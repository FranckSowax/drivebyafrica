import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Revalidate every 6 hours (rates update from live API)
export const revalidate = 21600;

// Currency metadata (names, symbols, countries) — rates come from live API
const CURRENCY_META: Record<string, { name: string; symbol: string; countries: string[] }> = {
  USD: { name: 'Dollar américain', symbol: '$', countries: ['USA', 'RD Congo', 'Angola', 'Zimbabwe'] },
  EUR: { name: 'Euro', symbol: '€', countries: ['France', 'Belgique', 'Réunion', 'Mayotte'] },
  XAF: { name: 'Franc CFA BEAC', symbol: 'FCFA', countries: ['Cameroun', 'Gabon', 'Congo', 'Centrafrique', 'Tchad', 'Guinée Équatoriale'] },
  XOF: { name: 'Franc CFA BCEAO', symbol: 'FCFA', countries: ['Sénégal', 'Mali', 'Burkina Faso', 'Bénin', 'Togo', 'Niger', "Côte d'Ivoire", 'Guinée-Bissau'] },
  NGN: { name: 'Naira nigérian', symbol: '₦', countries: ['Nigeria'] },
  GHS: { name: 'Cedi ghanéen', symbol: 'GH₵', countries: ['Ghana'] },
  GNF: { name: 'Franc guinéen', symbol: 'FG', countries: ['Guinée'] },
  SLE: { name: 'Leone sierra-léonais', symbol: 'Le', countries: ['Sierra Leone'] },
  LRD: { name: 'Dollar libérien', symbol: 'L$', countries: ['Liberia'] },
  GMD: { name: 'Dalasi gambien', symbol: 'D', countries: ['Gambie'] },
  MRU: { name: 'Ouguiya mauritanien', symbol: 'UM', countries: ['Mauritanie'] },
  CVE: { name: 'Escudo cap-verdien', symbol: '$', countries: ['Cap-Vert'] },
  CDF: { name: 'Franc congolais', symbol: 'FC', countries: ['RD Congo'] },
  AOA: { name: 'Kwanza angolais', symbol: 'Kz', countries: ['Angola'] },
  STN: { name: 'Dobra santoméen', symbol: 'Db', countries: ['São Tomé-et-Príncipe'] },
  KES: { name: 'Shilling kényan', symbol: 'KSh', countries: ['Kenya'] },
  TZS: { name: 'Shilling tanzanien', symbol: 'TSh', countries: ['Tanzanie'] },
  UGX: { name: 'Shilling ougandais', symbol: 'USh', countries: ['Ouganda'] },
  RWF: { name: 'Franc rwandais', symbol: 'FRw', countries: ['Rwanda'] },
  BIF: { name: 'Franc burundais', symbol: 'FBu', countries: ['Burundi'] },
  ETB: { name: 'Birr éthiopien', symbol: 'Br', countries: ['Éthiopie'] },
  DJF: { name: 'Franc djiboutien', symbol: 'Fdj', countries: ['Djibouti'] },
  ERN: { name: 'Nakfa érythréen', symbol: 'Nkf', countries: ['Érythrée'] },
  SOS: { name: 'Shilling somalien', symbol: 'Sh.So.', countries: ['Somalie'] },
  SSP: { name: 'Livre sud-soudanaise', symbol: 'SSP', countries: ['Soudan du Sud'] },
  MAD: { name: 'Dirham marocain', symbol: 'DH', countries: ['Maroc'] },
  DZD: { name: 'Dinar algérien', symbol: 'DA', countries: ['Algérie'] },
  TND: { name: 'Dinar tunisien', symbol: 'DT', countries: ['Tunisie'] },
  LYD: { name: 'Dinar libyen', symbol: 'LD', countries: ['Libye'] },
  EGP: { name: 'Livre égyptienne', symbol: 'E£', countries: ['Égypte'] },
  SDG: { name: 'Livre soudanaise', symbol: 'SDG', countries: ['Soudan'] },
  ZAR: { name: 'Rand sud-africain', symbol: 'R', countries: ['Afrique du Sud', 'Eswatini', 'Lesotho', 'Namibie'] },
  BWP: { name: 'Pula botswanais', symbol: 'P', countries: ['Botswana'] },
  MZN: { name: 'Metical mozambicain', symbol: 'MT', countries: ['Mozambique'] },
  ZMW: { name: 'Kwacha zambien', symbol: 'ZK', countries: ['Zambie'] },
  MWK: { name: 'Kwacha malawien', symbol: 'MK', countries: ['Malawi'] },
  ZWL: { name: 'Dollar zimbabwéen', symbol: 'Z$', countries: ['Zimbabwe'] },
  NAD: { name: 'Dollar namibien', symbol: 'N$', countries: ['Namibie'] },
  SZL: { name: 'Lilangeni swazi', symbol: 'E', countries: ['Eswatini'] },
  LSL: { name: 'Loti lesothan', symbol: 'L', countries: ['Lesotho'] },
  MGA: { name: 'Ariary malgache', symbol: 'Ar', countries: ['Madagascar'] },
  MUR: { name: 'Roupie mauricienne', symbol: 'Rs', countries: ['Maurice'] },
  SCR: { name: 'Roupie seychelloise', symbol: 'SCR', countries: ['Seychelles'] },
  KMF: { name: 'Franc comorien', symbol: 'CF', countries: ['Comores'] },
};

