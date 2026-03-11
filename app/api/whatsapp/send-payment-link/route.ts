import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { sendInteractiveMessage, sendTextMessage, isConfigured } from '@/lib/whatsapp/meta-client';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://drivebyafrica.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    // Auth: Bearer token (mobile) or cookie (web)
    const authHeader = request.headers.get('Authorization');
    let supabase;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );
    } else {
      supabase = await createClient();
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: corsHeaders });
    }

    const body = await request.json();
    const { whatsappNumber, customerName, quoteNumbers, vehiclesSummary, depositAmount, depositFormatted } = body;

    if (!whatsappNumber) {
      return NextResponse.json({ error: 'Numéro WhatsApp requis' }, { status: 400, headers: corsHeaders });
    }

    if (!isConfigured()) {
      return NextResponse.json({ error: 'WhatsApp non configuré' }, { status: 500, headers: corsHeaders });
    }

    const paymentUrl = `${SITE_URL}/dashboard/quotes`;

    const message = `Bonjour ${customerName || ''} !\n\n` +
      `Votre devis Driveby Africa est prêt pour validation.\n\n` +
      `Véhicule(s) : ${vehiclesSummary}\n` +
      `Devis : ${quoteNumbers}\n` +
      `Acompte : ${depositAmount} USD (${depositFormatted})\n\n` +
      `Pour finaliser votre commande et procéder au paiement de l'acompte, ` +
      `rendez-vous sur votre espace client.`;

    // Try interactive message with CTA button
    const result = await sendInteractiveMessage(
      whatsappNumber,
      message,
      'Payer mon acompte',
      paymentUrl
    );

    if (result.success) {
      return NextResponse.json(
        { success: true, messageId: result.messageId },
        { headers: corsHeaders }
      );
    }

    // Fallback: plain text with link
    const fallbackResult = await sendTextMessage(
      whatsappNumber,
      `${message}\n\n👉 ${paymentUrl}`
    );

    if (fallbackResult.success) {
      return NextResponse.json(
        { success: true, messageId: fallbackResult.messageId },
        { headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { error: 'Échec envoi WhatsApp', details: fallbackResult.error },
      { status: 500, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('WhatsApp payment link error:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500, headers: corsHeaders }
    );
  }
}
