import { NextResponse } from 'next/server';
import { requireCollaborator } from '@/lib/auth/collaborator-check';

// GET: Fetch collaborator notifications
export async function GET(request: Request) {
  try {
    const authCheck = await requireCollaborator();
    if (!authCheck.isCollaborator) {
      return authCheck.response;
    }

    const supabase = authCheck.supabase;
    const userId = authCheck.user.id;
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const unreadOnly = searchParams.get('unread') === 'true';
    const offset = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any;

    // Build query
    let query = supabaseAny
      .from('collaborator_notifications')
      .select('*', { count: 'exact' })
      .not('dismissed_by', 'cs', `{${userId}}`) // Exclude dismissed
      .order('created_at', { ascending: false });

    // Filter unread only
    if (unreadOnly) {
      query = query.not('read_by', 'cs', `{${userId}}`);
    }

    // Add pagination
    query = query.range(offset, offset + limit - 1);

    const { data: notifications, error, count } = await query;

    if (error) {
      throw error;
    }

    // Calculate unread count
    const { count: unreadCount } = await supabaseAny
      .from('collaborator_notifications')
      .select('*', { count: 'exact', head: true })
      .not('dismissed_by', 'cs', `{${userId}}`)
      .not('read_by', 'cs', `{${userId}}`);

    // Mark notifications with read status for current user
    const enrichedNotifications = (notifications || []).map((n: {
      id: string;
      read_by: string[];
      dismissed_by: string[];
      [key: string]: unknown;
    }) => ({
      ...n,
      isRead: n.read_by?.includes(userId) || false,
      isDismissed: n.dismissed_by?.includes(userId) || false,
    }));

    return NextResponse.json({
      notifications: enrichedNotifications,
      unreadCount: unreadCount || 0,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Error fetching notifications', error_zh: '获取通知时出错' },
      { status: 500 }
    );
  }
}

// PATCH: Mark notification(s) as read
export async function PATCH(request: Request) {
  try {
    const authCheck = await requireCollaborator();
    if (!authCheck.isCollaborator) {
      return authCheck.response;
    }

    const supabase = authCheck.supabase;
    const userId = authCheck.user.id;
    const body = await request.json();
    const { notificationId, markAll } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any;

    if (markAll) {
      // Get all unread notifications
      const { data: unreadNotifications } = await supabaseAny
        .from('collaborator_notifications')
        .select('id, read_by')
        .not('read_by', 'cs', `{${userId}}`);

      if (unreadNotifications && unreadNotifications.length > 0) {
        // Update each notification to add user to read_by array
        for (const notification of unreadNotifications) {
          const currentReadBy = notification.read_by || [];
          if (!currentReadBy.includes(userId)) {
            await supabaseAny
              .from('collaborator_notifications')
              .update({ read_by: [...currentReadBy, userId] })
              .eq('id', notification.id);
          }
        }
      }

      return NextResponse.json({
        success: true,
        markedCount: unreadNotifications?.length || 0,
      });
    } else if (notificationId) {
      // Mark single notification as read
      const { data: notification } = await supabaseAny
        .from('collaborator_notifications')
        .select('read_by')
        .eq('id', notificationId)
        .single();

      if (notification) {
        const currentReadBy = notification.read_by || [];
        if (!currentReadBy.includes(userId)) {
          await supabaseAny
            .from('collaborator_notifications')
            .update({ read_by: [...currentReadBy, userId] })
            .eq('id', notificationId);
        }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'notificationId or markAll required', error_zh: '需要通知ID或markAll' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Error updating notification', error_zh: '更新通知时出错' },
      { status: 500 }
    );
  }
}

// DELETE: Dismiss notification(s)
export async function DELETE(request: Request) {
  try {
    const authCheck = await requireCollaborator();
    if (!authCheck.isCollaborator) {
      return authCheck.response;
    }

    const supabase = authCheck.supabase;
    const userId = authCheck.user.id;
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID required', error_zh: '需要通知ID' },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any;

    // Get current notification
    const { data: notification } = await supabaseAny
      .from('collaborator_notifications')
      .select('dismissed_by')
      .eq('id', notificationId)
      .single();

    if (notification) {
      const currentDismissedBy = notification.dismissed_by || [];
      if (!currentDismissedBy.includes(userId)) {
        await supabaseAny
          .from('collaborator_notifications')
          .update({ dismissed_by: [...currentDismissedBy, userId] })
          .eq('id', notificationId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error dismissing notification:', error);
    return NextResponse.json(
      { error: 'Error dismissing notification', error_zh: '关闭通知时出错' },
      { status: 500 }
    );
  }
}
