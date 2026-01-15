import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// System prompt with Driveby Africa context
const SYSTEM_PROMPT = `Tu es l'assistant virtuel de Driveby Africa, une plateforme d'importation de vehicules depuis la Coree du Sud, la Chine et Dubai vers l'Afrique (principalement Gabon, Cameroun, Senegal, Cote d'Ivoire).

INFORMATIONS CLE SUR DRIVEBY AFRICA:

1. PROCESSUS D'ACHAT:
- Etape 1: L'utilisateur choisit un vehicule et demande un devis
- Etape 2: Paiement d'un acompte de 1000 USD (600 000 FCFA) pour bloquer le vehicule
- Etape 3: Inspection detaillee du vehicule avec rapport envoye au client
- Etape 4: Si satisfait, paiement du solde
- Etape 5: Expedition et livraison au port de destination

2. DELAIS DE LIVRAISON:
- Coree du Sud: 4-6 semaines
- Chine: 6-8 semaines
- Dubai: 3-5 semaines

3. MODES DE PAIEMENT:
- Carte bancaire (Visa, Mastercard) via Stripe
- Mobile Money (Airtel, MTN, Orange)
- Cash en agence (Libreville, Douala, Dakar)

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
- Si la question concerne un vehicule specifique, utilise les donnees fournies
- Si tu ne peux pas repondre, suggere de demander l'aide d'un agent humain
- Ne jamais inventer de prix ou specifications de vehicules
- Utilise un ton professionnel mais amical`;

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

    // Fetch recent conversation history for context
    const { data: recentMessages } = await supabase
      .from('chat_messages')
      .select('content, sender_type')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch some vehicle data for context
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id, make, model, year, current_price_usd, mileage, fuel_type, transmission, source')
      .or('status.eq.available,status.is.null')
      .limit(20);

    // Build vehicle context
    let vehicleContext = '';
    if (vehicles && vehicles.length > 0) {
      vehicleContext = `\n\nVEHICULES DISPONIBLES (echantillon):
${vehicles.map(v => `- ${v.make} ${v.model} ${v.year}, ${v.mileage?.toLocaleString() || 'N/A'} km, ${v.current_price_usd?.toLocaleString() || 'N/A'} USD, ${v.fuel_type || 'N/A'}, ${v.transmission || 'N/A'}, origine: ${v.source || 'N/A'}`).join('\n')}`;
    }

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

    // Check if Anthropic API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      // Fallback response without AI
      const fallbackResponse = generateFallbackResponse(userMessage);

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

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      system: SYSTEM_PROMPT + vehicleContext,
      messages: conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    });

    const aiResponse = response.content[0].type === 'text'
      ? response.content[0].text
      : "Je n'ai pas pu generer une reponse. Veuillez reessayer.";

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
        fallbackMessage: "Je rencontre des difficultes techniques. Vous pouvez demander l'aide d'un agent en cliquant sur le bouton ci-dessous, ou nous contacter directement via WhatsApp au +241 77 00 00 00."
      },
      { status: 500 }
    );
  }
}

// Fallback response generator when AI is not available
function generateFallbackResponse(userMessage: string): string {
  const message = userMessage.toLowerCase();

  if (message.includes('prix') || message.includes('cout') || message.includes('combien')) {
    return "Les prix de nos vehicules varient selon le modele, l'annee et l'origine. Pour obtenir un devis precis, selectionnez un vehicule dans notre catalogue et cliquez sur 'Demander un devis'. L'acompte pour bloquer un vehicule est de 1000 USD (600 000 FCFA).";
  }

  if (message.includes('delai') || message.includes('livraison') || message.includes('temps')) {
    return "Les delais de livraison dependent de l'origine du vehicule:\n- Coree du Sud: 4-6 semaines\n- Chine: 6-8 semaines\n- Dubai: 3-5 semaines\n\nCes delais incluent l'inspection, le chargement et le transport maritime.";
  }

  if (message.includes('paiement') || message.includes('payer')) {
    return "Nous acceptons plusieurs modes de paiement:\n- Carte bancaire (Visa, Mastercard)\n- Mobile Money (Airtel, MTN, Orange)\n- Cash en agence (Libreville, Douala, Dakar)\n\nL'acompte de 1000 USD peut etre paye par l'un de ces moyens.";
  }

  if (message.includes('garantie') || message.includes('remboursement')) {
    return "Votre acompte est securise! Si le rapport d'inspection ne vous satisfait pas, vous avez deux options:\n1. Choisir un autre vehicule\n2. Demander un remboursement integral\n\nNous nous engageons a votre satisfaction.";
  }

  if (message.includes('inspection') || message.includes('rapport')) {
    return "Apres le paiement de l'acompte, nos experts effectuent une inspection detaillee du vehicule. Le rapport comprend:\n- Photos HD du vehicule\n- Verification mecanique complete\n- Historique du vehicule\n- Etat de la carrosserie\n\nVous recevez ce rapport avant de payer le solde.";
  }

  if (message.includes('bonjour') || message.includes('salut') || message.includes('hello')) {
    return "Bonjour! Je suis l'assistant virtuel de Driveby Africa. Comment puis-je vous aider aujourd'hui? Je peux repondre a vos questions sur nos vehicules, le processus d'achat, les prix ou les delais de livraison.";
  }

  return "Merci pour votre message. Pour une reponse plus precise, vous pouvez:\n- Explorer notre catalogue de vehicules\n- Demander l'aide d'un agent humain\n- Nous contacter sur WhatsApp: +241 77 00 00 00\n\nComment puis-je vous aider?";
}
