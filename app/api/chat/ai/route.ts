import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

// Initialize OpenAI client (GPT-4o)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Order status translations for AI context
const ORDER_STATUS_FR: Record<string, string> = {
  'pending_deposit': 'En attente de l\'acompte',
  'deposit_paid': 'Acompte payé - En attente d\'inspection',
  'inspection_in_progress': 'Inspection en cours',
  'inspection_completed': 'Inspection terminée - Rapport disponible',
  'pending_balance': 'En attente du paiement du solde',
  'balance_paid': 'Solde payé - Préparation de l\'expédition',
  'shipping_preparation': 'Préparation de l\'expédition',
  'shipped': 'Expédié - En transit',
  'in_transit': 'En transit maritime',
  'customs_clearance': 'En dédouanement',
  'ready_for_pickup': 'Prêt pour récupération',
  'delivered': 'Livré',
  'cancelled': 'Annulé',
};

// Common car brand names and their variations for search
const BRAND_ALIASES: Record<string, string[]> = {
  'kia': ['kia', 'k3', 'k5', 'k7', 'k9', 'sportage', 'sorento', 'seltos', 'carnival', 'stinger', 'niro', 'ev6', 'telluride'],
  'hyundai': ['hyundai', 'tucson', 'santa fe', 'santafe', 'elantra', 'sonata', 'ioniq', 'kona', 'palisade', 'venue', 'creta'],
  'toyota': ['toyota', 'camry', 'corolla', 'rav4', 'highlander', 'land cruiser', 'prado', 'fortuner', 'hilux', 'yaris'],
  'honda': ['honda', 'civic', 'accord', 'cr-v', 'crv', 'hr-v', 'hrv', 'pilot', 'odyssey', 'fit'],
  'nissan': ['nissan', 'altima', 'maxima', 'sentra', 'rogue', 'murano', 'pathfinder', 'armada', 'kicks', 'qashqai'],
  'bmw': ['bmw', 'serie 3', 'serie 5', 'serie 7', 'x1', 'x3', 'x5', 'x6', 'x7', 'ix'],
  'mercedes': ['mercedes', 'mercedes-benz', 'benz', 'classe c', 'classe e', 'classe s', 'gle', 'glc', 'gla', 'amg'],
  'audi': ['audi', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'q3', 'q5', 'q7', 'q8', 'e-tron', 'etron'],
  'volkswagen': ['volkswagen', 'vw', 'golf', 'passat', 'tiguan', 'touareg', 'atlas', 'jetta', 'arteon', 'id.4'],
  'ford': ['ford', 'mustang', 'f-150', 'f150', 'explorer', 'escape', 'edge', 'bronco', 'ranger'],
  'chevrolet': ['chevrolet', 'chevy', 'malibu', 'camaro', 'silverado', 'equinox', 'traverse', 'tahoe'],
  'lexus': ['lexus', 'rx', 'nx', 'es', 'ls', 'is', 'gx', 'lx', 'ux'],
  'porsche': ['porsche', 'cayenne', 'macan', 'panamera', '911', 'taycan'],
  'land rover': ['land rover', 'range rover', 'defender', 'discovery', 'evoque', 'velar'],
  'nio': ['nio', 'et5', 'et7', 'es6', 'es7', 'es8', 'ec6', 'ec7'],
  'byd': ['byd', 'han', 'tang', 'song', 'seal', 'dolphin', 'atto'],
  'geely': ['geely', 'coolray', 'azkarra', 'okavango', 'emgrand'],
  'changan': ['changan', 'cs55', 'cs75', 'cs85', 'uni-k', 'uni-t'],
  'great wall': ['great wall', 'haval', 'h6', 'h9', 'tank'],
  'volvo': ['volvo', 'xc40', 'xc60', 'xc90', 's60', 's90', 'v60', 'v90'],
  'mazda': ['mazda', 'cx-5', 'cx5', 'cx-30', 'cx30', 'cx-9', 'cx9', 'mazda3', 'mazda6'],
  'subaru': ['subaru', 'outback', 'forester', 'crosstrek', 'impreza', 'wrx', 'legacy'],
  'mitsubishi': ['mitsubishi', 'outlander', 'pajero', 'eclipse cross', 'asx', 'montero'],
  'jeep': ['jeep', 'wrangler', 'grand cherokee', 'cherokee', 'compass', 'renegade', 'gladiator'],
  'peugeot': ['peugeot', '208', '308', '408', '508', '2008', '3008', '5008'],
  'renault': ['renault', 'megane', 'clio', 'captur', 'kadjar', 'koleos', 'arkana'],
  'tesla': ['tesla', 'model s', 'model 3', 'model x', 'model y'],
};

