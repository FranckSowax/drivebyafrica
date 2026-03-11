import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Force dynamic rendering — prevent Next.js from caching this route handler
export const dynamic = 'force-dynamic';

/**
 * Sanitize search input for PostgREST ILIKE patterns.
 * Remove characters that break .or() syntax: parentheses, commas, dots, backslashes.
 */
function sanitizeSearch(input: string): string {
  return input
    .replace(/[(),.*\\%_]/g, ' ')  // Remove PostgREST special chars
    .replace(/\s+/g, ' ')          // Collapse multiple spaces
    .trim();
}

const SELECT_COLUMNS = [
  'id', 'source', 'source_id', 'source_url', 'make', 'model', 'grade',
  'year', 'mileage', 'start_price_usd', 'current_price_usd', 'buy_now_price_usd',
  'fob_price_usd',
  'fuel_type', 'transmission', 'drive_type', 'body_type', 'color', 'engine_cc',
  'images', 'status', 'auction_status', 'auction_platform', 'auction_date',
  'is_visible', 'created_at', 'updated_at',
].join(',');

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
  'Netlify-Vary': 'query',
};

/**
 * Check if any meaningful filter is active (narrows results beyond default)
 */
function hasActiveFilters(params: URLSearchParams): boolean {
  const filterKeys = [
    'source', 'makes', 'models', 'yearFrom', 'yearTo',
    'priceFrom', 'priceTo', 'mileageMax', 'transmission',
    'fuelType', 'driveType', 'bodyType', 'color', 'status',
    'newArrivals', 'search',
  ];
  return filterKeys.some((key) => {
    const val = params.get(key);
    if (!val) return false;
    if (key === 'source' && val === 'all') return false;
    return true;
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '36', 10)), 100);
  const offset = (page - 1) * limit;
  const sortBy = searchParams.get('sortBy') || 'newest';
  const filtersActive = hasActiveFilters(searchParams);

  try {
    let query = supabaseAdmin
      .from('vehicles')
      .select(SELECT_COLUMNS, { count: filtersActive ? 'exact' : 'estimated' })
      .eq('is_visible', true);

    // Search (ILIKE on make, model, and grade)
    const rawSearch = searchParams.get('search')?.trim();
    const search = rawSearch ? sanitizeSearch(rawSearch) : null;
    if (search && search.length >= 2) {
      query = query.or(`make.ilike.%${search}%,model.ilike.%${search}%,grade.ilike.%${search}%`);
    }

    // Source filter
    const source = searchParams.get('source');
    if (source && source !== 'all') query = query.eq('source', source);

    // Makes filter
    const makes = searchParams.get('makes');
    if (makes) query = query.in('make', makes.split(','));

    // Models filter
    const models = searchParams.get('models');
    if (models) query = query.in('model', models.split(','));

    // Year range
    const yearFrom = searchParams.get('yearFrom');
    if (yearFrom) query = query.gte('year', parseInt(yearFrom, 10));

    const yearTo = searchParams.get('yearTo');
    if (yearTo) query = query.lte('year', parseInt(yearTo, 10));

    // Price range (fob_price_usd, NOT current_price_usd)
    const priceFrom = searchParams.get('priceFrom');
    if (priceFrom) query = query.gte('fob_price_usd', parseInt(priceFrom, 10));

    const priceTo = searchParams.get('priceTo');
    if (priceTo) query = query.lte('fob_price_usd', parseInt(priceTo, 10));

    // Mileage
    const mileageMax = searchParams.get('mileageMax');
    if (mileageMax) query = query.lte('mileage', parseInt(mileageMax, 10));

    // Transmission
    const transmission = searchParams.get('transmission');
    if (transmission) query = query.eq('transmission', transmission);

    // Fuel type
    const fuelType = searchParams.get('fuelType');
    if (fuelType) query = query.eq('fuel_type', fuelType);

    // Drive type
    const driveType = searchParams.get('driveType');
    if (driveType) query = query.eq('drive_type', driveType);

    // Body type
    const bodyType = searchParams.get('bodyType');
    if (bodyType) query = query.eq('body_type', bodyType);

    // Color
    const color = searchParams.get('color');
    if (color) query = query.ilike('color', `%${color}%`);

    // Status
    const statusFilter = searchParams.get('status');
    if (statusFilter) query = query.eq('status', statusFilter);

    // New arrivals (last 48h)
    if (searchParams.get('newArrivals') === 'true') {
      const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      query = query.gte('created_at', since);
    }

    // Sorting — secondary sort uses id DESC to match existing composite indexes
    switch (sortBy) {
      case 'price_asc':
        query = query.order('fob_price_usd', { ascending: true, nullsFirst: false });
        break;
      case 'price_desc':
        query = query.order('fob_price_usd', { ascending: false, nullsFirst: false });
        break;
      case 'year_desc':
        query = query.order('year', { ascending: false, nullsFirst: false });
        break;
      case 'year_asc':
        query = query.order('year', { ascending: true, nullsFirst: false });
        break;
      case 'mileage_asc':
        query = query.order('mileage', { ascending: true, nullsFirst: false });
        break;
      case 'mileage_desc':
        query = query.order('mileage', { ascending: false, nullsFirst: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    // Secondary sort for stable pagination (id correlates with created_at)
    query = query.order('id', { ascending: false });

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('[vehicles/list] Supabase error:', error);
      return NextResponse.json(
        { vehicles: [], totalCount: 0, error: error.message },
        { status: 500, headers: CACHE_HEADERS }
      );
    }

    const vehicles = data || [];
    const totalCount = count ?? (vehicles.length === limit ? vehicles.length * 100 : vehicles.length);

    return NextResponse.json(
      { vehicles, totalCount },
      { headers: CACHE_HEADERS }
    );
  } catch (err) {
    console.error('[vehicles/list] Unexpected error:', err);
    return NextResponse.json(
      { vehicles: [], totalCount: 0 },
      { status: 500, headers: CACHE_HEADERS }
    );
  }
}
