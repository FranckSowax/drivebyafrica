import { NextResponse } from 'next/server';
import { requireCollaborator, logCollaboratorActivity } from '@/lib/auth/collaborator-check';
import { enqueueStatusNotification } from '@/lib/notifications/enqueue-status-notification';

// Order statuses for tracking (13-step workflow)
const ORDER_STATUSES = [
  'deposit_paid',          // 1. Deposit paid / 定金已付
  'vehicle_locked',        // 2. Vehicle locked / 车辆已锁定
  'inspection_sent',       // 3. Inspection sent / 检测已发送
  'full_payment_received', // 4. Full payment received / 全款已收
  'vehicle_purchased',     // 5. Vehicle purchased / 车辆已购买
  'export_customs',        // 6. Export customs / 出口清关
  'in_transit',            // 7. In transit / 运输中
  'at_port',               // 8. At port / 在港口
  'shipping',              // 9. Shipping / 海运中
  'documents_ready',       // 10. Documents ready / 文件就绪
  'customs',               // 11. Import customs / 进口清关
  'ready_pickup',          // 12. Ready for pickup / 待提车
  'delivered',             // 13. Delivered / 已交付
  'processing',            // Legacy: processing = vehicle_locked
] as const;

// Map assigned_country values to vehicle_source values
const COUNTRY_TO_SOURCE: Record<string, string[]> = {
  china: ['china', 'che168', 'dongchedi'],
  korea: ['korea', 'encar'],
  dubai: ['dubai', 'dubicars'],
};

// GET: Fetch all orders from orders table + accepted quotes (hybrid approach)
// Collaborators only see orders for vehicles from their assigned country
export async function GET(request: Request) {
  try {
    // Verify collaborator authentication
    const authCheck = await requireCollaborator();
    if (!authCheck.isCollaborator) {
      return authCheck.response;
    }

    const supabase = authCheck.supabase;
    const assignedCountry = authCheck.assignedCountry; // 'china', 'korea', 'dubai', or null
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const offset = (page - 1) * limit;

    // Get allowed vehicle sources based on assigned country
    const allowedSources = assignedCountry ? COUNTRY_TO_SOURCE[assignedCountry] || [] : null;

    // First, get orders from the orders table (created when user validates quote)
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (ordersError && ordersError.code !== '42P01') {
      console.error('Error fetching orders:', ordersError);
    }

    let orders = ordersData || [];

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

    // Filter quotes by vehicle_source if collaborator has assigned country
    if (allowedSources && allowedSources.length > 0) {
      quotesQuery = quotesQuery.in('vehicle_source', allowedSources);
    }

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
        customer_name: profile.full_name || 'Customer',
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
        uploaded_documents: o.uploaded_documents || [],
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
      customer_name: profiles[q.user_id]?.full_name || 'Customer',
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
      uploaded_documents: [],
    }));

    // Combine all orders
    let allOrders = [...transformedOrders, ...transformedQuotes];

    // Filter by collaborator's assigned country (vehicle source)
    // This filters orders from the orders table that have vehicles from the assigned country
    if (allowedSources && allowedSources.length > 0) {
      allOrders = allOrders.filter(o => {
        const source = o.vehicle_source?.toLowerCase() || '';
        return allowedSources.some(s => source.includes(s) || s.includes(source));
      });
    }

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
      { error: 'Error fetching orders', error_zh: '获取订单时出错' },
      { status: 500 }
    );
  }
}

