import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Client Supabase admin
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey);
}

// GET - List vehicles with filters
export async function GET(request: NextRequest) {
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

  try {
    let query = supabase
      .from('vehicles')
      .select('*', { count: 'exact' });

    // Apply filters
    if (source && source !== 'all') {
      query = query.eq('source', source);
    }

    if (status && status !== 'all') {
      if (status === 'sold') {
        query = query.or('status.eq.sold,auction_status.eq.sold');
      } else {
        query = query.eq('status', status);
      }
    }

    if (isVisible !== null && isVisible !== 'all') {
      query = query.eq('is_visible', isVisible === 'true');
    }

    if (search) {
      query = query.or(`make.ilike.%${search}%,model.ilike.%${search}%,source_id.ilike.%${search}%`);
    }

    // Apply sorting
    const ascending = sortOrder === 'asc';
    query = query.order(sortBy, { ascending, nullsFirst: false });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      vehicles: data,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update vehicle(s)
export async function PATCH(request: NextRequest) {
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
