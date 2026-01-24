/**
 * Real-time synchronization helper for orders
 * Allows both admin and collaborator pages to subscribe to order changes
 */

import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type OrderChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

export interface OrderChangePayload {
  eventType: OrderChangeEvent;
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
  orderId: string;
}

export interface OrdersSyncOptions {
  onOrderChange?: (payload: OrderChangePayload) => void;
  onError?: (error: Error) => void;
  channelName?: string;
}

/**
 * Subscribe to real-time order changes
 * Returns a cleanup function to unsubscribe
 */
export function subscribeToOrders(options: OrdersSyncOptions = {}): () => void {
  const {
    onOrderChange,
    onError,
    channelName = `orders-sync-${Date.now()}`,
  } = options;

  const supabase = createClient();
  let channel: RealtimeChannel | null = null;

  try {
    channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          try {
            const eventType = payload.eventType as OrderChangeEvent;
            const orderId = (payload.new as { id?: string })?.id || (payload.old as { id?: string })?.id || '';

            onOrderChange?.({
              eventType,
              new: payload.new as Record<string, unknown> | null,
              old: payload.old as Record<string, unknown> | null,
              orderId,
            });

            console.log(`📡 Order ${eventType}:`, orderId);
          } catch (err) {
            onError?.(err instanceof Error ? err : new Error('Unknown error in order change handler'));
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscribed to orders real-time updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to orders:', err);
          onError?.(new Error(`Subscription error: ${err?.message || 'Unknown'}`));
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Subscription timed out');
          onError?.(new Error('Subscription timed out'));
        } else if (status === 'CLOSED') {
          console.log('🔌 Subscription closed');
        }
      });

    // Return cleanup function
    return () => {
      if (channel) {
        console.log('🔌 Unsubscribing from orders real-time updates');
        supabase.removeChannel(channel);
      }
    };
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error('Failed to subscribe to orders'));
    return () => {}; // Noop cleanup
  }
}

/**
 * Subscribe to real-time changes for a specific order
 */
export function subscribeToOrder(
  orderId: string,
  options: Omit<OrdersSyncOptions, 'channelName'> = {}
): () => void {
  const { onOrderChange, onError } = options;

  return subscribeToOrders({
    channelName: `order-${orderId}-sync`,
    onOrderChange: (payload) => {
      // Filter to only this order
      if (payload.orderId === orderId) {
        onOrderChange?.(payload);
      }
    },
    onError,
  });
}

/**
 * Subscribe to real-time changes for notification tables
 * Useful for admin and collaborator notification badges
 */
export interface NotificationSyncOptions {
  tableName: 'admin_notifications' | 'collaborator_notifications';
  onNotificationChange?: (payload: OrderChangePayload) => void;
  onError?: (error: Error) => void;
}

export function subscribeToNotifications(options: NotificationSyncOptions): () => void {
  const { tableName, onNotificationChange, onError } = options;

  const supabase = createClient();
  let channel: RealtimeChannel | null = null;

  try {
    channel = supabase
      .channel(`${tableName}-sync-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
        },
        (payload) => {
          try {
            const eventType = payload.eventType as OrderChangeEvent;
            const notificationId = (payload.new as { id?: string })?.id || (payload.old as { id?: string })?.id || '';

            onNotificationChange?.({
              eventType,
              new: payload.new as Record<string, unknown> | null,
              old: payload.old as Record<string, unknown> | null,
              orderId: notificationId, // Reuse field name for notification ID
            });

            console.log(`🔔 Notification ${eventType}:`, notificationId);
          } catch (err) {
            onError?.(err instanceof Error ? err : new Error('Unknown error in notification change handler'));
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to ${tableName} real-time updates`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Error subscribing to ${tableName}:`, err);
          onError?.(new Error(`Subscription error: ${err?.message || 'Unknown'}`));
        }
      });

    return () => {
      if (channel) {
        console.log(`🔌 Unsubscribing from ${tableName} real-time updates`);
        supabase.removeChannel(channel);
      }
    };
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error(`Failed to subscribe to ${tableName}`));
    return () => {};
  }
}

/**
 * React hook for subscribing to orders
 * Usage:
 *
 * useEffect(() => {
 *   const cleanup = subscribeToOrders({
 *     onOrderChange: (payload) => {
 *       // Refresh orders or update state
 *       fetchOrders();
 *     },
 *   });
 *   return cleanup;
 * }, []);
 */
