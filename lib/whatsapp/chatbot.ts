/**
 * WhatsApp Chatbot Orchestrator
 * RAG-powered AI chatbot for WhatsApp support/sales
 *
 * Pipeline per incoming message:
 * 1. Identify user by phone
 * 2. Load/create conversation state
 * 3. If escalated -> skip AI, notify agent
 * 4. Build context (RAG + orders/quotes + vehicle search + shipping + history)
 * 5. Call GPT-4.1 (multilingual)
 * 6. Send response via Meta Cloud API
 * 7. Send vehicle cards (image header + CTA button)
 * 8. Store in chat_messages
 */

import { createClient } from '@supabase/supabase-js';
import { searchKnowledge } from '@/lib/rag/knowledge-base';
import { sendTextMessage, sendInteractiveMessage, sendImageMessage } from './meta-client';
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
  'kaiyi': ['kaiyi', 'kunlun'],
  'maxus': ['maxus'],
  'hongqi': ['hongqi'],
  'lynk': ['lynk'],
  'ora': ['ora'],
  'voyah': ['voyah'],
  'aion': ['aion'],
  'neta': ['neta'],
  'seres': ['seres'],
  'skywell': ['skywell'],
  'dfsk': ['dfsk'],
};

// --- Origin / country-of-manufacture to brand mapping ---
const ORIGIN_TO_BRANDS: Record<string, string[]> = {
  'korean': ['hyundai', 'kia'],
  'japanese': ['toyota', 'honda', 'nissan', 'lexus', 'suzuki', 'mitsubishi'],
  'chinese': ['byd', 'chery', 'geely', 'changan', 'haval', 'great wall', 'gac', 'jetour', 'tank', 'zeekr', 'nio', 'xpeng', 'li auto', 'dongfeng', 'foton', 'jac', 'wuling', 'kaiyi', 'maxus', 'hongqi', 'lynk', 'ora', 'voyah', 'aion', 'neta', 'seres', 'skywell', 'dfsk', 'mg', 'lifan'],
  'german': ['bmw', 'mercedes', 'volkswagen', 'audi', 'porsche'],
  'french': ['peugeot', 'renault'],
  'american': ['ford'],
  'british': ['land rover'],
};

const ORIGIN_KEYWORDS: Record<string, string[]> = {
  'korean': ['corée', 'coree', 'coréen', 'coreen', 'coréenne', 'coreenne', 'korea', 'korean', 'sud-coréen', 'sud coréen', 'sud-coreen', 'sud coreen'],
  'japanese': ['japon', 'japonais', 'japonaise', 'japan', 'japanese'],
  'chinese': ['chine', 'chinois', 'chinoise', 'china', 'chinese'],
  'german': ['allemagne', 'allemand', 'allemande', 'germany', 'german'],
  'french': ['france', 'français', 'francais', 'française', 'francaise', 'french'],
  'american': ['américain', 'americain', 'américaine', 'americaine', 'american', 'usa', 'états-unis', 'etats-unis'],
  'british': ['anglais', 'anglaise', 'britannique', 'british', 'england'],
};

/**
 * Detect if the user is asking for vehicles by country of origin
 * Returns the list of brands from that origin, or null
 */
function detectOriginBrands(message: string): { brands: string[]; originLabel: string } | null {
  const lower = message.toLowerCase();
  for (const [origin, keywords] of Object.entries(ORIGIN_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return { brands: ORIGIN_TO_BRANDS[origin], originLabel: origin };
    }
  }
  return null;
}

/**
 * Detect if user wants cheapest vehicles
 */
function wantsCheapest(message: string): boolean {
  const lower = message.toLowerCase();
  const cheapPatterns = [
    'moins ch', 'moins cher', 'moins chère', 'moins chères', 'moins chers',
    'pas cher', 'pas chère', 'pas chères', 'pas chers',
    'abordable', 'économique', 'economique', 'petit budget', 'petit prix',
    'cheapest', 'affordable', 'budget', 'low price', 'lowest price',
    'bon marché', 'bon marche', 'meilleur prix',
  ];
  return cheapPatterns.some(p => lower.includes(p));
}

// --- Language detection ---

type Language = 'fr' | 'en' | 'zh' | 'ar' | 'pt' | 'es';

const LANG_LABELS: Record<Language, string> = {
  fr: 'Français',
  en: 'English',
  zh: '中文 (Chinois simplifié)',
  ar: 'العربية (Arabe)',
  pt: 'Português',
  es: 'Español',
};

const EN_WORDS = ['hello', 'hi', 'looking', 'car', 'want', 'need', 'price', 'how much', 'shipping', 'delivery', 'vehicle', 'buy', 'available', 'thank', 'please', 'good morning', 'good evening'];
const PT_WORDS = ['olá', 'ola', 'carro', 'quero', 'preço', 'preco', 'obrigado', 'obrigada', 'bom dia', 'boa tarde', 'veículo', 'veiculo', 'comprar', 'quanto'];
const ES_WORDS = ['hola', 'coche', 'carro', 'quiero', 'precio', 'gracias', 'buenos dias', 'buenas tardes', 'vehículo', 'vehiculo', 'comprar', 'cuanto'];

