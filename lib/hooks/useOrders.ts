'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/components/ui/Toast';
import type { Order, OrderTracking } from '@/types/database';

interface UseOrdersOptions {
  orderId?: string;
  userId?: string;
  status?: string;
  limit?: number;
}

interface OrderWithTracking extends Order {
  tracking?: OrderTracking[];
}

export function useOrders(options: UseOrdersOptions = {}) {
  const { orderId, userId, status, limit = 50 } = options;
  const [orders, setOrders] = useState<OrderWithTracking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();
  const toast = useToast();
  const supabase = useMemo(() => createClient(), []);

  const fetchOrders = useCallback(async () => {
    const targetUserId = userId || user?.id;
    if (!targetUserId && !orderId) {
      setOrders([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (orderId) {
        query = query.eq('id', orderId);
      } else if (targetUserId) {
        query = query.eq('user_id', targetUserId);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data: ordersData, error: ordersError } = await query;

      if (ordersError) throw ordersError;

      // Fetch tracking for each order
      const ordersWithTracking: OrderWithTracking[] = [];
      for (const order of ordersData || []) {
        const { data: trackingData } = await supabase
          .from('order_tracking')
          .select('*')
          .eq('order_id', order.id)
          .order('completed_at', { ascending: true });

        ordersWithTracking.push({
          ...(order as Order),
          tracking: (trackingData || []) as OrderTracking[],
        });
      }

      setOrders(ordersWithTracking);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch orders';
      setError(message);
      console.error('Error fetching orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, orderId, userId, user?.id, status, limit]);

  // Create order from won bid
  const createOrder = async (params: {
    vehicleId: string;
    bidId?: string;
    vehiclePriceUsd: number;
    destinationCountry: string;
    destinationPort?: string;
    destinationCity?: string;
    shippingMethod?: string;
    containerType?: string;
  }) => {
    if (!user) {
      toast.warning('Connexion requise', 'Connectez-vous pour créer une commande');
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { data, error: createError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          vehicle_id: params.vehicleId,
          bid_id: params.bidId || null,
          vehicle_price_usd: params.vehiclePriceUsd,
          destination_country: params.destinationCountry,
          destination_port: params.destinationPort || null,
          destination_city: params.destinationCity || null,
          shipping_method: params.shippingMethod || 'sea',
          container_type: params.containerType || 'shared',
          status: 'pending_payment',
          documents: {},
        })
        .select()
        .single();

      if (createError) throw createError;

      // Create initial tracking entry
      await supabase.from('order_tracking').insert({
        order_id: data.id,
        status: 'created',
        title: 'Commande créée',
        description: 'Votre commande a été créée avec succès',
      });

      toast.success('Commande créée!', 'Procédez au paiement pour confirmer');
      await fetchOrders();
      return { success: true, data: data as Order };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create order';
      toast.error('Erreur', message);
      return { success: false, error: message };
    }
  };

  // Update order
  const updateOrder = async (
    targetOrderId: string,
    updates: Partial<Order>
  ) => {
    if (!user) {
      toast.warning('Connexion requise', 'Connectez-vous pour modifier la commande');
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { data, error: updateError } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', targetOrderId)
        .select()
        .single();

      if (updateError) throw updateError;

      toast.success('Commande mise à jour');
      await fetchOrders();
      return { success: true, data: data as Order };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update order';
      toast.error('Erreur', message);
      return { success: false, error: message };
    }
  };

  // Get single order by ID
  const getOrder = useCallback(
    (targetOrderId: string) => {
      return orders.find((o) => o.id === targetOrderId);
    },
    [orders]
  );

  // Get orders by status
  const getOrdersByStatus = useCallback(
    (targetStatus: string) => {
      return orders.filter((o) => o.status === targetStatus);
    },
    [orders]
  );

  // Initial fetch
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    isLoading,
    error,
    createOrder,
    updateOrder,
    getOrder,
    getOrdersByStatus,
    refetch: fetchOrders,
  };
}

// Hook for single order with real-time tracking updates
export function useOrderTracking(orderId: string) {
  const [order, setOrder] = useState<OrderWithTracking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      const { data: trackingData } = await supabase
        .from('order_tracking')
        .select('*')
        .eq('order_id', orderId)
        .order('completed_at', { ascending: true });

      setOrder({
        ...(orderData as Order),
        tracking: (trackingData || []) as OrderTracking[],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch order';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, orderId]);

  // Initial fetch
  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Real-time subscription for tracking updates
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order-tracking-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_tracking',
          filter: `order_id=eq.${orderId}`,
        },
        () => {
          fetchOrder();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        () => {
          fetchOrder();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, orderId, fetchOrder]);

  return {
    order,
    tracking: order?.tracking || [],
    isLoading,
    error,
    refetch: fetchOrder,
  };
}

// Order status helpers
export const ORDER_STATUSES = {
  pending_payment: {
    label: 'En attente de paiement',
    color: 'bg-yellow-500',
    step: 1,
  },
  payment_received: {
    label: 'Paiement reçu',
    color: 'bg-blue-500',
    step: 2,
  },
  auction_won: {
    label: 'Enchère gagnée',
    color: 'bg-green-500',
    step: 3,
  },
  preparing_export: {
    label: 'Préparation export',
    color: 'bg-purple-500',
    step: 4,
  },
  in_transit: {
    label: 'En transit',
    color: 'bg-orange-500',
    step: 5,
  },
  customs_clearance: {
    label: 'Dédouanement',
    color: 'bg-indigo-500',
    step: 6,
  },
  delivered: {
    label: 'Livré',
    color: 'bg-green-600',
    step: 7,
  },
  cancelled: {
    label: 'Annulé',
    color: 'bg-red-500',
    step: 0,
  },
} as const;

export type OrderStatus = keyof typeof ORDER_STATUSES;
