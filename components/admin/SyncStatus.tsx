'use client';

import { useState } from 'react';
import { RefreshCw, Clock, CheckCircle, XCircle, AlertCircle, Play } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

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

export function SyncStatus({ syncConfig, syncLogs, onSync }: SyncStatusProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [syncMode, setSyncMode] = useState<'full' | 'changes' | null>(null);

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
      {/* Sync Controls */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-mandarin" />
              Synchronisation Encar
            </h3>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Gérez la synchronisation des véhicules depuis l'API Encar
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSync('changes')}
              disabled={isLoading}
              leftIcon={isLoading && syncMode === 'changes' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            >
              Sync Incrémentale
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

        {/* Current Status */}
        {syncConfig && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[var(--surface)] rounded-lg">
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

        {/* Last Sync Results */}
        {syncConfig && (syncConfig.vehicles_added > 0 || syncConfig.vehicles_updated > 0 || syncConfig.vehicles_removed > 0) && (
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <span className="text-jewel">+{syncConfig.vehicles_added} ajoutés</span>
            <span className="text-royal-blue">~{syncConfig.vehicles_updated} mis à jour</span>
            <span className="text-red-500">-{syncConfig.vehicles_removed} supprimés</span>
          </div>
        )}

        {/* Error Message */}
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
    </div>
  );
}