function detectLanguage(text: string): Language {
  // Chinese characters
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
  // Arabic script
  if (/[\u0600-\u06FF]/.test(text)) return 'ar';

  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);

  // Count matching words per language
  const enCount = EN_WORDS.filter(w => lower.includes(w)).length;
  const ptCount = PT_WORDS.filter(w => lower.includes(w)).length;
  const esCount = ES_WORDS.filter(w => lower.includes(w)).length;

  // Need at least 2 matches to be confident
  if (enCount >= 2 && enCount > ptCount && enCount > esCount) return 'en';
  if (ptCount >= 2 && ptCount > enCount) return 'pt';
  if (esCount >= 2 && esCount > enCount) return 'es';

  // Single strong indicator
  if (words.includes('hello') || words.includes('hi')) return 'en';
  if (words.includes('olá') || words.includes('obrigado')) return 'pt';
  if (words.includes('hola') || words.includes('gracias')) return 'es';

  return 'fr';
}

// --- Destination / shipping detection ---

const DESTINATIONS: Record<string, string[]> = {
  'libreville': ['libreville', 'gabon', 'gabonais', 'gabonaise'],
  'douala': ['douala', 'cameroun', 'camerounais'],
  'kribi': ['kribi'],
  'dakar': ['dakar', 'senegal', 'sénégal', 'sénégalais', 'senegalais'],
  'abidjan': ['abidjan', 'cote d\'ivoire', 'côte d\'ivoire', 'ivoirien', 'ivoirienne'],
  'tema': ['tema', 'ghana', 'ghanéen', 'ghaneen'],
  'lagos': ['lagos', 'nigeria', 'nigérian', 'nigerian'],
  'port-harcourt': ['port harcourt', 'port-harcourt'],
  'lome': ['lomé', 'lome', 'togo', 'togolais'],
  'cotonou': ['cotonou', 'benin', 'bénin', 'béninois', 'beninois'],
  'conakry': ['conakry', 'guinée', 'guinee', 'guinéen', 'guineen'],
  'freetown': ['freetown', 'sierra leone'],
  'monrovia': ['monrovia', 'liberia', 'libéria'],
  'banjul': ['banjul', 'gambie'],
  'pointe-noire': ['pointe-noire', 'pointe noire', 'congo', 'congolais'],
  'matadi': ['matadi', 'rd congo', 'rdc', 'kinshasa'],
  'luanda': ['luanda', 'angola', 'angolais'],
  'malabo': ['malabo', 'guinée équatoriale', 'guinee equatoriale'],
  'mombasa': ['mombasa', 'kenya', 'kényan', 'kenyan'],
  'dar-es-salaam': ['dar es salaam', 'dar-es-salaam', 'tanzanie'],
  'maputo': ['maputo', 'mozambique'],
  'djibouti': ['djibouti'],
  'durban': ['durban', 'afrique du sud', 'south africa'],
  'cape-town': ['le cap', 'cape town', 'cape-town'],
  'port-gentil': ['port-gentil', 'port gentil'],
  'nouakchott': ['nouakchott', 'mauritanie'],
  'casablanca': ['casablanca', 'maroc', 'marocain'],
  'alger': ['alger', 'algérie', 'algerie', 'algérien'],
  'tunis': ['tunis', 'tunisie', 'tunisien'],
  'alexandrie': ['alexandrie', 'egypte', 'égypte', 'égyptien'],
  'toamasina': ['toamasina', 'madagascar', 'malgache'],
  'port-louis': ['port-louis', 'port louis', 'maurice', 'mauricien'],
};

interface ShippingInfo {
  destination_name: string;
  destination_country: string;
  destination_flag: string;
  china_cost_usd: number;
  korea_cost_usd: number;
  dubai_cost_usd: number;
}

/**
 * Detect destination from message and fetch shipping cost
 */
