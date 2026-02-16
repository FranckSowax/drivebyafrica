'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { OrderCard } from '@/components/orders/OrderCard';
import { useAuthStore } from '@/store/useAuthStore';
import {
  Package,
  FileText,
  ArrowRight,
  Clock,
  CheckCircle,
  Ship,
  RefreshCw,
} from 'lucide-react';
import type { Order } from '@/types/database';

export default function OrdersPage() {
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const [orders, setOrders] = useState<(Order & { vehicle_image?: string | null })[]>([]);
  const [pendingQuotes, setPendingQuotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch orders and quotes in parallel
      const [ordersRes, quotesRes] = await Promise.allSettled([
        fetch('/api/orders'),
        fetch('/api/quotes?status=pending&limit=3'),
      ]);

      // Handle orders
      if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
        const data = await ordersRes.value.json();
        setOrders(data.orders || []);
      } else {
        throw new Error('Erreur de chargement des commandes');
      }

      // Handle quotes (optional, don't fail the whole page)
      if (quotesRes.status === 'fulfilled' && quotesRes.value.ok) {
        const data = await quotesRes.value.json();
        setPendingQuotes(data.quotes || []);
      }
    } catch {
      setError('Impossible de charger les commandes');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isInitialized && user) {
      fetchData();
    } else if (isInitialized && !user) {
      setIsLoading(false);
    }
  }, [isInitialized, user, fetchData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="text-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <Button
          variant="primary"
          onClick={fetchData}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Réessayer
        </Button>
      </Card>
    );
  }

  // Group orders by status
  const activeOrders = orders.filter(
    (o) => !['delivered', 'cancelled'].includes(o.status)
  );
  const completedOrders = orders.filter((o) => o.status === 'delivered');
  const cancelledOrders = orders.filter((o) => o.status === 'cancelled');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Mes commandes</h1>
          <p className="text-[var(--text-muted)] mt-1">
            Suivez le statut de vos commandes en temps réel
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
            {orders.filter((o) => o.status === 'shipped' || o.status === 'in_transit').length}
          </p>
          <p className="text-xs text-[var(--text-muted)]">En transit</p>
        </Card>
        <Card className="text-center p-4">
          <CheckCircle className="w-6 h-6 text-jewel mx-auto mb-2" />
          <p className="text-2xl font-bold text-[var(--text-primary)]">{completedOrders.length}</p>
          <p className="text-xs text-[var(--text-muted)]">Livrées</p>
        </Card>
        <Card className="text-center p-4">
          <Package className="w-6 h-6 text-[var(--text-muted)] mx-auto mb-2" />
          <p className="text-2xl font-bold text-[var(--text-primary)]">{orders.length}</p>
          <p className="text-xs text-[var(--text-muted)]">Total</p>
        </Card>
      </div>

      {/* Active Orders */}
      {activeOrders.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Commandes en cours</h2>
          <div className="space-y-4">
            {activeOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                vehicleTitle={
                  order.vehicle_make
                    ? `${order.vehicle_make} ${order.vehicle_model || ''} ${order.vehicle_year || ''}`.trim()
                    : undefined
                }
                vehicleImage={order.vehicle_image}
              />
            ))}
          </div>
        </section>
      )}

      {/* Completed Orders */}
      {completedOrders.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Commandes livrées</h2>
          <div className="space-y-4">
            {completedOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                vehicleTitle={
                  order.vehicle_make
                    ? `${order.vehicle_make} ${order.vehicle_model || ''} ${order.vehicle_year || ''}`.trim()
                    : undefined
                }
                vehicleImage={order.vehicle_image}
              />
            ))}
          </div>
        </section>
      )}

      {/* Cancelled Orders */}
      {cancelledOrders.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Commandes annulées</h2>
          <div className="space-y-4">
            {cancelledOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                vehicleTitle={
                  order.vehicle_make
                    ? `${order.vehicle_make} ${order.vehicle_model || ''} ${order.vehicle_year || ''}`.trim()
                    : undefined
                }
                vehicleImage={order.vehicle_image}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {orders.length === 0 && (
        <Card className="text-center py-12">
          <Package className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
            Aucune commande
          </h3>
          <p className="text-[var(--text-muted)] mb-6 max-w-md mx-auto">
            Vous n&apos;avez pas encore passé de commande.
            Commencez par demander un devis pour un véhicule.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/cars">
              <Button variant="primary">
                Explorer les véhicules
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
              <p className="text-xs text-[var(--text-muted)]">Estimation complète</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-mandarin/10 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-mandarin">2</span>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Acompte 1000$</p>
              <p className="text-xs text-[var(--text-muted)]">Blocage du véhicule</p>
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
              <p className="text-sm font-medium text-[var(--text-primary)]">Paiement intégral</p>
              <p className="text-xs text-[var(--text-muted)]">Solde de la commande</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-jewel/10 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-4 h-4 text-jewel" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Livraison</p>
              <p className="text-xs text-[var(--text-muted)]">Réception au port</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
