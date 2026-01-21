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

// Extract brand and model keywords from user message
function extractVehicleKeywords(message: string): { brands: string[], keywords: string[] } {
  const lowerMessage = message.toLowerCase();
  const foundBrands: string[] = [];
  const keywords: string[] = [];

  // Check for brand mentions
  for (const [brand, aliases] of Object.entries(BRAND_ALIASES)) {
    for (const alias of aliases) {
      if (lowerMessage.includes(alias)) {
        if (!foundBrands.includes(brand)) {
          foundBrands.push(brand);
        }
        // Also capture the specific model/alias as keyword
        if (alias !== brand && alias.length > 2) {
          keywords.push(alias);
        }
      }
    }
  }

  // Extract potential model names (alphanumeric patterns like K3, X5, etc.)
  const modelPatterns = lowerMessage.match(/\b[a-z]?\d+[a-z]?\b/gi) || [];
  modelPatterns.forEach(pattern => {
    if (pattern.length >= 2 && !keywords.includes(pattern.toLowerCase())) {
      keywords.push(pattern.toLowerCase());
    }
  });

  return { brands: foundBrands, keywords };
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
- Quand tu proposes des vehicules, inclus le lien vers la page du vehicule: /cars/[id]`;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, userMessage } = body;

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

    // Fetch user's recent orders
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

    // Extract vehicle keywords from user message
    const { brands, keywords } = extractVehicleKeywords(userMessage);

    // Smart vehicle search based on user query
    let vehicles: {
      id: string;
      make: string | null;
      model: string | null;
      year: number | null;
      current_price_usd: number | null;
      mileage: number | null;
      fuel_type: string | null;
      transmission: string | null;
      source: string | null;
    }[] = [];

    // If user mentions specific brands or models, search for them
    if (brands.length > 0 || keywords.length > 0) {
      // Build search conditions
      const searchConditions: string[] = [];

      // Add brand searches (case-insensitive)
      for (const brand of brands) {
        searchConditions.push(`make.ilike.%${brand}%`);
      }

      // Add keyword searches in model
      for (const keyword of keywords) {
        searchConditions.push(`model.ilike.%${keyword}%`);
      }

      // Search with OR conditions
      if (searchConditions.length > 0) {
        const { data: searchResults } = await supabase
          .from('vehicles')
          .select('id, make, model, year, current_price_usd, mileage, fuel_type, transmission, source')
          .eq('is_visible', true)
          .or(searchConditions.join(','))
          .order('created_at', { ascending: false })
          .limit(15);

        if (searchResults && searchResults.length > 0) {
          vehicles = searchResults;
        }
      }
    }

    // If no specific search or no results, also fetch some popular/recent vehicles
    if (vehicles.length < 5) {
      const { data: generalVehicles } = await supabase
        .from('vehicles')
        .select('id, make, model, year, current_price_usd, mileage, fuel_type, transmission, source')
        .eq('is_visible', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (generalVehicles) {
        // Add general vehicles that are not already in results
        const existingIds = new Set(vehicles.map(v => v.id));
        for (const v of generalVehicles) {
          if (!existingIds.has(v.id)) {
            vehicles.push(v);
          }
        }
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

    // Build orders context
    let ordersContext = '';
    if (orders && orders.length > 0) {
      ordersContext = '\n\nCOMMANDES DU CLIENT:';
      orders.forEach(order => {
        const statusFr = ORDER_STATUS_FR[order.status] || order.status;
        ordersContext += `\n- Commande ${order.order_number}: ${order.vehicle_make} ${order.vehicle_model} ${order.vehicle_year}`;
        ordersContext += `\n  Statut: ${statusFr}`;
        ordersContext += `\n  Destination: ${order.destination_name}, ${order.destination_country}`;
        ordersContext += `\n  Prix: ${order.vehicle_price_usd?.toLocaleString()} USD`;
        ordersContext += `\n  Date: ${new Date(order.created_at).toLocaleDateString('fr-FR')}`;
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

    // Build vehicle context with search info
    let vehicleContext = '';
    const searchedBrandsText = brands.length > 0 ? brands.join(', ') : '';
    const searchedKeywordsText = keywords.length > 0 ? keywords.join(', ') : '';

    if (brands.length > 0 || keywords.length > 0) {
      vehicleContext = `\n\nRECHERCHE EFFECTUEE:`;
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

      if (matchingVehicles.length > 0) {
        vehicleContext += `\n\nVEHICULES TROUVES CORRESPONDANT A LA RECHERCHE (${matchingVehicles.length} resultats):`;
        matchingVehicles.forEach(v => {
          vehicleContext += `\n- ID: ${v.id} | ${v.make} ${v.model} ${v.year} | ${v.mileage?.toLocaleString() || 'N/A'} km | ${v.current_price_usd?.toLocaleString() || 'N/A'} USD | ${v.fuel_type || 'N/A'} | ${v.transmission || 'N/A'} | Origine: ${v.source || 'N/A'}`;
        });
      } else if (brands.length > 0 || keywords.length > 0) {
        vehicleContext += `\n\nAUCUN VEHICULE TROUVE pour "${searchedBrandsText || searchedKeywordsText}".`;
      }

      if (otherVehicles.length > 0) {
        vehicleContext += `\n\nAUTRES VEHICULES DISPONIBLES (suggestions):`;
        otherVehicles.slice(0, 5).forEach(v => {
          vehicleContext += `\n- ID: ${v.id} | ${v.make} ${v.model} ${v.year} | ${v.mileage?.toLocaleString() || 'N/A'} km | ${v.current_price_usd?.toLocaleString() || 'N/A'} USD | ${v.fuel_type || 'N/A'} | Origine: ${v.source || 'N/A'}`;
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