// PUT: Update order status (supports both orders table and order_tracking)
export async function PUT(request: Request) {
  try {
    // Verify collaborator authentication
    const authCheck = await requireCollaborator();
    if (!authCheck.isCollaborator) {
      return authCheck.response;
    }

    const supabase = authCheck.supabase;
    const body = await request.json();
    // Support both 'status' and 'orderStatus' field names
    const { orderId, quoteId, orderStatus: orderStatusField, status: statusField, note, notes, eta, sendWhatsApp = true } = body;
    const orderStatus = orderStatusField || statusField;
    const noteText = note || notes;

    // Support both orderId (new system) and quoteId (legacy)
    const targetId = orderId || quoteId;

    if (!targetId || !orderStatus) {
      return NextResponse.json(
        { error: 'Order ID and status required', error_zh: '需要订单ID和状态' },
        { status: 400 }
      );
    }

    // Validate status
    if (!ORDER_STATUSES.includes(orderStatus as typeof ORDER_STATUSES[number])) {
      return NextResponse.json(
        { error: 'Invalid status', error_zh: '无效状态' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Get old status for logging
    let oldStatus = 'processing';

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
          { error: 'Order not found', error_zh: '找不到订单' },
          { status: 404 }
        );
      }

      if (!order) {
        return NextResponse.json(
          { error: 'Order not found', error_zh: '找不到订单' },
          { status: 404 }
        );
      }

      oldStatus = order.status || 'processing';

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

      // Update order status in orders table
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: orderStatus,
          estimated_arrival: eta || null,
          updated_at: now,
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('Error updating order:', updateError);
        return NextResponse.json(
          { error: 'Failed to update order', error_zh: '更新订单失败' },
          { status: 500 }
        );
      }

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
          updated_by: 'collaborator',
          collaborator_id: authCheck.user.id,
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

      // Log activity
      await logCollaboratorActivity(
        supabase,
        authCheck.user.id,
        'status_update',
        {
          orderId,
          oldStatus,
          newStatus: orderStatus,
          note: noteText || undefined,
        },
        request
      );

      // Enqueue WhatsApp notification (robust queue system with retries)
      let notificationResult: { success: boolean; queueId?: string; error?: string } = { success: false, error: 'Not sent' };
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
            recipientName: profile?.full_name || 'Customer',
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
            triggeredBy: authCheck.user.id,
            triggeredByEmail: authCheck.user.email || undefined,
            triggeredByRole: 'collaborator'
          });

          console.log('Notification enqueued:', notificationResult);
        }
      }

      return NextResponse.json({
        success: true,
        status: orderStatus,
        notificationQueued: notificationResult.success,
        notificationQueueId: notificationResult.queueId,
        notificationError: notificationResult.error,
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
        { error: 'Quote not found', error_zh: '找不到报价' },
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

    // Get current status for logging
    const { data: existingTracking } = await supabaseAny
      .from('order_tracking')
      .select('*')
      .eq('quote_id', quoteId)
      .single();

    if (existingTracking) {
      oldStatus = existingTracking.order_status;
    }

    const newStep = {
      status: orderStatus,
      timestamp: now,
      note: noteText || null,
      updated_by: 'collaborator',
      collaborator_id: authCheck.user.id,
    };

    let result;
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
      result = data;
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
      result = data;
    }

    // Log activity
    await logCollaboratorActivity(
      supabase,
      authCheck.user.id,
      'status_update',
      {
        quoteId,
        oldStatus,
        newStatus: orderStatus,
        note: noteText || undefined,
      },
      request
    );

    // Enqueue WhatsApp notification for legacy quotes
    let notificationResult: { success: boolean; queueId?: string; error?: string } = { success: false, error: 'Not sent' };
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
          recipientName: quoteProfile?.full_name || 'Customer',
          recipientUserId: quote.user_id,
          quoteId: quoteId,
          orderNumber: quote.quote_number?.replace('QT-', 'ORD-') || `ORD-${quoteId.slice(0, 8).toUpperCase()}`,
          previousStatus: oldStatus,
          newStatus: orderStatus,
          vehicleInfo: {
            make: quote.vehicle_make,
            model: quote.vehicle_model,
            year: quote.vehicle_year || new Date().getFullYear()
          },
          documents: uploadedDocs,
          note: noteText,
          eta: eta || existingTracking?.shipping_eta,
          triggeredBy: authCheck.user.id,
          triggeredByEmail: authCheck.user.email || undefined,
          triggeredByRole: 'collaborator'
        });

        console.log('Notification enqueued (legacy):', notificationResult);
      }
    }

    return NextResponse.json({
      success: true,
      tracking: result,
      notificationQueued: notificationResult.success,
      notificationQueueId: notificationResult.queueId,
      notificationError: notificationResult.error,
    });
  } catch (error) {
    console.error('Error updating order tracking:', error);
    return NextResponse.json(
      { error: 'Error updating order tracking', error_zh: '更新订单跟踪时出错' },
      { status: 500 }
    );
  }
}

// Helper functions for status display
function getStatusTitle(status: string): string {
  const titles: Record<string, string> = {
    deposit_paid: 'Deposit Paid / 定金已付',
    vehicle_locked: 'Vehicle Locked / 车辆已锁定',
    inspection_sent: 'Inspection Sent / 检测已发送',
    full_payment_received: 'Full Payment Received / 全款已收',
    vehicle_purchased: 'Vehicle Purchased / 车辆已购买',
    export_customs: 'Export Customs / 出口清关',
    in_transit: 'In Transit / 运输中',
    at_port: 'At Port / 在港口',
    shipping: 'Shipping / 海运中',
    documents_ready: 'Documents Ready / 文件就绪',
    customs: 'Import Customs / 进口清关',
    ready_pickup: 'Ready for Pickup / 待提车',
    delivered: 'Delivered / 已交付',
    processing: 'Processing / 处理中',
  };
  return titles[status] || status;
}

function getStatusDescription(status: string): string {
  const descriptions: Record<string, string> = {
    deposit_paid: 'Deposit of $1000 has been paid / 已支付1000美元定金',
    vehicle_locked: 'Vehicle is reserved / 车辆已预订',
    inspection_sent: 'Inspection report sent / 检测报告已发送',
    full_payment_received: 'Full payment confirmed / 全款已确认',
    vehicle_purchased: 'Vehicle has been purchased / 车辆已购买',
    export_customs: 'Export customs clearance / 出口清关中',
    in_transit: 'Vehicle in transit / 车辆运输中',
    at_port: 'Vehicle at port / 车辆在港口',
    shipping: 'Vehicle shipping / 车辆海运中',
    documents_ready: 'Documents available / 文件已准备好',
    customs: 'Import customs clearance / 进口清关中',
    ready_pickup: 'Ready for pickup / 可提车',
    delivered: 'Vehicle delivered / 车辆已交付',
    processing: 'Order processing / 订单处理中',
  };
  return descriptions[status] || '';
}