async function detectAndFetchShipping(
  supabase: ReturnType<typeof getAdmin>,
  message: string
): Promise<{ destinationId: string; shipping: ShippingInfo } | null> {
  const lower = message.toLowerCase();

  let matchedId: string | null = null;
  for (const [destId, keywords] of Object.entries(DESTINATIONS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      matchedId = destId;
      break;
    }
  }

  if (!matchedId) return null;

  try {
    const { data } = await supabase
      .from('shipping_routes')
      .select('destination_name, destination_country, destination_flag, china_cost_usd, korea_cost_usd, dubai_cost_usd')
      .eq('destination_id', matchedId)
      .eq('is_active', true)
      .single();

    if (!data) return null;
    return { destinationId: matchedId, shipping: data as ShippingInfo };
  } catch {
    return null;
  }
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

    // 4b. Detect language (use conversation history for consistency)
    const convCtx = conversation.context as { language?: Language } | null;
    const detectedLang = detectLanguage(messageText);
    const language: Language = detectedLang !== 'fr' ? detectedLang : (convCtx?.language || 'fr');

    // Store detected language in conversation context
    if (language !== convCtx?.language) {
      await supabase
        .from('whatsapp_conversations')
        .update({ context: { ...(conversation.context || {}), language } })
        .eq('id', conversation.id);
    }

    // 5. Build context + search vehicles (with timeout protection)
    let context = '';
    let foundVehicles: VehicleResult[] = [];
    let xafRate = DEFAULT_XAF_RATE;
    let vehiclesAreSuggestion = false;
    try {
      const result = await Promise.race([
        buildContextAndVehicles(supabase, messageText, userId, conversation.id),
        new Promise<{ context: string; vehicles: VehicleResult[]; xafRate: number; isSuggestion: boolean }>((_, reject) =>
          setTimeout(() => reject(new Error('Context timeout')), 5000)
        ),
      ]);
      context = result.context;
      foundVehicles = result.vehicles;
      xafRate = result.xafRate;
      vehiclesAreSuggestion = result.isSuggestion;
    } catch (err) {
      console.warn('[Chatbot] Context build timeout/error, proceeding without full context:', err);
    }

    // 6. Call AI (multilingual)
    console.log(`[Chatbot] Calling GPT-4.1... (${foundVehicles.length} vehicles, suggestion=${vehiclesAreSuggestion}, lang=${language})`);
    const aiResponse = await callAI(messageText, context, userName, xafRate, language);
    console.log(`[Chatbot] AI response: "${aiResponse.substring(0, 80)}..."`);

    // 7. Send AI text response
    const sendResult = await sendTextMessage(phone, aiResponse);
    console.log(`[Chatbot] Send result: success=${sendResult.success}, error=${sendResult.error || 'none'}`);

    // 8. Send vehicle cards ONLY for direct matches (not suggestions/random)
    if (foundVehicles.length > 0 && !vehiclesAreSuggestion) {
      try {
        await sendVehicleCards(phone, foundVehicles, xafRate);
        console.log(`[Chatbot] Sent ${Math.min(foundVehicles.length, 3)} vehicle cards`);
      } catch (err) {
        console.error('[Chatbot] Vehicle cards error:', err);
      }
    } else if (vehiclesAreSuggestion || foundVehicles.length === 0) {
      // No direct match → send CTA to browse the full catalog on the website
      try {
        await sendInteractiveMessage(
          phone,
          `Parcourez notre catalogue complet avec filtres par marque, prix, origine et type de véhicule.`,
          'Voir le catalogue',
          `${SITE_URL}/cars`
        );
        console.log(`[Chatbot] Sent catalog CTA (no direct match)`);
      } catch (err) {
        console.error('[Chatbot] Catalog CTA error:', err);
      }
    }

    // 8b. Send vehicle images if user asked for photos (only for direct matches)
    if (foundVehicles.length > 0 && !vehiclesAreSuggestion && wantsImages(messageText)) {
      try {
        await sendVehicleImages(phone, foundVehicles);
        console.log(`[Chatbot] Sent vehicle images`);
      } catch (err) {
        console.error('[Chatbot] Vehicle images error:', err);
      }
    }

    // 9. Store messages in conversation history + update contact name
    // Always store user + bot messages in whatsapp_conversations.context.recent_messages
    await storeConversationMessages(supabase, conversation.id, messageText, aiResponse, userName);

    // Also store in chat_messages for registered users
    if (userId) {
      await storeBotMessage(supabase, userId, aiResponse, conversation.id);
    }

    // 10. Update conversation last_message_at (context already updated in step 9)
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
): Promise<{ context: string; vehicles: VehicleResult[]; xafRate: number; isSuggestion: boolean }> {
  const parts: string[] = [];
  let vehicles: VehicleResult[] = [];
  let isSuggestion = false;

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
    const searchResult = await searchVehicles(supabase, message, xafRate);
    vehicles = searchResult.vehicles;
    isSuggestion = searchResult.isSuggestion;
    console.log(`[Chatbot] Vehicle search: ${vehicles.length} results, isSuggestion=${isSuggestion}, makes=${vehicles.map(v => v.make).join(',')}`);
    const vehicleContext = buildVehicleContext(vehicles, xafRate, isSuggestion);
    if (vehicleContext) {
      parts.push(vehicleContext);
    }
  } catch (err) {
    console.error('[Chatbot] Vehicle search failed:', err);
  }

  // Shipping/transport search if message mentions a destination
  try {
    const shippingResult = await detectAndFetchShipping(supabase, message);
    if (shippingResult) {
      const { shipping } = shippingResult;
      parts.push(`\nTRANSPORT VERS ${shipping.destination_name.toUpperCase()} ${shipping.destination_flag} (${shipping.destination_country}):`);
      parts.push(`- Conteneur 20HQ depuis Chine: $${shipping.china_cost_usd} USD (${formatFCFA(shipping.china_cost_usd, xafRate)})`);
      parts.push(`- Conteneur 20HQ depuis Corée: $${shipping.korea_cost_usd} USD (${formatFCFA(shipping.korea_cost_usd, xafRate)})`);
      parts.push(`- Conteneur 20HQ depuis Dubaï: $${shipping.dubai_cost_usd} USD (${formatFCFA(shipping.dubai_cost_usd, xafRate)})`);

      // If vehicles found, add total cost estimates (vehicle + export tax + shipping)
      if (vehicles.length > 0) {
        parts.push('\nESTIMATION PRIX TOTAL (véhicule + taxe export + transport 20HQ):');
        for (const v of vehicles.slice(0, 3)) {
          if (!v.start_price_usd) continue;
          const exportTax = getExportTax(v.source || '');
          const source = (v.source || 'china').toLowerCase();
          const shippingCost = source.includes('korea') ? shipping.korea_cost_usd
            : source.includes('dubai') ? shipping.dubai_cost_usd
            : shipping.china_cost_usd;
          const totalUsd = v.start_price_usd + exportTax + shippingCost;
          parts.push(`- ${v.make} ${v.model} ${v.year}: ${formatFCFA(totalUsd, xafRate)} ($${totalUsd.toLocaleString()}) [véhicule $${v.start_price_usd} + taxe $${exportTax} + transport $${shippingCost}]`);
        }
      }
    }
  } catch (err) {
    console.error('[Chatbot] Shipping search failed:', err);
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

  return { context: parts.join('\n'), vehicles, xafRate, isSuggestion };
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
 * Search vehicles — 2-phase approach:
 * Phase 1: Match brands from dictionary → strict brand filter
 * Phase 2: Direct ILIKE search on make + model columns for any word ≥ 3 chars
 * This ensures we find models like "Tiggo 7", "Coolray", "H6 GT" even if not in BRANDS dict
 */
interface VehicleSearchResult {
  vehicles: VehicleResult[];
  isSuggestion: boolean;
}

async function searchVehicles(
  supabase: ReturnType<typeof getAdmin>,
  message: string,
  xafRate: number
): Promise<VehicleSearchResult> {
  const lower = message.toLowerCase();
  const sortByPrice = wantsCheapest(message);

  // Stop words — never search these as vehicle terms
  const STOP_WORDS = new Set([
    'dans', 'pour', 'avec', 'quel', 'quelle', 'quels', 'quelles', 'moins', 'plus',
    'cherche', 'voudrais', 'veux', 'besoin', 'budget', 'millions', 'million', 'prix',
    'voiture', 'vehicule', 'véhicule', 'auto', 'importation', 'proposer', 'propose',
    'peux', 'bonjour', 'bonsoir', 'salut', 'merci', 'comment', 'combien', 'cher',
    'chere', 'chères', 'cheres', 'disponible', 'destination', 'livraison', 'transport', 'port', 'vers',
    'est', 'les', 'des', 'une', 'que', 'sur', 'pas', 'bon', 'bien', 'oui', 'non',
    'moi', 'toi', 'nous', 'vous', 'leur', 'elle', 'elles', 'sont', 'tout', 'tous',
    'comme', 'aussi', 'mais', 'donc', 'car', 'ici', 'avoir', 'être', 'faire',
    'gabon', 'cameroun', 'senegal', 'sénégal', 'nigeria', 'togo', 'benin', 'bénin',
    'congo', 'kenya', 'afrique', 'libreville', 'douala', 'dakar', 'abidjan', 'lagos',
    'hello', 'looking', 'want', 'need', 'show', 'send', 'photo', 'photos', 'image',
    'envoi', 'envoie', 'envoyer', 'montre', 'voir', 'catalogue',
    // Origin keywords are NOT vehicle terms — they are handled separately
    'corée', 'coree', 'coréen', 'coreen', 'coréenne', 'coreenne', 'korea', 'korean',
    'japon', 'japonais', 'japonaise', 'japan', 'japanese',
    'chine', 'chinois', 'chinoise', 'china', 'chinese',
    'allemagne', 'allemand', 'allemande', 'germany', 'german',
    'france', 'français', 'francais', 'française', 'francaise', 'french',
    'américain', 'americain', 'américaine', 'americaine', 'american',
    'anglais', 'anglaise', 'britannique', 'british',
    'dubai', 'dubaï', 'émirats', 'emirats',
  ]);

  // --- Phase 0: Origin detection (e.g. "voitures de Corée") ---
  const originResult = detectOriginBrands(message);
  if (originResult) {
    console.log(`[Chatbot] Origin detected: ${originResult.originLabel} → brands: ${originResult.brands.join(', ')}`);
    // Search ONLY for brands from this origin
    const conditions = originResult.brands.map(b => `make.ilike.%${b}%`);
    const orderCol = sortByPrice ? 'start_price_usd' : 'year';
    const ascending = sortByPrice;

    const { data, error } = await supabase
      .from('vehicles')
      .select('id, make, model, year, start_price_usd, mileage, source, images')
      .eq('is_visible', true)
      .not('start_price_usd', 'is', null)
      .or(conditions.join(','))
      .order(orderCol, { ascending })
      .limit(20);

    if (error) {
      console.error('[Chatbot] Origin vehicle search error:', error);
      return { vehicles: [], isSuggestion: false };
    }

    if (data && data.length > 0) {
      // Apply price filter if detected
      let filtered = data as VehicleResult[];
      const maxPriceUsd = extractMaxPrice(message, xafRate);
      if (maxPriceUsd) {
        filtered = filtered.filter(v => (v.start_price_usd || 0) <= maxPriceUsd);
      }

      if (filtered.length > 0) {
        // Pick diverse brands from this origin (max 5)
        const seen = new Set<string>();
        const diverse: VehicleResult[] = [];
        for (const v of filtered) {
          const brand = v.make.toLowerCase();
          if (!seen.has(brand)) {
            seen.add(brand);
            diverse.push(v);
            if (diverse.length >= 5) break;
          }
        }
        // If fewer than 5, fill with more from same brands (still sorted by price/year)
        if (diverse.length < 5) {
          for (const v of filtered) {
            if (!diverse.some(d => d.id === v.id)) {
              diverse.push(v);
              if (diverse.length >= 5) break;
            }
          }
        }
        return { vehicles: diverse, isSuggestion: false };
      }
    }

    // No vehicles from this origin in stock — suggest from related origins
    const alternatives = await getSuggestedVehicles(supabase, originResult.brands);
    if (alternatives.length > 0) {
      return { vehicles: alternatives, isSuggestion: true };
    }
    const random = await getRandomVehicles(supabase);
    return { vehicles: random, isSuggestion: true };
  }

  // --- Phase 1: Dictionary brand matching ---
  const foundBrands: string[] = [];
  const modelKeywords: string[] = [];

  for (const [brand, aliases] of Object.entries(BRANDS)) {
    for (const alias of aliases) {
      let matched = false;
      if (alias.length <= 3) {
        // Short aliases (≤ 3 chars) must match as whole word to avoid false positives
        // e.g. "es" in "des", "rx" in "brx", "h6" in "th6"
        const wordBoundary = new RegExp(`(?:^|\\s|[^a-zà-ÿ])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|\\s|[^a-zà-ÿ0-9])`, 'i');
        matched = wordBoundary.test(lower);
      } else {
        matched = lower.includes(alias);
      }
      if (matched) {
        if (!foundBrands.includes(brand)) foundBrands.push(brand);
        if (alias !== brand && alias.length > 2) modelKeywords.push(alias);
      }
    }
  }
  console.log(`[Chatbot] Brand detection: foundBrands=${JSON.stringify(foundBrands)}, modelKw=${JSON.stringify(modelKeywords)}`);

  // --- Phase 2: Extract search terms from message (any word ≥ 3 chars not in stop words) ---
  const rawWords = lower
    .replace(/[^a-zà-ÿ0-9\s-]/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w));

  // Deduplicate with existing keywords
  const existingSet = new Set([...foundBrands, ...modelKeywords]);
  const extraTerms = rawWords.filter(w => !existingSet.has(w)).slice(0, 3);

  // Build all search terms
  const allSearchTerms = [...new Set([...foundBrands, ...modelKeywords, ...extraTerms])];

  if (allSearchTerms.length === 0) {
    // No specific vehicle terms — return random featured vehicles
    const vehicles = await getRandomVehicles(supabase);
    return { vehicles, isSuggestion: true };
  }

  // Build OR conditions — search both make and model for every term (case-insensitive via ilike)
  const conditions: string[] = [];
  for (const term of allSearchTerms) {
    conditions.push(`make.ilike.%${term}%`);
    conditions.push(`model.ilike.%${term}%`);
  }

  // Sort by price if user wants cheapest, otherwise by year
  const orderCol = sortByPrice ? 'start_price_usd' : 'year';
  const ascending = sortByPrice;

  let query = supabase
    .from('vehicles')
    .select('id, make, model, year, start_price_usd, mileage, source, images')
    .eq('is_visible', true)
    .or(conditions.join(','))
    .order(orderCol, { ascending })
    .limit(20);

  // Apply price filter if detected
  const maxPriceUsd = extractMaxPrice(message, xafRate);
  if (maxPriceUsd) {
    query = query.lte('start_price_usd', maxPriceUsd);
  }

  const { data: vehicles, error } = await query;
  console.log(`[Chatbot] DB query: terms=${JSON.stringify(allSearchTerms)}, results=${vehicles?.length || 0}, error=${error?.message || 'none'}`);
  if (error) {
    console.error('[Chatbot] Vehicle search error:', error);
    return { vehicles: [], isSuggestion: false };
  }

  if (!vehicles || vehicles.length === 0) {
    console.log(`[Chatbot] No vehicles found for brands=${JSON.stringify(foundBrands)} — falling back to suggestions`);
    // No exact matches — try suggesting from related brands first
    if (foundBrands.length > 0) {
      const alternatives = await getSuggestedVehicles(supabase, foundBrands);
      if (alternatives.length > 0) {
        return { vehicles: alternatives, isSuggestion: true };
      }
    }
    // Fallback: random diverse vehicles
    const suggested = await getRandomVehicles(supabase);
    return { vehicles: suggested, isSuggestion: true };
  }

  // --- Scoring: rank results by relevance ---
  const scored = (vehicles as VehicleResult[]).map(v => {
    let score = 0;
    const vmake = v.make.toLowerCase();
    const vmodel = v.model.toLowerCase();

    // Exact brand match (highest priority)
    for (const brand of foundBrands) {
      if (vmake.includes(brand)) score += 10;
    }

    // Model keyword match
    for (const kw of modelKeywords) {
      if (vmodel.includes(kw)) score += 8;
      if (vmake.includes(kw)) score += 5;
    }

    // Extra term match (lower priority)
    for (const term of extraTerms) {
      if (vmake.includes(term)) score += 3;
      if (vmodel.includes(term)) score += 3;
    }

    return { vehicle: v, score };
  });

  // Sort by score descending, then by price or year
  if (sortByPrice) {
    scored.sort((a, b) => b.score - a.score || (a.vehicle.start_price_usd || 0) - (b.vehicle.start_price_usd || 0));
  } else {
    scored.sort((a, b) => b.score - a.score || b.vehicle.year - a.vehicle.year);
  }

  // STRICT: if known brands were detected, only return vehicles matching those brands
  if (foundBrands.length > 0) {
    const brandMatched = scored.filter(s =>
      foundBrands.some(brand => s.vehicle.make.toLowerCase().includes(brand))
    );
    if (brandMatched.length > 0) {
      return { vehicles: brandMatched.slice(0, 5).map(s => s.vehicle), isSuggestion: false };
    }
    // Brand requested but not in DB → suggest other models of similar category
    const alternatives = await getSuggestedVehicles(supabase, foundBrands);
    return { vehicles: alternatives, isSuggestion: true };
  }

  // No specific brand detected, return best scored results
  return { vehicles: scored.slice(0, 5).map(s => s.vehicle), isSuggestion: false };
}

