'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Eye,
  EyeOff,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Search,
  Filter,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { Vehicle } from '@/types/vehicle';

interface VehicleTableProps {
  vehicles: Vehicle[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onUpdate: (ids: string[], updates: Record<string, unknown>) => Promise<void>;
  onDelete: (ids: string[]) => Promise<void>;
  filters: {
    source: string;
    status: string;
    search: string;
    isVisible: string;
  };
  onFilterChange: (filters: Record<string, string>) => void;
}

const SOURCE_FLAGS: Record<string, string> = {
  korea: '🇰🇷',
  china: '🇨🇳',
  dubai: '🇦🇪',
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'available', label: 'Disponible' },
  { value: 'reserved', label: 'Réservé' },
  { value: 'sold', label: 'Vendu' },
  { value: 'pending', label: 'En attente' },
];

const SOURCE_OPTIONS = [
  { value: 'all', label: 'Toutes les sources' },
  { value: 'korea', label: '🇰🇷 Corée' },
  { value: 'china', label: '🇨🇳 Chine' },
  { value: 'dubai', label: '🇦🇪 Dubaï' },
];

const VISIBILITY_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'true', label: 'Visibles' },
  { value: 'false', label: 'Masqués' },
];

export function VehicleTable({
  vehicles,
  total,
  page,
  totalPages,
  isLoading,
  onPageChange,
  onUpdate,
  onDelete,
  filters,
  onFilterChange,
}: VehicleTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string>('');

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === vehicles.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(vehicles.map((v) => v.id));
    }
  };

  const handleBulkVisibility = async (visible: boolean) => {
    if (selectedIds.length === 0) return;
    await onUpdate(selectedIds, { is_visible: visible });
    setSelectedIds([]);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Supprimer ${selectedIds.length} véhicule(s) ?`)) return;
    await onDelete(selectedIds);
    setSelectedIds([]);
  };

  const handleStatusEdit = async (id: string) => {
    if (editStatus) {
      await onUpdate([id], { status: editStatus });
    }
    setEditingId(null);
    setEditStatus('');
  };

  const getStatusBadge = (vehicle: Vehicle) => {
    const status = vehicle.status || 'available';
    const styles: Record<string, string> = {
      available: 'bg-jewel/10 text-jewel',
      reserved: 'bg-mandarin/10 text-mandarin',
      sold: 'bg-red-500/10 text-red-500',
      pending: 'bg-royal-blue/10 text-royal-blue',
    };
    const labels: Record<string, string> = {
      available: 'Disponible',
      reserved: 'Réservé',
      sold: 'Vendu',
      pending: 'En attente',
    };
    return (
      <span className={cn('px-2 py-0.5 rounded-full text-xs', styles[status] || styles.available)}>
        {labels[status] || status}
      </span>
    );
  };

  const hasActiveFilters = filters.source !== 'all' || filters.status !== 'all' || filters.isVisible !== 'all' || filters.search !== '';

  const resetFilters = () => {
    onFilterChange({ source: 'all', status: 'all', isVisible: 'all', search: '' });
  };

  return (
    <div className="space-y-4">
      {/* Search & Filters Bar */}
      <div className="bg-gradient-to-r from-[var(--surface)] to-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] p-4 shadow-sm">
        {/* Search Row */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="search"
              placeholder="Rechercher par marque, modèle, ID source..."
              value={filters.search}
              onChange={(e) => onFilterChange({ search: e.target.value })}
              className="w-full h-12 pl-12 pr-4 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-mandarin focus:ring-2 focus:ring-mandarin/20 focus:outline-none transition-all"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap">
            <div className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filtres:</span>
            </div>

            {/* Source Filter */}
            <div className="relative group">
              <select
                value={filters.source}
                onChange={(e) => onFilterChange({ source: e.target.value })}
                className={cn(
                  "h-10 px-4 pr-8 rounded-full text-sm font-medium border-2 cursor-pointer transition-all appearance-none bg-[var(--card-bg)]",
                  filters.source !== 'all'
                    ? "border-mandarin text-mandarin bg-mandarin/10"
                    : "border-[var(--card-border)] text-[var(--text-primary)] hover:border-mandarin/50"
                )}
              >
                {SOURCE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronRight className="w-4 h-4 rotate-90 text-[var(--text-muted)]" />
              </div>
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={filters.status}
                onChange={(e) => onFilterChange({ status: e.target.value })}
                className={cn(
                  "h-10 px-4 pr-8 rounded-full text-sm font-medium border-2 cursor-pointer transition-all appearance-none bg-[var(--card-bg)]",
                  filters.status !== 'all'
                    ? "border-jewel text-jewel bg-jewel/10"
                    : "border-[var(--card-border)] text-[var(--text-primary)] hover:border-jewel/50"
                )}
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronRight className="w-4 h-4 rotate-90 text-[var(--text-muted)]" />
              </div>
            </div>

            {/* Visibility Filter */}
            <div className="relative">
              <select
                value={filters.isVisible}
                onChange={(e) => onFilterChange({ isVisible: e.target.value })}
                className={cn(
                  "h-10 px-4 pr-8 rounded-full text-sm font-medium border-2 cursor-pointer transition-all appearance-none bg-[var(--card-bg)]",
                  filters.isVisible !== 'all'
                    ? "border-royal-blue text-royal-blue bg-royal-blue/10"
                    : "border-[var(--card-border)] text-[var(--text-primary)] hover:border-royal-blue/50"
                )}
              >
                {VISIBILITY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronRight className="w-4 h-4 rotate-90 text-[var(--text-muted)]" />
              </div>
            </div>

            {/* Reset Button */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="h-10 px-4 rounded-full text-sm font-medium border-2 border-red-500/30 text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-all flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Réinitialiser</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="mt-3 pt-3 border-t border-[var(--card-border)] flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[var(--text-muted)]">Filtres actifs:</span>
            {filters.search && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-mandarin/10 text-mandarin text-xs rounded-full">
                Recherche: "{filters.search}"
                <button onClick={() => onFilterChange({ search: '' })} className="hover:text-mandarin/70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.source !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-mandarin/10 text-mandarin text-xs rounded-full">
                Source: {SOURCE_OPTIONS.find(o => o.value === filters.source)?.label}
                <button onClick={() => onFilterChange({ source: 'all' })} className="hover:text-mandarin/70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.status !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-jewel/10 text-jewel text-xs rounded-full">
                Statut: {STATUS_OPTIONS.find(o => o.value === filters.status)?.label}
                <button onClick={() => onFilterChange({ status: 'all' })} className="hover:text-jewel/70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.isVisible !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-royal-blue/10 text-royal-blue text-xs rounded-full">
                Visibilité: {VISIBILITY_OPTIONS.find(o => o.value === filters.isVisible)?.label}
                <button onClick={() => onFilterChange({ isVisible: 'all' })} className="hover:text-royal-blue/70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-mandarin/10 to-orange-500/10 rounded-xl border border-mandarin/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-mandarin rounded-full flex items-center justify-center text-white font-bold text-sm">
              {selectedIds.length}
            </div>
            <span className="text-sm font-medium text-[var(--text-primary)]">
              véhicule{selectedIds.length > 1 ? 's' : ''} sélectionné{selectedIds.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkVisibility(true)}
              className="flex items-center gap-2 px-4 py-2 bg-jewel/10 text-jewel rounded-lg hover:bg-jewel/20 transition-colors text-sm font-medium"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Afficher</span>
            </button>
            <button
              onClick={() => handleBulkVisibility(false)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500/10 text-gray-500 rounded-lg hover:bg-gray-500/20 transition-colors text-sm font-medium"
            >
              <EyeOff className="w-4 h-4" />
              <span className="hidden sm:inline">Masquer</span>
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Supprimer</span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--card-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface)]">
            <tr>
              <th className="p-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.length === vehicles.length && vehicles.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded"
                />
              </th>
              <th className="p-3 text-left text-[var(--text-muted)] font-medium">Image</th>
              <th className="p-3 text-left text-[var(--text-muted)] font-medium">Véhicule</th>
              <th className="p-3 text-left text-[var(--text-muted)] font-medium">Source</th>
              <th className="p-3 text-left text-[var(--text-muted)] font-medium">Prix</th>
              <th className="p-3 text-left text-[var(--text-muted)] font-medium">Statut</th>
              <th className="p-3 text-center text-[var(--text-muted)] font-medium">Visible</th>
              <th className="p-3 text-right text-[var(--text-muted)] font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--card-border)]">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-[var(--text-muted)]">
                  Chargement...
                </td>
              </tr>
            ) : vehicles.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-[var(--text-muted)]">
                  Aucun véhicule trouvé
                </td>
              </tr>
            ) : (
              vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="bg-[var(--card-bg)] hover:bg-[var(--surface)]">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(vehicle.id)}
                      onChange={() => toggleSelect(vehicle.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="p-3">
                    <div className="relative w-16 h-12 rounded overflow-hidden bg-[var(--surface)]">
                      {vehicle.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={vehicle.images[0]}
                          alt={`${vehicle.make} ${vehicle.model}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                          ?
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <p className="font-medium text-[var(--text-primary)]">
                      {vehicle.make} {vehicle.model}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {vehicle.year} • {vehicle.mileage?.toLocaleString()} km
                    </p>
                    <p className="text-xs text-[var(--text-muted)] font-mono">
                      {vehicle.source_id}
                    </p>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{SOURCE_FLAGS[vehicle.source] || '?'}</span>
                      {vehicle.source_url && (
                        <a
                          href={vehicle.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-royal-blue hover:text-mandarin transition-colors"
                          title="Voir sur le site source"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <p className="font-medium text-mandarin">
                      ${vehicle.start_price_usd?.toLocaleString() || '-'}
                    </p>
                  </td>
                  <td className="p-3">
                    {editingId === vehicle.id ? (
                      <div className="flex items-center gap-1">
                        <select
                          value={editStatus || vehicle.status || 'available'}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="w-28 h-8 px-2 text-xs bg-[var(--card-bg)] border border-[var(--card-border)] rounded text-[var(--text-primary)]"
                        >
                          {STATUS_OPTIONS.slice(1).map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleStatusEdit(vehicle.id)}
                          className="p-1 text-jewel hover:bg-jewel/10 rounded"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setEditingId(null); setEditStatus(''); }}
                          className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingId(vehicle.id); setEditStatus(vehicle.status || 'available'); }}
                        className="hover:opacity-80"
                      >
                        {getStatusBadge(vehicle)}
                      </button>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => onUpdate([vehicle.id], { is_visible: !vehicle.is_visible })}
                      className={cn(
                        'p-1.5 rounded-lg transition-colors',
                        vehicle.is_visible !== false
                          ? 'text-jewel bg-jewel/10'
                          : 'text-[var(--text-muted)] bg-[var(--surface)]'
                      )}
                    >
                      {vehicle.is_visible !== false ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/cars/${vehicle.id}`} target="_blank">
                        <Button variant="ghost" size="sm" className="p-1.5">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-1.5 text-red-500 hover:bg-red-500/10"
                        onClick={() => {
                          if (confirm('Supprimer ce véhicule ?')) {
                            onDelete([vehicle.id]);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">
          {total.toLocaleString()} véhicule(s) au total
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            leftIcon={<ChevronLeft className="w-4 h-4" />}
          >
            Précédent
          </Button>
          <span className="text-sm text-[var(--text-primary)]">
            Page {page} / {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            rightIcon={<ChevronRight className="w-4 h-4" />}
          >
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
}
