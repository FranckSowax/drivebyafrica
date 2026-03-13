import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth/admin-check';
import { sendTextMessage, sendInteractiveMessage, formatPhoneForMeta } from '@/lib/whatsapp/meta-client';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://driveby-africa.com';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Per-status WhatsApp message templates
const STATUS_TEMPLATES: Record<string, (data: {
  name: string;
  vehicle: string;
  orderNumber: string;
  eta?: string;
  note?: string;
}) => string> = {
  deposit_paid: ({ name, vehicle, orderNumber }) =>
    `🎉 Bonjour *${name}*,\n\nNous avons bien reçu votre acompte pour la commande *#${orderNumber}*.\n\n🚗 Véhicule : *${vehicle}*\n✅ Votre véhicule est maintenant réservé.\n\nNous allons maintenant procéder aux étapes suivantes et vous tiendrons informé à chaque étape.\n\n_Driveby Africa - Votre partenaire import_`,

  vehicle_locked: ({ name, vehicle, orderNumber }) =>
    `🔒 Bonjour *${name}*,\n\nBonne nouvelle ! Votre *${vehicle}* est officiellement bloqué pour la commande *#${orderNumber}*.\n\nNous procédons maintenant à l'inspection du véhicule.\n\n_Driveby Africa - Votre partenaire import_`,

  inspection_sent: ({ name, vehicle, orderNumber }) =>
    `🔍 Bonjour *${name}*,\n\nL'inspection de votre *${vehicle}* (commande *#${orderNumber}*) est en cours.\n\nVous recevrez le rapport d'inspection très prochainement.\n\n_Driveby Africa - Votre partenaire import_`,

  full_payment_received: ({ name, vehicle, orderNumber }) =>
    `💰 Bonjour *${name}*,\n\nNous avons bien reçu le paiement complet pour votre commande *#${orderNumber}*.\n\n🚗 Véhicule : *${vehicle}*\n\nL'achat est maintenant confirmé. Nous passons à l'étape d'acquisition.\n\n_Driveby Africa - Votre partenaire import_`,

  vehicle_purchased: ({ name, vehicle, orderNumber }) =>
    `✅ Bonjour *${name}*,\n\nExcellente nouvelle ! Votre *${vehicle}* a été officiellement acheté (commande *#${orderNumber}*).\n\nNous organisons maintenant la logistique d'expédition vers l'Afrique.\n\n_Driveby Africa - Votre partenaire import_`,

  vehicle_received: ({ name, vehicle, orderNumber }) =>
    `📦 Bonjour *${name}*,\n\nVotre *${vehicle}* est arrivé dans notre entrepôt (commande *#${orderNumber}*).\n\nNous préparons maintenant les formalités douanières d'export.\n\n_Driveby Africa - Votre partenaire import_`,

  export_customs: ({ name, vehicle, orderNumber }) =>
    `🏛️ Bonjour *${name}*,\n\nVotre *${vehicle}* est actuellement en cours de dédouanement export (commande *#${orderNumber}*).\n\nCette étape prend généralement 3 à 5 jours ouvrés.\n\n_Driveby Africa - Votre partenaire import_`,

  in_transit: ({ name, vehicle, orderNumber, eta }) =>
    `🚛 Bonjour *${name}*,\n\nVotre *${vehicle}* est en transit vers le port (commande *#${orderNumber}*).\n\n${eta ? `📅 Arrivée estimée au port : *${eta}*\n\n` : ''}Vous serez informé dès que le véhicule sera au port.\n\n_Driveby Africa - Votre partenaire import_`,

  at_port: ({ name, vehicle, orderNumber }) =>
    `⚓ Bonjour *${name}*,\n\nVotre *${vehicle}* est arrivé au port d'embarquement (commande *#${orderNumber}*).\n\nL'expédition par bateau sera prochainement organisée.\n\n_Driveby Africa - Votre partenaire import_`,

  shipping: ({ name, vehicle, orderNumber, eta }) =>
    `🚢 Bonjour *${name}*,\n\nVotre *${vehicle}* est maintenant en mer (commande *#${orderNumber}*) !\n\n${eta ? `📅 Arrivée estimée : *${eta}*\n\n` : ''}Vous pouvez suivre votre commande sur notre plateforme.\n\n_Driveby Africa - Votre partenaire import_`,

  documents_ready: ({ name, vehicle, orderNumber }) =>
    `📄 Bonjour *${name}*,\n\nLes documents de votre *${vehicle}* sont prêts (commande *#${orderNumber}*).\n\nNous vous transmettrons les documents requis pour le dédouanement à destination.\n\n_Driveby Africa - Votre partenaire import_`,

  customs: ({ name, vehicle, orderNumber }) =>
    `🏛️ Bonjour *${name}*,\n\nVotre *${vehicle}* est en cours de dédouanement à destination (commande *#${orderNumber}*).\n\nNous vous informerons dès que le véhicule sera disponible pour le retrait.\n\n_Driveby Africa - Votre partenaire import_`,

  ready_pickup: ({ name, vehicle, orderNumber }) =>
    `🎊 Bonjour *${name}*,\n\nBonne nouvelle ! Votre *${vehicle}* est prêt pour le retrait (commande *#${orderNumber}*).\n\nVeuillez nous contacter pour organiser la livraison ou le retrait.\n\n_Driveby Africa - Votre partenaire import_`,

  delivered: ({ name, vehicle, orderNumber }) =>
    `🏆 Bonjour *${name}*,\n\nFélicitations ! Votre *${vehicle}* vous a été livré avec succès (commande *#${orderNumber}*) ! 🎉\n\nMerci de votre confiance. N'hésitez pas à partager votre expérience et à nous recommander.\n\n_Driveby Africa - Votre partenaire import_`,
};

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.isAdmin) return adminCheck.response;

  const supabase = getSupabaseAdmin();

  try {
    const { orderId, quoteId, status, note, eta, customMessage } = await request.json();

    if (!status) {
      return NextResponse.json({ error: 'status requis' }, { status: 400 });
    }

    // Fetch order or quote details
    let phone = '';
    let customerName = '';
    let vehicleLabel = '';
    let orderNumber = '';

    if (orderId) {
      const { data: order } = await supabase
        .from('orders')
        .select('customer_whatsapp, customer_name, vehicle_make, vehicle_model, vehicle_year, order_number, shipping_eta')
        .eq('id', orderId)
        .single();

      if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });
      phone = order.customer_whatsapp;
      customerName = order.customer_name;
      vehicleLabel = `${order.vehicle_year} ${order.vehicle_make} ${order.vehicle_model}`;
      orderNumber = order.order_number;
    } else if (quoteId) {
      const { data: quote } = await supabase
        .from('quotes')
        .select('id, quote_number, vehicle_make, vehicle_model, vehicle_year, user_id')
        .eq('id', quoteId)
        .single();

      if (!quote) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 });

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, whatsapp_number, phone')
        .eq('id', quote.user_id)
        .single();

      phone = profile?.whatsapp_number || profile?.phone || '';
      customerName = profile?.full_name || 'Client';
      vehicleLabel = `${quote.vehicle_year} ${quote.vehicle_make} ${quote.vehicle_model}`;
      orderNumber = quote.quote_number;
    } else {
      return NextResponse.json({ error: 'orderId ou quoteId requis' }, { status: 400 });
    }

    if (!phone) {
      return NextResponse.json({ error: 'Numéro WhatsApp du client introuvable' }, { status: 400 });
    }

    // Build message
    const template = STATUS_TEMPLATES[status];
    const message = customMessage || (template
      ? template({ name: customerName, vehicle: vehicleLabel, orderNumber, eta, note })
      : `Bonjour *${customerName}*, mise à jour de votre commande *#${orderNumber}* : ${status}.`
    );

    // Try interactive with tracking link, fallback to text
    const trackingUrl = `${SITE_URL}/orders`;
    const result = await sendInteractiveMessage(
      phone,
      message,
      'Suivre ma commande',
      trackingUrl
    );

    return NextResponse.json({ success: result.success, messageId: result.messageId, error: result.error });
  } catch (error) {
    console.error('Error sending WhatsApp notification:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// GET - Return template preview for a given status
export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.isAdmin) return adminCheck.response;

  const status = request.nextUrl.searchParams.get('status');
  if (!status) return NextResponse.json({ error: 'status requis' }, { status: 400 });

  const template = STATUS_TEMPLATES[status];
  const preview = template
    ? template({ name: 'Jean Dupont', vehicle: '2024 Toyota Land Cruiser', orderNumber: 'ORD-001', eta: '15/04/2026' })
    : null;

  return NextResponse.json({ template: preview });
}
