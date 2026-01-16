import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Default shipping routes (used if database table doesn't exist) - prices doubled
const DEFAULT_ROUTES = [
  { id: '1', destination_id: 'libreville', destination_name: 'Libreville', destination_country: 'Gabon', destination_flag: '🇬🇦', korea_cost_usd: 3600, china_cost_usd: 4200, dubai_cost_usd: 3200, is_active: true },
  { id: '2', destination_id: 'port-gentil', destination_name: 'Port-Gentil', destination_country: 'Gabon', destination_flag: '🇬🇦', korea_cost_usd: 3700, china_cost_usd: 4300, dubai_cost_usd: 3300, is_active: true },
  { id: '3', destination_id: 'douala', destination_name: 'Douala', destination_country: 'Cameroun', destination_flag: '🇨🇲', korea_cost_usd: 3400, china_cost_usd: 4000, dubai_cost_usd: 3000, is_active: true },
  { id: '4', destination_id: 'pointe-noire', destination_name: 'Pointe-Noire', destination_country: 'Congo', destination_flag: '🇨🇬', korea_cost_usd: 3800, china_cost_usd: 4400, dubai_cost_usd: 3400, is_active: true },
  { id: '5', destination_id: 'abidjan', destination_name: 'Abidjan', destination_country: "Côte d'Ivoire", destination_flag: '🇨🇮', korea_cost_usd: 4200, china_cost_usd: 4800, dubai_cost_usd: 3800, is_active: true },
  { id: '6', destination_id: 'dakar', destination_name: 'Dakar', destination_country: 'Sénégal', destination_flag: '🇸🇳', korea_cost_usd: 4600, china_cost_usd: 5200, dubai_cost_usd: 4200, is_active: true },
  { id: '7', destination_id: 'lome', destination_name: 'Lomé', destination_country: 'Togo', destination_flag: '🇹🇬', korea_cost_usd: 4000, china_cost_usd: 4600, dubai_cost_usd: 3600, is_active: true },
  { id: '8', destination_id: 'cotonou', destination_name: 'Cotonou', destination_country: 'Bénin', destination_flag: '🇧🇯', korea_cost_usd: 4100, china_cost_usd: 4700, dubai_cost_usd: 3700, is_active: true },
];

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

export async function GET() {
  try {
    const supabase = await createUntypedClient();

    // Try to fetch from shipping_routes table
    const { data: routes, error } = await supabase
      .from('shipping_routes')
      .select('*')
      .order('destination_name');

    if (error) {
      // If table doesn't exist, return defaults
      // PostgreSQL error 42P01 or PostgREST error PGRST205
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return NextResponse.json({ routes: DEFAULT_ROUTES, lastUpdatedAt: null });
      }
      throw error;
    }

    // Find the most recent updated_at date
    let lastUpdatedAt: string | null = null;
    if (routes && routes.length > 0) {
      const dates = routes
        .map((r: { updated_at?: string }) => r.updated_at)
        .filter((d): d is string => Boolean(d))
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      lastUpdatedAt = dates[0] || null;
    }

    return NextResponse.json({
      routes: routes && routes.length > 0 ? routes : DEFAULT_ROUTES,
      lastUpdatedAt,
    });
  } catch (error) {
    console.error('Error fetching shipping routes:', error);
    return NextResponse.json({ routes: DEFAULT_ROUTES, lastUpdatedAt: null });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createUntypedClient();
    const { routes } = await request.json();

    // Try to upsert routes
    const { error } = await supabase
      .from('shipping_routes')
      .upsert(
        routes.map((route: Record<string, unknown>) => ({
          id: route.id,
          destination_id: route.destination_id,
          destination_name: route.destination_name,
          destination_country: route.destination_country,
          destination_flag: route.destination_flag,
          korea_cost_usd: route.korea_cost_usd,
          china_cost_usd: route.china_cost_usd,
          dubai_cost_usd: route.dubai_cost_usd,
          is_active: route.is_active,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'id' }
      );

    if (error) {
      // If table doesn't exist, return success anyway (using in-memory defaults)
      // PostgreSQL error 42P01 or PostgREST error PGRST205
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return NextResponse.json({
          success: true,
          message: 'Shipping routes table not set up yet. Using defaults.'
        });
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving shipping routes:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la sauvegarde' },
      { status: 500 }
    );
  }
}
