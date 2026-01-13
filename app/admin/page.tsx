'use client';

import { useState, useEffect } from 'react';
import {
  Car,
  Users,
  FileText,
  TrendingUp,
  Package,
  DollarSign,
  Eye,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Ship,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface DashboardStats {
  totalVehicles: number;
  activeListings: number;
  totalUsers: number;
  newUsersThisMonth: number;
  totalQuotes: number;
  pendingQuotes: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  revenueThisMonth: number;
  pageViews: number;
  avgTimeOnSite: string;
}

interface RecentActivity {
  id: string;
  type: 'quote' | 'order' | 'user' | 'vehicle';
  message: string;
  timestamp: string;
  icon: typeof FileText;
}

// Stats cards data
const statsCards = [
  {
    title: 'Véhicules',
    key: 'totalVehicles' as keyof DashboardStats,
    subKey: 'activeListings' as keyof DashboardStats,
    subLabel: 'actifs',
    icon: Car,
    color: 'text-mandarin',
    bgColor: 'bg-mandarin/10',
  },
  {
    title: 'Utilisateurs',
    key: 'totalUsers' as keyof DashboardStats,
    subKey: 'newUsersThisMonth' as keyof DashboardStats,
    subLabel: 'ce mois',
    icon: Users,
    color: 'text-royal-blue',
    bgColor: 'bg-royal-blue/10',
  },
  {
    title: 'Devis',
    key: 'totalQuotes' as keyof DashboardStats,
    subKey: 'pendingQuotes' as keyof DashboardStats,
    subLabel: 'en attente',
    icon: FileText,
    color: 'text-jewel',
    bgColor: 'bg-jewel/10',
  },
  {
    title: 'Commandes',
    key: 'totalOrders' as keyof DashboardStats,
    subKey: 'pendingOrders' as keyof DashboardStats,
    subLabel: 'en cours',
    icon: Package,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
];

// Default stats (mock data)
const defaultStats: DashboardStats = {
  totalVehicles: 1247,
  activeListings: 892,
  totalUsers: 3456,
  newUsersThisMonth: 234,
  totalQuotes: 567,
  pendingQuotes: 23,
  totalOrders: 189,
  pendingOrders: 12,
  totalRevenue: 2450000,
  revenueThisMonth: 345000,
  pageViews: 45678,
  avgTimeOnSite: '4:32',
};

// Mock recent activity
const mockActivity: RecentActivity[] = [
  {
    id: '1',
    type: 'quote',
    message: 'Nouveau devis demandé pour Toyota Land Cruiser 2023',
    timestamp: 'Il y a 5 min',
    icon: FileText,
  },
  {
    id: '2',
    type: 'order',
    message: 'Commande #1234 confirmée - Livraison Libreville',
    timestamp: 'Il y a 23 min',
    icon: Package,
  },
  {
    id: '3',
    type: 'user',
    message: 'Nouvel utilisateur inscrit depuis Douala',
    timestamp: 'Il y a 1h',
    icon: Users,
  },
  {
    id: '4',
    type: 'vehicle',
    message: '15 nouveaux véhicules synchronisés depuis Encar',
    timestamp: 'Il y a 2h',
    icon: Car,
  },
  {
    id: '5',
    type: 'quote',
    message: 'Devis #789 accepté - Mercedes GLE 2022',
    timestamp: 'Il y a 3h',
    icon: FileText,
  },
];

// Top destinations
const topDestinations = [
  { name: 'Libreville', country: 'Gabon', flag: '🇬🇦', orders: 45, percentage: 28 },
  { name: 'Douala', country: 'Cameroun', flag: '🇨🇲', orders: 38, percentage: 24 },
  { name: 'Pointe-Noire', country: 'Congo', flag: '🇨🇬', orders: 29, percentage: 18 },
  { name: 'Abidjan', country: "Côte d'Ivoire", flag: '🇨🇮', orders: 24, percentage: 15 },
  { name: 'Dakar', country: 'Sénégal', flag: '🇸🇳', orders: 18, percentage: 11 },
];

// Vehicle sources
const vehicleSources = [
  { name: 'Corée du Sud', flag: '🇰🇷', count: 782, percentage: 63 },
  { name: 'Dubaï', flag: '🇦🇪', count: 312, percentage: 25 },
  { name: 'Chine', flag: '🇨🇳', count: 153, percentage: 12 },
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [activity, setActivity] = useState<RecentActivity[]>(mockActivity);
  const [isLoading, setIsLoading] = useState(false);

  const refreshData = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('fr-FR').format(value);
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Tableau de bord</h1>
          <p className="text-[var(--text-muted)] mt-1">
            Vue d'ensemble de votre plateforme Driveby Africa
          </p>
        </div>
        <Button
          variant="outline"
          onClick={refreshData}
          leftIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
          disabled={isLoading}
        >
          Actualiser
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsCards.map((card) => (
          <Card key={card.key} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[var(--text-muted)]">{card.title}</p>
                <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                  {formatNumber(stats[card.key] as number)}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  <span className={card.color}>{formatNumber(stats[card.subKey] as number)}</span>{' '}
                  {card.subLabel}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${card.bgColor}`}>
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Revenue & Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Revenus</h2>
            <span className="flex items-center gap-1 text-sm text-jewel">
              <ArrowUpRight className="w-4 h-4" />
              +12.5%
            </span>
          </div>
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm text-[var(--text-muted)]">Total</p>
                <p className="text-3xl font-bold text-[var(--text-primary)]">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-[var(--text-muted)]">Ce mois</p>
                <p className="text-xl font-semibold text-mandarin">
                  {formatCurrency(stats.revenueThisMonth)}
                </p>
              </div>
            </div>
            <div className="h-2 bg-[var(--surface)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-mandarin to-mandarin/60 rounded-full"
                style={{ width: `${(stats.revenueThisMonth / stats.totalRevenue) * 100}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Site Analytics Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Analytiques</h2>
            <span className="text-sm text-[var(--text-muted)]">30 derniers jours</span>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-royal-blue/10 rounded-xl">
                <Eye className="w-6 h-6 text-royal-blue" />
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Vues</p>
                <p className="text-xl font-bold text-[var(--text-primary)]">
                  {formatNumber(stats.pageViews)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-xl">
                <Clock className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Temps moyen</p>
                <p className="text-xl font-bold text-[var(--text-primary)]">{stats.avgTimeOnSite}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Three Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="p-6 lg:col-span-1">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Activité récente</h2>
          <div className="space-y-4">
            {activity.map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    item.type === 'quote'
                      ? 'bg-jewel/10 text-jewel'
                      : item.type === 'order'
                        ? 'bg-purple-500/10 text-purple-500'
                        : item.type === 'user'
                          ? 'bg-royal-blue/10 text-royal-blue'
                          : 'bg-mandarin/10 text-mandarin'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-primary)] line-clamp-2">{item.message}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{item.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Destinations */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Ship className="w-5 h-5 text-mandarin" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Top Destinations</h2>
          </div>
          <div className="space-y-3">
            {topDestinations.map((dest, index) => (
              <div key={dest.name} className="flex items-center gap-3">
                <span className="text-sm text-[var(--text-muted)] w-4">{index + 1}</span>
                <span className="text-xl">{dest.flag}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{dest.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{dest.country}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{dest.orders}</p>
                  <p className="text-xs text-[var(--text-muted)]">{dest.percentage}%</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Vehicle Sources */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Car className="w-5 h-5 text-mandarin" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Sources véhicules</h2>
          </div>
          <div className="space-y-4">
            {vehicleSources.map((source) => (
              <div key={source.name}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{source.flag}</span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {source.name}
                    </span>
                  </div>
                  <span className="text-sm text-[var(--text-muted)]">
                    {formatNumber(source.count)} ({source.percentage}%)
                  </span>
                </div>
                <div className="h-2 bg-[var(--surface)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-mandarin rounded-full transition-all duration-500"
                    style={{ width: `${source.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
