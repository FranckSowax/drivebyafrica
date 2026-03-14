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
 * Determine count strategy based on filter type.
 * - Search (ILIKE) queries are expensive → always use estimated count
 * - Simple equality filters → use exact count
 * - No filters → use estimated count
 */
function getCountStrategy(params: URLSearchParams): 'exact' | 'estimated' {
  const search = params.get('search')?.trim();
  // ILIKE search on 190k+ rows with exact count = timeout
  // Always use estimated for search queries
  if (search && search.length >= 2) return 'estimated';

  const filterKeys = [
    'source', 'makes', 'models', 'yearFrom', 'yearTo',
    'priceFrom', 'priceTo', 'mileageMax', 'transmission',
    'fuelType', 'driveType', 'bodyType', 'color', 'status',
    'newArrivals',
  ];
  const hasFilter = filterKeys.some((key) => {
    const val = params.get(key);
    if (!val) return false;
    if (key === 'source' && val === 'all') return false;
    return true;
  });
  return hasFilter ? 'exact' : 'estimated';
}

/**
 * Build and apply filters to a Supabase query.
 */
function applyFilters(
  query: ReturnType<ReturnType<typeof supabaseAdmin.from>['select']>,
  searchParams: URLSearchParams,
  search: string | null,
) {
  // Search — progressive strategy:
  // Short terms (3-4 chars): search make + model only (faster, uses trigram indexes better)
  // Longer terms (5+): search make + model + grade
  if (search && search.length >= 3) {
    if (search.length <= 4) {
      query = query.or(`make.ilike.%${search}%,model.ilike.%${search}%`);
    } else {
      query = query.or(`make.ilike.%${search}%,model.ilike.%${search}%,grade.ilike.%${search}%`);
    }
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

  // Year range — year=0 means "unknown", treat as most recent
  const yearFrom = searchParams.get('yearFrom');
  if (yearFrom) {
    query = query.or(`year.gte.${parseInt(yearFrom, 10)},year.eq.0`);
  }

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

  return query;
}

/**
 * Apply sorting to a query.
 */
function applySorting(
  query: ReturnType<ReturnType<typeof supabaseAdmin.from>['select']>,
  sortBy: string,
) {
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

  return query;
}

/**
 * Check if an error is a statement timeout.
 */
function isTimeoutError(error: { message?: string; code?: string }): boolean {
  const msg = (error.message || '').toLowerCase();
  return msg.includes('statement timeout') || msg.includes('canceling statement') || error.code === '57014';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '36', 10)), 100);
  const offset = (page - 1) * limit;
  const sortBy = searchParams.get('sortBy') || 'newest';

  const rawSearch = searchParams.get('search')?.trim();
  const search = rawSearch ? sanitizeSearch(rawSearch) : null;
  const countStrategy = getCountStrategy(searchParams);

  try {
    // --- Attempt 1: full query with count ---
    let query = supabaseAdmin
      .from('vehicles')
      .select(SELECT_COLUMNS, { count: countStrategy })
      .eq('is_visible', true);

    query = applyFilters(query, searchParams, search);
    query = applySorting(query, sortBy);
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error && isTimeoutError(error)) {
      // --- Attempt 2: retry WITHOUT count (fastest possible) ---
      console.warn('[vehicles/list] Query timed out, retrying without count...');
      let retryQuery = supabaseAdmin
        .from('vehicles')
        .select(SELECT_COLUMNS)
        .eq('is_visible', true);

      retryQuery = applyFilters(retryQuery, searchParams, search);
      retryQuery = applySorting(retryQuery, sortBy);
      retryQuery = retryQuery.range(offset, offset + limit - 1);

      const { data: retryData, error: retryError } = await retryQuery;

      if (retryError) {
        console.error('[vehicles/list] Retry also failed:', retryError);
        return NextResponse.json(
          { vehicles: [], totalCount: 0, error: 'La recherche a pris trop de temps. Essayez avec un terme plus précis.' },
          { status: 504, headers: CACHE_HEADERS }
        );
      }

      const vehicles = retryData || [];
      // Without count, estimate based on whether we got a full page
      const estimatedCount = vehicles.length === limit ? (page * limit) + limit : offset + vehicles.length;

      return NextResponse.json(
        { vehicles, totalCount: estimatedCount },
        { headers: CACHE_HEADERS }
      );
    }

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
      { vehicles: [], totalCount: 0, error: 'Erreur inattendue. Veuillez réessayer.' },
      { status: 500, headers: CACHE_HEADERS }
    );
  }
}
