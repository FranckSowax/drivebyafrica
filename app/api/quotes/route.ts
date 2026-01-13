import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Create untyped Supabase client for tables not in Database type
async function createUntypedClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

export async function POST(request: Request) {
  try {
    const supabase = await createUntypedClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();

    // Insert quote into database
    const { data, error } = await supabase.from('quotes').insert({
      quote_number: body.quote_number,
      user_id: user.id,
      vehicle_id: body.vehicle_id,
      vehicle_make: body.vehicle_make,
      vehicle_model: body.vehicle_model,
      vehicle_year: body.vehicle_year,
      vehicle_price_usd: body.vehicle_price_usd,
      vehicle_source: body.vehicle_source,
      destination_id: body.destination_id,
      destination_name: body.destination_name,
      destination_country: body.destination_country,
      shipping_cost_xaf: body.shipping_cost_xaf,
      insurance_cost_xaf: body.insurance_cost_xaf,
      inspection_fee_xaf: body.inspection_fee_xaf,
      total_cost_xaf: body.total_cost_xaf,
      status: 'pending',
      valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days validity
    }).select().single();

    if (error) {
      console.error('Error saving quote:', error);
      // Don't fail if table doesn't exist yet
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, message: 'Quote table not set up yet' });
      }
      throw error;
    }

    return NextResponse.json({ success: true, quote: data });
  } catch (error) {
    console.error('Quote API error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la sauvegarde du devis' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createUntypedClient();
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
      console.error('Error fetching quotes:', error);
      // Return empty array if table doesn't exist
      if (error.code === '42P01') {
        return NextResponse.json({ quotes: [] });
      }
      throw error;
    }

    return NextResponse.json({ quotes });
  } catch (error) {
    console.error('Quote API error:', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement des devis' },
      { status: 500 }
    );
  }
}
