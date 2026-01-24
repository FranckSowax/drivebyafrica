import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifyCollaborators, notifyAdmins } from '@/lib/notifications/bidirectional-notifications';
import type { Database } from '@/types/database';

// Helper to check if user is admin
async function isUserAdmin(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  const role = profile?.role as string | undefined;
  return role === 'admin' || role === 'super_admin';
}

// GET - Get all vehicle batches
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const collaboratorId = searchParams.get('collaboratorId');
    const isPublic = searchParams.get('public') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Type-narrow status to allowed values
    const allowedStatuses = ['pending', 'approved', 'rejected', 'sold_out'] as const;
    type AllowedStatus = typeof allowedStatuses[number];
    const status: AllowedStatus | null = statusParam && allowedStatuses.includes(statusParam as AllowedStatus)
      ? (statusParam as AllowedStatus)
      : null;

    // For public access, only show approved and visible batches
    if (isPublic) {
      const query = supabase
        .from('vehicle_batches')
        .select('*', { count: 'exact' })
        .eq('status', 'approved')
        .eq('is_visible', true)
        .gt('available_quantity', 0)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: batches, error, count } = await query;

      if (error) {
        throw error;
      }

      return NextResponse.json({
        batches: batches || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      });
    }

    // Admin/collaborator access
    const isAdmin = await isUserAdmin(supabase, user.id);

    let query = supabase
      .from('vehicle_batches')
      .select('*, profiles!vehicle_batches_added_by_collaborator_id_fkey(full_name, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by status
    if (status) {
      query = query.eq('status', status);
    }

    // Filter by collaborator (admin can filter, collaborator sees only their own)
    if (collaboratorId) {
      query = query.eq('added_by_collaborator_id', collaboratorId);
    } else if (!isAdmin) {
      // Non-admin users only see their own batches
      query = query.eq('added_by_collaborator_id', user.id);
    }

    const { data: batches, error, count } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      batches: batches || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Error fetching batches:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des lots' },
      { status: 500 }
    );
  }
}

// PUT - Approve or reject a batch
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    if (!(await isUserAdmin(supabase, user.id))) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const { batchId, action, adminNotes } = body; // action: 'approve' or 'reject'

    if (!batchId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Batch ID et action (approve/reject) requis' },
        { status: 400 }
      );
    }

    // Get batch details
    const { data: batch, error: batchError } = await supabase
      .from('vehicle_batches')
      .select('*, profiles!vehicle_batches_added_by_collaborator_id_fkey(full_name, email)')
      .eq('id', batchId)
      .single();

    if (batchError || !batch) {
      return NextResponse.json(
        { error: 'Lot non trouvé' },
        { status: 404 }
      );
    }

    // Update batch based on action
    const updates: Record<string, unknown> = {
      admin_notes: adminNotes || null,
    };

    if (action === 'approve') {
      updates.status = 'approved';
      updates.is_visible = true;
      updates.approved_at = new Date().toISOString();
      updates.approved_by_admin_id = user.id;
    } else if (action === 'reject') {
      updates.status = 'rejected';
      updates.is_visible = false;
      updates.rejection_reason = adminNotes || 'Rejected by admin';
    }

    const { data: updatedBatch, error: updateError } = await supabase
      .from('vehicle_batches')
      .update(updates)
      .eq('id', batchId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Notify collaborator
    try {
      const { createClient: createAdminClient } = await import('@supabase/supabase-js');
      const supabaseAdmin = createAdminClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const collaboratorProfile = batch.profiles as unknown as { full_name: string | null; email: string | null } | null;
      const collaboratorName = collaboratorProfile?.full_name || 'Collaborator';

      if (action === 'approve') {
        await notifyCollaborators(supabaseAdmin, {
          type: 'batch_approved',
          title: `Your vehicle batch has been approved`,
          titleZh: `您的车辆批次已获批准`,
          message: `${batch.total_quantity}x ${batch.year} ${batch.make} ${batch.model} is now visible on the platform`,
          messageZh: `${batch.total_quantity}辆 ${batch.year} ${batch.make} ${batch.model} 现已在平台上可见`,
          data: {
            batchId: batch.id,
            make: batch.make,
            model: batch.model,
            year: batch.year,
            total_quantity: batch.total_quantity,
          },
          priority: 'high',
          actionUrl: `/collaborator/batches?batchId=${batch.id}`,
          relatedEntityType: 'batch',
          relatedEntityId: batch.id,
          targetCollaboratorId: batch.added_by_collaborator_id ?? undefined,
        });
      } else {
        await notifyCollaborators(supabaseAdmin, {
          type: 'batch_rejected',
          title: `Your batch submission was rejected`,
          titleZh: `您的批次提交被拒绝`,
          message: adminNotes || 'Please review and resubmit',
          messageZh: adminNotes || '请检查并重新提交',
          data: {
            batchId: batch.id,
            make: batch.make,
            model: batch.model,
            year: batch.year,
            reason: adminNotes,
          },
          priority: 'normal',
          actionUrl: `/collaborator/batches?batchId=${batch.id}`,
          relatedEntityType: 'batch',
          relatedEntityId: batch.id,
          targetCollaboratorId: batch.added_by_collaborator_id ?? undefined,
        });
      }

      console.log(`✅ Collaborator notified of batch ${action}`);
    } catch (notifError) {
      console.error('❌ Failed to notify collaborator:', notifError);
    }

    return NextResponse.json({
      success: true,
      batch: updatedBatch,
      action,
    });
  } catch (error) {
    console.error('Error updating batch:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du lot' },
      { status: 500 }
    );
  }
}

