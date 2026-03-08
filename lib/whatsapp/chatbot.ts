/**
 * WhatsApp Chatbot Orchestrator
 * RAG-powered AI chatbot for WhatsApp support/sales
 *
 * Pipeline per incoming message:
 * 1. Identify user by phone
 * 2. Load/create conversation state
 * 3. If escalated -> skip AI, notify agent
 * 4. Build context (RAG + orders/quotes + vehicle search + history)
 * 5. Call GPT-4o-mini
 * 6. Send response via Meta Cloud API
 * 7. Store in chat_messages
 * 8. Detect escalation keywords
 */

import { createClient } from '@supabase/supabase-js';
import { searchKnowledge } from '@/lib/rag/knowledge-base';
import { sendTextMessage, sendImageMessage, sendInteractiveMessage } from './meta-client';
import { parseImagesField, isUnavailableImage } from '@/lib/utils/imageProxy';

const ESCALATION_KEYWORDS = [
  'agent', 'humain', 'parler a quelqu', 'parler à quelqu',
  'personne reelle', 'personne réelle', 'help', 'aide',
  'responsable', 'manager', 'superviseur',
];

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://driveby-africa.com';
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
    let conversation = await getOrCreateConversation(supabase, phone, userId);

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
    try {
      const result = await Promise.race([
        buildContextAndVehicles(supabase, messageText, userId, conversation.id),
        new Promise<{ context: string; vehicles: VehicleResult[] }>((_, reject) =>
          setTimeout(() => reject(new Error('Context timeout')), 5000)
        ),
      ]);
      context = result.context;
      foundVehicles = result.vehicles;
    } catch (err) {
      console.warn('[Chatbot] Context build timeout/error, proceeding without full context:', err);
    }

    // 6. Call AI
    console.log(`[Chatbot] Calling GPT-4o-mini... (${foundVehicles.length} vehicles found)`);
    const aiResponse = await callAI(messageText, context, userName);
    console.log(`[Chatbot] AI response: "${aiResponse.substring(0, 80)}..."`);

    // 7. Send AI text response
    const sendResult = await sendTextMessage(phone, aiResponse);
    console.log(`[Chatbot] Send result: success=${sendResult.success}, error=${sendResult.error || 'none'}`);

    // 8. Send vehicle cards with images + CTA buttons (if vehicles found)
    if (foundVehicles.length > 0) {
      try {
        await sendVehicleCards(phone, foundVehicles);
        console.log(`[Chatbot] Sent ${Math.min(foundVehicles.length, 3)} vehicle cards`);
      } catch (err) {
        console.error('[Chatbot] Vehicle cards error:', err);
      }
    }

    // 9. Store bot response in chat_messages (find the chat_conversation linked to this user)
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
    // Send fallback message
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
  // Find active conversation
  const { data: existing } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('phone', phone)
    .in('status', ['active', 'escalated'])
    .order('last_message_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing;

  // Create new
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
    .update({
      status: 'escalated',
      escalation_reason: 'user_request',
    })
    .eq('id', conversationId);

  // Create admin notification
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

// --- Context building ---

async function buildContextAndVehicles(
  supabase: ReturnType<typeof getAdmin>,
  message: string,
  userId: string | undefined,
  conversationId: string
): Promise<{ context: string; vehicles: VehicleResult[] }> {
  const parts: string[] = [];
  let vehicles: VehicleResult[] = [];

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
          parts.push(`- ${q.quote_number}: ${q.vehicle_make} ${q.vehicle_model} ${q.vehicle_year} | ${q.vehicle_price_usd ? `$${q.vehicle_price_usd}` : 'Prix en attente'} | Statut: ${q.status}`);
        }
      }
    } catch (err) {
      console.error('[Chatbot] Orders fetch failed:', err);
    }
  }

  // Vehicle search if message mentions brands/models
  try {
    vehicles = await searchVehicles(supabase, message);
    const vehicleContext = buildVehicleContext(vehicles);
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

  return { context: parts.join('\n'), vehicles };
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
  'lexus': ['lexus', 'rx', 'nx', 'es', 'ux', 'lx'],
  'porsche': ['porsche', 'cayenne', 'macan', 'panamera'],
  'jetour': ['jetour', 'dashing', 'x70', 'x90', 't2'],
  'chery': ['chery', 'tiggo', 'arrizo', 'omoda'],
  'geely': ['geely', 'coolray', 'emgrand', 'monjaro', 'atlas', 'okavango'],
  'changan': ['changan', 'cs75', 'cs55', 'uni-t', 'uni-k', 'eado'],
  'haval': ['haval', 'jolion', 'h6', 'h9', 'dargo'],
  'great wall': ['great wall', 'gwm', 'poer', 'cannon'],
  'gac': ['gac', 'trumpchi', 'gs4', 'gs8', 'aion'],
  'tank': ['tank', 'tank 300', 'tank 500'],
  'zeekr': ['zeekr'],
  'nio': ['nio', 'et5', 'et7', 'es6', 'es8'],
  'xpeng': ['xpeng', 'p7', 'g6', 'g9'],
  'li auto': ['li auto', 'li l7', 'li l8', 'li l9', 'ideal'],
  'volkswagen': ['volkswagen', 'vw', 'golf', 'tiguan', 'passat', 'polo', 'touareg'],
  'audi': ['audi', 'a3', 'a4', 'a6', 'q3', 'q5', 'q7'],
  'ford': ['ford', 'ranger', 'escape', 'explorer', 'bronco'],
  'suzuki': ['suzuki', 'swift', 'vitara', 'jimny'],
  'mitsubishi': ['mitsubishi', 'outlander', 'pajero', 'l200'],
  'peugeot': ['peugeot', '208', '308', '3008', '5008'],
  'renault': ['renault', 'duster', 'clio', 'kadjar'],
  'land rover': ['land rover', 'range rover', 'defender', 'discovery', 'evoque'],
};