// All currency codes we need
const CURRENCY_CODES = Object.keys(CURRENCY_META);

/**
 * Fetch live rates from ExchangeRate-API (free, no key required)
 * Returns: { USD: 1, EUR: 0.92, XAF: 622.5, ... }
 */
async function fetchLiveRates(): Promise<Record<string, number> | null> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 21600 }, // Cache 6 hours
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.result !== 'success' || !data.rates) return null;
    return data.rates as Record<string, number>;
  } catch (e) {
    console.error('Failed to fetch live exchange rates:', e);
    return null;
  }
}

/**
 * Update currency_rates table in Supabase with live rates (fire-and-forget)
 */
async function syncRatesToDB(rates: Record<string, number>) {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any;

    for (const code of CURRENCY_CODES) {
      const rate = rates[code];
      if (!rate || code === 'USD') continue;

      await supabaseAny
        .from('currency_rates')
        .update({
          rate_to_usd: rate,
          updated_at: new Date().toISOString(),
        })
        .eq('currency_code', code);
    }
  } catch (e) {
    console.error('Failed to sync rates to DB:', e);
  }
}

// GET: Fetch currencies with live exchange rates
export async function GET() {
  try {
    // 1. Fetch live rates from API
    const liveRates = await fetchLiveRates();

    // 2. Build currency list with live rates (or DB fallback)
    if (liveRates) {
      const currencies = CURRENCY_CODES
        .filter(code => liveRates[code] !== undefined || code === 'USD')
        .map(code => ({
          code,
          ...CURRENCY_META[code],
          rateToUsd: code === 'USD' ? 1 : (liveRates[code] || 0),
        }));

      // Sync to DB in background (non-blocking)
      syncRatesToDB(liveRates).catch(() => {});

      return NextResponse.json({
        currencies,
        source: 'live',
        updatedAt: new Date().toISOString(),
      }, {
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=21600, stale-while-revalidate=43200',
        },
      });
    }

    // 3. Fallback: try database
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any;

    const { data: dbCurrencies, error } = await supabaseAny
      .from('currency_rates')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (!error && dbCurrencies && dbCurrencies.length > 0) {
      const currencies = dbCurrencies.map((c: {
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
        currencies,
        source: 'database',
      }, {
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
        },
      });
    }

    // 4. Last resort: hardcoded defaults
    const fallback = CURRENCY_CODES.map(code => ({
      code,
      ...CURRENCY_META[code],
      rateToUsd: code === 'USD' ? 1 : 0,
    }));

    return NextResponse.json({
      currencies: fallback,
      source: 'fallback',
    }, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Error fetching currencies:', error);
    return NextResponse.json({
      currencies: CURRENCY_CODES.map(code => ({
        code,
        ...CURRENCY_META[code],
        rateToUsd: code === 'USD' ? 1 : 0,
      })),
      source: 'error-fallback',
    }, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      },
    });
  }
}
