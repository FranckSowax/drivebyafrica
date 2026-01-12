'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Simplified payload type
interface RealtimePayload<T> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: { id: string } | T;
}

interface UseRealtimeOptions<T> {
  table: string;
  schema?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  onInsert?: (record: T) => void;
  onUpdate?: (record: T) => void;
  onDelete?: (record: { id: string }) => void;
  onChange?: (payload: RealtimePayload<T>) => void;
  enabled?: boolean;
}

export function useRealtime<T>(options: UseRealtimeOptions<T>) {
  const {
    table,
    schema = 'public',
    event = '*',
    filter,
    onInsert,
    onUpdate,
    onDelete,
    onChange,
    enabled = true,
  } = options;

  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize callbacks to prevent unnecessary resubscriptions
  const handlersRef = useRef({ onInsert, onUpdate, onDelete, onChange });
  handlersRef.current = { onInsert, onUpdate, onDelete, onChange };

  useEffect(() => {
    if (!enabled) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const channelName = `realtime-${table}-${filter || 'all'}`;

    // Build the filter config - use type assertion to bypass strict typing
    const filterConfig = {
      event: event as '*',
      schema,
      table,
      ...(filter && { filter }),
    };

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', filterConfig, (payload: unknown) => {
        const handlers = handlersRef.current;
        const typedPayload = payload as RealtimePayload<T>;

        handlers.onChange?.(typedPayload);

        const eventType = (payload as { eventType: string }).eventType;
        if (eventType === 'INSERT' && handlers.onInsert) {
          handlers.onInsert(typedPayload.new);
        } else if (eventType === 'UPDATE' && handlers.onUpdate) {
          handlers.onUpdate(typedPayload.new);
        } else if (eventType === 'DELETE' && handlers.onDelete) {
          handlers.onDelete(typedPayload.old as { id: string });
        }
      });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        setError(null);
      } else if (status === 'CLOSED') {
        setIsConnected(false);
      } else if (status === 'CHANNEL_ERROR') {
        setError('Failed to subscribe to channel');
        setIsConnected(false);
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [supabase, table, schema, event, filter, enabled]);

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setIsConnected(false);
    }
  }, [supabase]);

  return {
    isConnected,
    error,
    unsubscribe,
  };
}

// Presence hook for tracking online users
interface UsePresenceOptions {
  channelName: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  enabled?: boolean;
}

interface PresenceState {
  [key: string]: {
    user_id: string;
    online_at: string;
    [key: string]: unknown;
  }[];
}

export function usePresence(options: UsePresenceOptions) {
  const { channelName, userId, metadata = {}, enabled = true } = options;
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [presenceState, setPresenceState] = useState<PresenceState>({});
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!enabled || !userId) return;

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as PresenceState;
        setPresenceState(state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
            ...metadata,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [supabase, channelName, userId, enabled, metadata]);

  const onlineUsers = Object.values(presenceState).flat();
  const onlineCount = onlineUsers.length;

  return {
    presenceState,
    onlineUsers,
    onlineCount,
    isConnected,
  };
}
