import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

// GET - Fetch admin notifications
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
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const unreadOnly = searchParams.get('unread') === 'true';
    const priority = searchParams.get('priority');

    let query = supabase
      .from('admin_notifications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (priority && ['low', 'normal', 'high', 'urgent'].includes(priority)) {
      query = query.eq('priority', priority as 'low' | 'normal' | 'high' | 'urgent');
    }

    const { data, error, count } = await query;

    if (error) throw error;

    // Filter notifications not dismissed by current user
    const filteredData = (data || []).filter(
      n => !n.dismissed_by?.includes(user.id)
    );

    // Calculate unread count for current user
    const unreadNotifications = filteredData.filter(
      n => !n.read_by?.includes(user.id)
    );

    // If unreadOnly, filter further
    const finalData = unreadOnly ? unreadNotifications : filteredData;

    return NextResponse.json({
      notifications: finalData,
      total: count || 0,
      unreadCount: unreadNotifications.length,
    });
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des notifications' },
      { status: 500 }
    );
  }
}

// POST - Create admin notification
export async function POST(request: Request) {
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
    const {
      type,
      title,
      message,
      action_url,
      action_label,
      icon,
      priority = 'normal',
      related_entity_type,
      related_entity_id,
      data,
    } = body;

    const { data: notification, error } = await supabase
      .from('admin_notifications')
      .insert({
        type,
        title,
        message,
        action_url,
        action_label,
        icon,
        priority,
        related_entity_type,
        related_entity_id,
        data: data || {},
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ notification });
  } catch (error) {
    console.error('Error creating admin notification:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la notification' },
      { status: 500 }
    );
  }
}

// PATCH - Mark admin notifications as read
export async function PATCH(request: Request) {
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
    const { notification_ids, mark_all = false } = body;

    if (mark_all) {
      // Get all unread notifications for this admin
      const { data: notifications } = await supabase
        .from('admin_notifications')
        .select('id, read_by');

      if (notifications) {
        for (const notif of notifications) {
          if (!notif.read_by?.includes(user.id)) {
            await supabase
              .from('admin_notifications')
              .update({ read_by: [...(notif.read_by || []), user.id] })
              .eq('id', notif.id);
          }
        }
      }

      return NextResponse.json({ success: true, message: 'Toutes les notifications marquées comme lues' });
    } else if (notification_ids && notification_ids.length > 0) {
      // Mark specific notifications as read
      for (const notifId of notification_ids) {
        const { data: notif } = await supabase
          .from('admin_notifications')
          .select('read_by')
          .eq('id', notifId)
          .single();

        if (notif && !notif.read_by?.includes(user.id)) {
          await supabase
            .from('admin_notifications')
            .update({ read_by: [...(notif.read_by || []), user.id] })
            .eq('id', notifId);
        }
      }

      return NextResponse.json({ success: true, message: 'Notifications marquées comme lues' });
    }

    return NextResponse.json({ error: 'notification_ids ou mark_all requis' }, { status: 400 });
  } catch (error) {
    console.error('Error marking admin notifications as read:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour des notifications' },
      { status: 500 }
    );
  }
}

// DELETE - Dismiss admin notifications
export async function DELETE(request: Request) {
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
    const notificationId = searchParams.get('id');

    if (notificationId) {
      const { data: notif } = await supabase
        .from('admin_notifications')
        .select('dismissed_by')
        .eq('id', notificationId)
        .single();

      if (notif && !notif.dismissed_by?.includes(user.id)) {
        await supabase
          .from('admin_notifications')
          .update({ dismissed_by: [...(notif.dismissed_by || []), user.id] })
          .eq('id', notificationId);
      }

      return NextResponse.json({ success: true, message: 'Notification supprimée' });
    }

    return NextResponse.json({ error: 'id requis' }, { status: 400 });
  } catch (error) {
    console.error('Error dismissing admin notification:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la notification' },
      { status: 500 }
    );
  }
}
