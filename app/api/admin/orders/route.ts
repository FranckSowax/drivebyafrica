import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-check';
import { logCollaboratorActivity } from '@/lib/auth/collaborator-check';
import { enqueueStatusNotification } from '@/lib/notifications/enqueue-status-notification';
import { notifyCollaborators } from '@/lib/notifications/bidirectional-notifications';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Order statuses for tracking (13-step workflow)
const ORDER_STATUSES = [
  'deposit_paid',          // 1. Acompte payé
  'vehicle_locked',        // 2. Véhicule bloqué
  'inspection_sent',       // 3. Inspection envoyée
  'full_payment_received', // 4. Totalité du paiement reçu
  'vehicle_purchased',     // 5. Véhicule acheté
  'export_customs',        // 6. Douane export
  'in_transit',            // 7. En transit
  'at_port',               // 8. Au port
  'shipping',              // 9. En mer
  'documents_ready',       // 10. Remise documentation
  'customs',               // 11. En douane
  'ready_pickup',          // 12. Prêt pour retrait
  'delivered',             // 13. Livré
  'processing',            // Legacy: processing = vehicle_locked
] as const;

// GET: Fetch all orders from orders table + accepted quotes (hybrid approach)
export async function GET(request: Request) {
  try {
    // Vérification admin obligatoire
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAdmin) {
      return adminCheck.response;
    }

    const supabase = adminCheck.supabase;
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const offset = (page - 1) * limit;

    // First, get orders from the orders table (created when user validates quote)
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (ordersError && ordersError.code !== '42P01') {
      console.error('Error fetching orders:', ordersError);
    }

    const orders = ordersData || [];

    // Get accepted quotes that don't have an order yet (legacy support)
    const orderQuoteIds = orders.filter(o => o.quote_id).map(o => o.quote_id);

    let quotesQuery = supabase
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
      `)
      .eq('status', 'accepted')
      .order('updated_at', { ascending: false });

    // Exclude quotes that already have orders
    if (orderQuoteIds.length > 0) {
      quotesQuery = quotesQuery.not('id', 'in', `(${orderQuoteIds.join(',')})`);
    }

    const { data: quotes, error: quotesError } = await quotesQuery;

    if (quotesError) {
      console.error('Error fetching quotes:', quotesError);
    }

    // Collect all user IDs
    const userIds = [...new Set([
      ...orders.map(o => o.user_id),
      ...(quotes?.map(q => q.user_id) || [])
    ])];

    // Collect all vehicle IDs from orders
    const vehicleIds = [...new Set(orders.map(o => o.vehicle_id).filter(Boolean))];

    // Collect all quote IDs from orders for enrichment
    const quoteIdsFromOrders = [...new Set(orders.filter(o => o.quote_id).map(o => o.quote_id).filter((id): id is string => id !== null))];

    // Fetch profiles
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

    // Fetch vehicles for orders
    let vehicles: Record<string, { make: string | null; model: string | null; year: number | null; source: string | null; images: string[] | null; source_url: string | null }> = {};
    if (vehicleIds.length > 0) {
      const { data: vehiclesData } = await supabase
        .from('vehicles')
        .select('id, make, model, year, source, images, source_url')
        .in('id', vehicleIds);

      if (vehiclesData) {
        vehicles = vehiclesData.reduce((acc, v) => {
          acc[v.id] = {
            make: v.make,
            model: v.model,
            year: v.year,
            source: v.source,
            images: v.images,
            source_url: v.source_url,
          };
          return acc;
        }, {} as typeof vehicles);
      }
    }

    // Fetch quotes for order enrichment (shipping/insurance info + quote_number)
    let quotesMap: Record<string, { shipping_cost_xaf: number | null; insurance_cost_xaf: number | null; total_cost_xaf: number | null; quote_number: string | null }> = {};
    if (quoteIdsFromOrders.length > 0) {
      const { data: quotesForOrders } = await supabase
        .from('quotes')
        .select('id, shipping_cost_xaf, insurance_cost_xaf, total_cost_xaf, quote_number')
        .in('id', quoteIdsFromOrders);

      if (quotesForOrders) {
        quotesMap = quotesForOrders.reduce((acc, q) => {
          acc[q.id] = {
            shipping_cost_xaf: q.shipping_cost_xaf,
            insurance_cost_xaf: q.insurance_cost_xaf,
            total_cost_xaf: q.total_cost_xaf,
            quote_number: q.quote_number,
          };
          return acc;
        }, {} as typeof quotesMap);
      }
    }

    // Fetch modifier profiles (collaborators/admins who modified orders)
    const modifierIds = [...new Set(orders.map(o => o.last_modified_by).filter((id): id is string => id !== null))];
    let modifierProfiles: Record<string, { full_name: string | null; badge_color: string | null }> = {};
    if (modifierIds.length > 0) {
      const { data: modifiersData } = await supabase
        .from('profiles')
        .select('id, full_name, badge_color')
        .in('id', modifierIds);

      if (modifiersData) {
        modifierProfiles = modifiersData.reduce((acc, p) => {
          acc[p.id] = {
            full_name: p.full_name,
            badge_color: p.badge_color,
          };
          return acc;
        }, {} as typeof modifierProfiles);
      }
    }

    // Transform orders from orders table
    const transformedOrders = orders.map(o => {
      const vehicle = vehicles[o.vehicle_id] || {};
      const quote = o.quote_id ? quotesMap[o.quote_id] : null;
      const profile = profiles[o.user_id] || {};

      return {
        id: o.id,
        order_number: o.order_number || `ORD-${o.id.substring(0, 8).toUpperCase()}`,
        quote_number: quote?.quote_number || null, // Include original quote_number for search
        quote_id: o.quote_id,
        user_id: o.user_id,
        vehicle_id: o.vehicle_id,
        vehicle_make: vehicle.make || 'N/A',
        vehicle_model: vehicle.model || 'N/A',
        vehicle_year: vehicle.year || 0,
        vehicle_price_usd: o.vehicle_price_usd,
        vehicle_source: vehicle.source || 'china',
        vehicle_source_url: vehicle.source_url || null,
        vehicle_image_url: vehicle.images?.[0] || null,
        destination_country: o.destination_country,
        destination_name: o.destination_port || o.destination_city,
        shipping_cost_xaf: quote?.shipping_cost_xaf || null,
        insurance_cost_xaf: quote?.insurance_cost_xaf || null,
        total_cost_xaf: quote?.total_cost_xaf || null,
        customer_name: profile.full_name || 'Client',
        customer_phone: profile.phone || '',
        customer_whatsapp: profile.whatsapp_number || profile.phone || '',
        customer_country: profile.country || o.destination_country,
        order_status: o.status || 'processing',
        tracking_steps: [],
        shipping_eta: o.estimated_arrival || null,
        deposit_amount_usd: 1000,
        created_at: o.created_at,
        updated_at: o.updated_at,
        source: 'orders_table',
        isLegacyQuote: false,
        uploaded_documents: o.uploaded_documents || [],
        // Modifier tracking for collaborator badges
        last_modified_by: o.last_modified_by || null,
        last_modified_by_name: o.last_modified_by ? modifierProfiles[o.last_modified_by]?.full_name || null : null,
        last_modified_by_color: o.last_modified_by ? modifierProfiles[o.last_modified_by]?.badge_color || null : null,
        last_modified_at: o.last_modified_at || null,
      };
    });

    // Fetch vehicle source URLs for legacy quotes
    const legacyVehicleIds = [...new Set((quotes || []).map(q => q.vehicle_id).filter(Boolean))];
    let legacyVehicleSourceUrls: Record<string, string | null> = {};

    if (legacyVehicleIds.length > 0) {
      const { data: legacyVehiclesData } = await supabase
        .from('vehicles')
        .select('id, source_url')
        .in('id', legacyVehicleIds);

      if (legacyVehiclesData) {
        legacyVehicleSourceUrls = legacyVehiclesData.reduce((acc, v) => {
          acc[v.id] = v.source_url;
          return acc;
        }, {} as Record<string, string | null>);
      }
    }

    // Transform legacy quotes (quotes without orders)
    const transformedQuotes = (quotes || []).map(q => ({
      id: q.id,
      order_number: `ORD-${q.quote_number?.replace(/^(DBA-|QT-)/i, '') || q.id.slice(0, 8).toUpperCase()}`,
      quote_number: q.quote_number, // Keep original quote number for search
      quote_id: q.id,
      user_id: q.user_id,
      vehicle_id: q.vehicle_id,
      vehicle_make: q.vehicle_make,
      vehicle_model: q.vehicle_model,
      vehicle_year: q.vehicle_year,
      vehicle_price_usd: q.vehicle_price_usd,
      vehicle_source: q.vehicle_source,
      vehicle_source_url: q.vehicle_id ? legacyVehicleSourceUrls[q.vehicle_id] || null : null,
      vehicle_image_url: null,
      destination_country: q.destination_country,
      destination_name: q.destination_name,
      shipping_cost_xaf: q.shipping_cost_xaf,
      insurance_cost_xaf: q.insurance_cost_xaf,
      total_cost_xaf: q.total_cost_xaf,
      customer_name: profiles[q.user_id]?.full_name || 'Client',
      customer_phone: profiles[q.user_id]?.phone || '',
      customer_whatsapp: profiles[q.user_id]?.whatsapp_number || profiles[q.user_id]?.phone || '',
      customer_country: profiles[q.user_id]?.country || q.destination_country,
      order_status: 'deposit_paid',
      tracking_steps: [],
      shipping_eta: null,
      deposit_amount_usd: 1000,
      created_at: q.created_at,
      updated_at: q.updated_at,
      source: 'quotes_table',
      isLegacyQuote: true,
      uploaded_documents: [],
      // Legacy quotes don't have modifier tracking
      last_modified_by: null,
      last_modified_by_name: null,
      last_modified_by_color: null,
      last_modified_at: null,
    }));

    // Combine all orders
    let allOrders = [...transformedOrders, ...transformedQuotes];

    // Sort by created_at desc
    allOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Search filter - search by order_number, quote_number, vehicle, or customer
    if (search) {
      const searchLower = search.toLowerCase();
      allOrders = allOrders.filter(o => {
        const orderObj = o as typeof o & { quote_number?: string | null };
        return (
          orderObj.order_number?.toLowerCase().includes(searchLower) ||
          orderObj.quote_number?.toLowerCase().includes(searchLower) ||
          orderObj.vehicle_make?.toLowerCase().includes(searchLower) ||
          orderObj.vehicle_model?.toLowerCase().includes(searchLower) ||
          orderObj.customer_name?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Filter by order status if specified
    if (status && status !== 'all') {
      allOrders = allOrders.filter(o => o.order_status === status);
    }

    // Calculate stats before pagination
    const stats = {
      total: allOrders.length,
      deposit_paid: allOrders.filter(o => o.order_status === 'deposit_paid' || o.order_status === 'processing').length,
      vehicle_purchased: allOrders.filter(o => o.order_status === 'vehicle_purchased').length,
      in_transit: allOrders.filter(o => o.order_status === 'in_transit').length,
      shipping: allOrders.filter(o => o.order_status === 'shipping').length,
      delivered: allOrders.filter(o => o.order_status === 'delivered').length,
      totalDeposits: allOrders.length * 1000,
    };

    // Apply pagination
    const totalCount = allOrders.length;
    const paginatedOrders = allOrders.slice(offset, offset + limit);

    return NextResponse.json({
      orders: paginatedOrders,
      stats,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
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

// PUT: Update order status (supports both orders table and order_tracking)
export async function PUT(request: Request) {
  try {
    // Vérification admin obligatoire
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAdmin) {
      return adminCheck.response;
    }

    const supabase = adminCheck.supabase;

    // Create admin client for bidirectional notifications
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const body = await request.json();
    // Support both 'status' and 'orderStatus' field names
    const { orderId, quoteId, orderStatus: orderStatusField, status: statusField, note, notes, eta, sendWhatsApp = true } = body;
    const orderStatus = orderStatusField || statusField;
    const noteText = note || notes;

    // Support both orderId (new system) and quoteId (legacy)
    const targetId = orderId || quoteId;

    if (!targetId || !orderStatus) {
      return NextResponse.json(
        { error: 'Order ID et statut requis' },
        { status: 400 }
      );
    }

    // Validate status
    if (!ORDER_STATUSES.includes(orderStatus as typeof ORDER_STATUSES[number])) {
      return NextResponse.json(
        { error: 'Statut invalide' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // If orderId is provided, update the orders table directly
    if (orderId) {
      // Get order first
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchError) {
        console.error('Error fetching order:', fetchError);
        return NextResponse.json(
          { error: 'Commande non trouvée' },
          { status: 404 }
        );
      }

      if (!order) {
        return NextResponse.json(
          { error: 'Commande non trouvée' },
          { status: 404 }
        );
      }

      // Store old status for logging
      const oldStatus = order.status || 'processing';

      // Fetch profile separately for WhatsApp notification
      let profile: { full_name: string | null; whatsapp_number: string | null; phone: string | null } | null = null;
      if (order.user_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, whatsapp_number, phone')
          .eq('id', order.user_id)
          .single();
        profile = profileData;
      }

      // Fetch vehicle separately
      let vehicle: { make: string; model: string; year: number | null } | null = null;
      if (order.vehicle_id) {
        const { data: vehicleData } = await supabase
          .from('vehicles')
          .select('make, model, year')
          .eq('id', order.vehicle_id)
          .single();
        vehicle = vehicleData;
      }

      // Update order status in orders table (including last_modified_by tracking)
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: orderStatus,
          estimated_arrival: eta || null,
          updated_at: now,
          last_modified_by: adminCheck.user.id,
          last_modified_at: now,
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('Error updating order:', updateError);
        return NextResponse.json(
          { error: 'Erreur lors de la mise à jour de la commande' },
          { status: 500 }
        );
      }

      // Log activity for audit trail (admins use same activity log as collaborators)
      await logCollaboratorActivity(
        supabase,
        adminCheck.user.id,
        'status_update',
        {
          orderId,
          oldStatus,
          newStatus: orderStatus,
          note: noteText || undefined,
        },
        request
      );

      // Also create tracking entry if order has a quote_id
      // The order_tracking table uses quote_id, not order_id
      if (order?.quote_id) {
        // Check if tracking exists for this quote
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existingTrackingData } = await (supabase as any)
          .from('order_tracking')
          .select('id, tracking_steps')
          .eq('quote_id', order.quote_id)
          .single();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existingTracking = existingTrackingData as { id: string; tracking_steps: any[] } | null;

        const trackingStep = {
          status: orderStatus,
          timestamp: now,
          note: noteText || null,
          updated_by: 'admin',
        };

        if (existingTracking) {
          // Update existing tracking
          const existingSteps = Array.isArray(existingTracking.tracking_steps)
            ? existingTracking.tracking_steps
            : [];

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from('order_tracking')
            .update({
              order_status: orderStatus,
              tracking_steps: [...existingSteps, trackingStep],
              shipping_eta: eta || null,
              updated_at: now,
            })
            .eq('quote_id', order.quote_id);
        } else {
          // Create new tracking
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from('order_tracking')
            .insert({
              quote_id: order.quote_id,
              order_status: orderStatus,
              tracking_steps: [trackingStep],
              shipping_eta: eta || null,
            });
        }
      }

      // Enqueue WhatsApp notification (robust queue system with retries)
      let notificationResult: { success: boolean; queueId?: string; error?: string } = { success: false, error: 'Non envoyé' };
      if (sendWhatsApp && order) {
        const whatsappNumber = profile?.whatsapp_number || profile?.phone;

        if (whatsappNumber) {
          // Get uploaded documents for this status
          const uploadedDocs = Array.isArray(order.uploaded_documents)
            ? (order.uploaded_documents as { name: string; url: string; type: string; status?: string; visible_to_client?: boolean }[])
                .filter(d => d.status === orderStatus || !d.status)
                .map(d => ({
                  name: d.name,
                  url: d.url,
                  type: d.type as 'image' | 'pdf' | 'link',
                  visibleToClient: d.visible_to_client !== false
                }))
            : [];

          notificationResult = await enqueueStatusNotification({
            recipientPhone: whatsappNumber,
            recipientName: profile?.full_name || 'Client',
            recipientUserId: order.user_id,
            orderId: orderId,
            quoteId: order.quote_id || undefined,
            orderNumber: order.order_number || `ORD-${orderId.slice(0, 8).toUpperCase()}`,
            previousStatus: oldStatus,
            newStatus: orderStatus,
            vehicleInfo: vehicle ? {
              make: vehicle.make,
              model: vehicle.model,
              year: vehicle.year || new Date().getFullYear()
            } : undefined,
            documents: uploadedDocs,
            note: noteText,
            eta: eta || order.estimated_arrival,
            triggeredBy: adminCheck.user.id,
            triggeredByEmail: adminCheck.user.email || undefined,
            triggeredByRole: 'admin'
          });

          console.log('Notification enqueued:', notificationResult);
        }
      }

      // Notify collaborators about the status change (bidirectional notifications)
      const vehicleInfo = vehicle
        ? `${vehicle.make} ${vehicle.model} ${vehicle.year || ''}`
        : 'Vehicle';
      const customerName = profile?.full_name || 'Client';

      await notifyCollaborators(supabaseAdmin, {
        type: 'order_status_updated',
        title: `Order ${order.order_number || `ORD-${orderId.slice(0, 8)}`} updated by admin`,
        titleZh: `管理员更新了订单 ${order.order_number || `ORD-${orderId.slice(0, 8)}`}`,
        message: `Status changed from "${oldStatus}" to "${orderStatus}" by admin`,
        messageZh: `管理员将状态从"${oldStatus}"更改为"${orderStatus}"`,
        data: {
          orderId,
          orderNumber: order.order_number || `ORD-${orderId.slice(0, 8)}`,
          oldStatus,
          newStatus: orderStatus,
          vehicleInfo,
          customerName,
          updatedByRole: 'admin',
          note: noteText || undefined,
        },
        priority: 'normal',
        actionUrl: `/collaborator/orders?orderId=${orderId}`,
        relatedEntityType: 'order',
        relatedEntityId: orderId,
      });

      console.log('✅ Collaborators notified of status change');

      return NextResponse.json({
        success: true,
        status: orderStatus,
        notificationQueued: notificationResult.success,
        notificationQueueId: notificationResult.queueId,
        notificationError: notificationResult.error,
        collaboratorNotified: true,
      });
    }

    // Legacy: quoteId based tracking
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any;

    // Get quote first (without join to avoid FK issues)
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      console.error('Error fetching quote:', quoteError);
      return NextResponse.json(
        { error: 'Devis non trouvé' },
        { status: 404 }
      );
    }

    // Fetch profile separately for WhatsApp notification
    let quoteProfile: { full_name: string | null; whatsapp_number: string | null; phone: string | null } | null = null;
    if (quote.user_id) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, whatsapp_number, phone')
        .eq('id', quote.user_id)
        .single();
      quoteProfile = profileData;
    }

    // Check if tracking record exists
    const { data: existingTracking } = await supabaseAny
      .from('order_tracking')
      .select('*')
      .eq('quote_id', quoteId)
      .single();

    const newStep = {
      status: orderStatus,
      timestamp: now,
      note: noteText || null,
      updated_by: 'admin',
    };

    let trackingData;
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
      trackingData = data;
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
      trackingData = data;
    }

    // Enqueue WhatsApp notification for legacy quotes
    const legacyOldStatus = existingTracking?.order_status || 'deposit_paid';
    let notificationResult: { success: boolean; queueId?: string; error?: string } = { success: false, error: 'Non envoyé' };
    if (sendWhatsApp && quote) {
      const whatsappNumber = quoteProfile?.whatsapp_number || quoteProfile?.phone;

      if (whatsappNumber) {
        // Get uploaded documents from tracking
        const uploadedDocs = existingTracking?.uploaded_documents
          ? (existingTracking.uploaded_documents as { name: string; url: string; type: string; status?: string; visible_to_client?: boolean }[])
              .filter((d: { status?: string }) => d.status === orderStatus || !d.status)
              .map(d => ({
                name: d.name,
                url: d.url,
                type: d.type as 'image' | 'pdf' | 'link',
                visibleToClient: d.visible_to_client !== false
              }))
          : [];

        notificationResult = await enqueueStatusNotification({
          recipientPhone: whatsappNumber,
          recipientName: quoteProfile?.full_name || 'Client',
          recipientUserId: quote.user_id,
          quoteId: quoteId,
          orderNumber: quote.quote_number?.replace('QT-', 'ORD-') || `ORD-${quoteId.slice(0, 8).toUpperCase()}`,
          previousStatus: legacyOldStatus,
          newStatus: orderStatus,
          vehicleInfo: {
            make: quote.vehicle_make,
            model: quote.vehicle_model,
            year: quote.vehicle_year || new Date().getFullYear()
          },
          documents: uploadedDocs,
          note: noteText,
          eta: eta || existingTracking?.shipping_eta,
          triggeredBy: adminCheck.user.id,
          triggeredByEmail: adminCheck.user.email || undefined,
          triggeredByRole: 'admin'
        });

        console.log('Notification enqueued (legacy):', notificationResult);
      }
    }

    // Notify collaborators about the status change (bidirectional notifications - legacy)
    const vehicleInfo = `${quote.vehicle_make} ${quote.vehicle_model} ${quote.vehicle_year || ''}`;
    const customerName = quoteProfile?.full_name || 'Client';
    const orderNumber = quote.quote_number?.replace('QT-', 'ORD-') || `ORD-${quoteId.slice(0, 8)}`;

    await notifyCollaborators(supabaseAdmin, {
      type: 'order_status_updated',
      title: `Order ${orderNumber} updated by admin`,
      titleZh: `管理员更新了订单 ${orderNumber}`,
      message: `Status changed from "${legacyOldStatus}" to "${orderStatus}" by admin`,
      messageZh: `管理员将状态从"${legacyOldStatus}"更改为"${orderStatus}"`,
      data: {
        quoteId,
        orderNumber,
        oldStatus: legacyOldStatus,
        newStatus: orderStatus,
        vehicleInfo,
        customerName,
        updatedByRole: 'admin',
        note: noteText || undefined,
      },
      priority: 'normal',
      actionUrl: `/collaborator/orders?quoteId=${quoteId}`,
      relatedEntityType: 'order',
      relatedEntityId: quoteId,
    });

    console.log('✅ Collaborators notified of status change (legacy)');

    return NextResponse.json({
      success: true,
      tracking: trackingData,
      notificationQueued: notificationResult.success,
      notificationQueueId: notificationResult.queueId,
      notificationError: notificationResult.error,
      collaboratorNotified: true,
    });
  } catch (error) {
    console.error('Error updating order tracking:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du suivi' },
      { status: 500 }
    );
  }
}

// Helper functions for status display
function getStatusTitle(status: string): string {
  const titles: Record<string, string> = {
    deposit_paid: 'Acompte payé',
    vehicle_locked: 'Véhicule bloqué',
    inspection_sent: 'Inspection envoyée',
    full_payment_received: 'Paiement complet reçu',
    vehicle_purchased: 'Véhicule acheté',
    export_customs: 'Douane export',
    in_transit: 'En transit',
    at_port: 'Au port',
    shipping: 'En mer',
    documents_ready: 'Documents prêts',
    customs: 'En douane',
    ready_pickup: 'Prêt pour retrait',
    delivered: 'Livré',
    processing: 'En traitement',
  };
  return titles[status] || status;
}

function getStatusDescription(status: string): string {
  const descriptions: Record<string, string> = {
    deposit_paid: 'L\'acompte de 1000$ a été versé',
    vehicle_locked: 'Le véhicule est réservé',
    inspection_sent: 'Le rapport d\'inspection a été envoyé',
    full_payment_received: 'Le paiement complet a été confirmé',
    vehicle_purchased: 'Le véhicule a été acheté',
    export_customs: 'Le véhicule passe la douane d\'exportation',
    in_transit: 'Le véhicule est en transit',
    at_port: 'Le véhicule est au port',
    shipping: 'Le véhicule est en mer',
    documents_ready: 'Les documents sont disponibles',
    customs: 'Le véhicule est en douane',
    ready_pickup: 'Le véhicule est prêt à être retiré',
    delivered: 'Le véhicule a été livré',
    processing: 'La commande est en traitement',
  };
  return descriptions[status] || '';
}
