'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/components/ui/Toast';
import type { Bid } from '@/types/database';

interface UseBidsOptions {
  vehicleId?: string;
  userId?: string;
  realtime?: boolean;
}

export function useBids(options: UseBidsOptions = {}) {
  const { vehicleId, userId, realtime = true } = options;
  const [bids, setBids] = useState<Bid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();
  const toast = useToast();
  const supabase = useMemo(() => createClient(), []);

  const fetchBids = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('bids')
        .select('*')
        .order('created_at', { ascending: false });

      if (vehicleId) {
        query = query.eq('vehicle_id', vehicleId);
      }

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setBids((data || []) as Bid[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch bids';
      setError(message);
      console.error('Error fetching bids:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, vehicleId, userId]);

  // Place a new bid
  const placeBid = async (bidVehicleId: string, amountUsd: number) => {
    if (!user) {
      toast.warning('Connexion requise', 'Connectez-vous pour enchérir');
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { data, error: bidError } = await supabase
        .from('bids')
        .insert({
          vehicle_id: bidVehicleId,
          user_id: user.id,
          amount_usd: amountUsd,
          status: 'pending',
        })
        .select()
        .single();

      if (bidError) throw bidError;

      toast.success('Enchère placée!', `Votre enchère de $${amountUsd.toLocaleString()} a été placée`);
      return { success: true, data: data as Bid };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to place bid';
      toast.error('Erreur', message);
      return { success: false, error: message };
    }
  };

  // Cancel a bid
  const cancelBid = async (bidId: string) => {
    if (!user) {
      toast.warning('Connexion requise', 'Connectez-vous pour annuler une enchère');
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { error: cancelError } = await supabase
        .from('bids')
        .update({ status: 'cancelled' })
        .eq('id', bidId)
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (cancelError) throw cancelError;

      toast.success('Enchère annulée');
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel bid';
      toast.error('Erreur', message);
      return { success: false, error: message };
    }
  };

  // Get highest bid for a vehicle
  const getHighestBid = useCallback(
    (targetVehicleId?: string) => {
      const targetId = targetVehicleId || vehicleId;
      const vehicleBids = bids.filter(
        (b) => b.vehicle_id === targetId && b.status !== 'cancelled'
      );
      return vehicleBids.reduce<Bid | null>((highest, bid) => {
        if (!highest || bid.amount_usd > highest.amount_usd) {
          return bid;
        }
        return highest;
      }, null);
    },
    [bids, vehicleId]
  );

  // Get user's bids for a vehicle
  const getUserBids = useCallback(
    (targetVehicleId?: string) => {
      if (!user) return [];
      const targetId = targetVehicleId || vehicleId;
      return bids.filter(
        (b) => b.vehicle_id === targetId && b.user_id === user.id
      );
    },
    [bids, vehicleId, user]
  );

  // Check if user has active bid on vehicle
  const hasActiveBid = useCallback(
    (targetVehicleId?: string) => {
      if (!user) return false;
      const targetId = targetVehicleId || vehicleId;
      return bids.some(
        (b) =>
          b.vehicle_id === targetId &&
          b.user_id === user.id &&
          b.status === 'pending'
      );
    },
    [bids, vehicleId, user]
  );

  // Initial fetch
  useEffect(() => {
    fetchBids();
  }, [fetchBids]);

  // Real-time subscription
  useEffect(() => {
    if (!realtime) return;

    const channel = supabase
      .channel('bids-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bids',
          ...(vehicleId && { filter: `vehicle_id=eq.${vehicleId}` }),
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newBid = payload.new as Bid;
            setBids((prev) => [newBid, ...prev]);

            // Notify if it's not the current user's bid
            if (user && newBid.user_id !== user.id && vehicleId) {
              toast.info(
                'Nouvelle enchère!',
                `Quelqu'un a enchéri $${newBid.amount_usd.toLocaleString()}`
              );
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedBid = payload.new as Bid;
            setBids((prev) =>
              prev.map((b) => (b.id === updatedBid.id ? updatedBid : b))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedBid = payload.old as { id: string };
            setBids((prev) => prev.filter((b) => b.id !== deletedBid.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, vehicleId, realtime, user, toast]);

  return {
    bids,
    isLoading,
    error,
    placeBid,
    cancelBid,
    getHighestBid,
    getUserBids,
    hasActiveBid,
    refetch: fetchBids,
  };
}
