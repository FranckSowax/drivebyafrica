import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Database } from '@/types/database';

async function createSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
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

// Order statuses for tracking
const ORDER_STATUSES = [
  'deposit_paid',      // Acompte payé
  'vehicle_purchased', // Véhicule acheté
  'in_transit',        // En transit vers le port
  'at_port',           // Au port d'origine
  'shipping',          // En mer
  'customs',           // En douane
  'ready_pickup',      // Prêt pour retrait
  'delivered',         // Livré
] as const;

// GET: Fetch all orders (from accepted quotes)
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const offset = (page - 1) * limit;

    // Get accepted quotes as orders
    let query = supabase
      .from('quotes')
      .select(`
        id,
        quote_number,
        user_id,
        vehicle_id,
        vehicle_make,
        vehicle_model,
        vehicle_year,
        vehicle_price_usd,
        vehicle_source,
        destination_id,
        destination_name,
        destination_country,
        shipping_type,
        shipping_cost_xaf,
        insurance_cost_xaf,
        inspection_fee_xaf,
        total_cost_xaf,
        status,
        created_at,
        updated_at
      `, { count: 'exact' })
      .eq('status', 'accepted')
      .order('updated_at', { ascending: false });

    if (search) {
      query = query.or(`quote_number.ilike.%${search}%,vehicle_make.ilike.%${search}%,vehicle_model.ilike.%${search}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: quotes, error, count } = await query;

    if (error) {
      throw error;
    }

    // Get user profiles for these orders
    const userIds = [...new Set(quotes?.map(q => q.user_id) || [])];
    let profiles: Record<string, { full_name: string | null; phone: string | null; whatsapp_number: string | null; country: string | null }> = {};

    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, phone, whatsapp_number, country')
        .in('id', userIds);

      if (profilesData) {
        profiles = profilesData.reduce((acc, p) => {
          acc[p.id] = {
            full_name: p.full_name,
            phone: p.phone,
            whatsapp_number: p.whatsapp_number,
            country: p.country,
          };
          return acc;
        }, {} as typeof profiles);
      }
    }

    // Get order tracking data if exists (table may not exist yet)
    const quoteIds = quotes?.map(q => q.id) || [];
    const orderTracking: Record<string, { order_status: string; tracking_steps: unknown; shipping_eta: string | null }> = {};

    if (quoteIds.length > 0) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: trackingData } = await (supabase as any)
          .from('order_tracking')
          .select('quote_id, order_status, tracking_steps, shipping_eta')
          .in('quote_id', quoteIds);

        if (trackingData && Array.isArray(trackingData)) {
          trackingData.forEach((t: { quote_id: string; order_status: string; tracking_steps: unknown; shipping_eta: string | null }) => {
            orderTracking[t.quote_id] = {
              order_status: t.order_status,
              tracking_steps: t.tracking_steps,
              shipping_eta: t.shipping_eta,
            };
          });
        }
      } catch {
        // Table may not exist yet, continue without tracking data
      }
    }

    // Enrich orders with user info and tracking
    const enrichedOrders = quotes?.map(q => ({
      ...q,
      order_number: `ORD-${q.quote_number?.replace('QT-', '')}`,
      customer_name: profiles[q.user_id]?.full_name || 'Client',
      customer_phone: profiles[q.user_id]?.phone || '',
      customer_whatsapp: profiles[q.user_id]?.whatsapp_number || profiles[q.user_id]?.phone || '',
      customer_country: profiles[q.user_id]?.country || q.destination_country,
      order_status: orderTracking[q.id]?.order_status || 'deposit_paid',
      tracking_steps: orderTracking[q.id]?.tracking_steps || [],
      shipping_eta: orderTracking[q.id]?.shipping_eta || null,
      deposit_amount_usd: 1000,
    })) || [];

    // Filter by order status if specified
    let filteredOrders = enrichedOrders;
    if (status && status !== 'all') {
      filteredOrders = enrichedOrders.filter(o => o.order_status === status);
    }

    // Calculate stats
    const stats = {
      total: enrichedOrders.length,
      deposit_paid: enrichedOrders.filter(o => o.order_status === 'deposit_paid').length,
      vehicle_purchased: enrichedOrders.filter(o => o.order_status === 'vehicle_purchased').length,
      in_transit: enrichedOrders.filter(o => o.order_status === 'in_transit').length,
      shipping: enrichedOrders.filter(o => o.order_status === 'shipping').length,
      delivered: enrichedOrders.filter(o => o.order_status === 'delivered').length,
      totalDeposits: enrichedOrders.length * 1000,
    };

    return NextResponse.json({
      orders: filteredOrders,
      stats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des commandes' },
      { status: 500 }
    );
  }
}

// PUT: Update order tracking status
export async function PUT(request: Request) {
  try {
    const supabase = await createSupabaseClient();
    const body = await request.json();
    const { quoteId, orderStatus, note, eta } = body;

    if (!quoteId || !orderStatus) {
      return NextResponse.json(
        { error: 'Quote ID et statut requis' },
        { status: 400 }
      );
    }

    // Validate status
    if (!ORDER_STATUSES.includes(orderStatus)) {
      return NextResponse.json(
        { error: 'Statut invalide' },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any;

    // Check if tracking record exists
    const { data: existingTracking } = await supabaseAny
      .from('order_tracking')
      .select('*')
      .eq('quote_id', quoteId)
      .single();

    const now = new Date().toISOString();
    const newStep = {
      status: orderStatus,
      timestamp: now,
      note: note || null,
    };

    if (existingTracking) {
      // Update existing tracking
      const existingSteps = Array.isArray(existingTracking.tracking_steps)
        ? existingTracking.tracking_steps
        : [];

      const { data, error } = await supabaseAny
        .from('order_tracking')
        .update({
          order_status: orderStatus,
          tracking_steps: [...existingSteps, newStep],
          shipping_eta: eta || existingTracking.shipping_eta,
          updated_at: now,
        })
        .eq('quote_id', quoteId)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, tracking: data });
    } else {
      // Create new tracking record
      const { data, error } = await supabaseAny
        .from('order_tracking')
        .insert({
          quote_id: quoteId,
          order_status: orderStatus,
          tracking_steps: [newStep],
          shipping_eta: eta || null,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, tracking: data });
    }
  } catch (error) {
    console.error('Error updating order tracking:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du suivi' },
      { status: 500 }
    );
  }
}