// Export tax by source (same as in pricing.ts)
const EXPORT_TAX_USD: Record<string, number> = {
  che168: 980,    // China
  dongchedi: 980, // China
  encar: 0,       // Korea
  dubai: 0,       // Dubai
  china: 980,
  korea: 0,
};

function getExportTax(source: string | null): number {
  if (!source) return 0;
  return EXPORT_TAX_USD[source.toLowerCase()] || 0;
}

// Extract filters from user message
interface ExtractedFilters {
  brands: string[];
  keywords: string[];
  maxYear: number | null;
  minYear: number | null;
  maxPrice: number | null;
  minPrice: number | null;
  fuelTypes: string[];
  recentOnly: boolean; // Less than 5 years
}

function extractFiltersFromMessage(message: string): ExtractedFilters {
  const lowerMessage = message.toLowerCase();
  const foundBrands: string[] = [];
  const keywords: string[] = [];
  let maxYear: number | null = null;
  let minYear: number | null = null;
  let maxPrice: number | null = null;
  let minPrice: number | null = null;
  const fuelTypes: string[] = [];
  let recentOnly = false;

  // Check for brand mentions
  for (const [brand, aliases] of Object.entries(BRAND_ALIASES)) {
    for (const alias of aliases) {
      if (lowerMessage.includes(alias)) {
        if (!foundBrands.includes(brand)) {
          foundBrands.push(brand);
        }
        if (alias !== brand && alias.length > 2) {
          keywords.push(alias);
        }
      }
    }
  }

  // Extract model patterns (K3, X5, etc.)
  const modelPatterns = lowerMessage.match(/\b[a-z]?\d+[a-z]?\b/gi) || [];
  modelPatterns.forEach(pattern => {
    if (pattern.length >= 2 && !keywords.includes(pattern.toLowerCase())) {
      keywords.push(pattern.toLowerCase());
    }
  });

  // Detect "recent" or "less than X years" filters
  const currentYear = new Date().getFullYear();
  if (lowerMessage.includes('moins de 5 ans') || lowerMessage.includes('recente') || lowerMessage.includes('récente') || lowerMessage.includes('recent')) {
    recentOnly = true;
    minYear = currentYear - 5;
  }
  if (lowerMessage.includes('moins de 3 ans')) {
    minYear = currentYear - 3;
    recentOnly = true;
  }
  if (lowerMessage.includes('moins de 10 ans')) {
    minYear = currentYear - 10;
  }

  // Detect specific year mentions
  const yearMatch = lowerMessage.match(/(\d{4})/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    if (year >= 2000 && year <= currentYear + 1) {
      // If message says "après" or "depuis", use as minYear
      if (lowerMessage.includes('après') || lowerMessage.includes('depuis') || lowerMessage.includes('apres')) {
        minYear = year;
      } else if (lowerMessage.includes('avant')) {
        maxYear = year;
      }
    }
  }

  // Detect fuel type preferences
  if (lowerMessage.includes('electrique') || lowerMessage.includes('électrique') || lowerMessage.includes('ev')) {
    fuelTypes.push('electric', 'électrique', 'ev');
  }
  if (lowerMessage.includes('hybride')) {
    fuelTypes.push('hybrid', 'hybride', 'plug-in hybrid');
  }
  if (lowerMessage.includes('essence')) {
    fuelTypes.push('gasoline', 'essence', 'petrol');
  }
  if (lowerMessage.includes('diesel')) {
    fuelTypes.push('diesel');
  }

  // Detect price constraints (simplified - in millions FCFA or thousands USD)
  const priceFCFA = lowerMessage.match(/moins de (\d+)\s*millions?\s*(fcfa|xaf)?/i);
  if (priceFCFA) {
    maxPrice = parseInt(priceFCFA[1]) * 1000000 / 615; // Convert FCFA to USD
  }
  const priceUSD = lowerMessage.match(/moins de (\d+)\s*000?\s*\$?\s*usd?/i);
  if (priceUSD) {
    maxPrice = parseInt(priceUSD[1]) * 1000;
  }

  return { brands: foundBrands, keywords, maxYear, minYear, maxPrice, minPrice, fuelTypes, recentOnly };
}

