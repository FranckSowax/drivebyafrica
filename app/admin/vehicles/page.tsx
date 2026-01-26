'use client';

import { useState, useEffect, useRef } from 'react';
import { Car, RefreshCw, BarChart3 } from 'lucide-react';
import { AdminStats, SyncStatus, VehicleTable } from '@/components/admin';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import type { Vehicle } from '@/types/vehicle';

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

export default function AdminVehiclesPage() {
  const toast = useToast();

  // Stats state
  const [stats, setStats] = useState<StatsData | null>(null);
  const [syncConfig, setSyncConfig] = useState<SyncConfig | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  // Vehicles state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    source: 'all',
    status: 'all',
    search: '',
    isVisible: 'all',
    priceMin: '',
    priceMax: '',
  });

  // Active tab
  const [activeTab, setActiveTab] = useState<'stats' | 'vehicles' | 'sync'>('stats');

  // Track if initial load is done
  const statsLoaded = useRef(false);
  const vehiclesTabLoaded = useRef(false);

  // Fetch stats function
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await fetch('/api/admin/vehicles/stats');
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setStats(data.stats);
      setSyncConfig(data.syncConfig);
      setSyncLogs(data.syncLogs || []);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch vehicles function
  const fetchVehicles = async (pageNum: number, currentFilters: typeof filters) => {
    try {
      setVehiclesLoading(true);
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '20',
        ...(currentFilters.source !== 'all' && { source: currentFilters.source }),
        ...(currentFilters.status !== 'all' && { status: currentFilters.status }),
        ...(currentFilters.search && { search: currentFilters.search }),
        ...(currentFilters.isVisible !== 'all' && { isVisible: currentFilters.isVisible }),
        ...(currentFilters.priceMin && { priceMin: currentFilters.priceMin }),
        ...(currentFilters.priceMax && { priceMax: currentFilters.priceMax }),
      });

      const response = await fetch(`/api/admin/vehicles?${params}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setVehicles(data.vehicles);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Erreur lors du chargement des véhicules');
    } finally {
      setVehiclesLoading(false);
    }
  };

  // Initial stats load - only once
  useEffect(() => {
    if (!statsLoaded.current) {
      statsLoaded.current = true;
      fetchStats();
    }
  }, []);

  // Load vehicles when tab becomes active or filters/page change
  useEffect(() => {
    if (activeTab === 'vehicles') {
      fetchVehicles(page, filters);
    }
  }, [activeTab, page, filters.source, filters.status, filters.search, filters.isVisible, filters.priceMin, filters.priceMax]);

  // Handle sync
  const handleSync = async (mode: 'full' | 'changes') => {
    try {
      toast.info(`Synchronisation ${mode === 'full' ? 'complète' : 'incrémentale'} en cours...`);

      const response = await fetch('/api/admin/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      toast.success(`Sync terminée: +${data.added} ajoutés, ~${data.updated} mis à jour`);
      fetchStats();
      if (activeTab === 'vehicles') {
        fetchVehicles(page, filters);
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Erreur lors de la synchronisation');
    }
  };

  // Handle vehicle update
  const handleUpdate = async (ids: string[], updates: Record<string, unknown>) => {
    try {
      const response = await fetch('/api/admin/vehicles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, updates }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      toast.success(`${data.updated} véhicule(s) mis à jour`);
      fetchVehicles(page, filters);
      fetchStats();
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Handle vehicle delete
  const handleDelete = async (ids: string[]) => {
    try {
      const response = await fetch('/api/admin/vehicles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      toast.success(`${data.deleted} véhicule(s) supprimé(s)`);
      fetchVehicles(page, filters);
      fetchStats();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Handle filter change
  const handleFilterChange = (newFilters: Record<string, string>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            <span className="text-mandarin">Administration</span> Véhicules
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            Gérez les véhicules, la synchronisation et les statistiques
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[var(--card-border)]">
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'stats'
                ? 'border-mandarin text-mandarin'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Statistiques
          </button>
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'vehicles'
                ? 'border-mandarin text-mandarin'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Car className="w-4 h-4" />
            Véhicules
          </button>
          <button
            onClick={() => setActiveTab('sync')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'sync'
                ? 'border-mandarin text-mandarin'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            Synchronisation
          </button>
        </div>

        {/* Content */}
        {activeTab === 'stats' && (
          statsLoading ? (
            <Card className="p-8 text-center text-[var(--text-muted)]">
              Chargement des statistiques...
            </Card>
          ) : stats ? (
            <AdminStats stats={stats} />
          ) : (
            <Card className="p-8 text-center text-[var(--text-muted)]">
              Aucune donnée disponible
            </Card>
          )
        )}

        {activeTab === 'vehicles' && (
          <Card>
            <VehicleTable
              vehicles={vehicles}
              total={total}
              page={page}
              totalPages={totalPages}
              isLoading={vehiclesLoading}
              onPageChange={setPage}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              filters={filters}
              onFilterChange={handleFilterChange}
            />
          </Card>
        )}

        {activeTab === 'sync' && (
          <SyncStatus
            syncConfig={syncConfig}
            syncLogs={syncLogs}
            onSync={handleSync}
          />
        )}
      </div>
    </div>
  );
}
