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

// Type for destination with shipping costs
interface Destination {
  id: string;
  name: string;
  country: string;
  flag: string;
  shippingCost: {
    korea: number;
    china: number;
    dubai: number;
  };
}

// Default destinations (fallback if database not available) - prices doubled
const DEFAULT_DESTINATIONS: Destination[] = [
  { id: 'dakar', name: 'Dakar', country: 'Sénégal', flag: '🇸🇳', shippingCost: { korea: 4600, china: 5200, dubai: 4200 } },
  { id: 'abidjan', name: 'Abidjan', country: "Côte d'Ivoire", flag: '🇨🇮', shippingCost: { korea: 4200, china: 4800, dubai: 3800 } },
  { id: 'tema', name: 'Tema/Accra', country: 'Ghana', flag: '🇬🇭', shippingCost: { korea: 4000, china: 4600, dubai: 3600 } },
  { id: 'lome', name: 'Lomé', country: 'Togo', flag: '🇹🇬', shippingCost: { korea: 4000, china: 4600, dubai: 3600 } },
  { id: 'cotonou', name: 'Cotonou', country: 'Bénin', flag: '🇧🇯', shippingCost: { korea: 4100, china: 4700, dubai: 3700 } },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', flag: '🇳🇬', shippingCost: { korea: 4400, china: 5000, dubai: 4000 } },
  { id: 'douala', name: 'Douala', country: 'Cameroun', flag: '🇨🇲', shippingCost: { korea: 3400, china: 4000, dubai: 3000 } },
  { id: 'libreville', name: 'Libreville', country: 'Gabon', flag: '🇬🇦', shippingCost: { korea: 3600, china: 4200, dubai: 3200 } },
  { id: 'port-gentil', name: 'Port-Gentil', country: 'Gabon', flag: '🇬🇦', shippingCost: { korea: 3700, china: 4300, dubai: 3300 } },
  { id: 'pointe-noire', name: 'Pointe-Noire', country: 'Congo', flag: '🇨🇬', shippingCost: { korea: 3800, china: 4400, dubai: 3400 } },
  { id: 'mombasa', name: 'Mombasa', country: 'Kenya', flag: '🇰🇪', shippingCost: { korea: 3200, china: 3800, dubai: 2800 } },
  { id: 'dar-es-salaam', name: 'Dar es Salaam', country: 'Tanzanie', flag: '🇹🇿', shippingCost: { korea: 3300, china: 3900, dubai: 2900 } },
  { id: 'durban', name: 'Durban', country: 'Afrique du Sud', flag: '🇿🇦', shippingCost: { korea: 3600, china: 4200, dubai: 3200 } },
  { id: 'casablanca', name: 'Casablanca', country: 'Maroc', flag: '🇲🇦', shippingCost: { korea: 4400, china: 5000, dubai: 3600 } },
];

export async function GET() {
  try {
    const supabase = await createUntypedClient();

    // Try to fetch from shipping_routes table
    const { data: routes, error } = await supabase
      .from('shipping_routes')
      .select('*')
      .eq('is_active', true)
      .order('destination_name');

    if (error) {
      // If table doesn't exist, return defaults
      console.error('Error fetching shipping routes:', error);
      return NextResponse.json({ destinations: DEFAULT_DESTINATIONS, lastUpdatedAt: null });
    }

    if (!routes || routes.length === 0) {
      return NextResponse.json({ destinations: DEFAULT_DESTINATIONS, lastUpdatedAt: null });
    }

    // Find the most recent updated_at date
    let lastUpdatedAt: string | null = null;
    const dates = routes
      .map((r: { updated_at?: string }) => r.updated_at)
      .filter((d): d is string => Boolean(d))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    lastUpdatedAt = dates[0] || null;

    // Transform to the format expected by ShippingEstimator
    const destinations: Destination[] = routes.map((route) => ({
      id: route.destination_id,
      name: route.destination_name,
      country: route.destination_country,
      flag: route.destination_flag,
      shippingCost: {
        korea: route.korea_cost_usd,
        china: route.china_cost_usd,
        dubai: route.dubai_cost_usd,
      },
    }));

    // Cache for 1 hour (shipping costs don't change often)
    return NextResponse.json(
      { destinations, lastUpdatedAt },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching shipping routes:', error);
    return NextResponse.json(
      { destinations: DEFAULT_DESTINATIONS, lastUpdatedAt: null },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    );
  }
}
