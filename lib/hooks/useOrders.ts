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

// Order status helpers - 14-step workflow:
// 1. Acompte payé -> 2. Véhicule bloqué -> 3. Inspection envoyée -> 4. Totalité paiement reçu ->
// 5. Véhicule acheté -> 6. Réception véhicule (admin/collab only) -> 7. Douane export ->
// 8. En transit -> 9. Au port -> 10. En mer -> 11. Remise documentation ->
// 12. En douane -> 13. Prêt pour retrait -> 14. Livré
export const ORDER_STATUSES = {
  // Main workflow statuses (14 steps)
  deposit_paid: {
    label: 'Acompte payé',
    color: 'bg-yellow-500',
    step: 1,
    description: 'L\'acompte de 1000$ a été versé',
  },
  vehicle_locked: {
    label: 'Véhicule bloqué',
    color: 'bg-blue-500',
    step: 2,
    description: 'Le véhicule est réservé pour vous',
  },
  inspection_sent: {
    label: 'Inspection envoyée',
    color: 'bg-cyan-500',
    step: 3,
    description: 'Le rapport d\'inspection a été envoyé',
  },
  full_payment_received: {
    label: 'Totalité du paiement reçu',
    color: 'bg-green-500',
    step: 4,
    description: 'Le paiement complet a été confirmé',
  },
  vehicle_purchased: {
    label: 'Véhicule acheté',
    color: 'bg-emerald-500',
    step: 5,
    description: 'Le véhicule a été acheté',
  },
  vehicle_received: {
    label: 'Réception véhicule',
    color: 'bg-lime-500',
    step: 6,
    description: 'Le véhicule a été réceptionné et un transitaire assigné',
    adminOnly: true,
  },
  export_customs: {
    label: 'Douane export',
    color: 'bg-amber-500',
    step: 7,
    description: 'Le véhicule passe la douane d\'exportation',
  },
  in_transit: {
    label: 'En transit',
    color: 'bg-purple-500',
    step: 8,
    description: 'Le véhicule est en transit vers le port',
  },
  at_port: {
    label: 'Au port',
    color: 'bg-sky-500',
    step: 9,
    description: 'Le véhicule est arrivé au port',
  },
  shipping: {
    label: 'En mer',
    color: 'bg-indigo-500',
    step: 10,
    description: 'Le véhicule est en mer',
  },
  documents_ready: {
    label: 'Remise documentation',
    color: 'bg-violet-500',
    step: 11,
    description: 'Les documents sont disponibles au téléchargement',
  },
  customs: {
    label: 'En douane',
    color: 'bg-orange-500',
    step: 12,
    description: 'Le véhicule est en cours de dédouanement',
  },
  ready_pickup: {
    label: 'Prêt pour retrait',
    color: 'bg-teal-500',
    step: 13,
    description: 'Le véhicule est prêt à être retiré',
  },
  delivered: {
    label: 'Livré',
    color: 'bg-green-600',
    step: 14,
    description: 'Le véhicule a été livré',
  },
  // Special statuses
  cancelled: {
    label: 'Annulé',
    color: 'bg-red-500',
    step: 0,
    description: 'La commande a été annulée',
  },
  pending_reassignment: {
    label: 'Véhicule non disponible',
    color: 'bg-yellow-600',
    step: 0,
    description: 'Le véhicule n\'est plus disponible, réassignation en cours',
  },
  // Legacy statuses for backwards compatibility
  deposit_pending: {
    label: 'En attente de l\'acompte',
    color: 'bg-yellow-500',
    step: 1,
    description: 'Versez l\'acompte de 1000$',
  },
  deposit_received: {
    label: 'Véhicule bloqué',
    color: 'bg-blue-500',
    step: 2,
    description: 'Le véhicule est réservé',
  },
  inspection_pending: {
    label: 'Inspection en cours',
    color: 'bg-cyan-500',
    step: 3,
    description: 'Inspection en cours',
  },
  inspection_complete: {
    label: 'Inspection envoyée',
    color: 'bg-cyan-500',
    step: 3,
    description: 'Rapport d\'inspection disponible',
  },
  payment_pending: {
    label: 'En attente du paiement',
    color: 'bg-yellow-500',
    step: 4,
    description: 'Effectuez le paiement du solde',
  },
  payment_received: {
    label: 'Paiement reçu',
    color: 'bg-green-500',
    step: 4,
    description: 'Le paiement a été reçu',
  },
  preparing_export: {
    label: 'Douane export',
    color: 'bg-amber-500',
    step: 7,
    description: 'Préparation pour l\'export',
  },
  shipped: {
    label: 'En transit',
    color: 'bg-purple-500',
    step: 8,
    description: 'Le véhicule est en route',
  },
  customs_clearance: {
    label: 'En douane',
    color: 'bg-orange-500',
    step: 12,
    description: 'En cours de dédouanement',
  },
  completed: {
    label: 'Livré',
    color: 'bg-green-600',
    step: 14,
    description: 'La commande est terminée',
  },
  pending_payment: {
    label: 'En attente de paiement',
    color: 'bg-yellow-500',
    step: 4,
    description: 'En attente du paiement',
  },
  paid: {
    label: 'Paiement reçu',
    color: 'bg-green-500',
    step: 4,
    description: 'Le paiement a été reçu',
  },
  processing: {
    label: 'En traitement',
    color: 'bg-blue-500',
    step: 2,
    description: 'Le véhicule est bloqué, en attente de traitement',
  },
} as const;

export type OrderStatus = keyof typeof ORDER_STATUSES;