// Format price in user's currency
function formatPriceInCurrency(priceUsd: number | null, currency: string, rate: number): string {
  if (!priceUsd) return 'Prix non disponible';

  if (currency === 'USD') {
    return `${priceUsd.toLocaleString('fr-FR')} USD`;
  }

  const convertedPrice = Math.round(priceUsd * rate);
  return `${convertedPrice.toLocaleString('fr-FR')} ${currency}`;
}

// Get currency symbol/name
function getCurrencyDisplay(currency: string): string {
  const displays: Record<string, string> = {
    'USD': 'USD',
    'XAF': 'FCFA',
    'XOF': 'FCFA',
    'EUR': 'EUR',
    'GBP': 'GBP',
  };
  return displays[currency] || currency;
}

// System prompt with Driveby Africa context
const SYSTEM_PROMPT = `Tu es l'assistant virtuel de Driveby Africa, une plateforme d'importation de vehicules depuis la Coree du Sud, la Chine et Dubai vers l'Afrique (principalement Gabon, Cameroun, Senegal, Cote d'Ivoire).

INFORMATIONS CLE SUR DRIVEBY AFRICA:

1. PROCESSUS D'ACHAT (13 étapes):
- Etape 1: L'utilisateur choisit un vehicule et demande un devis
- Etape 2: Paiement d'un acompte de 1000 USD (600 000 FCFA) pour bloquer le vehicule
- Etape 3: Inspection detaillee du vehicule avec rapport envoye au client
- Etape 4: Si satisfait, paiement du solde
- Etape 5-13: Expedition et livraison au port de destination (préparation, chargement, transit, dédouanement, livraison)

2. DELAIS DE LIVRAISON:
- Coree du Sud: 4-6 semaines
- Chine: 6-8 semaines
- Dubai: 3-5 semaines

3. MODES DE PAIEMENT:
- Carte bancaire (Visa, Mastercard) via Stripe
- Mobile Money (Airtel, MTN, Orange)
- Cash en agence (Hong Kong)

4. GARANTIES:
- Remboursement integral si le rapport d'inspection ne satisfait pas le client
- Possibilite de choisir un autre vehicule
- Suivi en temps reel de l'expedition

5. CONTACT:
- WhatsApp: +241 77 00 00 00
- Email: contact@drivebyafrica.com
- Horaires: Lun-Ven 8h-18h, Sam 9h-14h

REGLES DE REPONSE:
- Reponds toujours en francais
- Sois concis et utile (max 2-3 paragraphes)
- Si la question concerne un vehicule specifique, utilise les donnees fournies dans VEHICULES TROUVES
- Si aucun vehicule n'est trouve pour la marque demandee, dis clairement que tu n'as pas trouve ce modele et propose des alternatives disponibles
- Si tu ne peux pas repondre, suggere de demander l'aide d'un agent humain en cliquant sur le bouton "Parler à un agent"
- Ne jamais inventer de prix ou specifications de vehicules - utilise UNIQUEMENT les donnees de VEHICULES TROUVES
- Utilise un ton professionnel mais amical
- Si le client demande le statut de sa commande, utilise les informations de commande fournies
- Si le client n'a pas de commande en cours, propose-lui de parcourir le catalogue

IMPORTANT - FORMAT DES LIENS ET PRIX:
- Pour les liens vers les vehicules, utilise TOUJOURS le format markdown: [Voir le vehicule](/cars/ID_DU_VEHICULE)
- Exemple: [Voir la Kia K3 2016](/cars/3bcef28d-f210-4bb5-9e3a-8f185f08ee46)
- Les prix sont deja convertis dans la devise du client - affiche-les tels quels
- N'ajoute PAS de lien externe (https://www.drivebyafrica.com), utilise uniquement /cars/ID

REGLES POUR LES SUGGESTIONS DE VEHICULES:
- Propose MAXIMUM 3 vehicules par reponse
- Pour chaque vehicule propose, inclus: marque, modele, annee, prix et un lien cliquable
- Format recommande:
  1. **Marque Modele Annee** - Prix
     [Voir ce vehicule](/cars/ID)
- Si le client demande des filtres (moins de X ans, electrique, etc.), applique-les dans tes suggestions
- Si plus de 3 vehicules correspondent, mentionne le nombre total disponible

SUIVI DE COMMANDE:
- Quand le client demande le statut de sa commande, donne des informations DETAILLEES:
  - Etape actuelle et signification (ex: "En transit maritime" = le vehicule est sur le bateau)
  - Prochaines etapes a venir
  - Estimation du delai restant si possible
- Si le client a une commande, propose toujours de l'aider a suivre son avancement`;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, userMessage, currency, exchangeRate } = body;

    // Currency settings from frontend (default to XAF)
    const userCurrency = currency || 'XAF';
    const userExchangeRate = exchangeRate || 615; // Default XAF rate

    if (!conversationId || !userMessage) {
      return NextResponse.json(
        { error: 'conversationId et userMessage requis' },
        { status: 400 }
      );
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, country, phone')
      .eq('id', user.id)
      .single();

    // Fetch user's recent orders with detailed tracking info
    const { data: orders } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        vehicle_make,
        vehicle_model,
        vehicle_year,
        vehicle_price_usd,
        destination_country,
        destination_name,
        destination_port,
        deposit_amount_usd,
        deposit_amount_xaf,
        deposit_paid_at,
        balance_amount_xaf,
        balance_paid_at,
        shipping_method,
        shipping_eta,
        tracking_number,
        tracking_url,
        estimated_arrival,
        created_at,
        updated_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Fetch user's recent quotes
    const { data: quotes } = await supabase
      .from('quotes')
      .select(`
        id,
        quote_number,
        status,
        vehicle_make,
        vehicle_model,
        vehicle_year,
        vehicle_price_usd,
        total_cost_xaf,
        destination_country,
        valid_until,
        created_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Fetch recent conversation history for context
    const { data: recentMessages } = await supabase
      .from('chat_messages')
      .select('content, sender_type')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Extract filters from user message
    const filters = extractFiltersFromMessage(userMessage);
    const { brands, keywords, minYear, maxYear, maxPrice, fuelTypes, recentOnly } = filters;

    // Smart vehicle search with filters
    let vehicles: {
      id: string;
      make: string | null;
      model: string | null;
      year: number | null;
      start_price_usd: number | null;
      mileage: number | null;
      fuel_type: string | null;
      transmission: string | null;
      source: string | null;
    }[] = [];

    // Build base query with start_price_usd (display price)
    let query = supabase
      .from('vehicles')
      .select('id, make, model, year, start_price_usd, mileage, fuel_type, transmission, source')
      .eq('is_visible', true);

    // Apply year filter
    if (minYear) {
      query = query.gte('year', minYear);
    }
    if (maxYear) {
      query = query.lte('year', maxYear);
    }

    // Apply price filter (approximate - will filter more precisely after)
    if (maxPrice) {
      query = query.lte('start_price_usd', maxPrice + 1000); // Add buffer for export tax
    }

    // Apply fuel type filter
    if (fuelTypes.length > 0) {
      const fuelConditions = fuelTypes.map(ft => `fuel_type.ilike.%${ft}%`).join(',');
      query = query.or(fuelConditions);
    }

    // Apply brand/model search
    if (brands.length > 0 || keywords.length > 0) {
      const searchConditions: string[] = [];
      for (const brand of brands) {
        searchConditions.push(`make.ilike.%${brand}%`);
      }
      for (const keyword of keywords) {
        searchConditions.push(`model.ilike.%${keyword}%`);
      }
      if (searchConditions.length > 0) {
        // Need to apply OR conditions separately
        const { data: searchResults } = await query
          .or(searchConditions.join(','))
          .order('year', { ascending: false })
          .limit(20);

        if (searchResults) {
          vehicles = searchResults;
        }
      }
    } else {
      // No specific brand search - get recent vehicles
      const { data: generalVehicles } = await query
        .order('year', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(15);

      if (generalVehicles) {
        vehicles = generalVehicles;
      }
    }

    // Post-filter for exact price with export tax
    if (maxPrice && vehicles.length > 0) {
      vehicles = vehicles.filter(v => {
        if (!v.start_price_usd) return false;
        const displayPrice = v.start_price_usd + getExportTax(v.source);
        return displayPrice <= maxPrice;
      });
    }

    // If no results from filtered search, get some suggestions
    if (vehicles.length === 0 && (brands.length > 0 || keywords.length > 0 || recentOnly)) {
      const { data: suggestionVehicles } = await supabase
        .from('vehicles')
        .select('id, make, model, year, start_price_usd, mileage, fuel_type, transmission, source')
        .eq('is_visible', true)
        .order('year', { ascending: false })
        .limit(10);

      if (suggestionVehicles) {
        vehicles = suggestionVehicles;
      }
    }

    // Get available brands for suggestions
    const { data: availableBrands } = await supabase
      .from('vehicles')
      .select('make')
      .eq('is_visible', true)
      .not('make', 'is', null);

    const uniqueBrands = [...new Set(availableBrands?.map(v => v.make).filter(Boolean) || [])];

    // Build customer context
    let customerContext = '\n\nINFORMATIONS CLIENT:';
    customerContext += `\nNom: ${profile?.full_name || 'Non renseigné'}`;
    customerContext += `\nPays: ${profile?.country || 'Non renseigné'}`;

    // Build orders context with detailed tracking
    let ordersContext = '';
    if (orders && orders.length > 0) {
      ordersContext = '\n\nCOMMANDES DU CLIENT:';
      orders.forEach(order => {
        const statusFr = ORDER_STATUS_FR[order.status] || order.status;
        ordersContext += `\n\n📦 Commande ${order.order_number || 'N/A'}: ${order.vehicle_make || ''} ${order.vehicle_model || ''} ${order.vehicle_year || ''}`;
        ordersContext += `\n  ➤ Statut actuel: ${statusFr}`;
        ordersContext += `\n  ➤ Destination: ${order.destination_name || ''}, ${order.destination_country || ''}`;
        ordersContext += `\n  ➤ Prix vehicule: ${order.vehicle_price_usd?.toLocaleString() || 'N/A'} USD`;

        // Add payment info
        if (order.deposit_amount_usd) {
          ordersContext += `\n  ➤ Acompte paye: ${order.deposit_amount_usd.toLocaleString()} USD`;
          if (order.deposit_paid_at) {
            ordersContext += ` (le ${new Date(order.deposit_paid_at).toLocaleDateString('fr-FR')})`;
          }
        }
        if (order.balance_amount_xaf && !order.balance_paid_at) {
          ordersContext += `\n  ➤ Solde restant: ${order.balance_amount_xaf.toLocaleString()} FCFA`;
        }
        if (order.balance_paid_at) {
          ordersContext += `\n  ➤ Solde paye le: ${new Date(order.balance_paid_at).toLocaleDateString('fr-FR')}`;
        }

        // Add shipping info if available
        if (order.destination_port) {
          ordersContext += `\n  ➤ Port de destination: ${order.destination_port}`;
        }
        if (order.shipping_method) {
          ordersContext += `\n  ➤ Mode d'expedition: ${order.shipping_method}`;
        }
        if (order.tracking_number) {
          ordersContext += `\n  ➤ Numero de suivi: ${order.tracking_number}`;
        }

        // Add dates
        ordersContext += `\n  ➤ Date de commande: ${new Date(order.created_at).toLocaleDateString('fr-FR')}`;
        const arrivalDate = order.shipping_eta || order.estimated_arrival;
        if (arrivalDate) {
          ordersContext += `\n  ➤ Arrivee estimee: ${new Date(arrivalDate).toLocaleDateString('fr-FR')}`;
        }

        // Add next steps based on status
        const nextSteps: Record<string, string> = {
          'pending_deposit': 'Prochaine etape: Payer l\'acompte de 1000 USD pour bloquer le vehicule',
          'deposit_paid': 'Prochaine etape: Inspection du vehicule en cours (1-3 jours)',
          'inspection_in_progress': 'Prochaine etape: Reception du rapport d\'inspection',
          'inspection_completed': 'Prochaine etape: Payer le solde pour lancer l\'expedition',
          'pending_balance': 'Prochaine etape: Payer le solde restant',
          'balance_paid': 'Prochaine etape: Preparation du vehicule pour l\'expedition',
          'shipping_preparation': 'Prochaine etape: Chargement sur le navire',
          'shipped': 'Prochaine etape: Arrivee au port de destination',
          'in_transit': 'Prochaine etape: Arrivee au port et dedouanement',
          'customs_clearance': 'Prochaine etape: Recuperation du vehicule',
          'ready_for_pickup': 'Prochaine etape: Recuperer le vehicule au point de livraison',
          'delivered': 'Commande terminee - Vehicule livre',
          'cancelled': 'Commande annulee',
        };
        if (nextSteps[order.status]) {
          ordersContext += `\n  💡 ${nextSteps[order.status]}`;
        }
      });
    } else {
      ordersContext = '\n\nCOMMANDES DU CLIENT: Aucune commande en cours.';
    }

    // Build quotes context
    let quotesContext = '';
    if (quotes && quotes.length > 0) {
      quotesContext = '\n\nDEVIS DU CLIENT:';
      quotes.forEach(quote => {
        const isExpired = new Date(quote.valid_until) < new Date();
        const statusText = quote.status === 'accepted' ? 'Accepté' :
                          quote.status === 'expired' || isExpired ? 'Expiré' :
                          quote.status === 'cancelled' ? 'Annulé' : 'En attente';
        quotesContext += `\n- Devis ${quote.quote_number}: ${quote.vehicle_make} ${quote.vehicle_model} ${quote.vehicle_year}`;
        quotesContext += `\n  Statut: ${statusText}`;
        quotesContext += `\n  Destination: ${quote.destination_country}`;
        quotesContext += `\n  Total: ${quote.total_cost_xaf?.toLocaleString()} FCFA`;
        quotesContext += `\n  Valide jusqu'au: ${new Date(quote.valid_until).toLocaleDateString('fr-FR')}`;
      });
    }

    // Build vehicle context with search info and converted prices
    let vehicleContext = '';
    const searchedBrandsText = brands.length > 0 ? brands.join(', ') : '';
    const searchedKeywordsText = keywords.length > 0 ? keywords.join(', ') : '';
    const currencyDisplay = getCurrencyDisplay(userCurrency);

    // Add currency info for the AI
    vehicleContext = `\n\nDEVISE CLIENT: ${currencyDisplay}`;

    if (brands.length > 0 || keywords.length > 0) {
      vehicleContext += `\n\nRECHERCHE EFFECTUEE:`;
      if (searchedBrandsText) vehicleContext += `\n- Marques recherchees: ${searchedBrandsText}`;
      if (searchedKeywordsText) vehicleContext += `\n- Mots-cles recherches: ${searchedKeywordsText}`;
    }

    if (vehicles && vehicles.length > 0) {
      // Separate found vehicles by whether they match the search
      const matchingVehicles = vehicles.filter(v => {
        const makeModel = `${v.make || ''} ${v.model || ''}`.toLowerCase();
        return brands.some(b => makeModel.includes(b)) || keywords.some(k => makeModel.includes(k));
      });

      const otherVehicles = vehicles.filter(v => {
        const makeModel = `${v.make || ''} ${v.model || ''}`.toLowerCase();
        return !brands.some(b => makeModel.includes(b)) && !keywords.some(k => makeModel.includes(k));
      });

      // Helper to calculate display price (start_price_usd + export tax)
      const getDisplayPrice = (v: { start_price_usd: number | null; source: string | null }): number | null => {
        if (!v.start_price_usd) return null;
        return v.start_price_usd + getExportTax(v.source);
      };

      // Helper to get origin name
      const getOriginName = (source: string | null): string => {
        if (!source) return 'N/A';
        const sourceMap: Record<string, string> = {
          'che168': 'Chine',
          'dongchedi': 'Chine',
          'encar': 'Corée du Sud',
          'dubai': 'Dubaï',
        };
        return sourceMap[source.toLowerCase()] || source;
      };

      if (matchingVehicles.length > 0) {
        // Limit to 3 results maximum
        const topMatches = matchingVehicles.slice(0, 3);
        vehicleContext += `\n\nVEHICULES TROUVES (${Math.min(matchingVehicles.length, 3)} sur ${matchingVehicles.length} resultats):`;
        topMatches.forEach(v => {
          const displayPrice = getDisplayPrice(v);
          const formattedPrice = formatPriceInCurrency(displayPrice, userCurrency, userExchangeRate);
          vehicleContext += `\n- ${v.make} ${v.model} ${v.year}`;
          vehicleContext += `\n  ID: ${v.id}`;
          vehicleContext += `\n  Prix: ${formattedPrice}`;
          vehicleContext += `\n  Kilometrage: ${v.mileage?.toLocaleString() || 'N/A'} km`;
          vehicleContext += `\n  Carburant: ${v.fuel_type || 'N/A'} | Transmission: ${v.transmission || 'N/A'}`;
          vehicleContext += `\n  Origine: ${getOriginName(v.source)}`;
          vehicleContext += `\n  Lien: /cars/${v.id}`;
        });
        if (matchingVehicles.length > 3) {
          vehicleContext += `\n\n(${matchingVehicles.length - 3} autres vehicules disponibles dans cette categorie)`;
        }
      } else if (brands.length > 0 || keywords.length > 0) {
        vehicleContext += `\n\nAUCUN VEHICULE TROUVE pour "${searchedBrandsText || searchedKeywordsText}".`;
      }

      if (otherVehicles.length > 0 && matchingVehicles.length === 0) {
        // Only show suggestions if no matching vehicles found - limit to 3
        vehicleContext += `\n\nAUTRES VEHICULES DISPONIBLES (suggestions):`;
        otherVehicles.slice(0, 3).forEach(v => {
          const displayPrice = getDisplayPrice(v);
          const formattedPrice = formatPriceInCurrency(displayPrice, userCurrency, userExchangeRate);
          vehicleContext += `\n- ${v.make} ${v.model} ${v.year} | ${formattedPrice} | ${v.mileage?.toLocaleString() || 'N/A'} km`;
          vehicleContext += `\n  Lien: /cars/${v.id}`;
        });
      }
    } else if (brands.length > 0 || keywords.length > 0) {
      vehicleContext += `\n\nAUCUN VEHICULE TROUVE pour "${searchedBrandsText || searchedKeywordsText}".`;
    }

    // Add available brands info
    if (uniqueBrands.length > 0) {
      vehicleContext += `\n\nMARQUES DISPONIBLES DANS LE CATALOGUE: ${uniqueBrands.slice(0, 20).join(', ')}${uniqueBrands.length > 20 ? '...' : ''}`;
    }

    // Combine all context
    const fullContext = SYSTEM_PROMPT + customerContext + ordersContext + quotesContext + vehicleContext;

    // Build conversation history for Claude
    const conversationHistory = recentMessages
      ?.reverse()
      .map(msg => ({
        role: msg.sender_type === 'user' ? 'user' : 'assistant',
        content: msg.content,
      }))
      .filter(msg => msg.content) || [];

    // Add current user message
    conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      // Fallback response without AI
      const fallbackResponse = generateFallbackResponse(userMessage, orders || [], quotes || []);

      const { data: botMessage, error: insertError } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'bot',
          content: fallbackResponse,
          metadata: { type: 'fallback' },
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return NextResponse.json({ message: botMessage });
    }

    // Call OpenAI GPT-4o API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cost-effective model, can use 'gpt-4o' for better quality
      max_tokens: 600,
      messages: [
        { role: 'system', content: fullContext },
        ...conversationHistory.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      ],
    });

    const aiResponse = response.choices[0]?.message?.content
      || "Je n'ai pas pu generer une reponse. Veuillez reessayer.";

    // Save bot response to database
    const { data: botMessage, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'bot',
        content: aiResponse,
        metadata: { type: 'ai_response' },
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ message: botMessage });
  } catch (error) {
    console.error('Chat AI error:', error);

    // Return a helpful error message
    return NextResponse.json(
      {
        error: 'Erreur lors de la generation de la reponse',
        fallbackMessage: "Je rencontre des difficultes techniques. Vous pouvez demander l'aide d'un agent en cliquant sur le bouton 'Parler à un agent', ou nous contacter directement via WhatsApp au +241 77 00 00 00."
      },
      { status: 500 }
    );
  }
}

