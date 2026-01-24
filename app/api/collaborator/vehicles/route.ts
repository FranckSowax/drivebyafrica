import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireCollaborator } from '@/lib/auth/collaborator-check';
import { notifyAdmins } from '@/lib/notifications/bidirectional-notifications';
import type { Database } from '@/types/database';

// POST - Create a new vehicle
export async function POST(request: Request) {
  try {
    const authCheck = await requireCollaborator();
    if (!authCheck.isCollaborator) {
      return authCheck.response;
    }

    const supabase = authCheck.supabase;
    const user = authCheck.user;

    const body = await request.json();
    const {
      make,
      model,
      year,
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
      features,
      images,
      thumbnail_url,
    } = body;

    // Validation
    if (!make || !model || !year) {
      return NextResponse.json(
        { error: 'Make, model, and year are required', error_zh: '需要品牌、型号和年份' },
        { status: 400 }
      );
    }

    // Get collaborator's assigned country to set source
    const { data: profile } = await supabase
      .from('profiles')
      .select('assigned_country')
      .eq('id', user.id)
      .single();

    const assignedCountry = profile?.assigned_country || 'china';

    // Map country to source
    let source = 'china';
    if (assignedCountry === 'korea') source = 'korea';
    if (assignedCountry === 'dubai') source = 'dubai';
    if (assignedCountry === 'all') source = 'china'; // Default to china for 'all'

    // Create vehicle - map to database schema
    const sourceId = `collab-${user.id.substring(0, 8)}-${Date.now()}`;
    const adminNotesContent = title ? `${title}${description ? '\n\n' + description : ''}` : (description || '');

    const { data: vehicle, error: createError } = await supabase
      .from('vehicles')
      .insert({
        source,
        source_id: sourceId,
        make,
        model,
        year,
        mileage,
        fuel_type,
        transmission,
        drive_type,
        engine_cc: engine_size || null,
        body_type,
        color,
        grade: condition || null,
        condition_report: features ? JSON.parse(JSON.stringify(features)) : null,
        images: images || [],
        buy_now_price_usd: price || null,
        current_price_usd: price || null,
        auction_status: 'available',
        status: 'available',
        is_visible: true,
        admin_notes: adminNotesContent || null,
        added_by_collaborator_id: user.id,
        is_collaborator_listing: true,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating vehicle:', createError);
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
        type: 'vehicle_published',
        title: `New vehicle published by collaborator`,
        titleZh: `协作员发布了新车辆`,
        message: `${year} ${make} ${model} - Now live on the platform`,
        messageZh: `${year} ${make} ${model} - 已在平台上线`,
        data: {
          vehicleId: vehicle.id,
          make,
          model,
          year,
          title,
          source,
        },
        priority: 'normal',
        actionUrl: `/admin/vehicles?vehicleId=${vehicle.id}`,
        relatedEntityType: 'vehicle',
        relatedEntityId: vehicle.id,
        excludeUserId: user.id,
      });

      console.log('✅ Admin notified of new vehicle publication');
    } catch (notifError) {
      console.error('❌ Failed to notify admins:', notifError);
    }

    return NextResponse.json({
      success: true,
      vehicle,
    });
  } catch (error) {
    console.error('Error creating vehicle:', error);
    return NextResponse.json(
      { error: 'Error creating vehicle', error_zh: '创建车辆时出错' },
      { status: 500 }
    );
  }
}

// GET - Get collaborator's vehicles
export async function GET(request: Request) {
  try {
    const authCheck = await requireCollaborator();
    if (!authCheck.isCollaborator) {
      return authCheck.response;
    }

    const supabase = authCheck.supabase;
    const user = authCheck.user;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending, approved, rejected
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('vehicles')
      .select('*', { count: 'exact' })
      .eq('added_by_collaborator_id', user.id)
      .eq('is_collaborator_listing', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by approval status
    if (status === 'pending') {
      query = query.eq('collaborator_approved', false).eq('is_visible', false);
    } else if (status === 'approved') {
      query = query.eq('collaborator_approved', true);
    }

    const { data: vehicles, error, count } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      vehicles: vehicles || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Error fetching vehicles', error_zh: '获取车辆时出错' },
      { status: 500 }
    );
  }
}

// PUT - Update a vehicle (only if pending approval)
export async function PUT(request: Request) {
  try {
    const authCheck = await requireCollaborator();
    if (!authCheck.isCollaborator) {
      return authCheck.response;
    }

    const supabase = authCheck.supabase;
    const user = authCheck.user;

    const body = await request.json();
    const { vehicleId, ...updates } = body;

    if (!vehicleId) {
      return NextResponse.json(
        { error: 'Vehicle ID required', error_zh: '需要车辆ID' },
        { status: 400 }
      );
    }

    // Check if vehicle belongs to collaborator and is pending
    const { data: vehicle, error: checkError } = await supabase
      .from('vehicles')
      .select('id, collaborator_approved, added_by_collaborator_id')
      .eq('id', vehicleId)
      .eq('added_by_collaborator_id', user.id)
      .single();

    if (checkError || !vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found', error_zh: '找不到车辆' },
        { status: 404 }
      );
    }

    if (vehicle.collaborator_approved) {
      return NextResponse.json(
        { error: 'Cannot update approved vehicle', error_zh: '无法更新已批准的车辆' },
        { status: 403 }
      );
    }

    // Update vehicle
    const { data: updatedVehicle, error: updateError } = await supabase
      .from('vehicles')
      .update(updates)
      .eq('id', vehicleId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      vehicle: updatedVehicle,
    });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    return NextResponse.json(
      { error: 'Error updating vehicle', error_zh: '更新车辆时出错' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a vehicle (only if pending approval)
export async function DELETE(request: Request) {
  try {
    const authCheck = await requireCollaborator();
    if (!authCheck.isCollaborator) {
      return authCheck.response;
    }

    const supabase = authCheck.supabase;
    const user = authCheck.user;

    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId');

    if (!vehicleId) {
      return NextResponse.json(
        { error: 'Vehicle ID required', error_zh: '需要车辆ID' },
        { status: 400 }
      );
    }

    // Check if vehicle belongs to collaborator and is pending
    const { data: vehicle, error: checkError } = await supabase
      .from('vehicles')
      .select('id, collaborator_approved, added_by_collaborator_id, make, model, year')
      .eq('id', vehicleId)
      .eq('added_by_collaborator_id', user.id)
      .single();

    if (checkError || !vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found', error_zh: '找不到车辆' },
        { status: 404 }
      );
    }

    if (vehicle.collaborator_approved) {
      return NextResponse.json(
        { error: 'Cannot delete approved vehicle', error_zh: '无法删除已批准的车辆' },
        { status: 403 }
      );
    }

    // Delete vehicle
    const { error: deleteError } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', vehicleId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    return NextResponse.json(
      { error: 'Error deleting vehicle', error_zh: '删除车辆时出错' },
      { status: 500 }
    );
  }
}
