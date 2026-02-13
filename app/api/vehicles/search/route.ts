import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const SEARCH_COLUMNS = [
  'id', 'source', 'source_id', 'source_url', 'make', 'model', 'grade',
  'year', 'mileage', 'start_price_usd', 'current_price_usd', 'buy_now_price_usd',
  'fuel_type', 'transmission', 'drive_type', 'body_type', 'color', 'engine_cc',
  'images', 'status', 'auction_status', 'auction_platform', 'auction_date',
  'is_visible', 'created_at', 'updated_at',
].join(',');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('q')?.trim() || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '36', 10), 100);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const sortBy = searchParams.get('sortBy') || 'newest';

  if (search.length < 2) {
    return NextResponse.json({ vehicles: [], totalCount: 0 });
  }

  try {
    let query = supabaseAdmin
      .from('vehicles')
      .select(SEARCH_COLUMNS, { count: 'estimated' })
      .eq('is_visible', true)
      .or(`make.ilike.%${search}%,model.ilike.%${search}%`);

    // Additional filters
    const source = searchParams.get('source');
    if (source && source !== 'all') query = query.eq('source', source);

    const makes = searchParams.get('makes');
    if (makes) query = query.in('make', makes.split(','));

    const models = searchParams.get('models');
    if (models) query = query.in('model', models.split(','));

    const yearFrom = searchParams.get('yearFrom');
    if (yearFrom) query = query.gte('year', parseInt(yearFrom, 10));

    const yearTo = searchParams.get('yearTo');
    if (yearTo) query = query.lte('year', parseInt(yearTo, 10));

    const priceFrom = searchParams.get('priceFrom');
    if (priceFrom) query = query.gte('current_price_usd', parseInt(priceFrom, 10));

    const priceTo = searchParams.get('priceTo');
    if (priceTo) query = query.lte('current_price_usd', parseInt(priceTo, 10));

    const mileageMax = searchParams.get('mileageMax');
    if (mileageMax) query = query.lte('mileage', parseInt(mileageMax, 10));

    const transmission = searchParams.get('transmission');
    if (transmission) query = query.eq('transmission', transmission);

    const fuelType = searchParams.get('fuelType');
    if (fuelType) query = query.eq('fuel_type', fuelType);

    const driveType = searchParams.get('driveType');
    if (driveType) query = query.eq('drive_type', driveType);

    const bodyType = searchParams.get('bodyType');
    if (bodyType) query = query.eq('body_type', bodyType);

    const color = searchParams.get('color');
    if (color) query = query.ilike('color', `%${color}%`);

    const statusFilter = searchParams.get('status');
    if (statusFilter) query = query.eq('status', statusFilter);

    if (searchParams.get('newArrivals') === 'true') {
      const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      query = query.gte('created_at', since);
    }

    // Sorting
    switch (sortBy) {
      case 'price_asc':
        query = query.order('start_price_usd', { ascending: true, nullsFirst: false });
        break;
      case 'price_desc':
        query = query.order('start_price_usd', { ascending: false, nullsFirst: true });
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
        query = query.order('mileage', { ascending: false, nullsFirst: true });
        break;
      default:
        query = query.order('id', { ascending: false });
    }

    // Secondary sort for consistency
    query = query.order('id', { ascending: false });

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json(
        { vehicles: [], totalCount: 0 },
        { status: 500 }
      );
    }

    const vehicles = data || [];
    const totalCount = count ?? (vehicles.length === limit ? vehicles.length * 100 : vehicles.length);

    return NextResponse.json({ vehicles, totalCount });
  } catch {
    return NextResponse.json(
      { vehicles: [], totalCount: 0 },
      { status: 500 }
    );
  }
}
