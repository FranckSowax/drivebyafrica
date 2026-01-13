'use client';

import { useState } from 'react';
import { Globe, RefreshCw, CheckCircle, XCircle, Clock, ExternalLink, Key, Settings } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// API integrations
const apiIntegrations = [
  {
    id: 'encar',
    name: 'Encar Korea',
    description: 'API pour les véhicules de Corée du Sud',
    flag: '🇰🇷',
    status: 'connected',
    lastSync: '2024-01-12 14:30',
    vehiclesCount: 782,
    endpoint: 'https://api.encar.com/v1',
  },
  {
    id: 'whapi',
    name: 'Whapi.cloud',
    description: 'API WhatsApp pour les notifications',
    flag: '💬',
    status: 'connected',
    lastSync: '2024-01-12 15:00',
    messagesSent: 1234,
    endpoint: 'https://gate.whapi.cloud',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Paiements et transactions',
    flag: '💳',
    status: 'connected',
    lastSync: '2024-01-12 14:45',
    transactionsCount: 189,
    endpoint: 'https://api.stripe.com/v1',
  },
  {
    id: 'supabase',
    name: 'Supabase',
    description: 'Base de données et authentification',
    flag: '🗄️',
    status: 'connected',
    lastSync: 'Temps réel',
    tablesCount: 12,
    endpoint: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xxx.supabase.co',
  },
  {
    id: 'dubai',
    name: 'Dubai Cars API',
    description: 'API pour les véhicules de Dubaï',
    flag: '🇦🇪',
    status: 'pending',
    lastSync: 'Non configuré',
    vehiclesCount: 0,
    endpoint: 'À configurer',
  },
  {
    id: 'china',
    name: 'China Auto API',
    description: 'API pour les véhicules de Chine',
    flag: '🇨🇳',
    status: 'pending',
    lastSync: 'Non configuré',
    vehiclesCount: 0,
    endpoint: 'À configurer',
  },
];

const statusConfig = {
  connected: { label: 'Connecté', color: 'text-jewel', bg: 'bg-jewel/10', icon: CheckCircle },
  error: { label: 'Erreur', color: 'text-red-500', bg: 'bg-red-500/10', icon: XCircle },
  pending: { label: 'En attente', color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: Clock },
};

export default function AdminApiPage() {
  const [isSyncing, setIsSyncing] = useState<string | null>(null);

  const handleSync = async (apiId: string) => {
    setIsSyncing(apiId);
    // Simulate sync
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsSyncing(null);
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-royal-blue/10 rounded-xl">
          <Globe className="w-6 h-6 text-royal-blue" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">APIs externes</h1>
          <p className="text-[var(--text-muted)]">Gérez vos intégrations et connexions API</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <p className="text-2xl font-bold text-jewel">
            {apiIntegrations.filter((a) => a.status === 'connected').length}
          </p>
          <p className="text-sm text-[var(--text-muted)]">APIs connectées</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-yellow-500">
            {apiIntegrations.filter((a) => a.status === 'pending').length}
          </p>
          <p className="text-sm text-[var(--text-muted)]">En attente</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-red-500">
            {apiIntegrations.filter((a) => a.status === 'error').length}
          </p>
          <p className="text-sm text-[var(--text-muted)]">En erreur</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-[var(--text-primary)]">{apiIntegrations.length}</p>
          <p className="text-sm text-[var(--text-muted)]">Total intégrations</p>
        </Card>
      </div>

      {/* API Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {apiIntegrations.map((api) => {
          const status = statusConfig[api.status as keyof typeof statusConfig];
          return (
            <Card key={api.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[var(--surface)] rounded-xl flex items-center justify-center">
                    <span className="text-2xl">{api.flag}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)]">{api.name}</h3>
                    <p className="text-sm text-[var(--text-muted)]">{api.description}</p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}
                >
                  <status.icon className="w-3.5 h-3.5" />
                  {status.label}
                </span>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Endpoint</span>
                  <span className="text-[var(--text-primary)] font-mono text-xs truncate max-w-[200px]">
                    {api.endpoint}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Dernière sync</span>
                  <span className="text-[var(--text-primary)]">{api.lastSync}</span>
                </div>
                {api.vehiclesCount !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Véhicules</span>
                    <span className="text-[var(--text-primary)] font-semibold">{api.vehiclesCount}</span>
                  </div>
                )}
                {api.messagesSent !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Messages envoyés</span>
                    <span className="text-[var(--text-primary)] font-semibold">{api.messagesSent}</span>
                  </div>
                )}
                {api.transactionsCount !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Transactions</span>
                    <span className="text-[var(--text-primary)] font-semibold">{api.transactionsCount}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {api.status === 'connected' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleSync(api.id)}
                    disabled={isSyncing === api.id}
                    leftIcon={
                      <RefreshCw className={`w-4 h-4 ${isSyncing === api.id ? 'animate-spin' : ''}`} />
                    }
                  >
                    {isSyncing === api.id ? 'Sync...' : 'Synchroniser'}
                  </Button>
                )}
                {api.status === 'pending' && (
                  <Button variant="outline" size="sm" className="flex-1" leftIcon={<Key className="w-4 h-4" />}>
                    Configurer
                  </Button>
                )}
                <Button variant="ghost" size="sm" leftIcon={<Settings className="w-4 h-4" />}>
                  Paramètres
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
