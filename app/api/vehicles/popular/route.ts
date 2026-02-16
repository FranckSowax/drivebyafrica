import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Exact brand names for fast in() query (no ilike on 190k+ rows)
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

export async function GET() {
  try {
    const supabase = await createClient();

    // Query featured brands, sorted by popularity
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any;
    const { data: vehicles, error } = await supabaseAny
      .from('vehicles')
      .select(VEHICLE_SELECT)
      .eq('status', 'available')
      .eq('is_visible', true)
      .in('make', FEATURED_BRANDS)
      .order('favorites_count', { ascending: false, nullsFirst: false })
      .order('views_count', { ascending: false, nullsFirst: false })
      .limit(12);

    if (error) {
      console.error('Popular vehicles API error:', error);
      return NextResponse.json({ vehicles: [] }, {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
      });
    }

    let results: any[] = vehicles || [];

    // Fallback: if no featured brands found, get any popular vehicles
    if (results.length === 0) {
      const { data: fallback } = await supabaseAny
        .from('vehicles')
        .select(VEHICLE_SELECT)
        .eq('status', 'available')
        .eq('is_visible', true)
        .order('favorites_count', { ascending: false, nullsFirst: false })
        .order('views_count', { ascending: false, nullsFirst: false })
        .limit(6);

      results = fallback || [];
    }

    // Score and pick top 6
    const scored = results.map((v: any) => ({
      vehicle: v,
      score: (v.views_count || 0) + ((v.favorites_count || 0) * 3),
    }));
    scored.sort((a: any, b: any) => b.score - a.score);
    const top = scored.slice(0, 6).map((s: any) => s.vehicle);

    return NextResponse.json({ vehicles: top }, {
      headers: {
        // Cache 5 min at CDN, serve stale for 10 min while revalidating
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Popular vehicles API server error:', error);
    return NextResponse.json({ vehicles: [] }, { status: 500 });
  }
}
