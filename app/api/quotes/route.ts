import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import {
  quoteRateLimiter,
  getClientIP,
  checkRateLimit,
  rateLimitResponse,
  isRateLimitConfigured,
} from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    // Rate limiting check (if configured)
    if (isRateLimitConfigured()) {
      const ip = getClientIP(request);
      const rateLimit = await checkRateLimit(quoteRateLimiter, ip);
      if (!rateLimit.success) {
        return rateLimitResponse(rateLimit.reset);
      }
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
    }

    console.log('Quote API: Received request body', body);

    // Insert quote into database
    console.log('Quote API: Inserting into Supabase');
    const { data, error } = await supabase.from('quotes').insert({
      quote_number: body.quote_number,
      user_id: user.id,
      vehicle_id: body.vehicle_id,
      vehicle_make: body.vehicle_make,
      vehicle_model: body.vehicle_model,
      vehicle_year: body.vehicle_year,
      vehicle_price_usd: Math.round(body.vehicle_price_usd),
      vehicle_source: body.vehicle_source,
      destination_id: body.destination_id,
      destination_name: body.destination_name,
      destination_country: body.destination_country,
      shipping_type: body.shipping_type || 'container',
      shipping_cost_xaf: Math.round(body.shipping_cost_xaf),
      insurance_cost_xaf: Math.round(body.insurance_cost_xaf),
      inspection_fee_xaf: Math.round(body.inspection_fee_xaf),
      total_cost_xaf: Math.round(body.total_cost_xaf),
      status: 'pending',
      valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }).select().single();

    if (error) {
      console.error('Quote API Supabase error:', error);
      // Table doesn't exist yet
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({ success: true, message: 'La table quotes n\'existe pas encore' });
      }
      // Check constraint violation - likely invalid vehicle_source or shipping_type
      if (error.code === '23514') {
        console.error('Quote API: Check constraint violation - invalid data:', {
          vehicle_source: body.vehicle_source,
          shipping_type: body.shipping_type,
        });
        return NextResponse.json({
          error: 'Données invalides',
          message: 'La source du véhicule ou le type d\'expédition est invalide',
          details: { vehicle_source: body.vehicle_source, shipping_type: body.shipping_type },
          code: error.code
        }, { status: 400 });
      }
      return NextResponse.json({
        error: 'Erreur Supabase',
        message: error.message,
        code: error.code
      }, { status: 400 });
    }

    console.log('Quote API: Successfully saved quote', data);
    return NextResponse.json({ success: true, quote: data });
  } catch (error) {
    console.error('Quote API server error:', error);
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const offset = (page - 1) * limit;

    // Build query with pagination
    let query = supabase
      .from('quotes')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: quotes, error, count } = await query;

    if (error) {
      console.error('Quote API Supabase error (GET):', error);
      // Table doesn't exist yet - return empty array
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({ quotes: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } });
      }
      // Permission denied - RLS policy issue, return empty array
      if (error.code === '42501' || error.message?.includes('permission denied')) {
        return NextResponse.json({ quotes: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Fetch vehicle images separately to avoid join issues
    let quotesWithImages = quotes || [];
    if (quotes && quotes.length > 0) {
      const vehicleIds = [...new Set(quotes.map(q => q.vehicle_id).filter(Boolean))];
      if (vehicleIds.length > 0) {
        const { data: vehicles } = await supabase
          .from('vehicles')
          .select('id, images')
          .in('id', vehicleIds);

        if (vehicles) {
          const vehicleMap = new Map(vehicles.map(v => [v.id, v.images]));
          quotesWithImages = quotes.map(q => ({
            ...q,
            vehicles: q.vehicle_id && vehicleMap.has(q.vehicle_id)
              ? { images: vehicleMap.get(q.vehicle_id) }
              : null
          }));
        }
      }
    }

    // Get user-specific stats using database function if available
    let stats = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: statsData, error: rpcError } = await (supabase.rpc as any)('get_user_quote_stats', { p_user_id: user.id });
      if (!rpcError && statsData) {
        stats = statsData;
      }
    } catch {
      // Function not available yet, skip stats
    }

    return NextResponse.json({
      quotes: quotesWithImages,
      stats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasMore: offset + (quotesWithImages?.length || 0) < (count || 0),
      },
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Quote API server error (GET):', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const quoteId = searchParams.get('id');

    if (!quoteId) {
      return NextResponse.json({ error: 'ID du devis requis' }, { status: 400 });
    }

    // First, verify the quote belongs to the user and check its status
    const { data: quote, error: fetchError } = await supabase
      .from('quotes')
      .select('id, status, user_id')
      .eq('id', quoteId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !quote) {
      return NextResponse.json({ error: 'Devis non trouvé' }, { status: 404 });
    }

    // Only allow deletion of pending or expired quotes
    if (quote.status === 'accepted') {
      return NextResponse.json(
        { error: 'Impossible de supprimer un devis accepté' },
        { status: 400 }
      );
    }

    // Delete the quote
    const { error: deleteError } = await supabase
      .from('quotes')
      .delete()
      .eq('id', quoteId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Quote delete error:', deleteError);
      return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Devis supprimé avec succès' });
  } catch (error) {
    console.error('Quote API server error (DELETE):', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
