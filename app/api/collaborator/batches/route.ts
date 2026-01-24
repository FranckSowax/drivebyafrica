import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireCollaborator } from '@/lib/auth/collaborator-check';
import { notifyAdmins } from '@/lib/notifications/bidirectional-notifications';
import type { Database } from '@/types/database';
import type { CreateVehicleBatchInput } from '@/types/vehicle-batch';

// POST - Create a new vehicle batch
export async function POST(request: Request) {
  try {
    const authCheck = await requireCollaborator();
    if (!authCheck.isCollaborator) {
      return authCheck.response;
    }

    const supabase = authCheck.supabase;
    const user = authCheck.user;

    const body: CreateVehicleBatchInput & { source_country: 'china' | 'korea' | 'dubai' } = await request.json();
    const {
      make,
      model,
      year,
      title,
      description,
      source_country,
      price_per_unit_usd,
      total_quantity,
      minimum_order_quantity,
      images,
      thumbnail_url,
      mileage,
      fuel_type,
      transmission,
      drive_type,
      engine_size,
      body_type,
      color,
      condition,
      features,
      collaborator_notes,
    } = body;

    // Validation
    if (!make || !model || !year || !title || !source_country || !price_per_unit_usd || !total_quantity || !minimum_order_quantity) {
      return NextResponse.json(
        {
          error: 'Make, model, year, title, source country, price, total quantity, and minimum quantity are required',
          error_zh: '需要品牌、型号、年份、标题、来源国家、价格、总数量和最小数量'
        },
        { status: 400 }
      );
    }

    if (total_quantity < minimum_order_quantity) {
      return NextResponse.json(
        {
          error: 'Total quantity must be greater than or equal to minimum order quantity',
          error_zh: '总数量必须大于或等于最小订购数量'
        },
        { status: 400 }
      );
    }

    // Get collaborator's assigned country to validate source
    const { data: profile } = await supabase
      .from('profiles')
      .select('assigned_country')
      .eq('id', user.id)
      .single();

    const assignedCountry = profile?.assigned_country || 'china';

    // Validate source_country matches assigned_country (unless 'all')
    if (assignedCountry !== 'all' && assignedCountry !== source_country) {
      return NextResponse.json(
        {
          error: 'Source country must match your assigned country',
          error_zh: '来源国家必须与您分配的国家匹配'
        },
        { status: 403 }
      );
    }

    // Map source_country to source
    let source = 'china';
    if (source_country === 'korea') source = 'korea';
    if (source_country === 'dubai') source = 'dubai';

    // Create batch
    const { data: batch, error: createError } = await supabase
      .from('vehicle_batches')
      .insert({
        added_by_collaborator_id: user.id,
        make,
        model,
        year,
        title,
        description,
        source,
        source_country,
        price_per_unit_usd,
        total_quantity,
        available_quantity: total_quantity,
        minimum_order_quantity,
        images: images || [],
        thumbnail_url,
        mileage,
        fuel_type,
        transmission,
        drive_type,
        engine_size,
        body_type,
        color,
        condition,
        features: features || [],
        collaborator_notes,
        status: 'pending',
        is_visible: false,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating batch:', createError);
      throw createError;
    }

    // Notify admins
    try {
      const { createClient: createAdminClient } = await import('@supabase/supabase-js');
      const supabaseAdmin = createAdminClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      await notifyAdmins(supabaseAdmin, {
        type: 'batch_submitted',
        title: `New vehicle batch submitted by collaborator`,
        titleZh: `协作员提交了新的车辆批次`,
        message: `${total_quantity}x ${year} ${make} ${model} from ${source_country.toUpperCase()} - Awaiting approval`,
        messageZh: `${total_quantity}辆 ${year} ${make} ${model} 来自${source_country === 'china' ? '中国' : source_country === 'korea' ? '韩国' : '迪拜'} - 等待批准`,
        data: {
          batchId: batch.id,
          make,
          model,
          year,
          title,
          source_country,
          total_quantity,
          price_per_unit_usd,
        },
        priority: 'high',
        actionUrl: `/admin/batches?batchId=${batch.id}`,
        relatedEntityType: 'batch',
        relatedEntityId: batch.id,
        excludeUserId: user.id,
      });

      console.log('✅ Admin notified of new batch submission');
    } catch (notifError) {
      console.error('❌ Failed to notify admins:', notifError);
    }

    return NextResponse.json({
      success: true,
      batch,
    });
  } catch (error) {
    console.error('Error creating batch:', error);
    return NextResponse.json(
      { error: 'Error creating batch', error_zh: '创建批次时出错' },
      { status: 500 }
    );
  }
}

// GET - Get collaborator's batches
export async function GET(request: Request) {
  try {
    const authCheck = await requireCollaborator();
    if (!authCheck.isCollaborator) {
      return authCheck.response;
    }

    const supabase = authCheck.supabase;
    const user = authCheck.user;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending, approved, rejected, sold_out
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('vehicle_batches')
      .select('*', { count: 'exact' })
      .eq('added_by_collaborator_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by status
    if (status) {
      query = query.eq('status', status);
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
      { error: 'Error fetching batches', error_zh: '获取批次时出错' },
      { status: 500 }
    );
  }
}

// PUT - Update a batch (only if pending approval)
export async function PUT(request: Request) {
  try {
    const authCheck = await requireCollaborator();
    if (!authCheck.isCollaborator) {
      return authCheck.response;
    }

    const supabase = authCheck.supabase;
    const user = authCheck.user;

    const body = await request.json();
    const { batchId, ...updates } = body;

    if (!batchId) {
      return NextResponse.json(
        { error: 'Batch ID required', error_zh: '需要批次ID' },
        { status: 400 }
      );
    }

    // Check if batch belongs to collaborator and is pending
    const { data: batch, error: checkError } = await supabase
      .from('vehicle_batches')
      .select('id, status, added_by_collaborator_id')
      .eq('id', batchId)
      .eq('added_by_collaborator_id', user.id)
      .single();

    if (checkError || !batch) {
      return NextResponse.json(
        { error: 'Batch not found', error_zh: '找不到批次' },
        { status: 404 }
      );
    }

    if (batch.status !== 'pending') {
      return NextResponse.json(
        { error: 'Cannot update non-pending batch', error_zh: '无法更新非待处理批次' },
        { status: 403 }
      );
    }

    // Prevent updating certain fields
    const allowedUpdates = { ...updates };
    delete allowedUpdates.status;
    delete allowedUpdates.approved_by_admin_id;
    delete allowedUpdates.approved_at;
    delete allowedUpdates.added_by_collaborator_id;

    // If updating quantities, validate
    if (allowedUpdates.total_quantity !== undefined || allowedUpdates.minimum_order_quantity !== undefined) {
      const totalQty = allowedUpdates.total_quantity !== undefined ? allowedUpdates.total_quantity : batch.total_quantity;
      const minQty = allowedUpdates.minimum_order_quantity !== undefined ? allowedUpdates.minimum_order_quantity : batch.minimum_order_quantity;

      if (totalQty < minQty) {
        return NextResponse.json(
          {
            error: 'Total quantity must be greater than or equal to minimum order quantity',
            error_zh: '总数量必须大于或等于最小订购数量'
          },
          { status: 400 }
        );
      }

      // Update available_quantity proportionally
      if (allowedUpdates.total_quantity !== undefined) {
        allowedUpdates.available_quantity = allowedUpdates.total_quantity;
      }
    }

    // Update batch
    const { data: updatedBatch, error: updateError } = await supabase
      .from('vehicle_batches')
      .update(allowedUpdates)
      .eq('id', batchId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      batch: updatedBatch,
    });
  } catch (error) {
    console.error('Error updating batch:', error);
    return NextResponse.json(
      { error: 'Error updating batch', error_zh: '更新批次时出错' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a batch (only if pending approval)
export async function DELETE(request: Request) {
  try {
    const authCheck = await requireCollaborator();
    if (!authCheck.isCollaborator) {
      return authCheck.response;
    }

    const supabase = authCheck.supabase;
    const user = authCheck.user;

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json(
        { error: 'Batch ID required', error_zh: '需要批次ID' },
        { status: 400 }
      );
    }

    // Check if batch belongs to collaborator and is pending
    const { data: batch, error: checkError } = await supabase
      .from('vehicle_batches')
      .select('id, status, added_by_collaborator_id')
      .eq('id', batchId)
      .eq('added_by_collaborator_id', user.id)
      .single();

    if (checkError || !batch) {
      return NextResponse.json(
        { error: 'Batch not found', error_zh: '找不到批次' },
        { status: 404 }
      );
    }

    if (batch.status !== 'pending') {
      return NextResponse.json(
        { error: 'Cannot delete non-pending batch', error_zh: '无法删除非待处理批次' },
        { status: 403 }
      );
    }

    // Delete batch
    const { error: deleteError } = await supabase
      .from('vehicle_batches')
      .delete()
      .eq('id', batchId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting batch:', error);
    return NextResponse.json(
      { error: 'Error deleting batch', error_zh: '删除批次时出错' },
      { status: 500 }
    );
  }
}
