import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { requireAdmin } from '@/lib/auth/admin-check';

// Client Supabase admin
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey);
}

// Helper to apply filters to a query
function applyFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  params: {
    source?: string | null;
    status?: string | null;
    isVisible?: string | null;
    search?: string | null;
    priceMin?: number | null;
    priceMax?: number | null;
  }
) {
  if (params.source && params.source !== 'all') {
    query = query.eq('source', params.source);
  }

  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status);
  }

  if (params.isVisible !== null && params.isVisible !== 'all') {
    query = query.eq('is_visible', params.isVisible === 'true');
  }

  if (params.search) {
    query = query.or(`make.ilike.%${params.search}%,model.ilike.%${params.search}%,source_id.ilike.%${params.search}%`);
  }

  // Price filters (source price = start_price_usd)
  if (params.priceMin !== null && params.priceMin !== undefined) {
    query = query.gte('start_price_usd', params.priceMin);
  }

  if (params.priceMax !== null && params.priceMax !== undefined) {
    query = query.lte('start_price_usd', params.priceMax);
  }

  return query;
}

// POST - Create a vehicle manually
export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.isAdmin) {
    return adminCheck.response;
  }

  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();
    const {
      make,
      model,
      year,
      source,
      title,
      description,
      price,
      mileage,
      fuel_type,
      transmission,
      drive_type,
      engine_size,
      body_type,
      color,
      condition,
      images,
    } = body;

    if (!make || !model || !year || !source) {
      return NextResponse.json(
        { error: 'Make, model, year and source are required' },
        { status: 400 }
      );
    }

    const validSources = ['china', 'korea', 'dubai'];
    if (!validSources.includes(source)) {
      return NextResponse.json(
        { error: 'Source must be china, korea or dubai' },
        { status: 400 }
      );
    }

    const sourceId = `admin-${adminCheck.user.id.substring(0, 8)}-${Date.now()}`;
    const adminNotes = title ? `${title}${description ? '\n\n' + description : ''}` : (description || null);

    const { data: vehicle, error: createError } = await supabase
      .from('vehicles')
      .insert({
        source,
        source_id: sourceId,
        make,
        model,
        year,
        mileage: mileage || null,
        fuel_type: fuel_type || null,
        transmission: transmission || null,
        drive_type: drive_type || null,
        engine_cc: engine_size || null,
        body_type: body_type || null,
        color: color || null,
        grade: condition || null,
        images: images || [],
        start_price_usd: price || null,
        buy_now_price_usd: price || null,
        current_price_usd: price || null,
        status: 'available',
        is_visible: true,
        admin_notes: adminNotes,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating vehicle:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, vehicle });
  } catch (error) {
    console.error('Error creating vehicle:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - List vehicles with filters
export async function GET(request: NextRequest) {
  // Vérification admin obligatoire
  const adminCheck = await requireAdmin();
  if (!adminCheck.isAdmin) {
    return adminCheck.response;
  }

  const supabase = getSupabaseAdmin();
  const searchParams = request.nextUrl.searchParams;

  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const source = searchParams.get('source');
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const isVisible = searchParams.get('isVisible');
  const priceMinParam = searchParams.get('priceMin');
  const priceMaxParam = searchParams.get('priceMax');

  // Optimization: Ignore search if less than 2 characters to prevent DB timeout
  // on expensive wildcard queries like '%a%' or '%j%'
  const effectiveSearch = search && search.length >= 2 ? search : null;

  // Parse price filters
  const priceMin = priceMinParam ? parseInt(priceMinParam, 10) : null;
  const priceMax = priceMaxParam ? parseInt(priceMaxParam, 10) : null;

  const filterParams = {
    source,
    status,
    isVisible,
    search: effectiveSearch,
    priceMin: !isNaN(priceMin as number) ? priceMin : null,
    priceMax: !isNaN(priceMax as number) ? priceMax : null,
  };

  try {
    // Run count query and data query in parallel for better performance
    // Count query uses head: true to only get the count without fetching data
    let countQuery = supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true });
    countQuery = applyFilters(countQuery, filterParams);

    // Data query - select only needed columns for admin list view (faster than *)
    let dataQuery = supabase
      .from('vehicles')
      .select(`
        id,
        source_id,
        source,
        source_url,
        make,
        model,
        year,
        mileage,
        current_price_usd,
        start_price_usd,
        buy_now_price_usd,
        status,
        is_visible,
        images,
        created_at,
        updated_at
      `);
    dataQuery = applyFilters(dataQuery, filterParams);

    // Apply sorting
    const ascending = sortOrder === 'asc';
    dataQuery = dataQuery.order(sortBy, { ascending, nullsFirst: false });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    dataQuery = dataQuery.range(from, to);

    // Execute both queries in parallel
    const [countResult, dataResult] = await Promise.all([
      countQuery,
      dataQuery,
    ]);

    if (countResult.error) {
      console.error('Count query error:', countResult.error);
      return NextResponse.json({ error: countResult.error.message }, { status: 500 });
    }

    if (dataResult.error) {
      console.error('Data query error:', dataResult.error);
      return NextResponse.json({ error: dataResult.error.message }, { status: 500 });
    }

    const count = countResult.count || 0;

    return NextResponse.json({
      vehicles: dataResult.data || [],
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update vehicle(s)
export async function PATCH(request: NextRequest) {
  // Vérification admin obligatoire
  const adminCheck = await requireAdmin();
  if (!adminCheck.isAdmin) {
    return adminCheck.response;
  }

  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();
    const { ids, updates } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Vehicle IDs required' }, { status: 400 });
    }

    // Sanitize updates - only allow specific fields
    const allowedFields = ['status', 'is_visible', 'admin_notes', 'start_price_usd', 'current_price_usd'];
    const sanitizedUpdates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        sanitizedUpdates[field] = updates[field];
      }
    }

    sanitizedUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('vehicles')
      .update(sanitizedUpdates)
      .in('id', ids)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ updated: data?.length || 0, vehicles: data });
  } catch (error) {
    console.error('Error updating vehicles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete vehicle(s)
export async function DELETE(request: NextRequest) {
  // Vérification admin obligatoire
  const adminCheck = await requireAdmin();
  if (!adminCheck.isAdmin) {
    return adminCheck.response;
  }

  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Vehicle IDs required' }, { status: 400 });
    }

    const { error, count } = await supabase
      .from('vehicles')
      .delete()
      .in('id', ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ deleted: count || ids.length });
  } catch (error) {
    console.error('Error deleting vehicles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
