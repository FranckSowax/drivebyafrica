import { NextResponse } from 'next/server';
import { requireAdminOrCollaborator } from '@/lib/auth/collaborator-check';

interface ActivityItem {
  id: string;
  collaborator_id: string;
  collaborator_name: string | null;
  collaborator_color: string | null;
  action_type: string;
  details: {
    oldStatus?: string;
    newStatus?: string;
    documentName?: string;
    note?: string;
    [key: string]: unknown;
  };
  created_at: string;
}

/**
 * GET /api/orders/[orderId]/activity
 * Fetch the activity history for an order (last 20 modifications)
 * Only accessible to admin and collaborators
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;

  // Auth check: must be admin or collaborator
  const authCheck = await requireAdminOrCollaborator();
  if (!authCheck.authorized) {
    return authCheck.response;
  }

  const { supabase } = authCheck;

  try {
    // Fetch activity logs for this order, joined with profiles for collaborator info
    const { data: activities, error } = await supabase
      .from('collaborator_activity_log')
      .select(`
        id,
        collaborator_id,
        action_type,
        details,
        created_at
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching activity:', error);
      return NextResponse.json(
        { error: 'Failed to fetch activity', error_zh: '获取活动失败' },
        { status: 500 }
      );
    }

    // Get unique collaborator IDs to fetch their profiles
    const collaboratorIds = [...new Set((activities || []).map((a) => a.collaborator_id))];

    // Fetch collaborator profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, badge_color')
      .in('id', collaboratorIds);

    // Create a map for quick lookup
    const profileMap = new Map(
      (profiles || []).map((p) => [p.id, { name: p.full_name, color: p.badge_color }])
    );

    // Transform activities with collaborator info
    const transformedActivities: ActivityItem[] = (activities || []).map((activity) => {
      const profile = profileMap.get(activity.collaborator_id);
      return {
        id: activity.id,
        collaborator_id: activity.collaborator_id,
        collaborator_name: profile?.name || null,
        collaborator_color: profile?.color || null,
        action_type: activity.action_type,
        details: (activity.details as ActivityItem['details']) || {},
        created_at: activity.created_at,
      };
    });

    return NextResponse.json({
      activities: transformedActivities,
      total: transformedActivities.length,
    });
  } catch (error) {
    console.error('Error in activity API:', error);
    return NextResponse.json(
      { error: 'Internal server error', error_zh: '服务器内部错误' },
      { status: 500 }
    );
  }
}