// Order type for fallback function
interface OrderData {
  order_number: string | null;
  status: string;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
}

interface QuoteData {
  quote_number: string | null;
  status: string;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  valid_until: string;
}

// Fallback response generator when AI is not available
function generateFallbackResponse(userMessage: string, orders: OrderData[], quotes: QuoteData[]): string {
  const message = userMessage.toLowerCase();

  // Check for order status queries
  if (message.includes('commande') || message.includes('statut') || message.includes('suivi') || message.includes('où en est')) {
    if (orders.length > 0) {
      const latestOrder = orders[0];
      const statusFr = ORDER_STATUS_FR[latestOrder.status] || latestOrder.status;
      const vehicleInfo = [latestOrder.vehicle_make, latestOrder.vehicle_model, latestOrder.vehicle_year].filter(Boolean).join(' ');
      return `Votre commande ${latestOrder.order_number || ''} pour le ${vehicleInfo || 'véhicule'} est actuellement au statut: ${statusFr}.\n\nPour plus de détails sur votre commande, vous pouvez consulter votre espace personnel ou demander l'aide d'un agent.`;
    }
    return "Je ne trouve pas de commande en cours sur votre compte. Si vous avez récemment passé commande, veuillez patienter quelques minutes ou demander l'aide d'un agent.";
  }

  // Check for quote queries
  if (message.includes('devis')) {
    if (quotes.length > 0) {
      const latestQuote = quotes[0];
      const isExpired = new Date(latestQuote.valid_until) < new Date();
      if (latestQuote.status === 'pending' && !isExpired) {
        const vehicleInfo = [latestQuote.vehicle_make, latestQuote.vehicle_model, latestQuote.vehicle_year].filter(Boolean).join(' ');
        return `Vous avez un devis en attente (${latestQuote.quote_number || ''}) pour le ${vehicleInfo || 'véhicule'}. Ce devis est valide jusqu'au ${new Date(latestQuote.valid_until).toLocaleDateString('fr-FR')}.\n\nPour accepter ce devis et procéder au paiement de l'acompte, rendez-vous dans votre espace personnel.`;
      }
    }
    return "Pour obtenir un devis, sélectionnez un véhicule dans notre catalogue et cliquez sur 'Demander un devis'. Vous recevrez une estimation détaillée incluant le prix du véhicule, le transport et l'assurance.";
  }

  if (message.includes('prix') || message.includes('cout') || message.includes('combien')) {
    return "Les prix de nos vehicules varient selon le modele, l'annee et l'origine. Pour obtenir un devis precis, selectionnez un vehicule dans notre catalogue et cliquez sur 'Demander un devis'. L'acompte pour bloquer un vehicule est de 1000 USD (600 000 FCFA).";
  }

  if (message.includes('delai') || message.includes('livraison') || message.includes('temps')) {
    return "Les delais de livraison dependent de l'origine du vehicule:\n- Coree du Sud: 4-6 semaines\n- Chine: 6-8 semaines\n- Dubai: 3-5 semaines\n\nCes delais incluent l'inspection, le chargement et le transport maritime.";
  }

  if (message.includes('paiement') || message.includes('payer')) {
    return "Nous acceptons plusieurs modes de paiement:\n- Carte bancaire (Visa, Mastercard)\n- Mobile Money (Airtel, MTN, Orange)\n- Cash en agence (Hong Kong)\n\nL'acompte de 1000 USD peut etre paye par l'un de ces moyens.";
  }

  if (message.includes('garantie') || message.includes('remboursement')) {
    return "Votre acompte est securise! Si le rapport d'inspection ne vous satisfait pas, vous avez deux options:\n1. Choisir un autre vehicule\n2. Demander un remboursement integral\n\nNous nous engageons a votre satisfaction.";
  }

  if (message.includes('inspection') || message.includes('rapport')) {
    return "Apres le paiement de l'acompte, nos experts effectuent une inspection detaillee du vehicule. Le rapport comprend:\n- Photos HD du vehicule\n- Verification mecanique complete\n- Historique du vehicule\n- Etat de la carrosserie\n\nVous recevez ce rapport avant de payer le solde.";
  }

  if (message.includes('bonjour') || message.includes('salut') || message.includes('hello')) {
    return "Bonjour! Je suis l'assistant virtuel de Driveby Africa. Comment puis-je vous aider aujourd'hui? Je peux repondre a vos questions sur nos vehicules, le processus d'achat, les prix, les delais de livraison ou le statut de vos commandes.";
  }

  if (message.includes('agent') || message.includes('humain') || message.includes('personne')) {
    return "Pour parler à un agent Driveby Africa, cliquez sur le bouton 'Parler à un agent' ci-dessous. Un membre de notre équipe vous répondra dans les plus brefs délais pendant nos heures d'ouverture (Lun-Ven 8h-18h, Sam 9h-14h).";
  }

  return "Merci pour votre message. Je peux vous aider avec:\n- Le statut de vos commandes\n- Vos devis en cours\n- Les prix et délais de livraison\n- Le processus d'achat\n\nSi vous avez besoin d'une assistance personnalisée, cliquez sur 'Parler à un agent'.";
}
