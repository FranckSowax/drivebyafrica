'use client';

import { Car, Eye, EyeOff, DollarSign, Globe } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface StatsData {
  total: number;
  byStatus: {
    available: number;
    reserved: number;
    sold: number;
    pending: number;
  };
  bySource: {
    korea: number;
    china: number;
    dubai: number;
  };
  hidden: number;
  visible: number;
  avgPrice: number;
}

interface AdminStatsProps {
  stats: StatsData;
}

export function AdminStats({ stats }: AdminStatsProps) {
  const statCards = [
    {
      label: 'Total Véhicules',
      value: stats.total.toLocaleString(),
      icon: Car,
      color: 'text-mandarin',
      bgColor: 'bg-mandarin/10',
    },
    {
      label: 'Disponibles',
      value: stats.byStatus.available.toLocaleString(),
      icon: Eye,
      color: 'text-jewel',
      bgColor: 'bg-jewel/10',
    },
    {
      label: 'Réservés',
      value: stats.byStatus.reserved.toLocaleString(),
      icon: Car,
      color: 'text-royal-blue',
      bgColor: 'bg-royal-blue/10',
    },
    {
      label: 'Vendus',
      value: stats.byStatus.sold.toLocaleString(),
      icon: DollarSign,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      label: 'Masqués',
      value: stats.hidden.toLocaleString(),
      icon: EyeOff,
      color: 'text-[var(--text-muted)]',
      bgColor: 'bg-[var(--surface)]',
    },
    {
      label: 'Prix Moyen',
      value: `$${stats.avgPrice.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-mandarin',
      bgColor: 'bg-mandarin/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} padding="sm" className="text-center">
            <div className={`inline-flex p-2 rounded-lg ${stat.bgColor} mb-2`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</p>
            <p className="text-xs text-[var(--text-muted)]">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Sources Breakdown */}
      <Card>
        <h3 className="font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-mandarin" />
          Répartition par Source
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-[var(--surface)] rounded-lg">
            <span className="text-2xl">🇰🇷</span>
            <p className="text-xl font-bold text-[var(--text-primary)] mt-2">
              {stats.bySource.korea.toLocaleString()}
            </p>
            <p className="text-xs text-[var(--text-muted)]">Corée du Sud</p>
          </div>
          <div className="text-center p-4 bg-[var(--surface)] rounded-lg">
            <span className="text-2xl">🇨🇳</span>
            <p className="text-xl font-bold text-[var(--text-primary)] mt-2">
              {stats.bySource.china.toLocaleString()}
            </p>
            <p className="text-xs text-[var(--text-muted)]">Chine</p>
          </div>
          <div className="text-center p-4 bg-[var(--surface)] rounded-lg">
            <span className="text-2xl">🇦🇪</span>
            <p className="text-xl font-bold text-[var(--text-primary)] mt-2">
              {stats.bySource.dubai.toLocaleString()}
            </p>
            <p className="text-xs text-[var(--text-muted)]">Dubaï</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