/**
 * Fisher-Yates shuffle — unbiased random permutation
 */
function fisherYatesShuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Get random vehicles from available stock (diverse brands/models).
 * Uses a random offset to avoid always picking from the same pool.
 */
async function getRandomVehicles(
  supabase: ReturnType<typeof getAdmin>
): Promise<VehicleResult[]> {
  try {
    // First get total count to compute a random offset
    const { count } = await supabase
      .from('vehicles')
      .select('id', { count: 'exact', head: true })
      .eq('is_visible', true)
      .not('start_price_usd', 'is', null);

    const total = count || 0;
    const poolSize = 200; // fetch a large pool for diversity
    const maxOffset = Math.max(0, total - poolSize);
    const randomOffset = maxOffset > 0 ? Math.floor(Math.random() * maxOffset) : 0;

    const { data } = await supabase
      .from('vehicles')
      .select('id, make, model, year, start_price_usd, mileage, source, images')
      .eq('is_visible', true)
      .not('start_price_usd', 'is', null)
      .range(randomOffset, randomOffset + poolSize - 1);

    if (!data || data.length === 0) return [];

    // Proper shuffle then pick 1 per brand (max 5)
    const shuffled = fisherYatesShuffle(data as VehicleResult[]);
    const seen = new Set<string>();
    const diverse: VehicleResult[] = [];

    for (const v of shuffled) {
      const brand = v.make.toLowerCase();
      if (!seen.has(brand)) {
        seen.add(brand);
        diverse.push(v);
        if (diverse.length >= 5) break;
      }
    }

    // Fill remaining slots if fewer than 3 brands available
    if (diverse.length < 3) {
      for (const v of shuffled) {
        if (!diverse.some(d => d.id === v.id)) {
          diverse.push(v);
          if (diverse.length >= 5) break;
        }
      }
    }

    return diverse;
  } catch {
    return [];
  }
}

