'use client';

import { BarChart3, TrendingUp, Users, Eye, Clock, Globe, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';

// Mock analytics data
const trafficData = {
  totalVisits: 45678,
  uniqueVisitors: 23456,
  pageViews: 123456,
  avgSessionDuration: '4:32',
  bounceRate: 35.2,
  newUsers: 8934,
};

const topPages = [
  { path: '/cars', views: 45678, percentage: 35 },
  { path: '/calculator', views: 23456, percentage: 18 },
  { path: '/cars/[id]', views: 19876, percentage: 15 },
  { path: '/', views: 15432, percentage: 12 },
  { path: '/how-it-works', views: 12345, percentage: 10 },
];

const topCountries = [
  { name: 'Gabon', flag: '🇬🇦', visitors: 8765, percentage: 28 },
  { name: 'Cameroun', flag: '🇨🇲', visitors: 6543, percentage: 21 },
  { name: 'Congo', flag: '🇨🇬', visitors: 4567, percentage: 15 },
  { name: "Côte d'Ivoire", flag: '🇨🇮', visitors: 3456, percentage: 11 },
  { name: 'Sénégal', flag: '🇸🇳', visitors: 2345, percentage: 8 },
];

const deviceStats = [
  { type: 'Mobile', percentage: 68, color: 'bg-mandarin' },
  { type: 'Desktop', percentage: 28, color: 'bg-royal-blue' },
  { type: 'Tablet', percentage: 4, color: 'bg-jewel' },
];

export default function AdminAnalyticsPage() {
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('fr-FR').format(value);
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-purple-500/10 rounded-xl">
          <BarChart3 className="w-6 h-6 text-purple-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Analytiques</h1>
          <p className="text-[var(--text-muted)]">Statistiques de trafic et d'engagement</p>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[var(--text-muted)]">Visites totales</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                {formatNumber(trafficData.totalVisits)}
              </p>
              <span className="flex items-center gap-1 text-xs text-jewel mt-1">
                <ArrowUpRight className="w-3 h-3" />
                +12.5%
              </span>
            </div>
            <div className="p-2 bg-mandarin/10 rounded-lg">
              <Eye className="w-5 h-5 text-mandarin" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[var(--text-muted)]">Visiteurs uniques</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                {formatNumber(trafficData.uniqueVisitors)}
              </p>
              <span className="flex items-center gap-1 text-xs text-jewel mt-1">
                <ArrowUpRight className="w-3 h-3" />
                +8.3%
              </span>
            </div>
            <div className="p-2 bg-royal-blue/10 rounded-lg">
              <Users className="w-5 h-5 text-royal-blue" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[var(--text-muted)]">Durée moyenne</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                {trafficData.avgSessionDuration}
              </p>
              <span className="flex items-center gap-1 text-xs text-jewel mt-1">
                <ArrowUpRight className="w-3 h-3" />
                +5.2%
              </span>
            </div>
            <div className="p-2 bg-jewel/10 rounded-lg">
              <Clock className="w-5 h-5 text-jewel" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[var(--text-muted)]">Taux de rebond</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                {trafficData.bounceRate}%
              </p>
              <span className="flex items-center gap-1 text-xs text-red-500 mt-1">
                <ArrowDownRight className="w-3 h-3" />
                -2.1%
              </span>
            </div>
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Pages */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Pages populaires</h2>
          <div className="space-y-4">
            {topPages.map((page, index) => (
              <div key={page.path}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[var(--text-primary)] font-mono">{page.path}</span>
                  <span className="text-sm text-[var(--text-muted)]">{formatNumber(page.views)}</span>
                </div>
                <div className="h-2 bg-[var(--surface)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-mandarin rounded-full"
                    style={{ width: `${page.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Countries */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-mandarin" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Pays</h2>
          </div>
          <div className="space-y-3">
            {topCountries.map((country, index) => (
              <div key={country.name} className="flex items-center gap-3">
                <span className="text-sm text-[var(--text-muted)] w-4">{index + 1}</span>
                <span className="text-xl">{country.flag}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{country.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {formatNumber(country.visitors)}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">{country.percentage}%</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Device Stats */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Appareils</h2>
          <div className="space-y-4">
            {deviceStats.map((device) => (
              <div key={device.type}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[var(--text-primary)]">{device.type}</span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">{device.percentage}%</span>
                </div>
                <div className="h-3 bg-[var(--surface)] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${device.color} rounded-full transition-all duration-500`}
                    style={{ width: `${device.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Device Donut placeholder */}
          <div className="mt-6 flex items-center justify-center">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="var(--surface)"
                  strokeWidth="12"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#F97316"
                  strokeWidth="12"
                  strokeDasharray={`${68 * 2.51} ${100 * 2.51}`}
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="12"
                  strokeDasharray={`${28 * 2.51} ${100 * 2.51}`}
                  strokeDashoffset={`${-68 * 2.51}`}
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#15803D"
                  strokeWidth="12"
                  strokeDasharray={`${4 * 2.51} ${100 * 2.51}`}
                  strokeDashoffset={`${-(68 + 28) * 2.51}`}
                />
              </svg>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
