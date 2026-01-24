import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Fetch notifications for current user
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const unreadOnly = searchParams.get('unread') === 'true';
    const type = searchParams.get('type');

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('dismissed', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)
      .eq('dismissed', false);

    return NextResponse.json({
      notifications: data || [],
      total: count || 0,
      unreadCount: unreadCount || 0,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des notifications' },
      { status: 500 }
    );
  }
}

// POST - Create a notification
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Check if user is admin for creating notifications for others
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role as string | undefined;
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';

    const body = await request.json();
    const {
      user_id,
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
      is_admin_notification = false,
    } = body;

    // Only admins can create notifications for other users
    const targetUserId = isAdmin ? (user_id || user.id) : user.id;

    if (is_admin_notification && isAdmin) {
      // Create admin notification
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
    } else {
      // Create user notification
      const { data: notification, error } = await supabase
        .from('notifications')
        .insert({
          user_id: targetUserId,
          type,
          title,
          message,
          action_url,
          action_label,
          icon,
          priority,
          category: 'user',
          related_entity_type,
          related_entity_id,
          data: data || {},
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ notification });
    }
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la notification' },
      { status: 500 }
    );
  }
}

// PATCH - Mark notifications as read
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { notification_ids, mark_all = false } = body;

    if (mark_all) {
      // Mark all as read
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      return NextResponse.json({ success: true, message: 'Toutes les notifications marquées comme lues' });
    } else if (notification_ids && notification_ids.length > 0) {
      // Mark specific notifications as read
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .in('id', notification_ids);

      if (error) throw error;

      return NextResponse.json({ success: true, message: 'Notifications marquées comme lues' });
    }

    return NextResponse.json({ error: 'notification_ids ou mark_all requis' }, { status: 400 });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour des notifications' },
      { status: 500 }
    );
  }
}

// DELETE - Dismiss notifications
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');
    const dismissAll = searchParams.get('all') === 'true';

    if (dismissAll) {
      // Dismiss all notifications
      const { error } = await supabase
        .from('notifications')
        .update({ dismissed: true })
        .eq('user_id', user.id);

      if (error) throw error;

      return NextResponse.json({ success: true, message: 'Toutes les notifications supprimées' });
    } else if (notificationId) {
      // Dismiss specific notification
      const { error } = await supabase
        .from('notifications')
        .update({ dismissed: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      return NextResponse.json({ success: true, message: 'Notification supprimée' });
    }

    return NextResponse.json({ error: 'id ou all requis' }, { status: 400 });
  } catch (error) {
    console.error('Error dismissing notifications:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression des notifications' },
      { status: 500 }
    );
  }
}
