'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Car,
  Users,
  FileText,
  TrendingUp,
  Package,
  DollarSign,
  Eye,
  Heart,
  RefreshCw,
  Ship,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  AlertCircle,
  MessageSquare,
  Clock,
  CheckCircle,
  BarChart3,
  Globe,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AnalyticsData {
  kpis: {
    totalVehicles: number;
    activeVehicles: number;
    soldVehicles: number;
    totalUsers: number;
    totalQuotes: number;
    totalOrders: number;
    totalViews: number;
    totalFavorites: number;
    totalRevenueXAF: number;
    totalDepositsUSD: number;
    conversionRate: number;
    quoteAcceptanceRate: number;
  };
  growth: {
    usersGrowth: number;
    quotesGrowth: number;
    vehiclesGrowth: number;
  };
  vehicles: {
    total: number;
    active: number;
    sold: number;
    bySource: Record<string, number>;
    thisMonth: number;
    lastMonth: number;
    topViewed: Array<{ id: string; make: string; model: string; views: number; favorites: number }>;
    topFavorited: Array<{ id: string; make: string; model: string; views: number; favorites: number }>;
    topMakes: Array<{ make: string; count: number }>;
  };
  users: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    lastMonth: number;
    thisYear: number;
    byCountry: Array<{ country: string; count: number; percentage: number }>;
  };
  quotes: {
    total: number;
    byStatus: Record<string, number>;
    today: number;
    thisWeek: number;
    thisMonth: number;
    lastMonth: number;
    byDestination: Array<{ country: string; count: number; percentage: number }>;
    bySource: Record<string, number>;
    topMakes: Array<{ make: string; count: number }>;
    acceptedCount: number;
  };
  orders: {
    total: number;
    deposit_paid: number;
    vehicle_purchased: number;
    in_transit: number;
    shipping: number;
    delivered: number;
  };
  chat: {
    totalConversations: number;
    activeConversations: number;
    waitingAgent: number;
    totalMessages: number;
    messagesThisWeek: number;
  };
  recentActivity: {
    quotes: Array<{
      id: string;
      vehicle_make: string;
      vehicle_model: string;
      destination_country: string;
      status: string;
      created_at: string;
    }>;
    users: Array<{
      id: string;
      country: string;
      created_at: string;
    }>;
  };
}

// Country flags mapping
const countryFlags: Record<string, string> = {
  'Gabon': '🇬🇦',
  'Cameroun': '🇨🇲',
  'Congo': '🇨🇬',
  'RDC': '🇨🇩',
  "Côte d'Ivoire": '🇨🇮',
  'Sénégal': '🇸🇳',
  'Mali': '🇲🇱',
  'Burkina Faso': '🇧🇫',
  'Bénin': '🇧🇯',
  'Togo': '🇹🇬',
  'Niger': '🇳🇪',
  'Guinée': '🇬🇳',
  'Tchad': '🇹🇩',
  'Centrafrique': '🇨🇫',
  'Non spécifié': '🌍',
};

