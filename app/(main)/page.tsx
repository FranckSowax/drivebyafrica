import { createClient } from '@/lib/supabase/server';
import { LandingContent } from '@/components/home/LandingContent';

const FEATURED_BRANDS = [
  'Jetour', 'Changan', 'Toyota', 'Haval', 'Zeekr', 'BYD', 'Geely',
  'JETOUR', 'CHANGAN', 'HAVAL', 'ZEEKR',
];

const VEHICLE_SELECT = [
  'id', 'source', 'source_id', 'source_url', 'make', 'model', 'grade',
  'year', 'mileage', 'start_price_usd', 'current_price_usd',
  'buy_now_price_usd', 'fuel_type', 'transmission', 'drive_type',
  'body_type', 'color', 'engine_cc', 'images', 'status',
  'auction_status', 'auction_platform', 'auction_date', 'is_visible',
  'created_at', 'updated_at', 'views_count', 'favorites_count',
].join(',');

async function getPopularVehicles() {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any;

    const { data, error } = await supabaseAny
      .from('vehicles')
      .select(VEHICLE_SELECT)
      .eq('status', 'available')
      .eq('is_visible', true)
      .in('make', FEATURED_BRANDS)
      .order('favorites_count', { ascending: false, nullsFirst: false })
      .order('views_count', { ascending: false, nullsFirst: false })
      .limit(6);

    if (error || !data || data.length === 0) {
      // Fallback: any popular vehicles
      const { data: fallback } = await supabaseAny
        .from('vehicles')
        .select(VEHICLE_SELECT)
        .eq('status', 'available')
        .eq('is_visible', true)
        .order('favorites_count', { ascending: false, nullsFirst: false })
        .order('views_count', { ascending: false, nullsFirst: false })
        .limit(6);

      return fallback || [];
    }

    return data;
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const popularVehicles = await getPopularVehicles();
  return <LandingContent initialVehicles={popularVehicles} />;
}
