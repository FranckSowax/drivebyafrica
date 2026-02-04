'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Eye,
  Search,
  Filter,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCollaboratorLocale } from '@/components/collaborator/CollaboratorLocaleProvider';
import type { CollaboratorVehicle } from '@/app/collaborator/vehicles/page';

interface CollaboratorVehicleTableProps {
  vehicles: CollaboratorVehicle[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  filters: {
    status: string;
    search: string;
  };
  onFilterChange: (filters: Record<string, string>) => void;
  onView?: (vehicle: CollaboratorVehicle) => void;
  onDelete?: (id: string) => void;
}

const SOURCE_FLAGS: Record<string, string> = {
  korea: '🇰🇷',
  china: '🇨🇳',
  dubai: '🇦🇪',
};

const getStatusOptions = (t: (key: string) => string) => [
  { value: 'all', label: t('filters.allStatuses') },
  { value: 'pending', label: t('filters.pending') },
  { value: 'approved', label: t('filters.published') },
];

export function CollaboratorVehicleTable({
  vehicles = [],
  total,
  page,
  totalPages,
  isLoading,
  onPageChange,
  filters,
  onFilterChange,
  onView,
  onDelete,
}: CollaboratorVehicleTableProps) {
  const { t } = useCollaboratorLocale();
  const [localSearch, setLocalSearch] = useState(filters.search);
  const statusOptions = getStatusOptions(t);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.search) {
        onFilterChange({ search: localSearch });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch]);

  // Sync local search with filters
  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  const getStatusBadge = (vehicle: CollaboratorVehicle) => {
    if (vehicle.status === 'available' && vehicle.is_visible) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 rounded-full text-xs font-medium">
          <CheckCircle className="w-3 h-3" />
          Published
        </span>
      );
    }

    if (vehicle.rejection_reason) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 rounded-full text-xs font-medium">
          <XCircle className="w-3 h-3" />
          Rejected
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded-full text-xs font-medium">
        <Clock className="w-3 h-3" />
        Pending
      </span>
    );
  };

  const hasActiveFilters = filters.status !== 'all' || filters.search !== '';

  const resetFilters = () => {
    onFilterChange({ status: 'all', search: '' });
  };

  return (
    <div className="space-y-4">
      {/* Search & Filters Bar */}
      <div className="bg-surface rounded-xl border border-nobel/20 p-4">
        {/* Search Row */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-nobel">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="search"
              placeholder="Search by make, model, title..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-cod-gray border border-nobel/20 rounded-xl text-white placeholder:text-nobel focus:border-alto-orange focus:ring-2 focus:ring-alto-orange/20 focus:outline-none transition-all"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap">
            <div className="flex items-center gap-1.5 text-sm text-gray-900">
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filters:</span>
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={filters.status}
                onChange={(e) => onFilterChange({ status: e.target.value })}
                className={cn(
                  "h-10 px-4 pr-8 rounded-full text-sm font-medium border-2 cursor-pointer transition-all appearance-none bg-cod-gray",
                  filters.status !== 'all'
                    ? "border-alto-orange text-alto-orange bg-alto-orange/10"
                    : "border-nobel/20 text-white hover:border-alto-orange/50"
                )}
              >
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronRight className="w-4 h-4 rotate-90 text-nobel" />
              </div>
            </div>

            {/* Reset Button */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="h-10 px-4 rounded-full text-sm font-medium border-2 border-red-500/30 text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-all flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="mt-3 pt-3 border-t border-nobel/20 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-nobel">Active filters:</span>
            {filters.search && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-alto-orange/10 text-alto-orange text-xs rounded-full">
                Search: "{filters.search}"
                <button onClick={() => onFilterChange({ search: '' })} className="hover:text-alto-orange/70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.status !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-alto-orange/10 text-alto-orange text-xs rounded-full">
                Status: {statusOptions.find(o => o.value === filters.status)?.label}
                <button onClick={() => onFilterChange({ status: 'all' })} className="hover:text-alto-orange/70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-nobel">
        <span>
          Showing {vehicles.length} of {total} vehicle{total !== 1 ? 's' : ''}
        </span>
        {totalPages > 1 && (
          <span>Page {page} of {totalPages}</span>
        )}
      </div>

      {/* Table - with mobile horizontal scroll */}
      <div className="overflow-x-auto rounded-xl border border-nobel/20 touch-pan-x">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-surface">
            <tr>
              <th className="p-3 text-left text-gray-900 font-medium">{t('table.image')}</th>
              <th className="p-3 text-left text-gray-900 font-medium">{t('table.vehicle')}</th>
              <th className="p-3 text-left text-gray-900 font-medium">{t('table.source')}</th>
              <th className="p-3 text-left text-gray-900 font-medium">{t('table.price')}</th>
              <th className="p-3 text-left text-gray-900 font-medium">{t('table.status')}</th>
              <th className="p-3 text-left text-gray-900 font-medium">{t('table.added')}</th>
              <th className="p-3 text-right text-gray-900 font-medium">{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-nobel/20">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-nobel">
                  Loading...
                </td>
              </tr>
            ) : vehicles.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-nobel">
                  No vehicles found
                </td>
              </tr>
            ) : (
              vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="bg-cod-gray hover:bg-surface transition-colors">
                  <td className="p-3">
                    <div className="relative w-16 h-12 rounded overflow-hidden bg-surface">
                      {vehicle.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={vehicle.images[0]}
                          alt={`${vehicle.make} ${vehicle.model}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-nobel">
                          ?
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <p className="font-medium text-white">
                      {vehicle.make} {vehicle.model}
                    </p>
                    <p className="text-xs text-nobel">
                      {vehicle.year} • {vehicle.transmission || 'N/A'}
                    </p>
                    {vehicle.mileage && (
                      <p className="text-xs text-nobel">
                        {vehicle.mileage.toLocaleString()} km
                      </p>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="text-xl">{SOURCE_FLAGS[vehicle.source || 'china'] || '🇨🇳'}</span>
                  </td>
                  <td className="p-3">
                    {vehicle.price != null ? (
                      <p className="font-medium text-alto-orange">
                        ${vehicle.price.toLocaleString()}
                      </p>
                    ) : (
                      <p className="font-medium text-gray-900">
                        On Request
                      </p>
                    )}
                  </td>
                  <td className="p-3">
                    {getStatusBadge(vehicle)}
                    {vehicle.rejection_reason && (
                      <p className="text-xs text-red-400 mt-1">
                        {vehicle.rejection_reason}
                      </p>
                    )}
                  </td>
                  <td className="p-3 text-nobel text-xs">
                    {format(new Date(vehicle.created_at), 'MMM dd, yyyy')}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1">
                      {onView && (
                        <button
                          onClick={() => onView(vehicle)}
                          className="p-2 text-blue-500 hover:bg-blue-500/10 rounded transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <Link href={`/cars/${vehicle.id}`} target="_blank">
                        <button className="p-2 text-royal-blue hover:bg-royal-blue/10 rounded transition-colors" title="View on website">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </Link>
                      {onDelete && (
                        <button
                          onClick={() => onDelete(vehicle.id)}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                          title="Delete vehicle"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="flex items-center gap-1 px-4 py-2 bg-surface border border-nobel/20 rounded-lg text-white hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <span className="text-sm text-nobel">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-4 py-2 bg-surface border border-nobel/20 rounded-lg text-white hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
