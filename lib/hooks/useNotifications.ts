'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import type { Notification, AdminNotification } from '@/types/database';

export interface UseNotificationsOptions {
  limit?: number;
  includeRead?: boolean;
  includeDismissed?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface NotificationWithMeta extends Notification {
  isNew?: boolean;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const {
    limit = 50,
    includeRead = true,
    includeDismissed = false,
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
  } = options;

  const [notifications, setNotifications] = useState<NotificationWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();
  const supabase = useMemo(() => createClient(), []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!includeRead) {
        query = query.eq('read', false);
      }

      if (!includeDismissed) {
        query = query.eq('dismissed', false);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setNotifications((data || []) as NotificationWithMeta[]);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch notifications';
      setError(message);
      console.error('Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, user?.id, limit, includeRead, includeDismissed]);

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to mark as read';
      return { success: false, error: message };
    }
  }, [supabase, user?.id]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (updateError) throw updateError;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to mark all as read';
      return { success: false, error: message };
    }
  }, [supabase, user?.id]);

  // Dismiss notification
  const dismissNotification = useCallback(async (notificationId: string) => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ dismissed: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to dismiss notification';
      return { success: false, error: message };
    }
  }, [supabase, user?.id]);

  // Count unread notifications
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  // Get notifications by priority
  const urgentNotifications = useMemo(() => {
    return notifications.filter(n => n.priority === 'urgent' && !n.read);
  }, [notifications]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !user?.id) return;

    const interval = setInterval(fetchNotifications, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchNotifications, user?.id]);

  // Real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as NotificationWithMeta;
          newNotification.isNew = true;
          setNotifications(prev => [newNotification, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedNotification = payload.new as NotificationWithMeta;
          setNotifications(prev =>
            prev.map(n => (n.id === updatedNotification.id ? updatedNotification : n))
          );
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.warn('Notifications realtime subscription error:', err.message);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, user?.id]);

  return {
    notifications,
    isLoading,
    error,
    unreadCount,
    urgentNotifications,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    refetch: fetchNotifications,
  };
}

// Hook for admin notifications
export function useAdminNotifications(options: UseNotificationsOptions = {}) {
  const {
    limit = 50,
    autoRefresh = true,
    refreshInterval = 30000,
  } = options;

  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, profile } = useAuthStore();
  const supabase = useMemo(() => createClient(), []);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  // Fetch admin notifications
  const fetchNotifications = useCallback(async () => {
    if (!user?.id || !isAdmin) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;

      setNotifications((data || []) as AdminNotification[]);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch admin notifications';
      setError(message);
      console.error('Error fetching admin notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, user?.id, isAdmin, limit]);

  // Mark admin notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user?.id || !isAdmin) return { success: false, error: 'Not authorized' };

    try {
      // Get current notification
      const { data: currentNotif } = await supabase
        .from('admin_notifications')
        .select('read_by')
        .eq('id', notificationId)
        .single();

      if (!currentNotif) throw new Error('Notification not found');

      const readBy = currentNotif.read_by || [];
      if (!readBy.includes(user.id)) {
        const { error: updateError } = await supabase
          .from('admin_notifications')
          .update({ read_by: [...readBy, user.id] })
          .eq('id', notificationId);

        if (updateError) throw updateError;
      }

      setNotifications(prev =>
        prev.map(n => {
          if (n.id === notificationId) {
            return {
              ...n,
              read_by: [...(n.read_by || []), user.id],
            };
          }
          return n;
        })
      );

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to mark as read';
      return { success: false, error: message };
    }
  }, [supabase, user?.id, isAdmin]);

  // Mark all admin notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.id || !isAdmin) return { success: false, error: 'Not authorized' };

    try {
      // Get all notifications that the user hasn't read yet
      const unreadNotifs = notifications.filter(n => !n.read_by?.includes(user.id));

      for (const notif of unreadNotifs) {
        const readBy = notif.read_by || [];
        await supabase
          .from('admin_notifications')
          .update({ read_by: [...readBy, user.id] })
          .eq('id', notif.id);
      }

      setNotifications(prev =>
        prev.map(n => ({
          ...n,
          read_by: [...(n.read_by || []), user.id],
        }))
      );

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to mark all as read';
      return { success: false, error: message };
    }
  }, [supabase, user?.id, isAdmin, notifications]);

  // Dismiss admin notification
  const dismissNotification = useCallback(async (notificationId: string) => {
    if (!user?.id || !isAdmin) return { success: false, error: 'Not authorized' };

    try {
      const { data: currentNotif } = await supabase
        .from('admin_notifications')
        .select('dismissed_by')
        .eq('id', notificationId)
        .single();

      if (!currentNotif) throw new Error('Notification not found');

      const dismissedBy = currentNotif.dismissed_by || [];
      if (!dismissedBy.includes(user.id)) {
        const { error: updateError } = await supabase
          .from('admin_notifications')
          .update({ dismissed_by: [...dismissedBy, user.id] })
          .eq('id', notificationId);

        if (updateError) throw updateError;
      }

      setNotifications(prev =>
        prev.filter(n => {
          if (n.id === notificationId) {
            return false;
          }
          return true;
        })
      );

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to dismiss notification';
      return { success: false, error: message };
    }
  }, [supabase, user?.id, isAdmin]);

  // Count unread notifications for current admin
  const unreadCount = useMemo(() => {
    if (!user?.id) return 0;
    return notifications.filter(n => !n.read_by?.includes(user.id)).length;
  }, [notifications, user?.id]);

  // Get urgent notifications
  const urgentNotifications = useMemo(() => {
    if (!user?.id) return [];
    return notifications.filter(
      n => n.priority === 'urgent' && !n.read_by?.includes(user.id)
    );
  }, [notifications, user?.id]);

  // Initial fetch
  useEffect(() => {
    if (isAdmin) {
      fetchNotifications();
    }
  }, [fetchNotifications, isAdmin]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !isAdmin) return;

    const interval = setInterval(fetchNotifications, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchNotifications, isAdmin]);

  // Real-time subscription
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications',
        },
        (payload) => {
          const newNotification = payload.new as AdminNotification;
          setNotifications(prev => [newNotification, ...prev]);
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.warn('Admin notifications realtime subscription error:', err.message);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, isAdmin]);

  return {
    notifications,
    isLoading,
    error,
    unreadCount,
    urgentNotifications,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    refetch: fetchNotifications,
  };
}

// Notification type icons mapping
export const NOTIFICATION_ICONS: Record<string, string> = {
  order_created: 'package',
  order_updated: 'package',
  order_shipped: 'truck',
  order_delivered: 'check-circle',
  quote_created: 'file-text',
  quote_accepted: 'check-circle',
  quote_expired: 'clock',
  quote_rejected: 'x-circle',
  payment_received: 'credit-card',
  payment_failed: 'alert-circle',
  vehicle_available: 'car',
  vehicle_sold: 'alert-triangle',
  alternatives_available: 'refresh-cw',
  reassignment_completed: 'check-circle',
  new_message: 'message-circle',
  new_order: 'shopping-cart',
  new_reassignment: 'refresh-cw',
  system: 'info',
};

// Notification priority colors
export const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-gray-500',
  normal: 'text-blue-500',
  high: 'text-orange-500',
  urgent: 'text-red-500',
};

export const PRIORITY_BG_COLORS: Record<string, string> = {
  low: 'bg-gray-500/10',
  normal: 'bg-blue-500/10',
  high: 'bg-orange-500/10',
  urgent: 'bg-red-500/10',
};
