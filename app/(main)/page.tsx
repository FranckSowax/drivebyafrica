import { LandingContent } from '@/components/home/LandingContent';

const FEATURED_BRANDS = [
  'Jetour', 'Changan', 'Toyota', 'Haval', 'Zeekr', 'BYD', 'Geely',
  'JETOUR', 'CHANGAN', 'HAVAL', 'ZEEKR',
];

const VEHICLE_COLUMNS = [
  'id', 'source', 'source_id', 'source_url', 'make', 'model', 'grade',
  'year', 'mileage', 'start_price_usd', 'current_price_usd',
  'buy_now_price_usd', 'fuel_type', 'transmission', 'drive_type',
  'body_type', 'color', 'engine_cc', 'images', 'status',
  'auction_status', 'auction_platform', 'auction_date', 'is_visible',
  'created_at', 'updated_at', 'views_count', 'favorites_count',
].join(',');

async function getPopularVehicles() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return [];

  try {
    // Direct REST call — no cookies needed for public data
    const params = new URLSearchParams();
    params.set('select', VEHICLE_COLUMNS);
    params.set('status', 'eq.available');
    params.set('is_visible', 'eq.true');
    params.set('make', `in.(${FEATURED_BRANDS.join(',')})`);
    params.set('order', 'favorites_count.desc.nullslast,views_count.desc.nullslast');
    params.set('limit', '6');

    const res = await fetch(`${supabaseUrl}/rest/v1/vehicles?${params}`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      next: { revalidate: 300 }, // ISR: revalidate every 5 minutes
    });

    if (!res.ok) throw new Error(`Supabase ${res.status}`);
    const vehicles = await res.json();

    if (vehicles && vehicles.length > 0) return vehicles;

    // Fallback: any popular vehicles (no brand filter)
    const fallbackParams = new URLSearchParams();
    fallbackParams.set('select', VEHICLE_COLUMNS);
    fallbackParams.set('status', 'eq.available');
    fallbackParams.set('is_visible', 'eq.true');
    fallbackParams.set('order', 'favorites_count.desc.nullslast,views_count.desc.nullslast');
    fallbackParams.set('limit', '6');

    const fallbackRes = await fetch(`${supabaseUrl}/rest/v1/vehicles?${fallbackParams}`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      next: { revalidate: 300 },
    });

    if (!fallbackRes.ok) return [];
    return await fallbackRes.json();
  } catch (e) {
    console.error('Failed to fetch popular vehicles:', e);
    return [];
  }
}

export default async function HomePage() {
  const popularVehicles = await getPopularVehicles();
  return <LandingContent initialVehicles={popularVehicles} />;
}
