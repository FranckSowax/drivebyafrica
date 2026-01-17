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
          status: 'deposit_pending',
          documents: {},
        })
        .select()
        .single();

      if (createError) throw createError;

      // Create initial tracking entry
      await supabase.from('order_tracking').insert({
        order_id: data.id,
        status: 'created',
        title: 'Commande creee',
        description: 'Votre commande a ete creee. Versez l\'acompte de 1000$ pour bloquer le vehicule.',
      });

      toast.success('Commande creee!', 'Versez l\'acompte de 1000$ pour bloquer le vehicule');
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

// Order status helpers - New workflow:
// 1. Quote obtained -> 2. $1000 deposit -> 3. Inspection report -> 4. Full payment -> 5. Delivery
export const ORDER_STATUSES = {
  deposit_pending: {
    label: 'En attente de l\'acompte',
    color: 'bg-yellow-500',
    step: 1,
  },
  deposit_received: {
    label: 'Vehicule bloque',
    color: 'bg-blue-500',
    step: 2,
  },
  inspection_pending: {
    label: 'Inspection en cours',
    color: 'bg-purple-500',
    step: 3,
  },
  inspection_complete: {
    label: 'Rapport d\'inspection envoye',
    color: 'bg-indigo-500',
    step: 4,
  },
  payment_pending: {
    label: 'En attente du paiement',
    color: 'bg-yellow-500',
    step: 5,
  },
  payment_received: {
    label: 'Paiement recu',
    color: 'bg-green-500',
    step: 6,
  },
  preparing_export: {
    label: 'Preparation export',
    color: 'bg-purple-500',
    step: 7,
  },
  shipped: {
    label: 'En transit',
    color: 'bg-orange-500',
    step: 8,
  },
  customs_clearance: {
    label: 'Dedouanement',
    color: 'bg-indigo-500',
    step: 9,
  },
  delivered: {
    label: 'Livre',
    color: 'bg-green-600',
    step: 10,
  },
  cancelled: {
    label: 'Annule',
    color: 'bg-red-500',
    step: 0,
  },
  // Legacy statuses for backwards compatibility
  pending_payment: {
    label: 'En attente de paiement',
    color: 'bg-yellow-500',
    step: 1,
  },
  paid: {
    label: 'Paiement reçu',
    color: 'bg-green-500',
    step: 2,
  },
  processing: {
    label: 'En traitement',
    color: 'bg-blue-500',
    step: 3,
  },
  in_transit: {
    label: 'En transit',
    color: 'bg-orange-500',
    step: 8,
  },
  completed: {
    label: 'Terminé',
    color: 'bg-green-600',
    step: 11,
  },
} as const;

export type OrderStatus = keyof typeof ORDER_STATUSES;
