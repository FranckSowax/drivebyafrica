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

// Default destinations (fallback if database not available)
const DEFAULT_DESTINATIONS: Destination[] = [
  { id: 'dakar', name: 'Dakar', country: 'Sénégal', flag: '🇸🇳', shippingCost: { korea: 2300, china: 2600, dubai: 2100 } },
  { id: 'abidjan', name: 'Abidjan', country: "Côte d'Ivoire", flag: '🇨🇮', shippingCost: { korea: 2100, china: 2400, dubai: 1900 } },
  { id: 'tema', name: 'Tema/Accra', country: 'Ghana', flag: '🇬🇭', shippingCost: { korea: 2050, china: 2350, dubai: 1850 } },
  { id: 'lome', name: 'Lomé', country: 'Togo', flag: '🇹🇬', shippingCost: { korea: 2000, china: 2300, dubai: 1800 } },
  { id: 'cotonou', name: 'Cotonou', country: 'Bénin', flag: '🇧🇯', shippingCost: { korea: 2050, china: 2350, dubai: 1850 } },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', flag: '🇳🇬', shippingCost: { korea: 1950, china: 2250, dubai: 1750 } },
  { id: 'douala', name: 'Douala', country: 'Cameroun', flag: '🇨🇲', shippingCost: { korea: 1700, china: 2000, dubai: 1500 } },
  { id: 'libreville', name: 'Libreville', country: 'Gabon', flag: '🇬🇦', shippingCost: { korea: 1800, china: 2100, dubai: 1600 } },
  { id: 'port-gentil', name: 'Port-Gentil', country: 'Gabon', flag: '🇬🇦', shippingCost: { korea: 1850, china: 2150, dubai: 1650 } },
  { id: 'pointe-noire', name: 'Pointe-Noire', country: 'Congo', flag: '🇨🇬', shippingCost: { korea: 1900, china: 2200, dubai: 1700 } },
  { id: 'mombasa', name: 'Mombasa', country: 'Kenya', flag: '🇰🇪', shippingCost: { korea: 1600, china: 1900, dubai: 1400 } },
  { id: 'dar-es-salaam', name: 'Dar es Salaam', country: 'Tanzanie', flag: '🇹🇿', shippingCost: { korea: 1650, china: 1950, dubai: 1450 } },
  { id: 'durban', name: 'Durban', country: 'Afrique du Sud', flag: '🇿🇦', shippingCost: { korea: 1800, china: 2100, dubai: 1600 } },
  { id: 'casablanca', name: 'Casablanca', country: 'Maroc', flag: '🇲🇦', shippingCost: { korea: 2200, china: 2500, dubai: 1800 } },
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
      return NextResponse.json({ destinations: DEFAULT_DESTINATIONS });
    }

    if (!routes || routes.length === 0) {
      return NextResponse.json({ destinations: DEFAULT_DESTINATIONS });
    }

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

    return NextResponse.json({ destinations });
  } catch (error) {
    console.error('Error fetching shipping routes:', error);
    return NextResponse.json({ destinations: DEFAULT_DESTINATIONS });
  }
}
