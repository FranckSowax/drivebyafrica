import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/price-request
 * Create a price request for a Dubai vehicle without a listed price
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
    }

    // Validate required fields
    const { vehicle_id, vehicle_make, vehicle_model, vehicle_year, vehicle_source } = body;

    if (!vehicle_id || !vehicle_make || !vehicle_model || !vehicle_year) {
      return NextResponse.json({ error: 'Données du véhicule manquantes' }, { status: 400 });
    }

    // Generate unique quote number for price request
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const quoteNumber = `PR-${timestamp}-${random}`;

    // Check if user already has a pending price request for this vehicle
    const { data: existingRequest } = await supabase
      .from('quotes')
      .select('id, quote_number')
      .eq('user_id', user.id)
      .eq('vehicle_id', vehicle_id)
      .eq('quote_type', 'price_request')
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return NextResponse.json({
        error: 'Une demande de prix est déjà en cours pour ce véhicule',
        existingQuoteNumber: existingRequest.quote_number
      }, { status: 409 });
    }

    // Get user profile for phone number
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone, full_name')
      .eq('id', user.id)
      .single();

    // Insert price request (using type assertion for new columns not yet in generated types)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('quotes') as any).insert({
      quote_number: quoteNumber,
      user_id: user.id,
      quote_type: 'price_request',
      vehicle_id,
      vehicle_make,
      vehicle_model,
      vehicle_year,
      vehicle_price_usd: null, // No price yet
      vehicle_source: vehicle_source || 'dubai',
      destination_id: body.destination_id || 'pending',
      destination_name: body.destination_name || 'À définir',
      destination_country: body.destination_country || 'À définir',
      shipping_type: 'container', // Default, will be updated when price is set
      shipping_cost_xaf: null,
      insurance_cost_xaf: null,
      inspection_fee_xaf: null,
      total_cost_xaf: null,
      status: 'pending',
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      notification_sent: false,
    }).select().single();

    if (error) {
      console.error('Price request API error:', error);
      return NextResponse.json({
        error: 'Erreur lors de la création de la demande',
        message: error.message,
        code: error.code
      }, { status: 400 });
    }

    console.log('Price request created:', data);

    return NextResponse.json({
      success: true,
      quote_number: quoteNumber,
      message: 'Votre demande de prix a été envoyée. Vous serez notifié dès que nous aurons le prix.'
    });
  } catch (error) {
    console.error('Price request server error:', error);
    return NextResponse.json(
      {
        error: 'Erreur interne du serveur',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/price-request
 * Get user's price requests
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicle_id');

    let query = supabase
      .from('quotes')
      .select('*')
      .eq('user_id', user.id)
      .eq('quote_type', 'price_request')
      .order('created_at', { ascending: false });

    if (vehicleId) {
      query = query.eq('vehicle_id', vehicleId);
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error('Price request GET error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Price request GET server error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
