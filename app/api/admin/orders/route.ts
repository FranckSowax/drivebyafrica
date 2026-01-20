import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-check';
import { sendStatusChangeNotification } from '@/lib/whatsapp/send-status-notification';

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
    let vehicles: Record<string, { make: string | null; model: string | null; year: number | null; source: string | null; images: string[] | null }> = {};
    if (vehicleIds.length > 0) {
      const { data: vehiclesData } = await supabase
        .from('vehicles')
        .select('id, make, model, year, source, images')
        .in('id', vehicleIds);

      if (vehiclesData) {
        vehicles = vehiclesData.reduce((acc, v) => {
          acc[v.id] = {
            make: v.make,
            model: v.model,
            year: v.year,
            source: v.source,
            images: v.images,
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
      };
    });

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
          { error: 'Erreur lors de la mise à jour de la commande' },
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

      // Send WhatsApp notification (profile and vehicle were fetched earlier)
      let whatsappResult: { success: boolean; error?: string; messageId?: string; messagesCount?: number } = { success: false, error: 'Non envoyé' };
      if (sendWhatsApp && order) {
        const whatsappNumber = profile?.whatsapp_number || profile?.phone;

        if (whatsappNumber) {
          const vehicleName = vehicle
            ? `${vehicle.make} ${vehicle.model} ${vehicle.year || ''}`
            : 'Votre véhicule';

          // Get uploaded documents for this status
          const uploadedDocs = Array.isArray(order.uploaded_documents)
            ? (order.uploaded_documents as { name: string; url: string; type: string; status?: string; visible_to_client?: boolean }[])
                .filter(d => d.status === orderStatus || !d.status)
            : [];

          whatsappResult = await sendStatusChangeNotification({
            phone: whatsappNumber,
            customerName: profile?.full_name || 'Client',
            orderNumber: order.order_number || `ORD-${orderId.slice(0, 8).toUpperCase()}`,
            orderId: orderId,
            vehicleName: vehicleName.trim(),
            newStatus: orderStatus,
            documents: uploadedDocs,
            eta: eta || order.estimated_arrival,
            language: 'fr', // Default to French for African markets
          });

          console.log('WhatsApp notification result:', whatsappResult);
        }
      }

      return NextResponse.json({
        success: true,
        status: orderStatus,
        whatsappSent: whatsappResult.success,
        whatsappError: whatsappResult.error,
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

    // Send WhatsApp notification for legacy quotes
    let whatsappResult: { success: boolean; error?: string; messageId?: string; messagesCount?: number } = { success: false, error: 'Non envoyé' };
    if (sendWhatsApp && quote) {
      const whatsappNumber = quoteProfile?.whatsapp_number || quoteProfile?.phone;

      if (whatsappNumber) {
        const vehicleName = `${quote.vehicle_make} ${quote.vehicle_model} ${quote.vehicle_year || ''}`;

        // Get uploaded documents from tracking
        const uploadedDocs = existingTracking?.uploaded_documents
          ? (existingTracking.uploaded_documents as { name: string; url: string; type: string; status?: string; visible_to_client?: boolean }[])
              .filter((d: { status?: string }) => d.status === orderStatus || !d.status)
          : [];

        whatsappResult = await sendStatusChangeNotification({
          phone: whatsappNumber,
          customerName: quoteProfile?.full_name || 'Client',
          orderNumber: quote.quote_number?.replace('QT-', 'ORD-') || `ORD-${quoteId.slice(0, 8).toUpperCase()}`,
          orderId: quoteId,
          vehicleName: vehicleName.trim(),
          newStatus: orderStatus,
          documents: uploadedDocs,
          eta: eta || existingTracking?.shipping_eta,
          language: 'fr', // Default to French for African markets
        });

        console.log('WhatsApp notification result (legacy):', whatsappResult);
      }
    }

    return NextResponse.json({
      success: true,
      tracking: trackingData,
      whatsappSent: whatsappResult.success,
      whatsappError: whatsappResult.error,
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
