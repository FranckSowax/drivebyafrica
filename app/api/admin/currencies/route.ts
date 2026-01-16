import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Database } from '@/types/database';

async function createSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
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

// GET: Fetch all currencies with history
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any;

    const { searchParams } = new URL(request.url);
    const withHistory = searchParams.get('withHistory') === 'true';
    const currencyCode = searchParams.get('code');

    // Fetch all currencies
    let query = supabaseAny
      .from('currency_rates')
      .select('*')
      .order('display_order', { ascending: true });

    if (currencyCode) {
      query = query.eq('currency_code', currencyCode);
    }

    const { data: currencies, error } = await query;

    if (error) {
      console.error('Error fetching currencies:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des devises' },
        { status: 500 }
      );
    }

    // Fetch history if requested
    let history: Record<string, Array<{
      id: string;
      old_rate: number;
      new_rate: number;
      changed_at: string;
      note: string;
    }>> = {};

    if (withHistory) {
      const codes = currencyCode ? [currencyCode] : currencies.map((c: { currency_code: string }) => c.currency_code);

      const { data: historyData } = await supabaseAny
        .from('currency_rate_history')
        .select('*')
        .in('currency_code', codes)
        .order('changed_at', { ascending: false })
        .limit(100);

      if (historyData) {
        history = historyData.reduce((acc: typeof history, h: {
          currency_code: string;
          id: string;
          old_rate: number;
          new_rate: number;
          changed_at: string;
          note: string;
        }) => {
          if (!acc[h.currency_code]) {
            acc[h.currency_code] = [];
          }
          acc[h.currency_code].push({
            id: h.id,
            old_rate: h.old_rate,
            new_rate: h.new_rate,
            changed_at: h.changed_at,
            note: h.note,
          });
          return acc;
        }, {});
      }
    }

    // Map to API format
    const mappedCurrencies = currencies.map((c: {
      id: string;
      currency_code: string;
      currency_name: string;
      currency_symbol: string;
      rate_to_usd: number;
      countries: string[];
      is_active: boolean;
      display_order: number;
      created_at: string;
      updated_at: string;
    }) => ({
      id: c.id,
      code: c.currency_code,
      name: c.currency_name,
      symbol: c.currency_symbol,
      rateToUsd: Number(c.rate_to_usd),
      countries: c.countries || [],
      isActive: c.is_active,
      displayOrder: c.display_order,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      history: history[c.currency_code] || [],
    }));

    return NextResponse.json({
      currencies: mappedCurrencies,
    });
  } catch (error) {
    console.error('Error in currencies API:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// PUT: Update currency rate
export async function PUT(request: Request) {
  try {
    const supabase = await createSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any;

    const body = await request.json();
    const { code, rateToUsd, note } = body;

    if (!code || !rateToUsd) {
      return NextResponse.json(
        { error: 'Code de devise et taux requis' },
        { status: 400 }
      );
    }

    if (rateToUsd <= 0) {
      return NextResponse.json(
        { error: 'Le taux doit être positif' },
        { status: 400 }
      );
    }

    // Get current rate
    const { data: current, error: fetchError } = await supabaseAny
      .from('currency_rates')
      .select('rate_to_usd')
      .eq('currency_code', code)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: 'Devise non trouvée' },
        { status: 404 }
      );
    }

    const oldRate = current.rate_to_usd;

    // Update rate
    const { error: updateError } = await supabaseAny
      .from('currency_rates')
      .update({
        rate_to_usd: rateToUsd,
        updated_at: new Date().toISOString(),
      })
      .eq('currency_code', code);

    if (updateError) {
      console.error('Error updating currency:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour' },
        { status: 500 }
      );
    }

    // Log history
    const { error: historyError } = await supabaseAny
      .from('currency_rate_history')
      .insert({
        currency_code: code,
        old_rate: oldRate,
        new_rate: rateToUsd,
        note: note || null,
      });

    if (historyError) {
      console.error('Error logging history:', historyError);
      // Don't fail the request, just log
    }

    return NextResponse.json({
      success: true,
      message: 'Taux de change mis à jour',
      oldRate,
      newRate: rateToUsd,
    });
  } catch (error) {
    console.error('Error updating currency:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// POST: Add new currency
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any;

    const body = await request.json();
    const { code, name, symbol, rateToUsd, countries, isActive, displayOrder } = body;

    if (!code || !name || !symbol || !rateToUsd) {
      return NextResponse.json(
        { error: 'Code, nom, symbole et taux requis' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAny
      .from('currency_rates')
      .insert({
        currency_code: code.toUpperCase(),
        currency_name: name,
        currency_symbol: symbol,
        rate_to_usd: rateToUsd,
        countries: countries || [],
        is_active: isActive !== false,
        display_order: displayOrder || 99,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Cette devise existe déjà' },
          { status: 400 }
        );
      }
      console.error('Error creating currency:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la création' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      currency: {
        id: data.id,
        code: data.currency_code,
        name: data.currency_name,
        symbol: data.currency_symbol,
        rateToUsd: Number(data.rate_to_usd),
        countries: data.countries,
        isActive: data.is_active,
      },
    });
  } catch (error) {
    console.error('Error creating currency:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// DELETE: Toggle currency active status
export async function DELETE(request: Request) {
  try {
    const supabase = await createSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any;

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { error: 'Code de devise requis' },
        { status: 400 }
      );
    }

    // Get current status
    const { data: current, error: fetchError } = await supabaseAny
      .from('currency_rates')
      .select('is_active')
      .eq('currency_code', code)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: 'Devise non trouvée' },
        { status: 404 }
      );
    }

    // Toggle status
    const { error: updateError } = await supabaseAny
      .from('currency_rates')
      .update({ is_active: !current.is_active })
      .eq('currency_code', code);

    if (updateError) {
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      isActive: !current.is_active,
    });
  } catch (error) {
    console.error('Error toggling currency:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
