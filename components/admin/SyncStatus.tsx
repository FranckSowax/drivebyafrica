'use client';

import { useState, useEffect } from 'react';
import {
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Globe,
  Server,
  Zap,
  Settings
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface SyncConfig {
  id: string;
  source: string;
  last_change_id: number | null;
  last_sync_at: string | null;
  last_sync_status: string;
  last_sync_error: string | null;
  vehicles_added: number;
  vehicles_updated: number;
  vehicles_removed: number;
  total_vehicles: number;
}

interface SyncLog {
  id: string;
  source: string;
  sync_type: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  vehicles_added: number;
  vehicles_updated: number;
  vehicles_removed: number;
  error_message: string | null;
}

interface SyncStatusProps {
  syncConfig: SyncConfig | null;
  syncLogs: SyncLog[];
  onSync: (mode: 'full' | 'changes') => Promise<void>;
}

interface DongchediStats {
  totalVehicles: number;
}

interface DongchediSyncResult {
  success: boolean;
  pagesProcessed: number;
  offersFound: number;
  added: number;
  updated: number;
  skipped: number;
  errors: number;
}

export function SyncStatus({ syncConfig, syncLogs, onSync }: SyncStatusProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [syncMode, setSyncMode] = useState<'full' | 'changes' | null>(null);
  const [activeSource, setActiveSource] = useState<'encar' | 'dongchedi' | 'dubicars'>('encar');

  // Dongchedi specific state
  const [dongchediStats, setDongchediStats] = useState<DongchediStats | null>(null);
  const [dongchediLoading, setDongchediLoading] = useState(false);
  const [dongchediSyncing, setDongchediSyncing] = useState(false);
  const [dongchediResult, setDongchediResult] = useState<DongchediSyncResult | null>(null);
  const [dongchediError, setDongchediError] = useState<string | null>(null);
  const [maxPages, setMaxPages] = useState(100);

  // Dubicars specific state
  const [dubicarsStats, setDubicarsStats] = useState<{ totalVehicles: number } | null>(null);
  const [dubicarsLoading, setDubicarsLoading] = useState(false);
  const [dubicarsSyncing, setDubicarsSyncing] = useState(false);
  const [dubicarsResult, setDubicarsResult] = useState<DongchediSyncResult | null>(null);
  const [dubicarsError, setDubicarsError] = useState<string | null>(null);
  const [dubicarsMaxPages, setDubicarsMaxPages] = useState(500);

  // Fetch Dongchedi/Dubicars stats on mount
  useEffect(() => {
    if (activeSource === 'dongchedi') {
      fetchDongchediStats();
    } else if (activeSource === 'dubicars') {
      fetchDubicarsStats();
    }
  }, [activeSource]);

  const fetchDongchediStats = async () => {
    setDongchediLoading(true);
    try {
      const response = await fetch('/api/admin/sync/dongchedi');
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setDongchediStats(data);
    } catch (error) {
      console.error('Error fetching Dongchedi stats:', error);
    } finally {
      setDongchediLoading(false);
    }
  };

  const fetchDubicarsStats = async () => {
    setDubicarsLoading(true);
    try {
      // Get count from vehicles table
      const response = await fetch('/api/admin/vehicles/stats');
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setDubicarsStats({ totalVehicles: data.stats?.bySource?.dubai || 0 });
    } catch (error) {
      console.error('Error fetching Dubicars stats:', error);
    } finally {
      setDubicarsLoading(false);
    }
  };

  const handleDubicarsSync = async () => {
    setDubicarsSyncing(true);
    setDubicarsError(null);
    setDubicarsResult(null);

    try {
      const response = await fetch('/api/admin/sync/dubicars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxPages: dubicarsMaxPages }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setDubicarsResult({
        success: true,
        pagesProcessed: dubicarsMaxPages,
        offersFound: data.stats.processed,
        added: data.stats.added,
        updated: data.stats.updated,
        skipped: data.stats.skipped,
        errors: data.stats.errors,
      });
      // Refresh stats after sync
      fetchDubicarsStats();
    } catch (error) {
      setDubicarsError(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setDubicarsSyncing(false);
    }
  };

  const handleDongchediSync = async () => {
    setDongchediSyncing(true);
    setDongchediError(null);
    setDongchediResult(null);

    try {
      const response = await fetch('/api/admin/sync/dongchedi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxPages }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setDongchediResult(data);
      // Refresh stats after sync
      fetchDongchediStats();
    } catch (error) {
      setDongchediError(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setDongchediSyncing(false);
    }
  };

  const handleSync = async (mode: 'full' | 'changes') => {
    setIsLoading(true);
    setSyncMode(mode);
    try {
      await onSync(mode);
    } finally {
      setIsLoading(false);
      setSyncMode(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-jewel" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <RefreshCw className="w-5 h-5 text-mandarin animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-[var(--text-muted)]" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'success':
        return 'Succès';
      case 'failed':
        return 'Échec';
      case 'running':
        return 'En cours';
      default:
        return 'En attente';
    }
  };

  return (
    <div className="space-y-6">
      {/* Source Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveSource('encar')}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all",
            activeSource === 'encar'
              ? "bg-gradient-to-r from-royal-blue to-blue-600 text-white shadow-lg shadow-royal-blue/25"
              : "bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--card-border)]"
          )}
        >
          <Globe className="w-5 h-5" />
          <span>Encar (Corée)</span>
        </button>
        <button
          onClick={() => setActiveSource('dongchedi')}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all",
            activeSource === 'dongchedi'
              ? "bg-gradient-to-r from-mandarin to-orange-600 text-white shadow-lg shadow-mandarin/25"
              : "bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--card-border)]"
          )}
        >
          <Server className="w-5 h-5" />
          <span>Dongchedi (Chine)</span>
        </button>
        <button
          onClick={() => setActiveSource('dubicars')}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all",
            activeSource === 'dubicars'
              ? "bg-gradient-to-r from-jewel to-emerald-600 text-white shadow-lg shadow-jewel/25"
              : "bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--card-border)]"
          )}
        >
          <Globe className="w-5 h-5" />
          <span>Dubicars (Dubai)</span>
        </button>
      </div>

      {/* Encar Sync Panel */}
      {activeSource === 'encar' && (
        <>
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Globe className="w-5 h-5 text-royal-blue" />
                  Synchronisation Encar
                </h3>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Véhicules d&apos;occasion importés de Corée du Sud
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSync('changes')}
                  disabled={isLoading}
                  leftIcon={isLoading && syncMode === 'changes' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                >
                  Incrémentale
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleSync('full')}
                  disabled={isLoading}
                  leftIcon={isLoading && syncMode === 'full' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                >
                  Sync Complète
                </Button>
              </div>
            </div>

            {syncConfig && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[var(--surface)] rounded-xl">
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Statut</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(syncConfig.last_sync_status)}
                    <span className="text-[var(--text-primary)] font-medium">
                      {getStatusLabel(syncConfig.last_sync_status)}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Dernière sync</p>
                  <p className="text-[var(--text-primary)] font-medium mt-1 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {syncConfig.last_sync_at
                      ? formatDistanceToNow(new Date(syncConfig.last_sync_at), { addSuffix: true, locale: fr })
                      : 'Jamais'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Change ID</p>
                  <p className="text-[var(--text-primary)] font-medium mt-1">
                    {syncConfig.last_change_id?.toLocaleString() || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Total Véhicules</p>
                  <p className="text-[var(--text-primary)] font-medium mt-1">
                    {syncConfig.total_vehicles.toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {syncConfig && (syncConfig.vehicles_added > 0 || syncConfig.vehicles_updated > 0 || syncConfig.vehicles_removed > 0) && (
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <span className="text-jewel">+{syncConfig.vehicles_added} ajoutés</span>
                <span className="text-royal-blue">~{syncConfig.vehicles_updated} mis à jour</span>
                <span className="text-red-500">-{syncConfig.vehicles_removed} supprimés</span>
              </div>
            )}

            {syncConfig?.last_sync_error && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">
                {syncConfig.last_sync_error}
              </div>
            )}
          </Card>

          {/* Sync History */}
          <Card>
            <h3 className="font-bold text-[var(--text-primary)] mb-4">Historique des synchronisations</h3>

            {syncLogs.length === 0 ? (
              <p className="text-[var(--text-muted)] text-center py-8">Aucun historique disponible</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--card-border)]">
                      <th className="text-left py-2 px-3 text-[var(--text-muted)] font-medium">Date</th>
                      <th className="text-left py-2 px-3 text-[var(--text-muted)] font-medium">Type</th>
                      <th className="text-left py-2 px-3 text-[var(--text-muted)] font-medium">Statut</th>
                      <th className="text-right py-2 px-3 text-[var(--text-muted)] font-medium">Ajoutés</th>
                      <th className="text-right py-2 px-3 text-[var(--text-muted)] font-medium">Mis à jour</th>
                      <th className="text-right py-2 px-3 text-[var(--text-muted)] font-medium">Supprimés</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syncLogs.map((log) => (
                      <tr key={log.id} className="border-b border-[var(--card-border)] last:border-0">
                        <td className="py-2 px-3 text-[var(--text-primary)]">
                          {new Date(log.started_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            log.sync_type === 'full' ? 'bg-mandarin/10 text-mandarin' : 'bg-royal-blue/10 text-royal-blue'
                          }`}>
                            {log.sync_type === 'full' ? 'Complète' : 'Incrémentale'}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1">
                            {getStatusIcon(log.status)}
                            <span className="text-[var(--text-primary)]">{getStatusLabel(log.status)}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right text-jewel">+{log.vehicles_added}</td>
                        <td className="py-2 px-3 text-right text-royal-blue">~{log.vehicles_updated}</td>
                        <td className="py-2 px-3 text-right text-red-500">-{log.vehicles_removed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* Dongchedi Sync Panel */}
      {activeSource === 'dongchedi' && (
        <Card>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
            <div>
              <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Server className="w-5 h-5 text-mandarin" />
                Synchronisation Dongchedi
              </h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Véhicules d&apos;occasion importés de Chine (via API Dongchedi)
              </p>
            </div>

            {/* Sync Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Max Pages Input */}
              <div className="flex items-center gap-2 bg-[var(--surface)] rounded-xl px-4 py-2 border border-[var(--card-border)]">
                <Settings className="w-4 h-4 text-[var(--text-muted)]" />
                <label className="text-sm text-[var(--text-muted)] whitespace-nowrap">Max pages:</label>
                <input
                  type="number"
                  value={maxPages}
                  onChange={(e) => setMaxPages(Math.min(4000, Math.max(1, parseInt(e.target.value) || 1)))}
                  min={1}
                  max={4000}
                  className="w-20 bg-transparent border-none text-[var(--text-primary)] font-medium focus:outline-none text-center"
                />
              </div>

              {/* Sync Button */}
              <Button
                variant="primary"
                onClick={handleDongchediSync}
                disabled={dongchediSyncing}
                leftIcon={dongchediSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                className="bg-gradient-to-r from-mandarin to-orange-600 hover:from-mandarin/90 hover:to-orange-600/90"
              >
                {dongchediSyncing ? 'Synchronisation...' : 'Lancer la Sync'}
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-[var(--surface)] rounded-xl mb-6">
            <div className="text-center p-4 bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">Véhicules Chine</p>
              <p className="text-2xl font-bold text-mandarin">
                {dongchediLoading ? '...' : dongchediStats?.totalVehicles?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="text-center p-4 bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">Véhicules/Page</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">20</p>
            </div>
            <div className="text-center p-4 bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">Max Estimé</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {(maxPages * 20).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Info Banner */}
          <div className="p-4 bg-mandarin/10 border border-mandarin/20 rounded-xl mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-mandarin flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-mandarin font-medium mb-1">Synchronisation via API</p>
                <p className="text-[var(--text-muted)]">
                  Cette sync utilise l&apos;API Dongchedi directement. Pour une sync complète avec photos fraîches (CSV),
                  utilisez le workflow GitHub Actions programmé quotidiennement à 6h UTC.
                </p>
              </div>
            </div>
          </div>

          {/* Sync Result */}
          {dongchediResult && (
            <div className="p-4 bg-jewel/10 border border-jewel/20 rounded-xl mb-6">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-jewel" />
                <span className="font-medium text-jewel">Synchronisation terminée</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-[var(--text-muted)]">Pages</p>
                  <p className="text-[var(--text-primary)] font-bold">{dongchediResult.pagesProcessed}</p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)]">Trouvés</p>
                  <p className="text-[var(--text-primary)] font-bold">{dongchediResult.offersFound.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)]">Ajoutés</p>
                  <p className="text-jewel font-bold">+{dongchediResult.added}</p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)]">Mis à jour</p>
                  <p className="text-royal-blue font-bold">~{dongchediResult.updated}</p>
                </div>
              </div>
              {dongchediResult.skipped > 0 && (
                <p className="text-xs text-[var(--text-muted)] mt-3">
                  {dongchediResult.skipped} véhicules ignorés (photos invalides/expirées)
                </p>
              )}
            </div>
          )}

          {/* Error */}
          {dongchediError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-500 font-medium">Erreur</span>
              </div>
              <p className="text-sm text-red-400 mt-2">{dongchediError}</p>
            </div>
          )}

          {/* GitHub Actions Info */}
          <div className="mt-6 pt-6 border-t border-[var(--card-border)]">
            <h4 className="font-medium text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-mandarin" />
              Sync Automatique (GitHub Actions)
            </h4>
            <div className="text-sm text-[var(--text-muted)] space-y-2">
              <p>
                <strong>Programmation:</strong> Tous les jours à 6h00 UTC (7h00 WAT)
              </p>
              <p>
                <strong>Max pages:</strong> 4000 (≈80,000 véhicules)
              </p>
              <p>
                <strong>Avantages:</strong> Télécharge les photos fraîches depuis le CSV quotidien,
                supprime automatiquement les véhicules avec photos expirées.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Dubicars Sync Panel */}
      {activeSource === 'dubicars' && (
        <Card>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
            <div>
              <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Globe className="w-5 h-5 text-jewel" />
                Synchronisation Dubicars
              </h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Véhicules d&apos;occasion importés de Dubai/UAE (via API Dubicars)
              </p>
            </div>

            {/* Sync Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Max Pages Input */}
              <div className="flex items-center gap-2 bg-[var(--surface)] rounded-xl px-4 py-2 border border-[var(--card-border)]">
                <Settings className="w-4 h-4 text-[var(--text-muted)]" />
                <label className="text-sm text-[var(--text-muted)] whitespace-nowrap">Max pages:</label>
                <input
                  type="number"
                  value={dubicarsMaxPages}
                  onChange={(e) => setDubicarsMaxPages(Math.min(2000, Math.max(1, parseInt(e.target.value) || 1)))}
                  min={1}
                  max={2000}
                  className="w-20 bg-transparent border-none text-[var(--text-primary)] font-medium focus:outline-none text-center"
                />
              </div>

              {/* Sync Button */}
              <Button
                variant="primary"
                onClick={handleDubicarsSync}
                disabled={dubicarsSyncing}
                leftIcon={dubicarsSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                className="bg-gradient-to-r from-jewel to-emerald-600 hover:from-jewel/90 hover:to-emerald-600/90"
              >
                {dubicarsSyncing ? 'Synchronisation...' : 'Lancer la Sync'}
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-[var(--surface)] rounded-xl mb-6">
            <div className="text-center p-4 bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">Véhicules Dubai</p>
              <p className="text-2xl font-bold text-jewel">
                {dubicarsLoading ? '...' : dubicarsStats?.totalVehicles?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="text-center p-4 bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">Véhicules/Page</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">20</p>
            </div>
            <div className="text-center p-4 bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">Max Estimé</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {(dubicarsMaxPages * 20).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Info Banner */}
          <div className="p-4 bg-jewel/10 border border-jewel/20 rounded-xl mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-jewel flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-jewel font-medium mb-1">Marché Dubai/UAE</p>
                <p className="text-[var(--text-muted)]">
                  Les prix sont en AED (Dirham) et convertis automatiquement en USD.
                  Les images sont hébergées directement sur dubicars.com.
                  API disponible: ~34,000 véhicules.
                </p>
              </div>
            </div>
          </div>

          {/* Sync Result */}
          {dubicarsResult && (
            <div className="p-4 bg-jewel/10 border border-jewel/20 rounded-xl mb-6">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-jewel" />
                <span className="font-medium text-jewel">Synchronisation terminée</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-[var(--text-muted)]">Trouvés</p>
                  <p className="text-[var(--text-primary)] font-bold">{dubicarsResult.offersFound.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)]">Ajoutés</p>
                  <p className="text-jewel font-bold">+{dubicarsResult.added}</p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)]">Mis à jour</p>
                  <p className="text-royal-blue font-bold">~{dubicarsResult.updated}</p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)]">Ignorés</p>
                  <p className="text-[var(--text-muted)] font-bold">{dubicarsResult.skipped}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {dubicarsError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-500 font-medium">Erreur</span>
              </div>
              <p className="text-sm text-red-400 mt-2">{dubicarsError}</p>
            </div>
          )}

          {/* GitHub Actions Info */}
          <div className="mt-6 pt-6 border-t border-[var(--card-border)]">
            <h4 className="font-medium text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-jewel" />
              Sync Automatique (GitHub Actions)
            </h4>
            <div className="text-sm text-[var(--text-muted)] space-y-2">
              <p>
                <strong>Programmation:</strong> Tous les jours à 8h00 UTC (9h00 WAT)
              </p>
              <p>
                <strong>Max pages:</strong> 2000 (≈40,000 véhicules)
              </p>
              <p>
                <strong>Suppression auto:</strong> Les véhicules vendus ou expirés sont automatiquement supprimés.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
