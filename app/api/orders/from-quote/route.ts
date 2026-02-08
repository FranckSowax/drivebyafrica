import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * POST /api/orders/from-quote
 * Creates an order from a validated quote (demo payment simulation).
 * Handles: quote status update, order creation, tracking, vehicle reservation.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { quoteId } = body;

    if (!quoteId) {
      return NextResponse.json({ error: 'quoteId requis' }, { status: 400 });
    }

    // Fetch the quote and verify ownership
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .eq('user_id', user.id)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 });
    }

    if (quote.status !== 'pending') {
      return NextResponse.json({ error: 'Ce devis a déjà été traité' }, { status: 400 });
    }

    // 1. Update quote status to 'accepted'
    const { error: updateError } = await supabase
      .from('quotes')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', quoteId);

    if (updateError) {
      console.error('[FromQuote] Failed to update quote:', updateError);
      return NextResponse.json({ error: 'Erreur mise à jour devis' }, { status: 500 });
    }

    // 2. Create order
    const orderNumber = quote.quote_number
      ? `ORD-${quote.quote_number.replace(/^(DBA-|QT-)/i, '')}`
      : `ORD-${Date.now().toString(36).toUpperCase()}`;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        vehicle_id: quote.vehicle_id,
        quote_id: quote.id,
        order_number: orderNumber,
        vehicle_make: quote.vehicle_make,
        vehicle_model: quote.vehicle_model,
        vehicle_year: quote.vehicle_year,
        vehicle_price_usd: quote.vehicle_price_usd,
        vehicle_source: quote.vehicle_source,
        destination_country: quote.destination_country,
        destination_name: quote.destination_name,
        destination_id: quote.destination_id,
        destination_port: quote.destination_name || null,
        shipping_method: 'container_20ft',
        shipping_type: quote.shipping_type || 'container',
        container_type: 'shared',
        shipping_cost_xaf: quote.shipping_cost_xaf,
        insurance_cost_xaf: quote.insurance_cost_xaf,
        inspection_fee_xaf: quote.inspection_fee_xaf,
        total_cost_xaf: quote.total_cost_xaf,
        deposit_amount_usd: 1000,
        deposit_amount_xaf: 600000,
        deposit_paid_at: new Date().toISOString(),
        deposit_payment_method: 'demo',
        customer_name: user.user_metadata?.full_name || user.email,
        customer_email: user.email,
        status: 'vehicle_locked',
        documents: {},
      })
      .select()
      .single();

    if (orderError) {
      console.error('[FromQuote] Failed to create order:', orderError);
      // Revert quote status
      await supabase
        .from('quotes')
        .update({ status: 'pending' })
        .eq('id', quoteId);
      return NextResponse.json({ error: 'Erreur création commande' }, { status: 500 });
    }

    // 3. Create order_tracking record (use admin to bypass RLS)
    await (supabaseAdmin.from('order_tracking') as any).insert({
      order_id: order.id,
      status: 'vehicle_locked',
      title: 'Véhicule bloqué',
      description: 'Le véhicule est maintenant réservé. Acompte de $1,000 reçu.',
    });

    // 4. Mark vehicle as reserved (use admin to bypass RLS)
    await (supabaseAdmin.from('vehicles') as any)
      .update({ status: 'reserved' })
      .eq('id', quote.vehicle_id);

    return NextResponse.json({ order });
  } catch (error) {
    console.error('[FromQuote] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
