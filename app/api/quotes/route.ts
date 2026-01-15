import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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
    } catch (e) {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
    }

    console.log('Quote API: Received request body', body);

    // Insert quote into database
    console.log('Quote API: Inserting into Supabase');
    const { data, error } = await supabase.from('quotes').insert({
      quote_number: body.quote_number,
      user_id: user.id,
      vehicle_id: body.vehicle_id,
      vehicle_make: body.vehicle_make,
      vehicle_model: body.vehicle_model,
      vehicle_year: body.vehicle_year,
      vehicle_price_usd: Math.round(body.vehicle_price_usd),
      vehicle_source: body.vehicle_source,
      destination_id: body.destination_id,
      destination_name: body.destination_name,
      destination_country: body.destination_country,
      shipping_type: body.shipping_type || 'container',
      shipping_cost_xaf: Math.round(body.shipping_cost_xaf),
      insurance_cost_xaf: Math.round(body.insurance_cost_xaf),
      inspection_fee_xaf: Math.round(body.inspection_fee_xaf),
      total_cost_xaf: Math.round(body.total_cost_xaf),
      status: 'pending',
      valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }).select().single();

    if (error) {
      console.error('Quote API Supabase error:', error);
      // Table doesn't exist yet
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({ success: true, message: 'La table quotes n\'existe pas encore' });
      }
      // Check constraint violation - likely invalid vehicle_source or shipping_type
      if (error.code === '23514') {
        console.error('Quote API: Check constraint violation - invalid data:', {
          vehicle_source: body.vehicle_source,
          shipping_type: body.shipping_type,
        });
        return NextResponse.json({
          error: 'Données invalides',
          message: 'La source du véhicule ou le type d\'expédition est invalide',
          details: { vehicle_source: body.vehicle_source, shipping_type: body.shipping_type },
          code: error.code
        }, { status: 400 });
      }
      return NextResponse.json({
        error: 'Erreur Supabase',
        message: error.message,
        code: error.code
      }, { status: 400 });
    }

    console.log('Quote API: Successfully saved quote', data);
    return NextResponse.json({ success: true, quote: data });
  } catch (error) {
    console.error('Quote API server error:', error);
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

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
    const limit = parseInt(searchParams.get('limit') || '10');

    const { data: quotes, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Quote API Supabase error (GET):', error);
      // Table doesn't exist yet - return empty array
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({ quotes: [] });
      }
      // Permission denied - RLS policy issue, return empty array
      if (error.code === '42501' || error.message?.includes('permission denied')) {
        return NextResponse.json({ quotes: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ quotes });
  } catch (error) {
    console.error('Quote API server error (GET):', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
