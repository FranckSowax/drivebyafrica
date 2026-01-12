import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { OrderCard } from '@/components/orders/OrderCard';
import { ORDER_STATUSES, type OrderStatus } from '@/lib/hooks/useOrders';
import type { Order } from '@/types/database';
import type { Vehicle } from '@/types/vehicle';

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch orders with vehicle info
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const ordersData = (orders || []) as Order[];

  // Fetch vehicle info for each order
  const vehicleIds = ordersData.map((o) => o.vehicle_id);
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, make, model, year, images')
    .in('id', vehicleIds);

  const vehiclesMap = new Map(
    ((vehicles || []) as Pick<Vehicle, 'id' | 'make' | 'model' | 'year' | 'images'>[]).map((v) => [v.id, v])
  );

  // Group orders by status
  const activeOrders = ordersData.filter(
    (o) => !['delivered', 'cancelled'].includes(o.status)
  );
  const completedOrders = ordersData.filter((o) => o.status === 'delivered');
  const cancelledOrders = ordersData.filter((o) => o.status === 'cancelled');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Mes commandes</h1>
        <p className="text-nobel mt-1">
          Suivez le statut de vos commandes en temps réel
        </p>
      </div>

      {/* Status Summary */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="warning" className="px-3 py-1.5">
          {activeOrders.length} En cours
        </Badge>
        <Badge variant="success" className="px-3 py-1.5">
          {completedOrders.length} Livrées
        </Badge>
        {cancelledOrders.length > 0 && (
          <Badge variant="error" className="px-3 py-1.5">
            {cancelledOrders.length} Annulées
          </Badge>
        )}
      </div>

      {/* Active Orders */}
      {activeOrders.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-white mb-4">Commandes en cours</h2>
          <div className="space-y-4">
            {activeOrders.map((order) => {
              const vehicle = vehiclesMap.get(order.vehicle_id);
              return (
                <OrderCard
                  key={order.id}
                  order={order}
                  vehicleTitle={
                    vehicle ? `${vehicle.make} ${vehicle.model} ${vehicle.year}` : undefined
                  }
                  vehicleImage={vehicle?.images?.[0]}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Completed Orders */}
      {completedOrders.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-white mb-4">Commandes livrées</h2>
          <div className="space-y-4">
            {completedOrders.map((order) => {
              const vehicle = vehiclesMap.get(order.vehicle_id);
              return (
                <OrderCard
                  key={order.id}
                  order={order}
                  vehicleTitle={
                    vehicle ? `${vehicle.make} ${vehicle.model} ${vehicle.year}` : undefined
                  }
                  vehicleImage={vehicle?.images?.[0]}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Cancelled Orders */}
      {cancelledOrders.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-white mb-4">Commandes annulées</h2>
          <div className="space-y-4">
            {cancelledOrders.map((order) => {
              const vehicle = vehiclesMap.get(order.vehicle_id);
              return (
                <OrderCard
                  key={order.id}
                  order={order}
                  vehicleTitle={
                    vehicle ? `${vehicle.make} ${vehicle.model} ${vehicle.year}` : undefined
                  }
                  vehicleImage={vehicle?.images?.[0]}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Empty State */}
      {ordersData.length === 0 && (
        <Card className="text-center py-12">
          <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-nobel"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">
            Aucune commande
          </h3>
          <p className="text-nobel mb-6">
            Vous n&apos;avez pas encore passé de commande.
            <br />
            Explorez notre catalogue pour trouver votre véhicule idéal.
          </p>
          <a
            href="/cars"
            className="inline-flex items-center justify-center px-6 py-3 bg-mandarin text-white rounded-lg font-medium hover:bg-mandarin/90 transition-colors"
          >
            Explorer les véhicules
          </a>
        </Card>
      )}
    </div>
  );
}
