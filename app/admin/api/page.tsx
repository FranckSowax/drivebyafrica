'use client';

import { useState, useEffect } from 'react';
import {
  Globe,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Key,
  Settings,
  Database,
  Trash2,
  Play,
  AlertTriangle,
  Image,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface SyncStats {
  added?: number;
  updated?: number;
  removed?: number;
  errors?: number;
  totalProcessed?: number;
  clearedCount?: number;
  pagesProcessed?: number;
  vehiclesAdded?: number;
  uploaded?: number;
  skipped?: number;
  processed?: number;
  totalRows?: number;
  validRows?: number;
}

interface SyncResult {
  success: boolean;
  stats?: SyncStats;
  syncedAt?: string;
  error?: string;
}

// API integrations configuration
const apiIntegrations = [
  {
    id: 'dongchedi',
    name: 'Dongchedi (Chine)',
    description: 'API Dongchedi pour les vehicules chinois',
    flag: '🇨🇳',
    status: 'connected',
    endpoint: 'https://api1.auto-api.com/api/v2/dongchedi',
    features: ['sync', 'photos', 'reset'],
  },
  {
    id: 'encar',
    name: 'Encar Korea',
    description: 'API pour les vehicules de Coree du Sud',
    flag: '🇰🇷',
    status: 'connected',
    endpoint: 'https://api.encar.com/v1',
    features: ['sync'],
  },
  {
    id: 'whapi',
    name: 'Whapi.cloud',
    description: 'API WhatsApp pour les notifications',
    flag: '💬',
    status: 'connected',
    endpoint: 'https://gate.whapi.cloud',
    features: [],
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Paiements et transactions',
    flag: '💳',
    status: 'connected',
    endpoint: 'https://api.stripe.com/v1',
    features: [],
  },
  {
    id: 'supabase',
    name: 'Supabase',
    description: 'Base de donnees et authentification',
    flag: '🗄️',
    status: 'connected',
    endpoint: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xxx.supabase.co',
    features: [],
  },
  {
    id: 'dubai',
    name: 'Dubai Cars API',
    description: 'API pour les vehicules de Dubai',
    flag: '🇦🇪',
    status: 'pending',
    endpoint: 'A configurer',
    features: [],
  },
];

const statusConfig = {
  connected: { label: 'Connecte', color: 'text-jewel', bg: 'bg-jewel/10', icon: CheckCircle },
  error: { label: 'Erreur', color: 'text-red-500', bg: 'bg-red-500/10', icon: XCircle },
  pending: { label: 'En attente', color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: Clock },
};

export default function AdminApiPage() {
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<Record<string, SyncResult>>({});
  const [vehicleStats, setVehicleStats] = useState<{ total: number; bySource: Record<string, number> }>({
    total: 0,
    bySource: {},
  });
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch vehicle stats on mount
  useEffect(() => {
    fetchVehicleStats();
  }, []);

  const fetchVehicleStats = async () => {
    try {
      const response = await fetch('/api/admin/vehicles/stats');
      if (response.ok) {
        const data = await response.json();
        setVehicleStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Sync changes (daily incremental)
  const handleSyncChanges = async (apiId: string) => {
    setIsSyncing(`${apiId}-changes`);
    setSyncResults((prev) => ({ ...prev, [apiId]: { success: false } }));

    try {
      const response = await fetch(`/api/${apiId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'changes', sinceDays: 1 }),
      });

      const result = await response.json();
      setSyncResults((prev) => ({
        ...prev,
        [apiId]: {
          success: response.ok,
          stats: result.stats,
          syncedAt: result.syncedAt,
          error: result.error,
        },
      }));

      if (response.ok) {
        fetchVehicleStats();
      }
    } catch (error) {
      setSyncResults((prev) => ({
        ...prev,
        [apiId]: { success: false, error: 'Erreur de connexion' },
      }));
    } finally {
      setIsSyncing(null);
    }
  };

  // Sync photos
  const handleSyncPhotos = async (apiId: string) => {
    setIsSyncing(`${apiId}-photos`);
    setSyncResults((prev) => ({ ...prev, [`${apiId}-photos`]: { success: false } }));

    try {
      const response = await fetch(`/api/${apiId}/photos/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 100 }),
      });

      const result = await response.json();
      setSyncResults((prev) => ({
        ...prev,
        [`${apiId}-photos`]: {
          success: response.ok,
          stats: result.stats,
          syncedAt: result.syncedAt,
          error: result.error,
        },
      }));
    } catch (error) {
      setSyncResults((prev) => ({
        ...prev,
        [`${apiId}-photos`]: { success: false, error: 'Erreur de connexion' },
      }));
    } finally {
      setIsSyncing(null);
    }
  };

  // Full reset and sync
  const handleResetSync = async () => {
    setShowConfirmReset(false);
    setIsSyncing('reset');
    setSyncResults((prev) => ({ ...prev, reset: { success: false } }));

    try {
      const response = await fetch('/api/admin/reset-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxPages: 100, clearTable: true }),
      });

      const result = await response.json();
      setSyncResults((prev) => ({
        ...prev,
        reset: {
          success: response.ok,
          stats: result.stats,
          syncedAt: result.syncedAt,
          error: result.error,
        },
      }));

      if (response.ok) {
        fetchVehicleStats();
      }
    } catch (error) {
      setSyncResults((prev) => ({
        ...prev,
        reset: { success: false, error: 'Erreur de connexion' },
      }));
    } finally {
      setIsSyncing(null);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-royal-blue/10 rounded-xl">
            <Globe className="w-6 h-6 text-royal-blue" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">APIs externes</h1>
            <p className="text-[var(--text-muted)]">Gerez vos integrations et synchronisations</p>
          </div>
        </div>
      </div>

      {/* Vehicle Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card className="p-4">
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : vehicleStats.total.toLocaleString()}
          </p>
          <p className="text-sm text-[var(--text-muted)]">Total vehicules</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-mandarin">
            {isLoading ? '-' : (vehicleStats.bySource.china || 0).toLocaleString()}
          </p>
          <p className="text-sm text-[var(--text-muted)]">Chine</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-royal-blue">
            {isLoading ? '-' : (vehicleStats.bySource.korea || 0).toLocaleString()}
          </p>
          <p className="text-sm text-[var(--text-muted)]">Coree</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-jewel">
            {apiIntegrations.filter((a) => a.status === 'connected').length}
          </p>
          <p className="text-sm text-[var(--text-muted)]">APIs connectees</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-yellow-500">
            {apiIntegrations.filter((a) => a.status === 'pending').length}
          </p>
          <p className="text-sm text-[var(--text-muted)]">En attente</p>
        </Card>
      </div>

      {/* Dongchedi Sync Panel */}
      <Card className="p-6 mb-8 border-2 border-mandarin/30">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-mandarin/10 rounded-xl flex items-center justify-center">
              <span className="text-3xl">🇨🇳</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Dongchedi - Synchronisation</h2>
              <p className="text-[var(--text-muted)]">
                Gerez la synchronisation des vehicules depuis l&apos;API Dongchedi
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-jewel/10 text-jewel">
            <CheckCircle className="w-4 h-4" />
            Connecte
          </span>
        </div>

        {/* Sync Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Sync Changes */}
          <div className="p-4 bg-[var(--surface)] rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-royal-blue/10 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-royal-blue" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">Sync quotidienne</h3>
                <p className="text-xs text-[var(--text-muted)]">Changements des dernieres 24h</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleSyncChanges('dongchedi')}
              disabled={isSyncing !== null}
            >
              {isSyncing === 'dongchedi-changes' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Synchronisation...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Lancer la sync
                </>
              )}
            </Button>
            {syncResults.dongchedi && (
              <div className={`mt-3 p-2 rounded-lg text-xs ${syncResults.dongchedi.success ? 'bg-jewel/10 text-jewel' : 'bg-red-500/10 text-red-500'}`}>
                {syncResults.dongchedi.success ? (
                  <>
                    Ajoutes: {syncResults.dongchedi.stats?.added || 0} |
                    Maj: {syncResults.dongchedi.stats?.updated || 0} |
                    Suppr: {syncResults.dongchedi.stats?.removed || 0}
                  </>
                ) : (
                  syncResults.dongchedi.error
                )}
              </div>
            )}
          </div>

          {/* Sync Photos */}
          <div className="p-4 bg-[var(--surface)] rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Image className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">Sync photos</h3>
                <p className="text-xs text-[var(--text-muted)]">Cache les photos (exp. 6j)</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleSyncPhotos('dongchedi')}
              disabled={isSyncing !== null}
            >
              {isSyncing === 'dongchedi-photos' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Telechargement...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Sync photos
                </>
              )}
            </Button>
            {syncResults['dongchedi-photos'] && (
              <div className={`mt-3 p-2 rounded-lg text-xs ${syncResults['dongchedi-photos'].success ? 'bg-jewel/10 text-jewel' : 'bg-red-500/10 text-red-500'}`}>
                {syncResults['dongchedi-photos'].success ? (
                  <>Uploadees: {syncResults['dongchedi-photos'].stats?.uploaded || 0}</>
                ) : (
                  syncResults['dongchedi-photos'].error
                )}
              </div>
            )}
          </div>

          {/* Full Reset */}
          <div className="p-4 bg-[var(--surface)] rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">Reset complet</h3>
                <p className="text-xs text-[var(--text-muted)]">Vide et resync tout</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full text-red-500 border-red-500/30 hover:bg-red-500/10"
              onClick={() => setShowConfirmReset(true)}
              disabled={isSyncing !== null}
            >
              {isSyncing === 'reset' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Reset en cours...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Reset & Sync
                </>
              )}
            </Button>
            {syncResults.reset && (
              <div className={`mt-3 p-2 rounded-lg text-xs ${syncResults.reset.success ? 'bg-jewel/10 text-jewel' : 'bg-red-500/10 text-red-500'}`}>
                {syncResults.reset.success ? (
                  <>
                    Suppr: {syncResults.reset.stats?.clearedCount || 0} |
                    Ajoutes: {syncResults.reset.stats?.vehiclesAdded || 0}
                  </>
                ) : (
                  syncResults.reset.error
                )}
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-600 mb-1">Important: Expiration des photos</p>
              <p className="text-[var(--text-muted)]">
                Les liens photos de Dongchedi expirent apres 6 jours. Executez la sync photos quotidiennement
                pour maintenir les images actives. Un cron job est configure pour s&apos;executer a 06:30 UTC.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Other API Cards */}
      <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Autres integrations</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {apiIntegrations
          .filter((api) => api.id !== 'dongchedi')
          .map((api) => {
            const status = statusConfig[api.status as keyof typeof statusConfig];
            return (
              <Card key={api.id} className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[var(--surface)] rounded-xl flex items-center justify-center">
                      <span className="text-xl">{api.flag}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--text-primary)]">{api.name}</h3>
                      <p className="text-xs text-[var(--text-muted)]">{api.description}</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}
                  >
                    <status.icon className="w-3 h-3" />
                    {status.label}
                  </span>
                </div>

                <div className="text-xs text-[var(--text-muted)] font-mono truncate mb-4">{api.endpoint}</div>

                <div className="flex gap-2">
                  {api.status === 'connected' && api.features.includes('sync') && (
                    <Button variant="outline" size="sm" className="flex-1">
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      Sync
                    </Button>
                  )}
                  {api.status === 'pending' && (
                    <Button variant="outline" size="sm" className="flex-1">
                      <Key className="w-3.5 h-3.5 mr-1.5" />
                      Configurer
                    </Button>
                  )}
                  <Button variant="ghost" size="sm">
                    <Settings className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
      </div>

      {/* Confirm Reset Modal */}
      {showConfirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <Card className="max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Confirmer le reset</h3>
                <p className="text-sm text-[var(--text-muted)]">Cette action est irreversible</p>
              </div>
            </div>
            <p className="text-[var(--text-muted)] mb-6">
              Cette action va supprimer tous les vehicules de la base de donnees et lancer une synchronisation
              complete depuis Dongchedi. Cela peut prendre plusieurs minutes.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowConfirmReset(false)}>
                Annuler
              </Button>
              <Button
                variant="primary"
                className="flex-1 bg-red-500 hover:bg-red-600"
                onClick={handleResetSync}
              >
                Confirmer le reset
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
