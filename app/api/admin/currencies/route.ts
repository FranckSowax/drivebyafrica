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

// PATCH: Seed all African currencies
export async function PATCH() {
  try {
    const supabase = await createSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any;

    // Complete list of all African currencies
    const ALL_AFRICAN_CURRENCIES = [
      // Base currencies
      { code: 'USD', name: 'Dollar américain', symbol: '$', rateToUsd: 1, countries: ['USA', 'RD Congo', 'Angola', 'Zimbabwe'], displayOrder: 1 },
      { code: 'EUR', name: 'Euro', symbol: '€', rateToUsd: 0.92, countries: ['France', 'Belgique', 'Réunion', 'Mayotte'], displayOrder: 2 },

      // Zone Franc CFA BEAC (Afrique Centrale)
      { code: 'XAF', name: 'Franc CFA BEAC', symbol: 'FCFA', rateToUsd: 615, countries: ['Cameroun', 'Gabon', 'Congo', 'Centrafrique', 'Tchad', 'Guinée Équatoriale'], displayOrder: 3 },

      // Zone Franc CFA BCEAO (Afrique de l'Ouest)
      { code: 'XOF', name: 'Franc CFA BCEAO', symbol: 'FCFA', rateToUsd: 615, countries: ['Sénégal', 'Mali', 'Burkina Faso', 'Bénin', 'Togo', 'Niger', "Côte d'Ivoire", 'Guinée-Bissau'], displayOrder: 4 },

      // Afrique de l'Ouest
      { code: 'NGN', name: 'Naira nigérian', symbol: '₦', rateToUsd: 1550, countries: ['Nigeria'], displayOrder: 10 },
      { code: 'GHS', name: 'Cedi ghanéen', symbol: 'GH₵', rateToUsd: 15.5, countries: ['Ghana'], displayOrder: 11 },
      { code: 'GNF', name: 'Franc guinéen', symbol: 'FG', rateToUsd: 8600, countries: ['Guinée'], displayOrder: 12 },
      { code: 'SLE', name: 'Leone sierra-léonais', symbol: 'Le', rateToUsd: 22.5, countries: ['Sierra Leone'], displayOrder: 13 },
      { code: 'LRD', name: 'Dollar libérien', symbol: 'L$', rateToUsd: 192, countries: ['Liberia'], displayOrder: 14 },
      { code: 'GMD', name: 'Dalasi gambien', symbol: 'D', rateToUsd: 67, countries: ['Gambie'], displayOrder: 15 },
      { code: 'MRU', name: 'Ouguiya mauritanien', symbol: 'UM', rateToUsd: 39.5, countries: ['Mauritanie'], displayOrder: 16 },
      { code: 'CVE', name: 'Escudo cap-verdien', symbol: '$', rateToUsd: 103, countries: ['Cap-Vert'], displayOrder: 17 },

      // Afrique Centrale
      { code: 'CDF', name: 'Franc congolais', symbol: 'FC', rateToUsd: 2800, countries: ['RD Congo'], displayOrder: 20 },
      { code: 'AOA', name: 'Kwanza angolais', symbol: 'Kz', rateToUsd: 830, countries: ['Angola'], displayOrder: 21 },
      { code: 'STN', name: 'Dobra santoméen', symbol: 'Db', rateToUsd: 23, countries: ['São Tomé-et-Príncipe'], displayOrder: 22 },

      // Afrique de l'Est
      { code: 'KES', name: 'Shilling kényan', symbol: 'KSh', rateToUsd: 154, countries: ['Kenya'], displayOrder: 30 },
      { code: 'TZS', name: 'Shilling tanzanien', symbol: 'TSh', rateToUsd: 2640, countries: ['Tanzanie'], displayOrder: 31 },
      { code: 'UGX', name: 'Shilling ougandais', symbol: 'USh', rateToUsd: 3750, countries: ['Ouganda'], displayOrder: 32 },
      { code: 'RWF', name: 'Franc rwandais', symbol: 'FRw', rateToUsd: 1280, countries: ['Rwanda'], displayOrder: 33 },
      { code: 'BIF', name: 'Franc burundais', symbol: 'FBu', rateToUsd: 2850, countries: ['Burundi'], displayOrder: 34 },
      { code: 'ETB', name: 'Birr éthiopien', symbol: 'Br', rateToUsd: 56.5, countries: ['Éthiopie'], displayOrder: 35 },
      { code: 'DJF', name: 'Franc djiboutien', symbol: 'Fdj', rateToUsd: 178, countries: ['Djibouti'], displayOrder: 36 },
      { code: 'ERN', name: 'Nakfa érythréen', symbol: 'Nkf', rateToUsd: 15, countries: ['Érythrée'], displayOrder: 37 },
      { code: 'SOS', name: 'Shilling somalien', symbol: 'Sh.So.', rateToUsd: 571, countries: ['Somalie'], displayOrder: 38 },
      { code: 'SSP', name: 'Livre sud-soudanaise', symbol: 'SSP', rateToUsd: 1300, countries: ['Soudan du Sud'], displayOrder: 39 },

      // Afrique du Nord
      { code: 'MAD', name: 'Dirham marocain', symbol: 'DH', rateToUsd: 10.1, countries: ['Maroc'], displayOrder: 40 },
      { code: 'DZD', name: 'Dinar algérien', symbol: 'DA', rateToUsd: 135, countries: ['Algérie'], displayOrder: 41 },
      { code: 'TND', name: 'Dinar tunisien', symbol: 'DT', rateToUsd: 3.15, countries: ['Tunisie'], displayOrder: 42 },
      { code: 'LYD', name: 'Dinar libyen', symbol: 'LD', rateToUsd: 4.85, countries: ['Libye'], displayOrder: 43 },
      { code: 'EGP', name: 'Livre égyptienne', symbol: 'E£', rateToUsd: 50.5, countries: ['Égypte'], displayOrder: 44 },
      { code: 'SDG', name: 'Livre soudanaise', symbol: 'SDG', rateToUsd: 600, countries: ['Soudan'], displayOrder: 45 },

      // Afrique Australe
      { code: 'ZAR', name: 'Rand sud-africain', symbol: 'R', rateToUsd: 18.5, countries: ['Afrique du Sud', 'Eswatini', 'Lesotho', 'Namibie'], displayOrder: 50 },
      { code: 'BWP', name: 'Pula botswanais', symbol: 'P', rateToUsd: 13.7, countries: ['Botswana'], displayOrder: 51 },
      { code: 'MZN', name: 'Metical mozambicain', symbol: 'MT', rateToUsd: 63.5, countries: ['Mozambique'], displayOrder: 52 },
      { code: 'ZMW', name: 'Kwacha zambien', symbol: 'ZK', rateToUsd: 27, countries: ['Zambie'], displayOrder: 53 },
      { code: 'MWK', name: 'Kwacha malawien', symbol: 'MK', rateToUsd: 1750, countries: ['Malawi'], displayOrder: 54 },
      { code: 'ZWG', name: 'Dollar zimbabwéen ZiG', symbol: 'ZiG', rateToUsd: 13.5, countries: ['Zimbabwe'], displayOrder: 55 },
      { code: 'NAD', name: 'Dollar namibien', symbol: 'N$', rateToUsd: 18.5, countries: ['Namibie'], displayOrder: 56 },
      { code: 'SZL', name: 'Lilangeni swazi', symbol: 'E', rateToUsd: 18.5, countries: ['Eswatini'], displayOrder: 57 },
      { code: 'LSL', name: 'Loti lesothan', symbol: 'L', rateToUsd: 18.5, countries: ['Lesotho'], displayOrder: 58 },

      // Îles de l'Océan Indien
      { code: 'MGA', name: 'Ariary malgache', symbol: 'Ar', rateToUsd: 4650, countries: ['Madagascar'], displayOrder: 60 },
      { code: 'MUR', name: 'Roupie mauricienne', symbol: 'Rs', rateToUsd: 46, countries: ['Maurice'], displayOrder: 61 },
      { code: 'SCR', name: 'Roupie seychelloise', symbol: 'SCR', rateToUsd: 14.5, countries: ['Seychelles'], displayOrder: 62 },
      { code: 'KMF', name: 'Franc comorien', symbol: 'CF', rateToUsd: 460, countries: ['Comores'], displayOrder: 63 },
    ];

    // Get existing currencies
    const { data: existing } = await supabaseAny
      .from('currency_rates')
      .select('currency_code');

    const existingCodes = new Set((existing || []).map((c: { currency_code: string }) => c.currency_code));

    // Filter currencies that don't exist yet
    const toInsert = ALL_AFRICAN_CURRENCIES.filter(c => !existingCodes.has(c.code));

    if (toInsert.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Toutes les devises sont déjà présentes',
        added: 0,
      });
    }

    // Insert missing currencies
    const { error: insertError } = await supabaseAny
      .from('currency_rates')
      .insert(toInsert.map(c => ({
        currency_code: c.code,
        currency_name: c.name,
        currency_symbol: c.symbol,
        rate_to_usd: c.rateToUsd,
        countries: c.countries,
        is_active: true,
        display_order: c.displayOrder,
      })));

    if (insertError) {
      console.error('Error seeding currencies:', insertError);
      return NextResponse.json(
        { error: 'Erreur lors de l\'ajout des devises', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${toInsert.length} devises ajoutées`,
      added: toInsert.length,
      currencies: toInsert.map(c => c.code),
    });
  } catch (error) {
    console.error('Error seeding currencies:', error);
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
