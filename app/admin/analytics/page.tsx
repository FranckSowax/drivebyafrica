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
  RefreshCw,
  Loader2,
  AlertCircle,
  Car,
  FileText,
  Package,
  Ship,
  Target,
  Percent,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  Plus,
  Minus,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Bar,
  BarChart,
  PieChart,
  Pie,
  Cell,
  Legend,
  Line,
  LineChart,
  RadialBarChart,
  RadialBar,
} from 'recharts';

interface TimeSeriesData {
  date: string;
  users: number;
  quotes: number;
  vehicles: number;
  views: number;
}

interface MonthlyData {
  month: string;
  users: number;
  quotes: number;
  vehicles: number;
}

interface ProfitData {
  summary: {
    totalOrders: number;
    ordersWithPriceData: number;
    totalDrivebyPriceUSD: number;
    totalSourcePriceUSD: number;
    totalProfitUSD: number;
    avgProfitPercentage: number | null;
  };
  bySource: Record<string, {
    count: number;
    totalDrivebyUSD: number;
    totalSourceUSD: number;
    totalProfitUSD: number;
    avgProfitPercentage: number | null;
  }>;
  exchangeRate?: {
    xafToUsd: number;
    description: string;
  };
  orders: Array<{
    orderId: string;
    orderNumber: string;
    vehicleMake: string;
    vehicleModel: string;
    vehicleYear: number;
    vehicleSource: string;
    destinationCountry: string;
    orderStatus: string;
    createdAt: string;
    drivebyPriceUSD: number;
    drivebyPriceXAF: number | null;
    sourcePriceUSD: number | null;
    profitUSD: number | null;
    profitPercentage: number | null;
  }>;
}

interface SyncStats {
  added: number;
  removed: number;
  updated: number;
  net: number;
}

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
    syncThisMonth?: {
      added: number;
      removed: number;
      net: number;
      bySource: Record<string, SyncStats>;
    };
    syncLastMonth?: {
      added: number;
      removed: number;
      net: number;
      bySource: Record<string, SyncStats>;
    };
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
  timeSeries: TimeSeriesData[];
  monthlyComparison: MonthlyData[];
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

// Chart colors
const CHART_COLORS = {
  primary: '#F97316',
  secondary: '#3B82F6',
  tertiary: '#10B981',
  quaternary: '#8B5CF6',
  yellow: '#EAB308',
  red: '#EF4444',
  muted: '#94A3B8',
};