/**
 * Get suggested vehicles when a specific brand isn't in stock
 * Tries related brands (e.g. Chinese → other Chinese, Korean → other Korean)
 */
async function getSuggestedVehicles(
  supabase: ReturnType<typeof getAdmin>,
  requestedBrands: string[]
): Promise<VehicleResult[]> {
  // Group brands by category for smart suggestions
  const BRAND_CATEGORIES: Record<string, string[]> = {
    chinese: ['byd', 'chery', 'geely', 'changan', 'haval', 'great wall', 'gac', 'jetour', 'tank', 'zeekr', 'nio', 'xpeng', 'li auto', 'dongfeng', 'foton', 'jac', 'wuling', 'kaiyi', 'maxus', 'hongqi', 'lynk', 'ora', 'voyah', 'aion', 'neta', 'seres', 'skywell', 'dfsk', 'mg', 'lifan'],
    korean: ['hyundai', 'kia'],
    japanese: ['toyota', 'honda', 'nissan', 'lexus', 'suzuki', 'mitsubishi'],
    german: ['bmw', 'mercedes', 'volkswagen', 'audi', 'porsche'],
    french: ['peugeot', 'renault'],
    british: ['land rover'],
    american: ['ford'],
  };

  // Find what category the requested brand belongs to
  const categories = new Set<string>();
  for (const brand of requestedBrands) {
    for (const [cat, brands] of Object.entries(BRAND_CATEGORIES)) {
      if (brands.includes(brand)) categories.add(cat);
    }
  }

  // Build alternative brand list from same categories
  const altBrands: string[] = [];
  for (const cat of categories) {
    for (const b of BRAND_CATEGORIES[cat]) {
      if (!requestedBrands.includes(b)) altBrands.push(b);
    }
  }

  if (altBrands.length === 0) {
    return getRandomVehicles(supabase);
  }

  // Search for alternative brands
  const conditions = altBrands.map(b => `make.ilike.%${b}%`);
  try {
    const { data } = await supabase
      .from('vehicles')
      .select('id, make, model, year, start_price_usd, mileage, source, images')
      .eq('is_visible', true)
      .or(conditions.join(','))
      .not('start_price_usd', 'is', null)
      .order('year', { ascending: false })
      .limit(20);

    if (!data || data.length === 0) return getRandomVehicles(supabase);

    // Pick diverse results
    const seen = new Set<string>();
    const diverse: VehicleResult[] = [];
    const shuffled = fisherYatesShuffle(data as VehicleResult[]);
    for (const v of shuffled) {
      const brand = v.make.toLowerCase();
      if (!seen.has(brand)) {
        seen.add(brand);
        diverse.push(v);
        if (diverse.length >= 5) break;
      }
    }
    return diverse;
  } catch {
    return getRandomVehicles(supabase);
  }
}

