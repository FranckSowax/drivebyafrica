/**
 * WhatsApp Chatbot Orchestrator
 * RAG-powered AI chatbot for WhatsApp support/sales
 *
 * Pipeline per incoming message:
 * 1. Identify user by phone
 * 2. Load/create conversation state
 * 3. If escalated -> skip AI, notify agent
 * 4. Build context (RAG + orders/quotes + vehicle search + history)
 * 5. Call GPT-4.1
 * 6. Send response via Meta Cloud API
 * 7. Send vehicle cards (image header + CTA button)
 * 8. Store in chat_messages
 */

import { createClient } from '@supabase/supabase-js';
import { searchKnowledge } from '@/lib/rag/knowledge-base';
import { sendTextMessage, sendInteractiveMessage } from './meta-client';
import { parseImagesField, isUnavailableImage } from '@/lib/utils/imageProxy';
import { getExportTax } from '@/lib/utils/pricing';

const ESCALATION_KEYWORDS = [
  'agent', 'humain', 'parler a quelqu', 'parler à quelqu',
  'personne reelle', 'personne réelle', 'help', 'aide',
  'responsable', 'manager', 'superviseur',
];

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://driveby-africa.com';
const DEFAULT_XAF_RATE = 630;
const FALLBACK_MESSAGE = process.env.CHATBOT_FALLBACK_MESSAGE
  || `Désolé, je rencontre un problème technique. Veuillez réessayer ou contacter notre équipe directement :\n📞 WhatsApp: +86 130 2205 2798`;

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface ChatbotResult {
  replied: boolean;
  escalated: boolean;
  error?: string;
}

// --- Vehicle types ---

interface VehicleResult {
  id: string;
  make: string;
  model: string;
  year: number;
  start_price_usd: number | null;
  mileage: number | null;
  source: string | null;
  images: string[] | string | null;
}

// Common brand patterns (Korean, Japanese, German, Chinese, others)
const BRANDS: Record<string, string[]> = {
  'kia': ['kia', 'k3', 'k5', 'sportage', 'sorento', 'seltos', 'carnival', 'stinger', 'niro', 'ev6'],
  'hyundai': ['hyundai', 'tucson', 'santa fe', 'elantra', 'sonata', 'ioniq', 'kona', 'palisade', 'venue', 'creta'],
  'toyota': ['toyota', 'camry', 'corolla', 'rav4', 'land cruiser', 'prado', 'fortuner', 'hilux', 'yaris', 'highlander'],
  'honda': ['honda', 'civic', 'accord', 'cr-v', 'crv', 'hr-v', 'pilot'],
  'bmw': ['bmw', 'serie 3', 'serie 5', 'x3', 'x5', 'x1', 'x6'],
  'mercedes': ['mercedes', 'benz', 'classe c', 'classe e', 'gle', 'glc', 'gla', 'glb'],
  'byd': ['byd', 'han', 'tang', 'song', 'seal', 'dolphin', 'atto', 'yuan'],
  'nissan': ['nissan', 'qashqai', 'rogue', 'pathfinder', 'x-trail', 'kicks'],
  'lexus': ['lexus', 'rx', 'nx', 'es', 'ux', 'lx', 'lbx'],
  'porsche': ['porsche', 'cayenne', 'macan', 'panamera'],
  'jetour': ['jetour', 'dashing', 'x70', 'x90', 't2'],
  'chery': ['chery', 'tiggo', 'arrizo', 'omoda'],
  'geely': ['geely', 'coolray', 'emgrand', 'monjaro', 'atlas', 'okavango'],
  'changan': ['changan', 'cs75', 'cs55', 'uni-t', 'uni-k', 'eado'],
  'haval': ['haval', 'jolion', 'h6', 'h9', 'dargo'],
  'great wall': ['great wall', 'gwm', 'poer', 'cannon'],
  'gac': ['gac', 'trumpchi', 'gs4', 'gs8', 'aion'],
  'tank': ['tank 300', 'tank 500'],
  'zeekr': ['zeekr'],
  'nio': ['nio', 'et5', 'et7', 'es6', 'es8'],
  'xpeng': ['xpeng', 'p7', 'g6', 'g9'],
  'li auto': ['li auto', 'li l7', 'li l8', 'li l9', 'ideal'],
  'volkswagen': ['volkswagen', 'vw', 'golf', 'tiguan', 'passat', 'polo', 'touareg'],
  'audi': ['audi', 'a3', 'a4', 'a6', 'q3', 'q5', 'q7'],
  'ford': ['ford', 'ranger', 'escape', 'explorer', 'bronco'],
  'suzuki': ['suzuki', 'swift', 'vitara', 'jimny'],
  'mitsubishi': ['mitsubishi', 'outlander', 'pajero', 'l200'],
  'peugeot': ['peugeot', '3008', '5008'],
  'renault': ['renault', 'duster', 'clio', 'kadjar'],
  'land rover': ['land rover', 'range rover', 'defender', 'discovery', 'evoque'],
  'lifan': ['lifan'],
  'dongfeng': ['dongfeng'],
  'foton': ['foton'],
  'jac': ['jac'],
  'wuling': ['wuling'],
  'mg': ['mg zs', 'mg hs', 'mg4'],
};

