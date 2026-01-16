'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  Heart,
  Globe,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Loader2,
  AlertCircle,
  Car,
  FileText,
  Package,
  Ship,
  Calendar,
  Target,
  Percent,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

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

export default function AdminAnalyticsPage() {
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

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('fr-FR').format(value);
  };

  const formatCurrency = (value: number, currency: 'USD' | 'XAF' = 'USD') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const GrowthBadge = ({ value, inverted = false }: { value: number; inverted?: boolean }) => {
    const isPositive = inverted ? value < 0 : value > 0;
    return (
      <span className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-green-600' : value === 0 ? 'text-gray-500' : 'text-red-500'}`}>
        {value >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {value >= 0 ? '+' : ''}{value}%
      </span>
    );
  };

  // Simple bar chart component
  const BarChart = ({ data, maxValue }: { data: Array<{ label: string; value: number; color?: string }>; maxValue?: number }) => {
    const max = maxValue || Math.max(...data.map(d => d.value));
    return (
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-[var(--text-primary)]">{item.label}</span>
              <span className="text-sm font-medium text-[var(--text-primary)]">{formatNumber(item.value)}</span>
            </div>
            <div className="h-3 bg-[var(--surface)] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${item.color || 'bg-mandarin'}`}
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Donut chart component
  const DonutChart = ({ data, size = 120 }: { data: Array<{ label: string; value: number; color: string }>; size?: number }) => {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    let cumulative = 0;

    return (
      <div className="flex items-center justify-center">
        <div className="relative" style={{ width: size, height: size }}>
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="var(--surface)"
              strokeWidth="16"
            />
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const offset = cumulative;
              cumulative += percentage;
              return (
                <circle
                  key={index}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={item.color}
                  strokeWidth="16"
                  strokeDasharray={`${percentage * 2.51} ${100 * 2.51}`}
                  strokeDashoffset={`${-offset * 2.51}`}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-[var(--text-primary)]">{total}</span>
            <span className="text-xs text-[var(--text-muted)]">Total</span>
          </div>
        </div>
      </div>
    );
  };

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
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/10 rounded-xl">
            <BarChart3 className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Analytiques</h1>
            <p className="text-[var(--text-muted)]">Statistiques détaillées de la plateforme</p>
          </div>
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

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[var(--text-muted)]">Total vues</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                {formatNumber(data.kpis.totalViews)}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Sur tous les véhicules
              </p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Eye className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[var(--text-muted)]">Total favoris</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                {formatNumber(data.kpis.totalFavorites)}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Véhicules sauvegardés
              </p>
            </div>
            <div className="p-2 bg-red-100 rounded-lg">
              <Heart className="w-5 h-5 text-red-500" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[var(--text-muted)]">Taux conversion</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                {data.kpis.conversionRate}%
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Utilisateurs → Devis
              </p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[var(--text-muted)]">Taux acceptation</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                {data.kpis.quoteAcceptanceRate}%
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Devis → Commandes
              </p>
            </div>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Percent className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Growth Comparison */}
      <Card className="p-6 mb-8">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Évolution mensuelle</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Users Growth */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Users className="w-5 h-5 text-royal-blue" />
              <span className="font-medium text-[var(--text-primary)]">Utilisateurs</span>
            </div>
            <div className="flex items-center justify-center gap-4">
              <div>
                <p className="text-3xl font-bold text-[var(--text-primary)]">{data.users.thisMonth}</p>
                <p className="text-xs text-[var(--text-muted)]">Ce mois</p>
              </div>
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${data.growth.usersGrowth >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {data.growth.usersGrowth >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span className="font-medium">{data.growth.usersGrowth >= 0 ? '+' : ''}{data.growth.usersGrowth}%</span>
              </div>
              <div>
                <p className="text-xl font-medium text-[var(--text-muted)]">{data.users.lastMonth}</p>
                <p className="text-xs text-[var(--text-muted)]">Mois dernier</p>
              </div>
            </div>
          </div>

          {/* Quotes Growth */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-jewel" />
              <span className="font-medium text-[var(--text-primary)]">Devis</span>
            </div>
            <div className="flex items-center justify-center gap-4">
              <div>
                <p className="text-3xl font-bold text-[var(--text-primary)]">{data.quotes.thisMonth}</p>
                <p className="text-xs text-[var(--text-muted)]">Ce mois</p>
              </div>
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${data.growth.quotesGrowth >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {data.growth.quotesGrowth >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span className="font-medium">{data.growth.quotesGrowth >= 0 ? '+' : ''}{data.growth.quotesGrowth}%</span>
              </div>
              <div>
                <p className="text-xl font-medium text-[var(--text-muted)]">{data.quotes.lastMonth}</p>
                <p className="text-xs text-[var(--text-muted)]">Mois dernier</p>
              </div>
            </div>
          </div>

          {/* Vehicles Growth */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Car className="w-5 h-5 text-mandarin" />
              <span className="font-medium text-[var(--text-primary)]">Véhicules ajoutés</span>
            </div>
            <div className="flex items-center justify-center gap-4">
              <div>
                <p className="text-3xl font-bold text-[var(--text-primary)]">{data.vehicles.thisMonth}</p>
                <p className="text-xs text-[var(--text-muted)]">Ce mois</p>
              </div>
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${data.growth.vehiclesGrowth >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {data.growth.vehiclesGrowth >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span className="font-medium">{data.growth.vehiclesGrowth >= 0 ? '+' : ''}{data.growth.vehiclesGrowth}%</span>
              </div>
              <div>
                <p className="text-xl font-medium text-[var(--text-muted)]">{data.vehicles.lastMonth}</p>
                <p className="text-xs text-[var(--text-muted)]">Mois dernier</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Vehicles by Source */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Globe className="w-5 h-5 text-mandarin" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Véhicules par source</h2>
          </div>
          <div className="flex gap-8">
            <div className="flex-1">
              <DonutChart
                size={140}
                data={Object.entries(data.vehicles.bySource).map(([source, count], index) => ({
                  label: sourceFlags[source]?.name || source,
                  value: count,
                  color: index === 0 ? '#F97316' : index === 1 ? '#2563EB' : '#15803D',
                }))}
              />
            </div>
            <div className="flex-1 space-y-3">
              {Object.entries(data.vehicles.bySource).map(([source, count], index) => {
                const sourceInfo = sourceFlags[source] || { flag: '🌍', name: source };
                const percentage = Math.round((count / data.vehicles.total) * 100);
                return (
                  <div key={source} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-mandarin' : index === 1 ? 'bg-royal-blue' : 'bg-jewel'}`} />
                    <span className="text-xl">{sourceInfo.flag}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{sourceInfo.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{formatNumber(count)} ({percentage}%)</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Quote Status Distribution */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-5 h-5 text-mandarin" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Statut des devis</h2>
          </div>
          <div className="flex gap-8">
            <div className="flex-1">
              <DonutChart
                size={140}
                data={[
                  { label: 'En attente', value: data.quotes.byStatus?.pending || 0, color: '#EAB308' },
                  { label: 'Acceptés', value: data.quotes.byStatus?.accepted || 0, color: '#22C55E' },
                  { label: 'Expirés', value: data.quotes.byStatus?.expired || 0, color: '#6B7280' },
                  { label: 'Annulés', value: data.quotes.byStatus?.cancelled || 0, color: '#EF4444' },
                ]}
              />
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">En attente</p>
                  <p className="text-xs text-[var(--text-muted)]">{data.quotes.byStatus?.pending || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">Acceptés</p>
                  <p className="text-xs text-[var(--text-muted)]">{data.quotes.byStatus?.accepted || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-gray-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">Expirés</p>
                  <p className="text-xs text-[var(--text-muted)]">{data.quotes.byStatus?.expired || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">Annulés</p>
                  <p className="text-xs text-[var(--text-muted)]">{data.quotes.byStatus?.cancelled || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Three Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Users by Country */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-royal-blue" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Utilisateurs par pays</h2>
          </div>
          <div className="space-y-3">
            {data.users.byCountry.slice(0, 6).map((item, index) => (
              <div key={item.country} className="flex items-center gap-3">
                <span className="text-sm text-[var(--text-muted)] w-4">{index + 1}</span>
                <span className="text-xl">{countryFlags[item.country] || '🌍'}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{item.country}</p>
                    <p className="text-sm text-[var(--text-muted)]">{item.count} ({item.percentage}%)</p>
                  </div>
                  <div className="h-1.5 bg-[var(--surface)] rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-royal-blue rounded-full" style={{ width: `${item.percentage}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Destinations */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Ship className="w-5 h-5 text-mandarin" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Destinations (devis)</h2>
          </div>
          <div className="space-y-3">
            {data.quotes.byDestination.slice(0, 6).map((item, index) => (
              <div key={item.country} className="flex items-center gap-3">
                <span className="text-sm text-[var(--text-muted)] w-4">{index + 1}</span>
                <span className="text-xl">{countryFlags[item.country] || '🌍'}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{item.country}</p>
                    <p className="text-sm text-[var(--text-muted)]">{item.count} ({item.percentage}%)</p>
                  </div>
                  <div className="h-1.5 bg-[var(--surface)] rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-mandarin rounded-full" style={{ width: `${item.percentage}%` }} />
                  </div>
                </div>
              </div>
            ))}
            {data.quotes.byDestination.length === 0 && (
              <p className="text-sm text-[var(--text-muted)] text-center py-4">Aucune donnée</p>
            )}
          </div>
        </Card>

        {/* Orders Pipeline */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Pipeline commandes</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-sm text-[var(--text-primary)]">Acompte payé</span>
              </div>
              <span className="text-lg font-bold text-yellow-600">{data.orders.deposit_paid}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm text-[var(--text-primary)]">Véhicule acheté</span>
              </div>
              <span className="text-lg font-bold text-blue-600">{data.orders.vehicle_purchased}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-sm text-[var(--text-primary)]">En transit</span>
              </div>
              <span className="text-lg font-bold text-orange-600">{data.orders.in_transit}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-sm text-[var(--text-primary)]">En mer</span>
              </div>
              <span className="text-lg font-bold text-purple-600">{data.orders.shipping}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm text-[var(--text-primary)]">Livrés</span>
              </div>
              <span className="text-lg font-bold text-green-600">{data.orders.delivered}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Top Vehicles Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Viewed Vehicles */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Véhicules les plus vus</h2>
          </div>
          <div className="space-y-3">
            {data.vehicles.topViewed.map((vehicle, index) => (
              <div key={vehicle.id} className="flex items-center gap-3 p-2 bg-[var(--surface)] rounded-lg">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 text-xs font-bold rounded-full flex items-center justify-center">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{vehicle.make} {vehicle.model}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {formatNumber(vehicle.views)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    {formatNumber(vehicle.favorites)}
                  </span>
                </div>
              </div>
            ))}
            {data.vehicles.topViewed.length === 0 && (
              <p className="text-sm text-[var(--text-muted)] text-center py-4">Aucune donnée</p>
            )}
          </div>
        </Card>

        {/* Top Favorited Vehicles */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Véhicules les plus favoris</h2>
          </div>
          <div className="space-y-3">
            {data.vehicles.topFavorited.map((vehicle, index) => (
              <div key={vehicle.id} className="flex items-center gap-3 p-2 bg-[var(--surface)] rounded-lg">
                <span className="w-6 h-6 bg-red-100 text-red-500 text-xs font-bold rounded-full flex items-center justify-center">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{vehicle.make} {vehicle.model}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    {formatNumber(vehicle.favorites)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {formatNumber(vehicle.views)}
                  </span>
                </div>
              </div>
            ))}
            {data.vehicles.topFavorited.length === 0 && (
              <p className="text-sm text-[var(--text-muted)] text-center py-4">Aucune donnée</p>
            )}
          </div>
        </Card>
      </div>

      {/* Top Makes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Makes in Catalog */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Car className="w-5 h-5 text-mandarin" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Marques dans le catalogue</h2>
          </div>
          <BarChart
            data={data.vehicles.topMakes.slice(0, 6).map(item => ({
              label: item.make,
              value: item.count,
              color: 'bg-mandarin',
            }))}
          />
        </Card>

        {/* Top Quoted Makes */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-jewel" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Marques les plus demandées (devis)</h2>
          </div>
          <BarChart
            data={data.quotes.topMakes.slice(0, 6).map(item => ({
              label: item.make,
              value: item.count,
              color: 'bg-jewel',
            }))}
          />
        </Card>
      </div>
    </div>
  );
}
