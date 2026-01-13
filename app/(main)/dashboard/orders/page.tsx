import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { OrderCard } from '@/components/orders/OrderCard';
import { ORDER_STATUSES, type OrderStatus } from '@/lib/hooks/useOrders';
import {
  Package,
  FileText,
  ArrowRight,
  Clock,
  CheckCircle,
  Truck,
  Ship,
  MapPin,
} from 'lucide-react';
import type { Order } from '@/types/database';
import type { Vehicle } from '@/types/vehicle';

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch orders
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Fetch pending quotes (using any to bypass type check for quotes table)
  let pendingQuotes: any[] = [];
  try {
    const { data: quotes } = await (supabase as any)
      .from('quotes')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(3);
    pendingQuotes = quotes || [];
  } catch (e) {
    // quotes table may not exist
  }

  const ordersData = (orders || []) as Order[];

  // Fetch vehicle info for each order
  const vehicleIds = ordersData.map((o) => o.vehicle_id);
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, make, model, year, images')
    .in('id', vehicleIds.length > 0 ? vehicleIds : ['']);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Mes commandes</h1>
          <p className="text-[var(--text-muted)] mt-1">
            Suivez le statut de vos commandes en temps reel
          </p>
        </div>
        <Link href="/dashboard/quotes">
          <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
            Voir mes devis
          </Button>
        </Link>
      </div>

      {/* Pending Quotes Banner */}
      {pendingQuotes.length > 0 && (
        <Card className="bg-mandarin/5 border-mandarin/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-mandarin/10 rounded-lg">
                <FileText className="w-5 h-5 text-mandarin" />
              </div>
              <div>
                <h3 className="font-medium text-[var(--text-primary)]">
                  {pendingQuotes.length} devis en attente
                </h3>
                <p className="text-sm text-[var(--text-muted)]">
                  Contactez-nous pour convertir vos devis en commandes
                </p>
              </div>
            </div>
            <Link href="/dashboard/quotes">
              <Button variant="primary" size="sm">
                Voir les devis
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Status Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="text-center p-4">
          <Clock className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-[var(--text-primary)]">{activeOrders.length}</p>
          <p className="text-xs text-[var(--text-muted)]">En cours</p>
        </Card>
        <Card className="text-center p-4">
          <Ship className="w-6 h-6 text-royal-blue mx-auto mb-2" />
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {ordersData.filter((o) => o.status === 'shipped' || o.status === 'in_transit').length}
          </p>
          <p className="text-xs text-[var(--text-muted)]">En transit</p>
        </Card>
        <Card className="text-center p-4">
          <CheckCircle className="w-6 h-6 text-jewel mx-auto mb-2" />
          <p className="text-2xl font-bold text-[var(--text-primary)]">{completedOrders.length}</p>
          <p className="text-xs text-[var(--text-muted)]">Livrees</p>
        </Card>
        <Card className="text-center p-4">
          <Package className="w-6 h-6 text-[var(--text-muted)] mx-auto mb-2" />
          <p className="text-2xl font-bold text-[var(--text-primary)]">{ordersData.length}</p>
          <p className="text-xs text-[var(--text-muted)]">Total</p>
        </Card>
      </div>

      {/* Active Orders */}
      {activeOrders.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Commandes en cours</h2>
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
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Commandes livrees</h2>
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
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Commandes annulees</h2>
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
          <Package className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
            Aucune commande
          </h3>
          <p className="text-[var(--text-muted)] mb-6 max-w-md mx-auto">
            Vous n&apos;avez pas encore passe de commande.
            Commencez par demander un devis pour un vehicule.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/cars">
              <Button variant="primary">
                Explorer les vehicules
              </Button>
            </Link>
            <Link href="/dashboard/quotes">
              <Button variant="outline" leftIcon={<FileText className="w-4 h-4" />}>
                Voir mes devis
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* How Orders Work */}
      <Card className="bg-[var(--surface)]/50">
        <h3 className="font-bold text-[var(--text-primary)] mb-4">
          Processus de commande
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-mandarin/10 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-mandarin">1</span>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Devis obtenu</p>
              <p className="text-xs text-[var(--text-muted)]">Estimation complete</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-mandarin/10 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-mandarin">2</span>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Acompte 1000$</p>
              <p className="text-xs text-[var(--text-muted)]">Blocage du vehicule</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-mandarin/10 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-mandarin">3</span>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Inspection</p>
              <p className="text-xs text-[var(--text-muted)]">Rapport professionnel</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-mandarin/10 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-mandarin">4</span>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Paiement integral</p>
              <p className="text-xs text-[var(--text-muted)]">Solde de la commande</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-jewel/10 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-4 h-4 text-jewel" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Livraison</p>
              <p className="text-xs text-[var(--text-muted)]">Reception au port</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
