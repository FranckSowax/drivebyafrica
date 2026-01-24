import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import {
  Package,
  FileText,
  Heart,
  Car,
  ArrowRight,
  TrendingUp,
  Ship,
  CheckCircle,
  Calculator,
} from 'lucide-react';
import { formatUsdToLocal } from '@/lib/utils/currency';
import { OrderCardCompact } from '@/components/orders/OrderCard';
import type { Order, Profile } from '@/types/database';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch dashboard data in parallel
  const [
    { data: profile },
    { data: orders },
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
      .from('favorites')
      .select('*')
      .eq('user_id', user.id),
  ]);

  // Fetch quotes separately (using any to bypass type check for quotes table)
  let quotesData: any[] = [];
  try {
    const { data: quotes } = await (supabase as any)
      .from('quotes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    quotesData = quotes || [];
  } catch (e) {
    // quotes table may not exist
  }

  const profileData = profile as Profile | null;
  const ordersData = (orders || []) as Order[];
  const favoritesCount = favorites?.length || 0;

  // Calculate stats
  const activeOrders = ordersData.filter(
    (o) => !['delivered', 'cancelled'].includes(o.status)
  ).length;
  const pendingQuotes = quotesData.filter((q) => q.status === 'pending').length;
  const totalSpent = ordersData
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.total_price_usd || 0), 0);

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Bienvenue, {profileData?.full_name || 'Utilisateur'}!
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          Gerez vos devis, commandes et suivez vos importations
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FileText}
          label="Devis en attente"
          value={pendingQuotes.toString()}
          color="text-mandarin"
        />
        <StatCard
          icon={Package}
          label="Commandes actives"
          value={activeOrders.toString()}
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
          label="Total depense"
          value={formatUsdToLocal(totalSpent)}
          color="text-jewel"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Actions rapides</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickActionButton
            href="/cars"
            icon={Car}
            label="Explorer"
            description="Voir les vehicules"
          />
          <QuickActionButton
            href="/calculator"
            icon={Calculator}
            label="Calculer"
            description="Estimer un prix"
          />
          <QuickActionButton
            href="/dashboard/quotes"
            icon={FileText}
            label="Mes devis"
            description="Voir mes devis"
          />
          <QuickActionButton
            href="/dashboard/orders"
            icon={Package}
            label="Commandes"
            description="Suivre mes commandes"
          />
        </div>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Quotes */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Devis recents</h2>
            <Link href="/dashboard/quotes">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Voir tout
              </Button>
            </Link>
          </div>

          {quotesData.length > 0 ? (
            <div className="space-y-3">
              {quotesData.slice(0, 3).map((quote) => (
                <QuoteCard key={quote.id} quote={quote} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-[var(--text-muted)]">Aucun devis</p>
              <Link href="/cars">
                <Button variant="primary" size="sm" className="mt-4">
                  Explorer les vehicules
                </Button>
              </Link>
            </div>
          )}
        </Card>

        {/* Recent Orders */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Commandes recentes</h2>
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
              <Package className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-[var(--text-muted)]">Aucune commande</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Demandez un devis pour passer commande
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* How it Works */}
      <Card className="bg-gradient-to-r from-mandarin/5 to-transparent border-mandarin/20">
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-6">Comment ca marche</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <WorkflowStep
            number={1}
            icon={FileText}
            title="Devis"
            description="Obtenez votre devis gratuit pour le vehicule choisi"
          />
          <WorkflowStep
            number={2}
            icon={CheckCircle}
            title="Acompte 1000$"
            description="Versez l'acompte pour bloquer le vehicule"
          />
          <WorkflowStep
            number={3}
            icon={Car}
            title="Inspection"
            description="Recevez le rapport d'inspection professionnel"
          />
          <WorkflowStep
            number={4}
            icon={TrendingUp}
            title="Paiement"
            description="Reglez le solde pour lancer la livraison"
          />
          <WorkflowStep
            number={5}
            icon={Ship}
            title="Livraison"
            description="Suivez votre vehicule jusqu'a destination"
          />
        </div>
      </Card>

      {/* CTA */}
      <Card className="text-center py-8">
        <Car className="w-16 h-16 text-mandarin mx-auto mb-4" />
        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          Pret a importer votre vehicule?
        </h3>
        <p className="text-[var(--text-muted)] mb-6 max-w-md mx-auto">
          Parcourez notre selection de vehicules de Coree, Chine et Dubai
          et obtenez un devis instantane.
        </p>
        <Link href="/cars">
          <Button variant="primary" size="lg">
            Explorer les vehicules
          </Button>
        </Link>
      </Card>
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
      <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
    </Card>
  );
}

function QuickActionButton({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string;
  icon: typeof Package;
  label: string;
  description: string;
}) {
  return (
    <Link href={href}>
      <button className="w-full p-4 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface)]/80 transition-colors text-left">
        <Icon className="w-6 h-6 text-mandarin mb-2" />
        <span className="text-sm font-medium text-[var(--text-primary)] block">{label}</span>
        <span className="text-xs text-[var(--text-muted)]">{description}</span>
      </button>
    </Link>
  );
}

function QuoteCard({ quote }: { quote: any }) {
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-500',
    accepted: 'bg-jewel/10 text-jewel',
    rejected: 'bg-red-500/10 text-red-500',
    expired: 'bg-[var(--text-muted)]/10 text-[var(--text-muted)]',
  };

  const statusLabels: Record<string, string> = {
    pending: 'En attente',
    accepted: 'Accepte',
    rejected: 'Refuse',
    expired: 'Expire',
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface)]">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
          {quote.vehicle_make} {quote.vehicle_model} {quote.vehicle_year}
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          {quote.destination_name}, {quote.destination_country}
        </p>
      </div>
      <div className="text-right ml-4">
        <p className="text-sm font-bold text-mandarin">
          {Math.round(quote.total_cost_xaf || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA
        </p>
        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[quote.status] || statusColors.pending}`}>
          {statusLabels[quote.status] || 'En attente'}
        </span>
      </div>
    </div>
  );
}

function WorkflowStep({
  number,
  icon: Icon,
  title,
  description,
}: {
  number: number;
  icon: typeof Package;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="relative inline-flex mb-3">
        <div className="w-12 h-12 bg-mandarin/10 rounded-full flex items-center justify-center">
          <Icon className="w-6 h-6 text-mandarin" />
        </div>
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-mandarin text-white text-xs font-bold rounded-full flex items-center justify-center">
          {number}
        </span>
      </div>
      <h3 className="font-medium text-[var(--text-primary)] mb-1">{title}</h3>
      <p className="text-xs text-[var(--text-muted)]">{description}</p>
    </div>
  );
}
