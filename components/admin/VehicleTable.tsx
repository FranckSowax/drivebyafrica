'use client';

import { useState } from 'react';
import Image from 'next/image';
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
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
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
    const status = vehicle.status || (vehicle.auction_status === 'sold' ? 'sold' : 'available');
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

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          type="search"
          placeholder="Rechercher..."
          value={filters.search}
          onChange={(e) => onFilterChange({ search: e.target.value })}
          className="w-full sm:w-64"
        />
        <Select
          options={SOURCE_OPTIONS}
          value={filters.source}
          onChange={(e) => onFilterChange({ source: e.target.value })}
          className="w-full sm:w-40"
        />
        <Select
          options={STATUS_OPTIONS}
          value={filters.status}
          onChange={(e) => onFilterChange({ status: e.target.value })}
          className="w-full sm:w-40"
        />
        <Select
          options={VISIBILITY_OPTIONS}
          value={filters.isVisible}
          onChange={(e) => onFilterChange({ isVisible: e.target.value })}
          className="w-full sm:w-32"
        />
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-mandarin/10 rounded-lg">
          <span className="text-sm text-[var(--text-primary)]">
            {selectedIds.length} sélectionné(s)
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkVisibility(true)}
            leftIcon={<Eye className="w-4 h-4" />}
          >
            Afficher
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkVisibility(false)}
            leftIcon={<EyeOff className="w-4 h-4" />}
          >
            Masquer
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-500 border-red-500 hover:bg-red-500/10"
            onClick={handleBulkDelete}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Supprimer
          </Button>
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
                        <Image
                          src={vehicle.images[0]}
                          alt={`${vehicle.make} ${vehicle.model}`}
                          fill
                          className="object-cover"
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
                        <Select
                          options={STATUS_OPTIONS.slice(1)}
                          value={editStatus || vehicle.status || 'available'}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="w-28 text-xs"
                        />
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
