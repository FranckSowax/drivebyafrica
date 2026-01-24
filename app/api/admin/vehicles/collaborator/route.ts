import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifyCollaborators } from '@/lib/notifications/bidirectional-notifications';
import type { Database } from '@/types/database';

// Type for vehicle with collaborator info
type VehicleRow = Database['public']['Tables']['vehicles']['Row'];

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

// GET - Get all collaborator-submitted vehicles
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    if (!(await isUserAdmin(supabase, user.id))) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending, approved
    const collaboratorId = searchParams.get('collaboratorId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('vehicles')
      .select('*, profiles!vehicles_added_by_collaborator_id_fkey(full_name, email)', { count: 'exact' })
      .eq('is_collaborator_listing', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by approval status
    if (status === 'pending') {
      query = query.eq('collaborator_approved', false);
    } else if (status === 'approved') {
      query = query.eq('collaborator_approved', true);
    }

    // Filter by collaborator
    if (collaboratorId) {
      query = query.eq('added_by_collaborator_id', collaboratorId);
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
      { error: 'Erreur lors de la récupération des véhicules' },
      { status: 500 }
    );
  }
}

// PUT - Approve or reject a vehicle
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
    const { vehicleId, action, adminNotes } = body; // action: 'approve' or 'reject'

    if (!vehicleId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Vehicle ID et action (approve/reject) requis' },
        { status: 400 }
      );
    }

    // Get vehicle details
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('*, profiles!vehicles_added_by_collaborator_id_fkey(full_name, email)')
      .eq('id', vehicleId)
      .eq('is_collaborator_listing', true)
      .single();

    if (vehicleError || !vehicle) {
      return NextResponse.json(
        { error: 'Véhicule non trouvé' },
        { status: 404 }
      );
    }

    // Update vehicle based on action
    const updates: Record<string, unknown> = {
      admin_notes: adminNotes || null,
    };

    if (action === 'approve') {
      updates.collaborator_approved = true;
      updates.is_visible = true;
      updates.approved_at = new Date().toISOString();
      updates.approved_by = user.id;
    } else if (action === 'reject') {
      updates.collaborator_approved = false;
      updates.is_visible = false;
      updates.rejection_reason = adminNotes || 'Rejected by admin';
    }

    const { data: updatedVehicle, error: updateError } = await supabase
      .from('vehicles')
      .update(updates)
      .eq('id', vehicleId)
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

      const collaboratorProfile = vehicle.profiles as unknown as { full_name: string | null; email: string | null } | null;

      if (action === 'approve') {
        await notifyCollaborators(supabaseAdmin, {
          type: 'vehicle_approved',
          title: `Your vehicle has been approved`,
          titleZh: `您的车辆已获批准`,
          message: `${vehicle.year} ${vehicle.make} ${vehicle.model} is now visible on the platform`,
          messageZh: `${vehicle.year} ${vehicle.make} ${vehicle.model} 现已在平台上可见`,
          data: {
            vehicleId: vehicle.id,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
          },
          priority: 'high',
          actionUrl: `/collaborator/vehicles?vehicleId=${vehicle.id}`,
          relatedEntityType: 'vehicle',
          relatedEntityId: vehicle.id,
          targetCollaboratorId: vehicle.added_by_collaborator_id ?? undefined,
        });
      } else {
        await notifyCollaborators(supabaseAdmin, {
          type: 'vehicle_rejected',
          title: `Your vehicle submission was rejected`,
          titleZh: `您的车辆提交被拒绝`,
          message: adminNotes || 'Please review and resubmit',
          messageZh: adminNotes || '请检查并重新提交',
          data: {
            vehicleId: vehicle.id,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            reason: adminNotes,
          },
          priority: 'normal',
          actionUrl: `/collaborator/vehicles?vehicleId=${vehicle.id}`,
          relatedEntityType: 'vehicle',
          relatedEntityId: vehicle.id,
          targetCollaboratorId: vehicle.added_by_collaborator_id ?? undefined,
        });
      }

      console.log(`✅ Collaborator notified of vehicle ${action}`);
    } catch (notifError) {
      console.error('❌ Failed to notify collaborator:', notifError);
    }

    return NextResponse.json({
      success: true,
      vehicle: updatedVehicle,
      action,
    });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du véhicule' },
      { status: 500 }
    );
  }
}
