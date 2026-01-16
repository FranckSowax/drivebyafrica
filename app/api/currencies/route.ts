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
// Covers all African countries from the shipping destinations list
// Note: RD Congo and Angola use USD
const DEFAULT_CURRENCIES = [
  // Base currencies - USD also used in RD Congo and Angola
  { code: 'USD', name: 'Dollar américain', symbol: '$', rateToUsd: 1, countries: ['USA', 'RD Congo', 'Angola'] },
  { code: 'EUR', name: 'Euro', symbol: '€', rateToUsd: 0.92, countries: ['France', 'Belgique'] },

  // Zone Franc CFA
  { code: 'XAF', name: 'Franc CFA BEAC', symbol: 'FCFA', rateToUsd: 615, countries: ['Cameroun', 'Gabon', 'Congo', 'Centrafrique', 'Tchad', 'Guinée Équatoriale'] },
  { code: 'XOF', name: 'Franc CFA BCEAO', symbol: 'FCFA', rateToUsd: 615, countries: ['Sénégal', 'Mali', 'Burkina Faso', 'Bénin', 'Togo', 'Niger', "Côte d'Ivoire", 'Guinée-Bissau'] },

  // Afrique de l'Ouest
  { code: 'NGN', name: 'Naira nigérian', symbol: '₦', rateToUsd: 1550, countries: ['Nigeria'] },
  { code: 'GHS', name: 'Cedi ghanéen', symbol: 'GH₵', rateToUsd: 15.5, countries: ['Ghana'] },
  { code: 'GNF', name: 'Franc guinéen', symbol: 'FG', rateToUsd: 8600, countries: ['Guinée'] },
  { code: 'SLL', name: 'Leone sierra-léonais', symbol: 'Le', rateToUsd: 22500, countries: ['Sierra Leone'] },
  { code: 'LRD', name: 'Dollar libérien', symbol: 'L$', rateToUsd: 192, countries: ['Liberia'] },
  { code: 'GMD', name: 'Dalasi gambien', symbol: 'D', rateToUsd: 67, countries: ['Gambie'] },
  { code: 'MRU', name: 'Ouguiya mauritanien', symbol: 'UM', rateToUsd: 39.5, countries: ['Mauritanie'] },
  { code: 'CVE', name: 'Escudo cap-verdien', symbol: '$', rateToUsd: 103, countries: ['Cap-Vert'] },

  // Afrique Centrale (RD Congo et Angola utilisent USD)
  { code: 'STN', name: 'Dobra santoméen', symbol: 'Db', rateToUsd: 23, countries: ['São Tomé-et-Príncipe'] },

  // Afrique de l'Est
  { code: 'KES', name: 'Shilling kényan', symbol: 'KSh', rateToUsd: 154, countries: ['Kenya'] },
  { code: 'TZS', name: 'Shilling tanzanien', symbol: 'TSh', rateToUsd: 2640, countries: ['Tanzanie'] },
  { code: 'UGX', name: 'Shilling ougandais', symbol: 'USh', rateToUsd: 3750, countries: ['Ouganda'] },
  { code: 'RWF', name: 'Franc rwandais', symbol: 'FRw', rateToUsd: 1280, countries: ['Rwanda'] },
  { code: 'BIF', name: 'Franc burundais', symbol: 'FBu', rateToUsd: 2850, countries: ['Burundi'] },
  { code: 'ETB', name: 'Birr éthiopien', symbol: 'Br', rateToUsd: 56.5, countries: ['Éthiopie'] },
  { code: 'DJF', name: 'Franc djiboutien', symbol: 'Fdj', rateToUsd: 178, countries: ['Djibouti'] },
  { code: 'ERN', name: 'Nakfa érythréen', symbol: 'Nkf', rateToUsd: 15, countries: ['Érythrée'] },
  { code: 'SOS', name: 'Shilling somalien', symbol: 'Sh.So.', rateToUsd: 571, countries: ['Somalie'] },
  { code: 'SSP', name: 'Livre sud-soudanaise', symbol: 'SSP', rateToUsd: 1300, countries: ['Soudan du Sud'] },

  // Afrique du Nord
  { code: 'MAD', name: 'Dirham marocain', symbol: 'DH', rateToUsd: 10.1, countries: ['Maroc'] },
  { code: 'DZD', name: 'Dinar algérien', symbol: 'DA', rateToUsd: 135, countries: ['Algérie'] },
  { code: 'TND', name: 'Dinar tunisien', symbol: 'DT', rateToUsd: 3.15, countries: ['Tunisie'] },
  { code: 'LYD', name: 'Dinar libyen', symbol: 'LD', rateToUsd: 4.85, countries: ['Libye'] },
  { code: 'EGP', name: 'Livre égyptienne', symbol: 'E£', rateToUsd: 50.5, countries: ['Égypte'] },
  { code: 'SDG', name: 'Livre soudanaise', symbol: 'SDG', rateToUsd: 600, countries: ['Soudan'] },

  // Afrique Australe
  { code: 'ZAR', name: 'Rand sud-africain', symbol: 'R', rateToUsd: 18.5, countries: ['Afrique du Sud', 'Eswatini', 'Lesotho', 'Namibie'] },
  { code: 'MZN', name: 'Metical mozambicain', symbol: 'MT', rateToUsd: 63.5, countries: ['Mozambique'] },
  { code: 'ZMW', name: 'Kwacha zambien', symbol: 'ZK', rateToUsd: 27, countries: ['Zambie'] },
  { code: 'ZWL', name: 'Dollar zimbabwéen', symbol: 'Z$', rateToUsd: 13.5, countries: ['Zimbabwe'] },
  { code: 'BWP', name: 'Pula botswanais', symbol: 'P', rateToUsd: 13.7, countries: ['Botswana'] },
  { code: 'MWK', name: 'Kwacha malawien', symbol: 'MK', rateToUsd: 1750, countries: ['Malawi'] },

  // Îles de l'Océan Indien
  { code: 'MGA', name: 'Ariary malgache', symbol: 'Ar', rateToUsd: 4650, countries: ['Madagascar'] },
  { code: 'MUR', name: 'Roupie mauricienne', symbol: 'Rs', rateToUsd: 46, countries: ['Maurice'] },
  { code: 'SCR', name: 'Roupie seychelloise', symbol: 'SCR', rateToUsd: 14.5, countries: ['Seychelles'] },
  { code: 'KMF', name: 'Franc comorien', symbol: 'CF', rateToUsd: 460, countries: ['Comores'] },
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