/**
 * Extract max price from message (supports CFA millions and USD)
 * e.g. "moins de 10 millions" -> 10000000 CFA -> ~$16000 USD approx
 */
function extractMaxPrice(message: string): number | null {
  const lower = message.toLowerCase();

  // Pattern: "moins de X millions" or "budget X millions" or "X millions max"
  const cfaMatch = lower.match(/(?:moins de|budget|max(?:imum)?|under|en dessous de)\s*(\d+(?:[.,]\d+)?)\s*(?:millions?|m)/);
  if (cfaMatch) {
    const cfaMillions = parseFloat(cfaMatch[1].replace(',', '.'));
    // Rough CFA -> USD conversion (1 USD ≈ 600 CFA)
    return Math.round((cfaMillions * 1_000_000) / 600);
  }

  // Pattern: "$X" or "X dollars" or "X usd"
  const usdMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:k|\$|dollars?|usd)/);
  if (usdMatch) {
    const val = parseFloat(usdMatch[1].replace(',', '.'));
    return val >= 1000 ? val : val * 1000; // "15k" or "15000"
  }

  return null;
}

/**
 * Search vehicles and return structured results for rich messages
 */
async function searchVehicles(
  supabase: ReturnType<typeof getAdmin>,
  message: string
): Promise<VehicleResult[]> {
  const lower = message.toLowerCase();

  const foundBrands: string[] = [];
  const keywords: string[] = [];

  for (const [brand, aliases] of Object.entries(BRANDS)) {
    for (const alias of aliases) {
      if (lower.includes(alias)) {
        if (!foundBrands.includes(brand)) foundBrands.push(brand);
        if (alias !== brand && alias.length > 2) keywords.push(alias);
      }
    }
  }

  // Fallback: extract any word > 3 chars that could be a brand/model
  if (foundBrands.length === 0 && keywords.length === 0) {
    const words = lower.replace(/[^a-zà-ÿ0-9\s-]/g, '').split(/\s+/).filter(w => w.length > 3);
    // Filter common French words that aren't vehicle terms
    const stopWords = ['dans', 'pour', 'avec', 'quel', 'quelle', 'moins', 'plus', 'cherche', 'voudrais', 'veux', 'besoin', 'budget', 'millions', 'prix', 'voiture', 'vehicule', 'véhicule', 'auto', 'importation'];
    const searchWords = words.filter(w => !stopWords.includes(w));
    if (searchWords.length > 0) keywords.push(...searchWords.slice(0, 3));
  }

  if (foundBrands.length === 0 && keywords.length === 0) return [];

  const conditions: string[] = [];
  for (const brand of foundBrands) conditions.push(`make.ilike.%${brand}%`);
  for (const kw of keywords) {
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
  const maxPriceUsd = extractMaxPrice(message);
  if (maxPriceUsd) {
    query = query.lte('start_price_usd', maxPriceUsd);
  }

  const { data: vehicles, error } = await query;
  if (error) {
    console.error('[Chatbot] Vehicle search error:', error);
    return [];
  }

  return (vehicles as VehicleResult[]) || [];
}

/**
 * Build context string from vehicle results (for AI prompt)
 */
function buildVehicleContext(vehicles: VehicleResult[]): string | null {
  if (vehicles.length === 0) return null;

  const lines = ['\nVEHICULES TROUVES:'];
  for (const v of vehicles) {
    const price = v.start_price_usd ? `$${v.start_price_usd.toLocaleString()}` : 'Prix sur demande';
    lines.push(`- ${v.make} ${v.model} ${v.year} | ${price} | ${v.mileage?.toLocaleString() || 'N/A'} km | ${SITE_URL}/cars/${v.id}`);
  }
  lines.push(`Total disponible: ${vehicles.length}+ véhicules`);
  return lines.join('\n');
}

/**
 * Get best available image URL for a vehicle (for WhatsApp sending)
 * Returns full public URL or null if no usable image
 */
function getVehicleImageUrl(vehicle: VehicleResult): string | null {
  const images = parseImagesField(vehicle.images);
  if (images.length === 0) return null;

  for (const url of images) {
    if (!url || isUnavailableImage(url)) continue;

    // autoimg.cn needs proxy — build full public URL
    if (url.includes('autoimg.cn')) {
      return `${SITE_URL}/api/image-proxy?url=${encodeURIComponent(url)}`;
    }

    // Direct URL for other domains (byteimg.com p9 works, etc.)
    if (url.startsWith('http')) return url;
  }

  return null;
}

/**
 * Send rich vehicle cards via WhatsApp (image + CTA button)
 * Sends up to 3 vehicles after the AI text response
 */
async function sendVehicleCards(phone: string, vehicles: VehicleResult[]): Promise<void> {
  const toSend = vehicles.slice(0, 3); // Max 3 cards

  for (const v of toSend) {
    const price = v.start_price_usd ? `$${v.start_price_usd.toLocaleString()}` : 'Prix sur demande';
    const mileage = v.mileage ? `${v.mileage.toLocaleString()} km` : '';
    const caption = `🚗 ${v.make} ${v.model} ${v.year}\n💰 ${price}${mileage ? `\n📏 ${mileage}` : ''}`;
    const vehicleUrl = `${SITE_URL}/cars/${v.id}`;
    const imageUrl = getVehicleImageUrl(v);

    try {
      // Send image with caption if available
      if (imageUrl) {
        await sendImageMessage(phone, imageUrl, caption);
      }

      // Send CTA button to view vehicle on site
      await sendInteractiveMessage(
        phone,
        imageUrl ? `Voir les détails de ${v.make} ${v.model} ${v.year}` : caption,
        'Voir le véhicule',
        vehicleUrl
      );
    } catch (err) {
      console.error(`[Chatbot] Failed to send vehicle card for ${v.id}:`, err);
      // Fallback: simple text with link
      try {
        await sendTextMessage(phone, `${caption}\n\n👉 ${vehicleUrl}`);
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

  const systemPrompt = `Tu es l'assistant WhatsApp de Driveby Africa, une plateforme d'importation de véhicules depuis la Corée du Sud, la Chine et Dubaï vers l'Afrique (Gabon, Cameroun, Sénégal, Côte d'Ivoire).

REGLES:
- Réponds UNIQUEMENT aux questions sur les véhicules, l'importation, les prix, les commandes
- Si question hors-sujet, recentre poliment vers les véhicules
- Sois concis (max 300 mots) - c'est WhatsApp, pas un email
- Utilise des emojis avec parcimonie
- Termine par une question ou suggestion orientée achat
- Ne jamais inventer de prix - utilise UNIQUEMENT les données fournies dans le contexte
- Si des VEHICULES TROUVES sont dans le contexte, mentionne-les avec leur prix et dis que des fiches détaillées avec photos suivent juste après
- Si aucun véhicule trouvé pour la marque demandée, suggère des alternatives disponibles
- Si tu ne peux pas répondre, suggère de taper "agent" pour parler à un humain
- Langue: français par défaut, mais adapte-toi à la langue du client

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
      model: 'gpt-4o-mini',
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
  // Find the chat_conversation for this user
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

    // Keep last 10 messages
    if (recentMessages.length > 10) recentMessages.splice(0, recentMessages.length - 10);

    await supabase
      .from('whatsapp_conversations')
      .update({ context: { ...ctx, recent_messages: recentMessages } })
      .eq('id', whatsappConversationId);
  } catch {
    // Ignore context update errors
  }
}
