'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { authFetch } from '@/lib/supabase/auth-helpers';

interface Notification {
  id: string;
  type: string;
  title: string;
  message?: string;
  data?: Record<string, unknown>;
  priority?: string;
  action_url?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  read_by: string[];
  dismissed_by: string[];
  created_at: string;
  read: boolean;
}

interface UseCollaboratorNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismiss: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useCollaboratorNotifications(): UseCollaboratorNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);

      const response = await authFetch('/api/collaborator/notifications');

      // Silently handle auth errors (user not logged in) or server errors (table doesn't exist)
      if (!response.ok) {
        // Don't set error for non-critical notification failures
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setError(null);
    } catch {
      // Silently fail - notifications are non-critical
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();
  }, [supabase]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!userId) return;

    let channel: RealtimeChannel;

    const subscribeToNotifications = async () => {
      channel = supabase
        .channel('collaborator-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'collaborator_notifications',
          },
          (payload) => {
            const newNotification = payload.new as Omit<Notification, 'read'>;
            const isRead = newNotification.read_by?.includes(userId) || false;
            const isDismissed = newNotification.dismissed_by?.includes(userId) || false;

            if (!isDismissed) {
              setNotifications((prev) => [
                { ...newNotification, read: isRead },
                ...prev,
              ]);
              if (!isRead) {
                setUnreadCount((prev) => prev + 1);
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'collaborator_notifications',
          },
          (payload) => {
            const updated = payload.new as Omit<Notification, 'read'>;
            const isRead = updated.read_by?.includes(userId) || false;
            const isDismissed = updated.dismissed_by?.includes(userId) || false;

            setNotifications((prev) =>
              isDismissed
                ? prev.filter((n) => n.id !== updated.id)
                : prev.map((n) =>
                    n.id === updated.id ? { ...updated, read: isRead } : n
                  )
            );
          }
        )
        .subscribe();
    };

    subscribeToNotifications();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [supabase, userId]);

  // Mark as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      const response = await authFetch('/api/collaborator/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ notificationId: id }),
      });

      if (!response.ok) {
        return; // Silently fail
      }

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silently fail - non-critical
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await authFetch('/api/collaborator/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ markAllRead: true }),
      });

      if (!response.ok) {
        return; // Silently fail
      }

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch {
      // Silently fail - non-critical
    }
  }, []);

  // Dismiss notification
  const dismiss = useCallback(async (id: string) => {
    try {
      const response = await authFetch('/api/collaborator/notifications', {
        method: 'DELETE',
        body: JSON.stringify({ notificationId: id }),
      });

      if (!response.ok) {
        return; // Silently fail
      }

      const notification = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (notification && !notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      // Silently fail - non-critical
    }
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    dismiss,
    refresh: fetchNotifications,
  };
}