const sourceFlags: Record<string, { flag: string; name: string }> = {
  'korea': { flag: '🇰🇷', name: 'Corée du Sud' },
  'china': { flag: '🇨🇳', name: 'Chine' },
  'dubai': { flag: '🇦🇪', name: 'Dubaï' },
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/admin/analytics');
      if (!response.ok) throw new Error('Erreur lors du chargement');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError('Erreur lors du chargement des données');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (value: number, currency: 'USD' | 'XAF' = 'USD') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('fr-FR').format(value);
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-500';
    return 'text-gray-500';
  };

  const GrowthIndicator = ({ value }: { value: number }) => (
    <span className={`flex items-center gap-1 text-xs ${getGrowthColor(value)}`}>
      {value >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {value >= 0 ? '+' : ''}{value}%
    </span>
  );

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-mandarin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 lg:p-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error || 'Erreur de chargement'}</span>
          <Button variant="outline" size="sm" onClick={fetchData}>Réessayer</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Tableau de bord</h1>
          <p className="text-[var(--text-muted)] mt-1">
            Vue d&apos;ensemble de Driveby Africa
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchData}
          leftIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
          disabled={isLoading}
        >
          Actualiser
        </Button>
      </div>

      {/* KPI Cards - Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Vehicles */}
        <Link href="/admin/vehicles">
          <Card className="p-5 hover:border-mandarin/50 transition-colors cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[var(--text-muted)]">Véhicules</p>
                <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                  {formatNumber(data.kpis.totalVehicles)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-green-600">{formatNumber(data.vehicles.active)} actifs</span>
                  <GrowthIndicator value={data.growth.vehiclesGrowth} />
                </div>
              </div>
              <div className="p-3 rounded-xl bg-mandarin/10">
                <Car className="w-6 h-6 text-mandarin" />
              </div>
            </div>
          </Card>
        </Link>

        {/* Users */}
        <Link href="/admin/users">
          <Card className="p-5 hover:border-royal-blue/50 transition-colors cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[var(--text-muted)]">Utilisateurs</p>
                <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                  {formatNumber(data.kpis.totalUsers)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-royal-blue">+{data.users.thisMonth} ce mois</span>
                  <GrowthIndicator value={data.growth.usersGrowth} />
                </div>
              </div>
              <div className="p-3 rounded-xl bg-royal-blue/10">
                <Users className="w-6 h-6 text-royal-blue" />
              </div>
            </div>
          </Card>
        </Link>

        {/* Quotes */}
        <Link href="/admin/quotes">
          <Card className="p-5 hover:border-jewel/50 transition-colors cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[var(--text-muted)]">Devis</p>
                <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                  {formatNumber(data.kpis.totalQuotes)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-yellow-600">{data.quotes.byStatus?.pending || 0} en attente</span>
                  <GrowthIndicator value={data.growth.quotesGrowth} />
                </div>
              </div>
              <div className="p-3 rounded-xl bg-jewel/10">
                <FileText className="w-6 h-6 text-jewel" />
              </div>
            </div>
          </Card>
        </Link>

        {/* Orders */}
        <Link href="/admin/orders">
          <Card className="p-5 hover:border-purple-500/50 transition-colors cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[var(--text-muted)]">Commandes</p>
                <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                  {formatNumber(data.kpis.totalOrders)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-purple-600">{data.orders.shipping} en mer</span>
                  <span className="text-xs text-green-600">{data.orders.delivered} livrés</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10">
                <Package className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* KPI Cards - Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total Views */}
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[var(--text-muted)]">Vues véhicules</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                {formatNumber(data.kpis.totalViews)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-blue-100">
              <Eye className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        {/* Total Favorites */}
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[var(--text-muted)]">Favoris</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                {formatNumber(data.kpis.totalFavorites)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-red-100">
              <Heart className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </Card>

        {/* Conversion Rate */}
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[var(--text-muted)]">Taux de conversion</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                {data.kpis.conversionRate}%
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Users → Devis</p>
            </div>
            <div className="p-3 rounded-xl bg-green-100">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        {/* Quote Acceptance */}
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[var(--text-muted)]">Taux d&apos;acceptation</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                {data.kpis.quoteAcceptanceRate}%
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Devis → Commandes</p>
            </div>
            <div className="p-3 rounded-xl bg-yellow-100">
              <CheckCircle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Revenue & Messages Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-mandarin" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Revenus</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-[var(--text-muted)]">Acomptes collectés</p>
              <p className="text-3xl font-bold text-mandarin mt-1">
                {formatCurrency(data.kpis.totalDepositsUSD, 'USD')}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {data.quotes.acceptedCount} commandes × $1,000
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-muted)]">Total devis acceptés</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                {formatCurrency(data.kpis.totalRevenueXAF, 'XAF')}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Valeur totale des commandes</p>
            </div>
          </div>
        </Card>

        {/* Messages Card */}
        <Link href="/admin/messages">
          <Card className="p-6 hover:border-mandarin/50 transition-colors cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-mandarin" />
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Messages</h2>
              </div>
              {data.chat.waitingAgent > 0 && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                  {data.chat.waitingAgent} en attente
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{data.chat.totalConversations}</p>
                <p className="text-xs text-[var(--text-muted)]">Conversations</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{data.chat.activeConversations}</p>
                <p className="text-xs text-[var(--text-muted)]">Actives</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{data.chat.totalMessages}</p>
                <p className="text-xs text-[var(--text-muted)]">Messages</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Three Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Sources Véhicules */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-mandarin" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Sources véhicules</h2>
          </div>
          <div className="space-y-4">
            {Object.entries(data.vehicles.bySource).map(([source, count]) => {
              const sourceInfo = sourceFlags[source] || { flag: '🌍', name: source };
              const percentage = Math.round((count / data.vehicles.total) * 100);
              return (
                <div key={source}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{sourceInfo.flag}</span>
                      <span className="text-sm font-medium text-[var(--text-primary)]">{sourceInfo.name}</span>
                    </div>
                    <span className="text-sm text-[var(--text-muted)]">
                      {formatNumber(count)} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-[var(--surface)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-mandarin rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Top Destinations */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Ship className="w-5 h-5 text-mandarin" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Top Destinations</h2>
          </div>
          <div className="space-y-3">
            {data.quotes.byDestination.slice(0, 5).map((dest, index) => (
              <div key={dest.country} className="flex items-center gap-3">
                <span className="text-sm text-[var(--text-muted)] w-4">{index + 1}</span>
                <span className="text-xl">{countryFlags[dest.country] || '🌍'}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{dest.country}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{dest.count}</p>
                  <p className="text-xs text-[var(--text-muted)]">{dest.percentage}%</p>
                </div>
              </div>
            ))}
            {data.quotes.byDestination.length === 0 && (
              <p className="text-sm text-[var(--text-muted)] text-center py-4">Aucune donnée</p>
            )}
          </div>
        </Card>

        {/* Users by Country */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-mandarin" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Utilisateurs par pays</h2>
          </div>
          <div className="space-y-3">
            {data.users.byCountry.slice(0, 5).map((item, index) => (
              <div key={item.country} className="flex items-center gap-3">
                <span className="text-sm text-[var(--text-muted)] w-4">{index + 1}</span>
                <span className="text-xl">{countryFlags[item.country] || '🌍'}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{item.country}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{item.count}</p>
                  <p className="text-xs text-[var(--text-muted)]">{item.percentage}%</p>
                </div>
              </div>
            ))}
            {data.users.byCountry.length === 0 && (
              <p className="text-sm text-[var(--text-muted)] text-center py-4">Aucune donnée</p>
            )}
          </div>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Makes */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Car className="w-5 h-5 text-mandarin" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Marques populaires (devis)</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {data.quotes.topMakes.slice(0, 8).map((item, index) => (
              <div key={item.make} className="flex items-center gap-2 p-2 bg-[var(--surface)] rounded-lg">
                <span className="w-5 h-5 bg-mandarin/20 text-mandarin text-xs font-bold rounded flex items-center justify-center">
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-[var(--text-primary)] flex-1 truncate">{item.make}</span>
                <span className="text-xs text-[var(--text-muted)]">{item.count}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-mandarin" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Activité récente</h2>
            </div>
            <Link href="/admin/quotes" className="text-xs text-mandarin hover:underline">
              Voir tout
            </Link>
          </div>
          <div className="space-y-3">
            {data.recentActivity.quotes.slice(0, 5).map((quote) => (
              <div key={quote.id} className="flex items-start gap-3">
                <div className="p-2 bg-jewel/10 rounded-lg">
                  <FileText className="w-4 h-4 text-jewel" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-primary)] truncate">
                    Devis {quote.vehicle_make} {quote.vehicle_model}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {countryFlags[quote.destination_country] || '🌍'} {quote.destination_country} •{' '}
                    {formatDistanceToNow(new Date(quote.created_at), { addSuffix: true, locale: fr })}
                  </p>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${
                  quote.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  quote.status === 'accepted' ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {quote.status === 'pending' ? 'En attente' : quote.status === 'accepted' ? 'Accepté' : quote.status}
                </span>
              </div>
            ))}
            {data.recentActivity.quotes.length === 0 && (
              <p className="text-sm text-[var(--text-muted)] text-center py-4">Aucune activité récente</p>
            )}
          </div>
        </Card>
      </div>

      {/* Quick Stats Footer */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4 text-center">
          <p className="text-xs text-[var(--text-muted)]">Nouveaux aujourd&apos;hui</p>
          <p className="text-xl font-bold text-mandarin">{data.users.today}</p>
          <p className="text-xs text-[var(--text-muted)]">utilisateurs</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-[var(--text-muted)]">Cette semaine</p>
          <p className="text-xl font-bold text-royal-blue">{data.users.thisWeek}</p>
          <p className="text-xs text-[var(--text-muted)]">utilisateurs</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-[var(--text-muted)]">Devis aujourd&apos;hui</p>
          <p className="text-xl font-bold text-jewel">{data.quotes.today}</p>
          <p className="text-xs text-[var(--text-muted)]">demandes</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-[var(--text-muted)]">Devis cette semaine</p>
          <p className="text-xl font-bold text-purple-600">{data.quotes.thisWeek}</p>
          <p className="text-xs text-[var(--text-muted)]">demandes</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-[var(--text-muted)]">Messages cette semaine</p>
          <p className="text-xl font-bold text-green-600">{data.chat.messagesThisWeek}</p>
          <p className="text-xs text-[var(--text-muted)]">messages</p>
        </Card>
      </div>
    </div>
  );
}
