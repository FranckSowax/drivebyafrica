import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import {
  Package,
  Gavel,
  Heart,
  CreditCard,
  ArrowRight,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { OrderCardCompact } from '@/components/orders/OrderCard';
import type { Order, Bid, Profile } from '@/types/database';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch dashboard data in parallel
  const [
    { data: profile },
    { data: orders },
    { data: bids },
    { data: favorites },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('bids')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id),
  ]);

  const profileData = profile as Profile | null;
  const ordersData = (orders || []) as Order[];
  const bidsData = (bids || []) as Bid[];
  const favoritesCount = favorites?.length || 0;

  // Calculate stats
  const activeOrders = ordersData.filter(
    (o) => !['delivered', 'cancelled'].includes(o.status)
  ).length;
  const activeBids = bidsData.length;
  const totalSpent = ordersData
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.total_price_usd || 0), 0);

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Bienvenue, {profileData?.full_name || 'Utilisateur'}!
        </h1>
        <p className="text-nobel mt-1">
          Gérez vos commandes, enchères et paramètres
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label="Commandes actives"
          value={activeOrders.toString()}
          color="text-mandarin"
        />
        <StatCard
          icon={Gavel}
          label="Enchères en cours"
          value={activeBids.toString()}
          color="text-royal-blue"
        />
        <StatCard
          icon={Heart}
          label="Favoris"
          value={favoritesCount.toString()}
          color="text-red-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Total dépensé"
          value={formatCurrency(totalSpent, 'USD')}
          color="text-jewel"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <h2 className="text-lg font-bold text-white mb-4">Actions rapides</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickActionButton
            href="/cars"
            icon={Package}
            label="Explorer"
          />
          <QuickActionButton
            href="/dashboard/orders"
            icon={Clock}
            label="Mes commandes"
          />
          <QuickActionButton
            href="/dashboard/bids"
            icon={Gavel}
            label="Mes enchères"
          />
          <QuickActionButton
            href="/dashboard/wallet"
            icon={CreditCard}
            label="Portefeuille"
          />
        </div>
      </Card>

      {/* Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Commandes récentes</h2>
            <Link href="/dashboard/orders">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Voir tout
              </Button>
            </Link>
          </div>

          {ordersData.length > 0 ? (
            <div className="space-y-2">
              {ordersData.slice(0, 3).map((order) => (
                <OrderCardCompact key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-nobel mx-auto mb-2" />
              <p className="text-nobel">Aucune commande</p>
              <Link href="/cars">
                <Button variant="primary" size="sm" className="mt-4">
                  Explorer les véhicules
                </Button>
              </Link>
            </div>
          )}
        </Card>

        {/* Active Bids */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Enchères actives</h2>
            <Link href="/dashboard/bids">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Voir tout
              </Button>
            </Link>
          </div>

          {bidsData.length > 0 ? (
            <div className="space-y-2">
              {bidsData.slice(0, 3).map((bid) => (
                <div
                  key={bid.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface"
                >
                  <div>
                    <p className="text-sm text-white font-medium">
                      Véhicule #{bid.vehicle_id.slice(-6)}
                    </p>
                    <p className="text-xs text-nobel">En attente</p>
                  </div>
                  <span className="text-mandarin font-medium">
                    {formatCurrency(bid.amount_usd, 'USD')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Gavel className="w-12 h-12 text-nobel mx-auto mb-2" />
              <p className="text-nobel">Aucune enchère active</p>
              <Link href="/cars">
                <Button variant="primary" size="sm" className="mt-4">
                  Participer aux enchères
                </Button>
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* Account Balance */}
      {profileData && (
        <Card className="bg-gradient-to-r from-mandarin/10 to-transparent border-mandarin/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-nobel">Solde du compte</p>
              <p className="text-2xl font-bold text-white mt-1">
                {formatCurrency(profileData.balance || 0, profileData.preferred_currency || 'USD')}
              </p>
            </div>
            <Link href="/dashboard/wallet">
              <Button variant="primary">
                Recharger
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Package;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card className="text-center">
      <Icon className={`w-6 h-6 ${color} mx-auto mb-2`} />
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-nobel">{label}</p>
    </Card>
  );
}

function QuickActionButton({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Package;
  label: string;
}) {
  return (
    <Link href={href}>
      <button className="w-full p-4 rounded-lg bg-surface hover:bg-surface/80 transition-colors text-center">
        <Icon className="w-6 h-6 text-mandarin mx-auto mb-2" />
        <span className="text-sm text-white">{label}</span>
      </button>
    </Link>
  );
}
