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

// Default currencies if database table doesn't exist yet
const DEFAULT_CURRENCIES = [
  {
    code: 'USD',
    name: 'Dollar américain',
    symbol: '$',
    rateToUsd: 1,
    countries: ['USA'],
  },
  {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    rateToUsd: 0.92,
    countries: ['France', 'Belgique'],
  },
  {
    code: 'XAF',
    name: 'Franc CFA BEAC',
    symbol: 'FCFA',
    rateToUsd: 615,
    countries: ['Cameroun', 'Gabon', 'Congo', 'Centrafrique', 'Tchad', 'Guinée équatoriale'],
  },
  {
    code: 'XOF',
    name: 'Franc CFA BCEAO',
    symbol: 'FCFA',
    rateToUsd: 615,
    countries: ['Sénégal', 'Mali', 'Burkina Faso', 'Bénin', 'Togo', 'Niger', "Côte d'Ivoire", 'Guinée-Bissau'],
  },
  {
    code: 'CDF',
    name: 'Franc congolais',
    symbol: 'FC',
    rateToUsd: 2800,
    countries: ['RDC'],
  },
  {
    code: 'NGN',
    name: 'Naira nigérian',
    symbol: '₦',
    rateToUsd: 1550,
    countries: ['Nigeria'],
  },
  {
    code: 'GNF',
    name: 'Franc guinéen',
    symbol: 'FG',
    rateToUsd: 8600,
    countries: ['Guinée'],
  },
  {
    code: 'RWF',
    name: 'Franc rwandais',
    symbol: 'FRw',
    rateToUsd: 1280,
    countries: ['Rwanda'],
  },
  {
    code: 'BIF',
    name: 'Franc burundais',
    symbol: 'FBu',
    rateToUsd: 2850,
    countries: ['Burundi'],
  },
  {
    code: 'AOA',
    name: 'Kwanza angolais',
    symbol: 'Kz',
    rateToUsd: 830,
    countries: ['Angola'],
  },
];

// GET: Fetch all active currencies
export async function GET() {
  try {
    const supabase = await createSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any;

    // Try to fetch from database
    const { data: currencies, error } = await supabaseAny
      .from('currency_rates')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      // If table doesn't exist, return defaults
      console.log('Currency table not found, using defaults:', error.message);
      return NextResponse.json({
        currencies: DEFAULT_CURRENCIES,
        source: 'defaults',
      });
    }

    // Map database format to API format
    const mappedCurrencies = currencies.map((c: {
      currency_code: string;
      currency_name: string;
      currency_symbol: string;
      rate_to_usd: number;
      countries: string[];
      updated_at: string;
    }) => ({
      code: c.currency_code,
      name: c.currency_name,
      symbol: c.currency_symbol,
      rateToUsd: Number(c.rate_to_usd),
      countries: c.countries || [],
      updatedAt: c.updated_at,
    }));

    return NextResponse.json({
      currencies: mappedCurrencies.length > 0 ? mappedCurrencies : DEFAULT_CURRENCIES,
      source: mappedCurrencies.length > 0 ? 'database' : 'defaults',
    });
  } catch (error) {
    console.error('Error fetching currencies:', error);
    return NextResponse.json({
      currencies: DEFAULT_CURRENCIES,
      source: 'defaults',
      error: 'Failed to fetch from database',
    });
  }
}