// POST - Create a batch order
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const {
      batchId,
      quantityOrdered,
      destinationCountry,
      destinationPort,
      customerNotes,
    } = body;

    if (!batchId || !quantityOrdered || !destinationCountry) {
      return NextResponse.json(
        { error: 'Batch ID, quantity, and destination country required' },
        { status: 400 }
      );
    }

    // Get batch details
    const { data: batch, error: batchError } = await supabase
      .from('vehicle_batches')
      .select('*')
      .eq('id', batchId)
      .eq('status', 'approved')
      .eq('is_visible', true)
      .single();

    if (batchError || !batch) {
      return NextResponse.json(
        { error: 'Lot non disponible' },
        { status: 404 }
      );
    }

    // Validate quantity
    if (quantityOrdered < batch.minimum_order_quantity) {
      return NextResponse.json(
        {
          error: `Minimum order quantity is ${batch.minimum_order_quantity}`,
          error_zh: `最小订购数量为 ${batch.minimum_order_quantity}`
        },
        { status: 400 }
      );
    }

    if (quantityOrdered > batch.available_quantity) {
      return NextResponse.json(
        {
          error: `Only ${batch.available_quantity} units available`,
          error_zh: `仅剩 ${batch.available_quantity} 辆`
        },
        { status: 400 }
      );
    }

    // Calculate total price
    const totalPriceUsd = quantityOrdered * batch.price_per_unit_usd;

    // Create batch order
    const { data: order, error: orderError } = await supabase
      .from('batch_orders')
      .insert({
        batch_id: batchId,
        user_id: user.id,
        quantity_ordered: quantityOrdered,
        price_per_unit_usd: batch.price_per_unit_usd,
        total_price_usd: totalPriceUsd,
        destination_country: destinationCountry,
        destination_port: destinationPort,
        customer_notes: customerNotes,
        status: 'pending',
        deposit_paid: false,
        full_payment_received: false,
      })
      .select()
      .single();

    if (orderError) {
      throw orderError;
    }

    // Notify admins and collaborator
    try {
      const { createClient: createAdminClient } = await import('@supabase/supabase-js');
      const supabaseAdmin = createAdminClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const customerName = profile?.full_name || 'Customer';

      // Notify admins
      await notifyAdmins(supabaseAdmin, {
        type: 'batch_order_created',
        title: `New batch order received`,
        titleZh: `收到新的批次订单`,
        message: `${customerName} ordered ${quantityOrdered}x ${batch.year} ${batch.make} ${batch.model}`,
        messageZh: `${customerName} 订购了 ${quantityOrdered}辆 ${batch.year} ${batch.make} ${batch.model}`,
        data: {
          orderId: order.id,
          batchId,
          quantity: quantityOrdered,
          totalPrice: totalPriceUsd,
          customerName,
        },
        priority: 'high',
        actionUrl: `/admin/batches?orderId=${order.id}`,
        relatedEntityType: 'batch_order',
        relatedEntityId: order.id,
      });

      // Notify collaborator who listed the batch
      await notifyCollaborators(supabaseAdmin, {
        type: 'batch_order_created',
        title: `New order for your batch`,
        titleZh: `您的批次有新订单`,
        message: `${quantityOrdered} units ordered from your ${batch.year} ${batch.make} ${batch.model} batch`,
        messageZh: `从您的 ${batch.year} ${batch.make} ${batch.model} 批次订购了 ${quantityOrdered} 辆`,
        data: {
          orderId: order.id,
          batchId,
          quantity: quantityOrdered,
        },
        priority: 'high',
        actionUrl: `/collaborator/batches?batchId=${batchId}`,
        relatedEntityType: 'batch_order',
        relatedEntityId: order.id,
        targetCollaboratorId: batch.added_by_collaborator_id ?? undefined,
      });

      console.log('✅ Admins and collaborator notified of batch order');
    } catch (notifError) {
      console.error('❌ Failed to send notifications:', notifError);
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('Error creating batch order:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la commande' },
      { status: 500 }
    );
  }
}