/**
 * Main chatbot entry point - called from webhook on incoming message
 */
export async function handleChatbotMessage(
  phone: string,
  messageText: string,
  contactName?: string
): Promise<ChatbotResult> {
  const supabase = getAdmin();

  try {
    console.log(`[Chatbot] Processing message from ${phone}: "${messageText.substring(0, 50)}..."`);

    // 1. Find user by phone
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, country, phone, whatsapp_number')
      .or(`whatsapp_number.ilike.%${phone},phone.ilike.%${phone}`)
      .limit(1)
      .maybeSingle();

    const userName = profile?.full_name || contactName || 'Client';
    const userId = profile?.id;
    console.log(`[Chatbot] User: ${userName} (${userId || 'unknown'})`);

    // 2. Load or create WhatsApp conversation state
    const conversation = await getOrCreateConversation(supabase, phone, userId);

    // 3. Check if escalated
    if (conversation.status === 'escalated') {
      return { replied: false, escalated: true };
    }

    // 4. Check for escalation keywords
    if (shouldEscalate(messageText)) {
      await escalateConversation(supabase, conversation.id, phone, userName);
      await sendTextMessage(phone,
        `Bien sûr, je vous mets en relation avec un agent. Un membre de notre équipe vous répondra rapidement.\n\nEn attendant, vous pouvez aussi nous contacter directement :\n📞 WhatsApp: +86 130 2205 2798\n📧 Email: contact@driveby-africa.com`
      );
      return { replied: true, escalated: true };
    }

    // 5. Build context + search vehicles (with timeout protection)
    let context = '';
    let foundVehicles: VehicleResult[] = [];
    let xafRate = DEFAULT_XAF_RATE;
    try {
      const result = await Promise.race([
        buildContextAndVehicles(supabase, messageText, userId, conversation.id),
        new Promise<{ context: string; vehicles: VehicleResult[]; xafRate: number }>((_, reject) =>
          setTimeout(() => reject(new Error('Context timeout')), 5000)
        ),
      ]);
      context = result.context;
      foundVehicles = result.vehicles;
      xafRate = result.xafRate;
    } catch (err) {
      console.warn('[Chatbot] Context build timeout/error, proceeding without full context:', err);
    }

    // 6. Call AI
    console.log(`[Chatbot] Calling GPT-4.1... (${foundVehicles.length} vehicles found)`);
    const aiResponse = await callAI(messageText, context, userName);
    console.log(`[Chatbot] AI response: "${aiResponse.substring(0, 80)}..."`);

    // 7. Send AI text response
    const sendResult = await sendTextMessage(phone, aiResponse);
    console.log(`[Chatbot] Send result: success=${sendResult.success}, error=${sendResult.error || 'none'}`);

    // 8. Send vehicle cards with image header + CTA buttons (if vehicles found)
    if (foundVehicles.length > 0) {
      try {
        await sendVehicleCards(phone, foundVehicles, xafRate);
        console.log(`[Chatbot] Sent ${Math.min(foundVehicles.length, 3)} vehicle cards`);
      } catch (err) {
        console.error('[Chatbot] Vehicle cards error:', err);
      }
    }

    // 9. Store bot response in chat_messages
    if (userId) {
      await storeBotMessage(supabase, userId, aiResponse, conversation.id);
    }

    // 10. Update conversation last_message_at
    await supabase
      .from('whatsapp_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversation.id);

    return { replied: sendResult.success, escalated: false, error: sendResult.error };
  } catch (error) {
    console.error('[Chatbot] Error:', error);
    try {
      await sendTextMessage(phone, FALLBACK_MESSAGE);
    } catch {
      // Ignore send error
    }
    return { replied: false, escalated: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// --- Conversation management ---

async function getOrCreateConversation(
  supabase: ReturnType<typeof getAdmin>,
  phone: string,
  userId?: string
) {
  const { data: existing } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('phone', phone)
    .in('status', ['active', 'escalated'])
    .order('last_message_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing;

  const { data: newConv, error } = await supabase
    .from('whatsapp_conversations')
    .insert({
      phone,
      user_id: userId || null,
      status: 'active',
      context: {},
    })
    .select()
    .single();

  if (error) throw error;
  return newConv;
}

function shouldEscalate(message: string): boolean {
  const lower = message.toLowerCase();
  return ESCALATION_KEYWORDS.some(kw => lower.includes(kw));
}

async function escalateConversation(
  supabase: ReturnType<typeof getAdmin>,
  conversationId: string,
  phone: string,
  customerName: string
) {
  await supabase
    .from('whatsapp_conversations')
    .update({ status: 'escalated', escalation_reason: 'user_request' })
    .eq('id', conversationId);

  await supabase.from('admin_notifications').insert({
    type: 'agent_request',
    title: `Demande d'agent - ${customerName}`,
    message: `Le client ${customerName} (+${phone}) demande à parler à un agent humain.`,
    priority: 'high',
    action_url: '/admin/messages',
    action_label: 'Répondre',
    icon: 'message-circle',
    data: { phone, customer_name: customerName, conversation_id: conversationId },
  });
}

// --- Currency ---

async function getXafRate(supabase: ReturnType<typeof getAdmin>): Promise<number> {
  try {
    const { data } = await supabase
      .from('currency_rates')
      .select('rate')
      .eq('code', 'XAF')
      .eq('is_active', true)
      .single();
    return data?.rate || DEFAULT_XAF_RATE;
  } catch {
    return DEFAULT_XAF_RATE;
  }
}

function formatFCFA(amountUsd: number, xafRate: number): string {
  const fcfa = Math.round(amountUsd * xafRate);
  return `${fcfa.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`;
}

// --- Context building ---

async function buildContextAndVehicles(
  supabase: ReturnType<typeof getAdmin>,
  message: string,
  userId: string | undefined,
  conversationId: string
): Promise<{ context: string; vehicles: VehicleResult[]; xafRate: number }> {
  const parts: string[] = [];
  let vehicles: VehicleResult[] = [];

  // Get XAF rate for price display
  const xafRate = await getXafRate(supabase);

  // RAG knowledge search
  try {
    const ragResults = await searchKnowledge(message, { threshold: 0.7, limit: 5 });
    if (ragResults.length > 0) {
      parts.push('BASE DE CONNAISSANCE:');
      for (const r of ragResults) {
        parts.push(`[${r.category}] ${r.content}`);
      }
    }
  } catch (err) {
    console.error('[Chatbot] RAG search failed:', err);
  }

  // User orders/quotes
  if (userId) {
    try {
      const { data: orders } = await supabase
        .from('orders')
        .select('order_number, status, vehicle_make, vehicle_model, vehicle_year, shipping_eta, updated_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (orders && orders.length > 0) {
        parts.push('\nCOMMANDES DU CLIENT:');
        for (const o of orders) {
          parts.push(`- ${o.order_number}: ${o.vehicle_make} ${o.vehicle_model} ${o.vehicle_year} | Statut: ${o.status}${o.shipping_eta ? ` | ETA: ${o.shipping_eta}` : ''}`);
        }
      }

      const { data: quotes } = await supabase
        .from('quotes')
        .select('quote_number, status, vehicle_make, vehicle_model, vehicle_year, vehicle_price_usd')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (quotes && quotes.length > 0) {
        parts.push('\nDEVIS DU CLIENT:');
        for (const q of quotes) {
          const priceFcfa = q.vehicle_price_usd ? formatFCFA(q.vehicle_price_usd, xafRate) : 'Prix en attente';
          parts.push(`- ${q.quote_number}: ${q.vehicle_make} ${q.vehicle_model} ${q.vehicle_year} | ${priceFcfa} | Statut: ${q.status}`);
        }
      }
    } catch (err) {
      console.error('[Chatbot] Orders fetch failed:', err);
    }
  }

  // Vehicle search if message mentions brands/models
  try {
    vehicles = await searchVehicles(supabase, message, xafRate);
    const vehicleContext = buildVehicleContext(vehicles, xafRate);
    if (vehicleContext) {
      parts.push(vehicleContext);
    }
  } catch (err) {
    console.error('[Chatbot] Vehicle search failed:', err);
  }

  // Recent conversation history
  try {
    const { data: history } = await supabase
      .from('whatsapp_conversations')
      .select('context')
      .eq('id', conversationId)
      .single();

    const ctx = history?.context as { recent_messages?: string[] } | null;
    if (ctx?.recent_messages && ctx.recent_messages.length > 0) {
      parts.push('\nHISTORIQUE RECENT:');
      parts.push(ctx.recent_messages.slice(-5).join('\n'));
    }
  } catch {
    // Ignore
  }

  return { context: parts.join('\n'), vehicles, xafRate };
}

// --- Vehicle search ---

/**
 * Extract max price from message (supports CFA millions and USD)
 */
function extractMaxPrice(message: string, xafRate: number): number | null {
  const lower = message.toLowerCase();

  // Pattern: "moins de X millions" or "budget X millions" or "X millions max"
  const cfaMatch = lower.match(/(?:moins de|budget|max(?:imum)?|under|en dessous de|a|à)\s*(\d+(?:[.,]\d+)?)\s*(?:millions?|m\b)/);
  if (cfaMatch) {
    const cfaMillions = parseFloat(cfaMatch[1].replace(',', '.'));
    return Math.round((cfaMillions * 1_000_000) / xafRate);
  }

  // Pattern: "$X" or "X dollars" or "X usd"
  const usdMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:k|\$|dollars?|usd)/);
  if (usdMatch) {
    const val = parseFloat(usdMatch[1].replace(',', '.'));
    return val >= 1000 ? val : val * 1000;
  }

  return null;
}

/**
 * Search vehicles - only returns vehicles matching the detected brands
 */
async function searchVehicles(
  supabase: ReturnType<typeof getAdmin>,
  message: string,
  xafRate: number
): Promise<VehicleResult[]> {
  const lower = message.toLowerCase();

  const foundBrands: string[] = [];
  const modelKeywords: string[] = [];

  for (const [brand, aliases] of Object.entries(BRANDS)) {
    for (const alias of aliases) {
      if (lower.includes(alias)) {
        if (!foundBrands.includes(brand)) foundBrands.push(brand);
        if (alias !== brand && alias.length > 2) modelKeywords.push(alias);
      }
    }
  }

  // Fallback: extract words that could be brands/models (min 4 chars)
  if (foundBrands.length === 0 && modelKeywords.length === 0) {
    const words = lower.replace(/[^a-zà-ÿ0-9\s-]/g, '').split(/\s+/).filter(w => w.length >= 4);
    const stopWords = ['dans', 'pour', 'avec', 'quel', 'quelle', 'quels', 'quelles', 'moins', 'plus',
      'cherche', 'voudrais', 'veux', 'besoin', 'budget', 'millions', 'million', 'prix', 'voiture',
      'vehicule', 'véhicule', 'auto', 'importation', 'proposer', 'propose', 'peux', 'bonjour',
      'bonsoir', 'salut', 'merci', 'comment', 'combien', 'cher', 'chere', 'disponible'];
    const searchWords = words.filter(w => !stopWords.includes(w));
    if (searchWords.length > 0) modelKeywords.push(...searchWords.slice(0, 2));
  }

  if (foundBrands.length === 0 && modelKeywords.length === 0) return [];

  // Build conditions: prioritize brand match on make, model keywords on model
  const conditions: string[] = [];
  for (const brand of foundBrands) conditions.push(`make.ilike.%${brand}%`);
  for (const kw of modelKeywords) {
    conditions.push(`make.ilike.%${kw}%`);
    conditions.push(`model.ilike.%${kw}%`);
  }

  let query = supabase
    .from('vehicles')
    .select('id, make, model, year, start_price_usd, mileage, source, images')
    .eq('is_visible', true)
    .or(conditions.join(','))
    .order('year', { ascending: false })
    .limit(5);

  // Apply price filter if detected
  const maxPriceUsd = extractMaxPrice(message, xafRate);
  if (maxPriceUsd) {
    query = query.lte('start_price_usd', maxPriceUsd);
  }

  const { data: vehicles, error } = await query;
  if (error) {
    console.error('[Chatbot] Vehicle search error:', error);
    return [];
  }

  if (!vehicles || vehicles.length === 0) return [];

  // Filter: if specific brands were detected, only return matching brands
  if (foundBrands.length > 0) {
    const filtered = vehicles.filter((v: VehicleResult) =>
      foundBrands.some(brand => v.make.toLowerCase().includes(brand))
    );
    // Return filtered if we have results, otherwise return all (fuzzy match)
    if (filtered.length > 0) return filtered as VehicleResult[];
  }

  return vehicles as VehicleResult[];
}

/**
 * Build context string from vehicle results (for AI prompt) with FCFA prices
 */
function buildVehicleContext(vehicles: VehicleResult[], xafRate: number): string | null {
  if (vehicles.length === 0) return null;

  const lines = ['\nVEHICULES DISPONIBLES DANS NOTRE CATALOGUE:'];
  for (const v of vehicles) {
    const exportTax = getExportTax(v.source || '');
    const totalUsd = (v.start_price_usd || 0) + exportTax;
    const priceFcfa = v.start_price_usd ? formatFCFA(totalUsd, xafRate) : 'Prix sur demande';
    const priceUsd = v.start_price_usd ? `$${totalUsd.toLocaleString()}` : '';
    lines.push(`- ${v.make} ${v.model} ${v.year} | ${priceFcfa}${priceUsd ? ` (${priceUsd})` : ''} | ${v.mileage?.toLocaleString() || 'N/A'} km | Origine: ${v.source || 'N/A'}`);
  }
  return lines.join('\n');
}

// --- Vehicle image URL ---

function getVehicleImageUrl(vehicle: VehicleResult): string | null {
  const images = parseImagesField(vehicle.images);
  if (images.length === 0) return null;

  for (const url of images) {
    if (!url || isUnavailableImage(url)) continue;

    // autoimg.cn needs proxy — build full public URL
    if (url.includes('autoimg.cn')) {
      return `${SITE_URL}/api/image-proxy?url=${encodeURIComponent(url)}`;
    }

    // Direct URL for other domains
    if (url.startsWith('http')) return url;
  }

  return null;
}

// --- Send vehicle cards ---

/**
 * Send rich vehicle cards: single interactive message per vehicle
 * with image header + vehicle info in FCFA + "Voir le véhicule" CTA button
 */
async function sendVehicleCards(
  phone: string,
  vehicles: VehicleResult[],
  xafRate: number
): Promise<void> {
  const toSend = vehicles.slice(0, 3);

  for (const v of toSend) {
    const exportTax = getExportTax(v.source || '');
    const totalUsd = (v.start_price_usd || 0) + exportTax;
    const priceFcfa = v.start_price_usd ? formatFCFA(totalUsd, xafRate) : 'Prix sur demande';
    const priceUsd = v.start_price_usd ? `$${totalUsd.toLocaleString()}` : '';
    const mileage = v.mileage ? `${v.mileage.toLocaleString()} km` : 'Neuf';
    const origin = (v.source || '').charAt(0).toUpperCase() + (v.source || '').slice(1);

    const bodyText = [
      `*${v.make} ${v.model} ${v.year}*`,
      `💰 ${priceFcfa}${priceUsd ? ` (${priceUsd})` : ''}`,
      `📏 ${mileage}`,
      origin ? `🌍 Origine: ${origin}` : '',
    ].filter(Boolean).join('\n');

    const vehicleUrl = `${SITE_URL}/cars/${v.id}`;
    const imageUrl = getVehicleImageUrl(v);

    try {
      // Single interactive CTA message with image header + vehicle info + button
      await sendInteractiveMessage(
        phone,
        bodyText,
        'Voir le véhicule',
        vehicleUrl,
        imageUrl || undefined
      );
    } catch (err) {
      console.error(`[Chatbot] Failed to send vehicle card for ${v.id}:`, err);
      // Fallback: simple text with link
      try {
        await sendTextMessage(phone, `${bodyText}\n\n👉 ${vehicleUrl}`);
      } catch {
        // Ignore
      }
    }
  }
}

// --- AI call ---

async function callAI(userMessage: string, context: string, userName: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const systemPrompt = `Tu es Jason, vendeur expert chez Driveby Africa, spécialisé dans l'importation de véhicules depuis la Chine, la Corée du Sud et Dubaï vers l'Afrique (tous ports : Libreville, Douala, Dakar, Abidjan, Lomé, Cotonou, Pointe-Noire, etc.).

PERSONNALITE:
- Tu es un vendeur passionné et expert, pas un simple chatbot
- Tu connais parfaitement les marques chinoises (Jetour, Chery, BYD, Geely, Haval, Changan, GAC, etc.), coréennes (Hyundai, Kia, etc.) et celles disponibles à Dubaï
- Tu poses des questions pour mieux cibler : budget, usage (ville/route/chantier), préférence carburant (essence/diesel/électrique), nombre de places, pays de destination
- Tu donnes des conseils d'expert : fiabilité, coût d'entretien en Afrique, disponibilité des pièces, consommation
- Tu es honnête : si un véhicule n'est pas dans le catalogue, dis-le clairement mais propose des alternatives pertinentes

REGLES STRICTES:
- Réponds UNIQUEMENT aux questions liées aux véhicules, l'importation, les prix, les commandes
- Si question hors-sujet, recentre poliment vers les véhicules
- Sois concis (max 200 mots) - c'est WhatsApp
- Tous les prix doivent être en FCFA (taux: 1 USD = 630 FCFA). Mentionne le prix USD entre parenthèses
- Ne jamais inventer de prix - utilise UNIQUEMENT les données du contexte
- Si des VEHICULES sont dans le contexte, mentionne-les brièvement et dis que les fiches avec photos arrivent juste après
- Si aucun véhicule trouvé pour la marque demandée, explique que tu n'en as pas en stock actuellement et propose des alternatives en posant des questions sur les besoins
- Pour orienter le client, demande : budget, type de véhicule souhaité, pays de livraison
- Si tu ne peux pas répondre, suggère de taper "agent" pour parler à un humain
- Langue: français par défaut, adapte-toi à la langue du client

CONTACT: WhatsApp +86 130 2205 2798 | contact@driveby-africa.com
SITE: ${SITE_URL}

${context ? `\nCONTEXTE:\n${context}` : ''}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `[${userName}]: ${userMessage}` },
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`OpenAI error: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu générer une réponse.';
}

// --- Message storage ---

async function storeBotMessage(
  supabase: ReturnType<typeof getAdmin>,
  userId: string,
  content: string,
  whatsappConversationId: string
) {
  const { data: chatConv } = await supabase
    .from('chat_conversations')
    .select('id')
    .eq('user_id', userId)
    .in('status', ['active', 'waiting_agent'])
    .order('last_message_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!chatConv) return;

  await supabase.from('chat_messages').insert({
    conversation_id: chatConv.id,
    sender_type: 'bot',
    content,
    metadata: {
      source: 'whatsapp_chatbot',
      whatsapp_conversation_id: whatsappConversationId,
    },
  });

  // Update conversation context with recent messages
  try {
    const { data: conv } = await supabase
      .from('whatsapp_conversations')
      .select('context')
      .eq('id', whatsappConversationId)
      .single();

    const ctx = (conv?.context || {}) as { recent_messages?: string[] };
    const recentMessages = ctx.recent_messages || [];
    recentMessages.push(`Bot: ${content.substring(0, 200)}`);

    if (recentMessages.length > 10) recentMessages.splice(0, recentMessages.length - 10);

    await supabase
      .from('whatsapp_conversations')
      .update({ context: { ...ctx, recent_messages: recentMessages } })
      .eq('id', whatsappConversationId);
  } catch {
    // Ignore context update errors
  }
}
