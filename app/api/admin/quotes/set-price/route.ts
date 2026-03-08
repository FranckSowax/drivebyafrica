import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-check';
import { sendTextMessage, isConfigured } from '@/lib/whatsapp/meta-client';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://drivebyafrica.com';

/**
 * Send WhatsApp message to notify user about price via Meta Cloud API
 */
async function sendWhatsAppNotification(
  phone: string,
  customerName: string,
  vehicleMake: string,
  vehicleModel: string,
  vehicleYear: number,
  priceUsd: number,
  vehicleId: string
): Promise<boolean> {
  if (!isConfigured()) {
    console.log('Meta WhatsApp API not configured, skipping notification');
    return false;
  }

  const vehicleUrl = `${SITE_URL}/cars/${vehicleId}`;
  const message = `Bonjour ${customerName},

Nous avons le prix pour le véhicule que vous avez demandé:

*${vehicleMake} ${vehicleModel} ${vehicleYear}*
Prix FOB: *$${priceUsd.toLocaleString()}*

Consultez les détails et demandez un devis complet ici:
${vehicleUrl}

Équipe Driveby Africa`;

  const result = await sendTextMessage(phone, message);
  if (result.success) {
    console.log('WhatsApp notification sent successfully');
  } else {
    console.error('WhatsApp API error:', result.error);
  }
  return result.success;
}

/**
 * POST /api/admin/quotes/set-price
 * Set price for a price request and notify the user
 */
export async function POST(request: Request) {
  try {
    // Vérification admin obligatoire
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAdmin) {
      return adminCheck.response;
    }

    const supabase = adminCheck.supabase;
    const body = await request.json();
    const { quoteId, priceUsd, notes } = body;

    if (!quoteId || !priceUsd) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    // Get the quote with user info
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        profiles:user_id (
          full_name,
          phone,
          email
        )
      `)
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      console.error('Quote not found:', quoteError);
      return NextResponse.json({ error: 'Devis non trouvé' }, { status: 404 });
    }

    // Type assertion for new columns not yet in generated types
    const quoteData = quote as typeof quote & { quote_type?: string };

    // Check if it's a price request
    if (quoteData.quote_type !== 'price_request') {
      return NextResponse.json({ error: 'Ce devis n\'est pas une demande de prix' }, { status: 400 });
    }

    // Update the quote with the price
    const { error: updateError } = await supabase
      .from('quotes')
      .update({
        admin_price_usd: priceUsd,
        vehicle_price_usd: priceUsd,
        admin_notes: notes || null,
        status: 'price_received',
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq('id', quoteId);

    if (updateError) {
      console.error('Error updating quote:', updateError);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
    }

    // Send WhatsApp notification if phone is available
    let whatsappSent = false;
    const profile = quote.profiles as { full_name?: string; phone?: string; email?: string } | null;

    if (profile?.phone) {
      whatsappSent = await sendWhatsAppNotification(
        profile.phone,
        profile.full_name || 'Client',
        quote.vehicle_make,
        quote.vehicle_model,
        quote.vehicle_year,
        priceUsd,
        quote.vehicle_id
      );

      // Update notification_sent flag
      if (whatsappSent) {
        await supabase
          .from('quotes')
          .update({ notification_sent: true } as Record<string, unknown>)
          .eq('id', quoteId);
      }
    }

    return NextResponse.json({
      success: true,
      whatsappSent,
      message: whatsappSent
        ? 'Prix défini et notification WhatsApp envoyée'
        : 'Prix défini (notification WhatsApp non envoyée - numéro manquant ou erreur)',
    });
  } catch (error) {
    console.error('Set price error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