const PIE_COLORS = ['#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#F59E0B'];

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [profitData, setProfitData] = useState<ProfitData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfitLoading, setIsProfitLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

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

  const fetchProfitData = useCallback(async () => {
    try {
      setIsProfitLoading(true);
      const response = await fetch('/api/admin/analytics/profits');
      if (!response.ok) throw new Error('Erreur lors du chargement des profits');
      const result = await response.json();
      setProfitData(result);
    } catch (err) {
      console.error('Error fetching profit data:', err);
    } finally {
      setIsProfitLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchProfitData();
  }, [fetchData, fetchProfitData]);

  const formatNumber = (value: number) => {
    // Format with regular spaces as thousand separators
    return Math.round(value)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  // Filter time series data based on selected range
  const getFilteredTimeSeries = () => {
    if (!data?.timeSeries) return [];
    const daysToShow = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    return data.timeSeries.slice(-daysToShow);
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-[var(--text-primary)] mb-2">
            {label ? new Date(label).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}
          </p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-[var(--text-muted)]">{entry.name}:</span>
              <span className="font-medium text-[var(--text-primary)]">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Prepare pie chart data for vehicle sources
  const getSourcesPieData = () => {
    if (!data?.vehicles.bySource) return [];
    return Object.entries(data.vehicles.bySource).map(([source, count]) => {
      const sourceInfo = sourceFlags[source] || { name: source };
      return {
        name: sourceInfo.name,
        value: count,
      };
    });
  };

  // Prepare pie chart data for quote status
  const getQuoteStatusPieData = () => {
    if (!data?.quotes.byStatus) return [];
    const statusLabels: Record<string, string> = {
      pending: 'En attente',
      accepted: 'Acceptés',
      expired: 'Expirés',
      cancelled: 'Annulés',
    };
    return Object.entries(data.quotes.byStatus).map(([status, count]) => ({
      name: statusLabels[status] || status,
      value: count,
    }));
  };

  // Prepare bar chart data for top makes
  const getTopMakesData = () => {
    if (!data?.vehicles.topMakes) return [];
    return data.vehicles.topMakes.slice(0, 8).map(item => ({
      name: item.make,
      value: item.count,
    }));
  };

  // Prepare data for orders pipeline
  const getOrdersPipelineData = () => {
    if (!data?.orders) return [];
    return [
      { name: 'Acompte payé', value: data.orders.deposit_paid, fill: CHART_COLORS.yellow },
      { name: 'Véhicule acheté', value: data.orders.vehicle_purchased, fill: CHART_COLORS.secondary },
      { name: 'En transit', value: data.orders.in_transit, fill: CHART_COLORS.primary },
      { name: 'En mer', value: data.orders.shipping, fill: CHART_COLORS.quaternary },
      { name: 'Livrés', value: data.orders.delivered, fill: CHART_COLORS.tertiary },
    ];
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

  const filteredTimeSeries = getFilteredTimeSeries();
  const sourcesPieData = getSourcesPieData();
  const quoteStatusPieData = getQuoteStatusPieData();
  const topMakesData = getTopMakesData();
  const ordersPipelineData = getOrdersPipelineData();

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

      {/* Main Activity Chart */}
      <Card className="p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Activité globale</h2>
            <p className="text-sm text-[var(--text-muted)]">Utilisateurs, devis et véhicules au fil du temps</p>
          </div>
          <div className="flex gap-2">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  timeRange === range
                    ? 'bg-mandarin text-white'
                    : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {range === '7d' ? '7 jours' : range === '30d' ? '30 jours' : '3 mois'}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredTimeSeries}>
              <defs>
                <linearGradient id="colorUsersAnalytics" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.secondary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorQuotesAnalytics" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorVehiclesAnalytics" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.tertiary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.tertiary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                minTickGap={30}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="users"
                name="Utilisateurs"
                stroke={CHART_COLORS.secondary}
                fill="url(#colorUsersAnalytics)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="quotes"
                name="Devis"
                stroke={CHART_COLORS.primary}
                fill="url(#colorQuotesAnalytics)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="vehicles"
                name="Véhicules"
                stroke={CHART_COLORS.tertiary}
                fill="url(#colorVehiclesAnalytics)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

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
              <span className="font-medium text-[var(--text-primary)]">Véhicules (net)</span>
            </div>
            <div className="flex items-center justify-center gap-4">
              <div>
                <p className={`text-3xl font-bold ${data.vehicles.thisMonth >= 0 ? 'text-jewel' : 'text-red-500'}`}>
                  {data.vehicles.thisMonth >= 0 ? '+' : ''}{data.vehicles.thisMonth}
                </p>
                <p className="text-xs text-[var(--text-muted)]">Ce mois</p>
              </div>
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${data.growth.vehiclesGrowth >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {data.growth.vehiclesGrowth >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span className="font-medium">{data.growth.vehiclesGrowth >= 0 ? '+' : ''}{data.growth.vehiclesGrowth}%</span>
              </div>
              <div>
                <p className={`text-xl font-medium ${data.vehicles.lastMonth >= 0 ? 'text-[var(--text-muted)]' : 'text-red-400'}`}>
                  {data.vehicles.lastMonth >= 0 ? '+' : ''}{data.vehicles.lastMonth}
                </p>
                <p className="text-xs text-[var(--text-muted)]">Mois dernier</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Sync Details Card */}
      {data.vehicles.syncThisMonth && (
        <Card className="p-6 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <RefreshCw className="w-5 h-5 text-mandarin" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Détail des synchronisations</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* This Month */}
            <div className="bg-[var(--surface)] rounded-xl p-4">
              <h3 className="font-medium text-[var(--text-primary)] mb-4">Ce mois-ci</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-jewel mb-1">
                    <Plus className="w-4 h-4" />
                    <span className="text-xl font-bold">{formatNumber(data.vehicles.syncThisMonth.added)}</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">Ajoutés</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-red-500 mb-1">
                    <Minus className="w-4 h-4" />
                    <span className="text-xl font-bold">{formatNumber(data.vehicles.syncThisMonth.removed)}</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">Supprimés</p>
                </div>
                <div className="text-center">
                  <div className={`text-xl font-bold mb-1 ${data.vehicles.syncThisMonth.net >= 0 ? 'text-jewel' : 'text-red-500'}`}>
                    {data.vehicles.syncThisMonth.net >= 0 ? '+' : ''}{formatNumber(data.vehicles.syncThisMonth.net)}
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">Net</p>
                </div>
              </div>

              {/* By Source This Month */}
              <div className="space-y-2">
                {Object.entries(data.vehicles.syncThisMonth.bySource).map(([source, stats]) => (
                  <div key={source} className="flex items-center justify-between p-2 bg-[var(--card-bg)] rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{sourceFlags[source]?.flag || '🌍'}</span>
                      <span className="text-sm font-medium text-[var(--text-primary)] capitalize">{sourceFlags[source]?.name || source}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-jewel">+{stats.added}</span>
                      <span className="text-red-500">-{stats.removed}</span>
                      <span className={`font-medium ${stats.net >= 0 ? 'text-jewel' : 'text-red-500'}`}>
                        = {stats.net >= 0 ? '+' : ''}{stats.net}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Last Month */}
            {data.vehicles.syncLastMonth && (
              <div className="bg-[var(--surface)] rounded-xl p-4">
                <h3 className="font-medium text-[var(--text-primary)] mb-4">Mois dernier</h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-jewel mb-1">
                      <Plus className="w-4 h-4" />
                      <span className="text-xl font-bold">{formatNumber(data.vehicles.syncLastMonth.added)}</span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">Ajoutés</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-red-500 mb-1">
                      <Minus className="w-4 h-4" />
                      <span className="text-xl font-bold">{formatNumber(data.vehicles.syncLastMonth.removed)}</span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">Supprimés</p>
                  </div>
                  <div className="text-center">
                    <div className={`text-xl font-bold mb-1 ${data.vehicles.syncLastMonth.net >= 0 ? 'text-jewel' : 'text-red-500'}`}>
                      {data.vehicles.syncLastMonth.net >= 0 ? '+' : ''}{formatNumber(data.vehicles.syncLastMonth.net)}
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">Net</p>
                  </div>
                </div>

                {/* By Source Last Month */}
                <div className="space-y-2">
                  {Object.entries(data.vehicles.syncLastMonth.bySource).map(([source, stats]) => (
                    <div key={source} className="flex items-center justify-between p-2 bg-[var(--card-bg)] rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{sourceFlags[source]?.flag || '🌍'}</span>
                        <span className="text-sm font-medium text-[var(--text-primary)] capitalize">{sourceFlags[source]?.name || source}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-jewel">+{stats.added}</span>
                        <span className="text-red-500">-{stats.removed}</span>
                        <span className={`font-medium ${stats.net >= 0 ? 'text-jewel' : 'text-red-500'}`}>
                          = {stats.net >= 0 ? '+' : ''}{stats.net}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Monthly Comparison Bar Chart */}
      <Card className="p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-mandarin" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Comparaison mensuelle</h2>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthlyComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="users" name="Utilisateurs" fill={CHART_COLORS.secondary} radius={[4, 4, 0, 0]} />
              <Bar dataKey="quotes" name="Devis" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
              <Bar dataKey="vehicles" name="Véhicules" fill={CHART_COLORS.tertiary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Two Column Layout - Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Vehicles by Source */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Globe className="w-5 h-5 text-mandarin" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Véhicules par source</h2>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourcesPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                  labelLine={{ stroke: 'var(--text-muted)' }}
                >
                  {sourcesPieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [formatNumber(value as number), 'Véhicules']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Quote Status Distribution */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-5 h-5 text-mandarin" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Statut des devis</h2>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={quoteStatusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                  labelLine={{ stroke: 'var(--text-muted)' }}
                >
                  <Cell fill={CHART_COLORS.yellow} />
                  <Cell fill={CHART_COLORS.tertiary} />
                  <Cell fill={CHART_COLORS.muted} />
                  <Cell fill={CHART_COLORS.red} />
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [formatNumber(value as number), 'Devis']}
                />
              </PieChart>
            </ResponsiveContainer>
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
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ordersPipelineData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {ordersPipelineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Profit Analysis Section */}
      <Card className="p-6 mb-8 bg-gradient-to-r from-jewel/5 to-mandarin/5 border-jewel/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-jewel/10 rounded-xl">
              <Calculator className="w-6 h-6 text-jewel" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Analyse des Bénéfices (Commandes)</h2>
              <p className="text-sm text-[var(--text-muted)]">
                Comparaison Prix Driveby vs Prix Source pour les commandes validées
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProfitData}
            disabled={isProfitLoading}
            leftIcon={<RefreshCw className={`w-4 h-4 ${isProfitLoading ? 'animate-spin' : ''}`} />}
          >
            Actualiser
          </Button>
        </div>

        {isProfitLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-jewel" />
          </div>
        ) : profitData ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--card-border)]">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="text-xs text-[var(--text-muted)]">Commandes analysées</span>
                </div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {profitData.summary.ordersWithPriceData}
                  <span className="text-sm font-normal text-[var(--text-muted)]"> / {profitData.summary.totalOrders}</span>
                </p>
              </div>

              <div className="bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--card-border)]">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-royal-blue" />
                  <span className="text-xs text-[var(--text-muted)]">Prix Driveby Total</span>
                </div>
                <p className="text-2xl font-bold text-royal-blue">
                  ${formatNumber(profitData.summary.totalDrivebyPriceUSD)}
                </p>
              </div>

              <div className="bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--card-border)]">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-mandarin" />
                  <span className="text-xs text-[var(--text-muted)]">Prix Source Total</span>
                </div>
                <p className="text-2xl font-bold text-mandarin">
                  ${formatNumber(profitData.summary.totalSourcePriceUSD)}
                </p>
              </div>

              <div className="bg-[var(--card-bg)] rounded-xl p-4 border border-jewel/30">
                <div className="flex items-center gap-2 mb-2">
                  {profitData.summary.totalProfitUSD >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-jewel" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-xs text-[var(--text-muted)]">Bénéfice Total</span>
                </div>
                <p className={`text-2xl font-bold ${profitData.summary.totalProfitUSD >= 0 ? 'text-jewel' : 'text-red-500'}`}>
                  {profitData.summary.totalProfitUSD >= 0 ? '+' : ''}${formatNumber(profitData.summary.totalProfitUSD)}
                </p>
                {profitData.summary.avgProfitPercentage !== null && (
                  <p className="text-xs text-[var(--text-muted)]">
                    Marge moyenne: {profitData.summary.avgProfitPercentage}%
                  </p>
                )}
              </div>
            </div>

            {/* Exchange Rate Info */}
            {profitData.exchangeRate && (
              <div className="bg-[var(--surface)] rounded-xl p-3 mb-6 flex items-center gap-2 text-sm">
                <span className="text-[var(--text-muted)]">Taux de change:</span>
                <span className="font-mono text-[var(--text-primary)]">{profitData.exchangeRate.description}</span>
              </div>
            )}

            {/* By Source Breakdown */}
            {Object.keys(profitData.bySource).length > 0 && (
              <div className="bg-[var(--surface)] rounded-xl p-4 mb-6">
                <h3 className="font-medium text-[var(--text-primary)] mb-4">Bénéfices par source</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm table-fixed">
                    <thead>
                      <tr className="border-b border-[var(--card-border)]">
                        <th className="text-left py-2 px-3 text-[var(--text-muted)] font-medium w-[120px]">Source</th>
                        <th className="text-right py-2 px-3 text-[var(--text-muted)] font-medium w-[100px]">Commandes</th>
                        <th className="text-right py-2 px-3 text-[var(--text-muted)] font-medium w-[140px]">Prix Driveby</th>
                        <th className="text-right py-2 px-3 text-[var(--text-muted)] font-medium w-[140px]">Prix Source</th>
                        <th className="text-right py-2 px-3 text-[var(--text-muted)] font-medium w-[120px]">Bénéfice</th>
                        <th className="text-right py-2 px-3 text-[var(--text-muted)] font-medium w-[80px]">Marge</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(profitData.bySource).map(([source, sourceData]) => (
                        <tr key={source} className="border-b border-[var(--card-border)]/50">
                          <td className="py-2 px-3">
                            <span className="flex items-center gap-2">
                              <span className="text-lg">
                                {source === 'china' || source === 'che168' || source === 'dongchedi' ? '🇨🇳' :
                                 source === 'korea' ? '🇰🇷' :
                                 source === 'dubai' ? '🇦🇪' : '🌍'}
                              </span>
                              <span className="capitalize text-[var(--text-primary)]">{source}</span>
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right text-[var(--text-primary)]">{sourceData.count}</td>
                          <td className="py-2 px-3 text-right text-royal-blue font-medium">
                            ${formatNumber(sourceData.totalDrivebyUSD)}
                          </td>
                          <td className="py-2 px-3 text-right text-mandarin font-medium">
                            ${formatNumber(sourceData.totalSourceUSD)}
                          </td>
                          <td className={`py-2 px-3 text-right font-bold ${sourceData.totalProfitUSD >= 0 ? 'text-jewel' : 'text-red-500'}`}>
                            {sourceData.totalProfitUSD >= 0 ? '+' : ''}${formatNumber(sourceData.totalProfitUSD)}
                          </td>
                          <td className={`py-2 px-3 text-right ${sourceData.totalProfitUSD >= 0 ? 'text-jewel' : 'text-red-500'}`}>
                            {sourceData.avgProfitPercentage !== null ? `${sourceData.avgProfitPercentage}%` : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Individual Orders Table */}
            <div className="bg-[var(--surface)] rounded-xl p-4">
              <h3 className="font-medium text-[var(--text-primary)] mb-4">Détail par commande</h3>
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[var(--surface)]">
                    <tr className="border-b border-[var(--card-border)]">
                      <th className="text-left py-2 px-3 text-[var(--text-muted)] font-medium">Commande</th>
                      <th className="text-left py-2 px-3 text-[var(--text-muted)] font-medium">Véhicule</th>
                      <th className="text-center py-2 px-3 text-[var(--text-muted)] font-medium">Source</th>
                      <th className="text-right py-2 px-3 text-[var(--text-muted)] font-medium">Prix Véhicule (XAF)</th>
                      <th className="text-right py-2 px-3 text-[var(--text-muted)] font-medium">Prix Driveby (USD)</th>
                      <th className="text-right py-2 px-3 text-[var(--text-muted)] font-medium">Prix Source</th>
                      <th className="text-right py-2 px-3 text-[var(--text-muted)] font-medium">Bénéfice</th>
                      <th className="text-right py-2 px-3 text-[var(--text-muted)] font-medium">Marge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profitData.orders.slice(0, 20).map((order) => (
                      <tr key={order.orderId} className="border-b border-[var(--card-border)]/30 hover:bg-[var(--card-bg)]">
                        <td className="py-2 px-3">
                          <span className="font-mono text-xs text-mandarin">{order.orderNumber}</span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="text-[var(--text-primary)]">
                            {order.vehicleMake} {order.vehicleModel} {order.vehicleYear}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="text-lg">
                            {order.vehicleSource === 'china' || order.vehicleSource === 'che168' || order.vehicleSource === 'dongchedi' ? '🇨🇳' :
                             order.vehicleSource === 'korea' ? '🇰🇷' :
                             order.vehicleSource === 'dubai' ? '🇦🇪' : '🌍'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-[var(--text-primary)]">
                          {order.drivebyPriceXAF !== null
                            ? `${formatNumber(order.drivebyPriceXAF)} FCFA`
                            : <span className="text-[var(--text-muted)]">N/A</span>
                          }
                        </td>
                        <td className="py-2 px-3 text-right text-royal-blue font-medium">
                          ${formatNumber(order.drivebyPriceUSD)}
                        </td>
                        <td className="py-2 px-3 text-right text-mandarin">
                          {order.sourcePriceUSD !== null
                            ? `$${formatNumber(order.sourcePriceUSD)}`
                            : <span className="text-[var(--text-muted)]">N/A</span>
                          }
                        </td>
                        <td className={`py-2 px-3 text-right font-medium ${
                          order.profitUSD !== null
                            ? order.profitUSD >= 0 ? 'text-jewel' : 'text-red-500'
                            : 'text-[var(--text-muted)]'
                        }`}>
                          {order.profitUSD !== null
                            ? `${order.profitUSD >= 0 ? '+' : ''}$${formatNumber(order.profitUSD)}`
                            : 'N/A'
                          }
                        </td>
                        <td className={`py-2 px-3 text-right ${
                          order.profitPercentage !== null
                            ? order.profitPercentage >= 0 ? 'text-jewel' : 'text-red-500'
                            : 'text-[var(--text-muted)]'
                        }`}>
                          {order.profitPercentage !== null ? `${order.profitPercentage}%` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {profitData.orders.length > 20 && (
                <p className="text-xs text-[var(--text-muted)] mt-3 text-center">
                  Affichage des 20 premières commandes sur {profitData.orders.length} total
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
            <p className="text-[var(--text-muted)]">Aucune donnée de profit disponible</p>
          </div>
        )}
      </Card>

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

      {/* Top Makes - Bar Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Makes in Catalog */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Car className="w-5 h-5 text-mandarin" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Marques dans le catalogue</h2>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topMakesData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="value" name="Véhicules" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Top Quoted Makes */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-jewel" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Marques les plus demandées</h2>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.quotes.topMakes.slice(0, 8).map(item => ({ name: item.make, value: item.count }))}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="value" name="Devis" fill={CHART_COLORS.tertiary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