/**
 * Build context string from vehicle results (for AI prompt) with FCFA prices
 */
function buildVehicleContext(vehicles: VehicleResult[], xafRate: number, isSuggestion = false): string | null {
  if (vehicles.length === 0) return null;

  const header = isSuggestion
    ? '\nSUGGESTIONS ALTERNATIVES DE NOTRE CATALOGUE (pas exactement ce que le client a demandé):'
    : '\nVEHICULES DISPONIBLES DANS NOTRE CATALOGUE:';
  const lines = [header];
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

// --- Image requests detection ---

const IMAGE_KEYWORDS = [
  'photo', 'photos', 'image', 'images', 'voir', 'montre', 'montrer',
  'envoie', 'envoyer', 'envoi', 'picture', 'pic', 'show',
  'catalogue', 'galerie', 'gallery',
];

/**
 * Detect if user is asking for photos/images of vehicles
 */
function wantsImages(message: string): boolean {
  const lower = message.toLowerCase();
  return IMAGE_KEYWORDS.some(kw => lower.includes(kw));
}

/**
 * Send multiple images of vehicles when user requests photos
 * Sends up to 3 images per vehicle (max 3 vehicles)
 */
async function sendVehicleImages(
  phone: string,
  vehicles: VehicleResult[]
): Promise<void> {
  const toSend = vehicles.slice(0, 3);

  for (const v of toSend) {
    const images = parseImagesField(v.images);
    const validImages = images
      .filter(url => url && !isUnavailableImage(url))
      .map(url => {
        if (url.includes('autoimg.cn')) {
          return `${SITE_URL}/api/image-proxy?url=${encodeURIComponent(url)}`;
        }
        return url;
      })
      .slice(0, 3);

    for (const imageUrl of validImages) {
      try {
        await sendImageMessage(phone, imageUrl, `${v.make} ${v.model} ${v.year}`);
      } catch (err) {
        console.error(`[Chatbot] Failed to send image for ${v.id}:`, err);
      }
    }
  }
}

// --- AI call ---

async function callAI(
  userMessage: string,
  context: string,
  userName: string,
  xafRate: number = DEFAULT_XAF_RATE,
  language: Language = 'fr'
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const langLabel = LANG_LABELS[language];

  const systemPrompt = `# RÔLE ET IDENTITÉ
Tu es Jason, l'assistant virtuel et conseiller commercial expert en automobile pour "Driveby Africa". Ton rôle est d'accueillir les prospects sur WhatsApp, de comprendre leurs besoins automobiles, de les conseiller et de les convaincre d'acheter nos véhicules (neufs ou occasions récentes), avec un focus particulier sur les marques chinoises, coréennes et les véhicules importés de Dubaï.

# LANGUE
IMPORTANT : Réponds TOUJOURS dans la langue du client. Langue détectée : ${langLabel}.
- Si le client écrit en français → réponds en français
- Si le client écrit en anglais → réponds en anglais
- Si le client écrit en chinois → réponds en chinois simplifié
- Si le client écrit en arabe → réponds en arabe
- Adapte aussi le ton culturel à la langue

# TON ET STYLE DE COMMUNICATION
- Ton : Professionnel, chaleureux, rassurant, persuasif et expert.
- Format : Adapté à WhatsApp. Fais des phrases courtes. Fais des paragraphes aérés. Utilise des listes à puces.
- Emojis : Utilise les emojis de manière stratégique mais sans en abuser (🚗, ✅, 💡, 🤝, 📍, 💰).

# DIRECTIVES DE CONVERSATION (RÈGLES STRICTES)
1. CONCISION : Ne fais jamais de réponses de plus de 4 ou 5 phrases. Les utilisateurs WhatsApp lisent en diagonale. Pose une question à la fin de chaque message pour faire avancer la discussion.
2. QUALIFICATION : Avant de proposer un véhicule, tu dois connaître : le budget du client, la destination de livraison (port/pays africain) et ses préférences de marque.
3. VALORISATION DES PRODUITS :
   - Véhicules Chinois (Haval H6 GT, Changan, Chery, Jetour, BYD, Geely, GAC...) : Design premium, technologies de série (caméra 360, écrans), robustesse des châssis, rapport qualité/prix imbattable.
   - Véhicules Coréens (Hyundai, Kia) : Fiabilité à toute épreuve, pièces de rechange disponibles partout sur le continent, excellente valeur de revente.
   - Imports Dubaï (Toyota, Lexus...) : Prix compétitif sans intermédiaire, tropicalisation (clim et refroidissement adaptés aux fortes chaleurs), rapidité d'expédition.
4. GESTION DES OBJECTIONS : Si un client doute de la fiabilité chinoise, rappelle que les standards ont changé, matériaux ultra-résistants, garantie constructeur. Sois éducatif, jamais défensif.
5. ORIENTATION VERS L'ACTION : Génère un lead qualifié. Propose d'envoyer un catalogue, des photos, un devis, ou de programmer un appel avec un conseiller humain.

# STRUCTURE D'UNE INTERACTION TYPE
- Salutation : "Bonjour ! 👋 Bienvenue chez Driveby Africa. Je suis Jason, votre conseiller automobile. Quel type de véhicule cherchez-vous et vers quel pays/port africain ?"
- Découverte : Poser des questions sur le budget et la destination.
- Argumentaire : Proposer 1 ou 2 modèles pertinents avec les arguments du marché.
- Call-to-Action : "Voulez-vous que je vous envoie des photos de ce modèle ou préférez-vous qu'un de nos conseillers vous appelle pour un devis précis ? 📞"

# PRIX ET DEVISES
- Tous les prix en FCFA (taux: 1 USD = ${xafRate} FCFA). USD entre parenthèses.
- Ne jamais inventer de prix — utilise UNIQUEMENT les données du contexte.
- Toujours préciser "prix hors transport jusqu'à votre destination, sous réserve de confirmation par un conseiller" sauf si le TRANSPORT est dans le contexte (auquel cas donne le prix total estimé).
- Si le contexte contient des infos TRANSPORT avec prix total, mentionne le prix total rendu destination.

# VÉHICULES (RÈGLES ABSOLUES — NE JAMAIS DÉROGER)
- Tu ne connais QUE les véhicules listés dans la section CONTEXTE ci-dessous. Tu n'as accès à AUCUN autre inventaire.
- NE MENTIONNE JAMAIS un véhicule, une marque ou un modèle qui n'apparaît pas explicitement dans le CONTEXTE. Pas de Toyota, pas de Lexus, pas de BMW, RIEN sauf ce qui est dans le contexte.
- Si le contexte contient des VEHICULES DISPONIBLES, mentionne-les brièvement et dis que les fiches avec photos arrivent juste après.
- Si le contexte contient des SUGGESTIONS ALTERNATIVES, présente-les comme : "Nous n'avons pas ce modèle exact en ce moment, mais voici quelques alternatives qui pourraient vous plaire :" — NE CITE QUE les véhicules du contexte.
- Si AUCUN véhicule n'est dans le contexte ou si tu n'as que des SUGGESTIONS ALTERNATIVES qui ne correspondent pas à la demande, ne propose PAS de véhicules spécifiques. Dis plutôt : "Nous avons un large catalogue — je vous envoie un lien pour explorer tous nos véhicules avec des filtres par marque, prix et origine." Un bouton vers le site web sera envoyé automatiquement après ton message.
- NE PROPOSE JAMAIS les mêmes véhicules à chaque message. Varie tes suggestions et pose des questions pour affiner (budget, usage, préférences).
- Si le client demande des photos/images d'un véhicule spécifique du catalogue, réponds que tu lui envoies les photos tout de suite.

# RESTRICTIONS
- Ne dis jamais du mal des autres marques, valorise simplement nos offres.
- Si question hors-sujet automobile, recentre poliment.
- Si question trop complexe, redirige vers le service client humain (taper "agent").

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
    throw new Error(`OpenAI error: ${(err as any).error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu générer une réponse.';
}

// --- Message storage ---

/**
 * Store user + bot messages in whatsapp_conversations.context.recent_messages
 * Works for ALL contacts (registered or not).
 */
async function storeConversationMessages(
  supabase: ReturnType<typeof getAdmin>,
  conversationId: string,
  userMessage: string,
  botResponse: string,
  contactName?: string
) {
  try {
    const { data: conv } = await supabase
      .from('whatsapp_conversations')
      .select('context')
      .eq('id', conversationId)
      .single();

    const ctx = (conv?.context || {}) as Record<string, unknown>;
    const recentMessages = (ctx.recent_messages as string[] | undefined) || [];
    recentMessages.push(`User: ${userMessage.substring(0, 300)}`);
    recentMessages.push(`Bot: ${botResponse.substring(0, 300)}`);

    // Keep last 20 messages (10 exchanges)
    if (recentMessages.length > 20) recentMessages.splice(0, recentMessages.length - 20);

    const updatedContext: Record<string, unknown> = { ...ctx, recent_messages: recentMessages };
    if (contactName) updatedContext.contact_name = contactName;

    await supabase
      .from('whatsapp_conversations')
      .update({ context: updatedContext })
      .eq('id', conversationId);
  } catch {
    // Ignore context update errors
  }
}

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
}

// --- Admin test endpoint ---

/**
 * Test the chatbot without sending WhatsApp messages.
 * Used by admin panel to test RAG + AI responses.
 */
export async function testChatbot(
  message: string,
  userName: string = 'Admin Test'
): Promise<{ response: string; vehicles_found: number; context: string }> {
  const supabase = getAdmin();

  const { context, vehicles, xafRate } = await buildContextAndVehicles(
    supabase, message, undefined, 'test'
  );

  const language = detectLanguage(message);
  const response = await callAI(message, context, userName, xafRate, language);

  return {
    response,
    vehicles_found: vehicles.length,
    context: context.substring(0, 500),
  };
}
