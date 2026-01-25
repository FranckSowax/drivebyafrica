'use client';

import { useState, useEffect } from 'react';
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
  ShoppingCart,
  Check,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VehicleBatchWithCollaborator } from '@/types/vehicle-batch';

interface AdminBatchTableProps {
  batches: VehicleBatchWithCollaborator[];
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
  onView?: (batch: VehicleBatchWithCollaborator) => void;
  onApprove?: (batch: VehicleBatchWithCollaborator) => void;
  onReject?: (batch: VehicleBatchWithCollaborator) => void;
}

const SOURCE_FLAGS: Record<string, string> = {
  korea: '🇰🇷',
  china: '🇨🇳',
  dubai: '🇦🇪',
};

const getStatusOptions = () => [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'sold_out', label: 'Sold Out' },
];

export function AdminBatchTable({
  batches = [],
  total,
  page,
  totalPages,
  isLoading,
  onPageChange,
  filters,
  onFilterChange,
  onView,
  onApprove,
  onReject,
}: AdminBatchTableProps) {
  const [localSearch, setLocalSearch] = useState(filters.search);
  const statusOptions = getStatusOptions();

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

  const getStatusBadge = (batch: VehicleBatchWithCollaborator) => {
    switch (batch.status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 rounded-full text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 rounded-full text-xs font-medium">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      case 'sold_out':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-500/10 text-gray-400 rounded-full text-xs font-medium">
            <ShoppingCart className="w-3 h-3" />
            Sold Out
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded-full text-xs font-medium">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
    }
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
              placeholder="Search by make, model, title, collaborator..."
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
          Showing {batches.length} of {total} batch{total !== 1 ? 'es' : ''}
        </span>
        {totalPages > 1 && (
          <span>Page {page} of {totalPages}</span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-nobel/20">
        <table className="w-full text-sm">
          <thead className="bg-surface">
            <tr>
              <th className="p-3 text-left text-gray-900 font-medium">Image</th>
              <th className="p-3 text-left text-gray-900 font-medium">Batch</th>
              <th className="p-3 text-left text-gray-900 font-medium">Collaborator</th>
              <th className="p-3 text-left text-gray-900 font-medium">Source</th>
              <th className="p-3 text-left text-gray-900 font-medium">Price/Unit</th>
              <th className="p-3 text-left text-gray-900 font-medium">Quantity</th>
              <th className="p-3 text-left text-gray-900 font-medium">Min. Order</th>
              <th className="p-3 text-left text-gray-900 font-medium">Status</th>
              <th className="p-3 text-left text-gray-900 font-medium">Added</th>
              <th className="p-3 text-right text-gray-900 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-nobel/20">
            {isLoading ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-nobel">
                  Loading...
                </td>
              </tr>
            ) : batches.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-nobel">
                  No batches found
                </td>
              </tr>
            ) : (
              batches.map((batch) => (
                <tr key={batch.id} className="bg-cod-gray hover:bg-surface transition-colors">
                  <td className="p-3">
                    <div className="relative w-16 h-12 rounded overflow-hidden bg-surface">
                      {batch.thumbnail_url || batch.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={batch.thumbnail_url || batch.images[0]}
                          alt={batch.title}
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
                    <p className="font-medium text-gray-900">
                      {batch.title}
                    </p>
                    <p className="text-xs text-nobel">
                      {batch.year} {batch.make} {batch.model}
                    </p>
                  </td>
                  <td className="p-3">
                    {batch.collaborator_name ? (
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-nobel" />
                        <span className="text-white text-xs">{batch.collaborator_name}</span>
                      </div>
                    ) : (
                      <span className="text-nobel text-xs">—</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="text-xl">{SOURCE_FLAGS[batch.source_country] || '🇨🇳'}</span>
                  </td>
                  <td className="p-3">
                    <p className="font-medium text-alto-orange">
                      ${batch.price_per_unit_usd.toLocaleString()}
                    </p>
                  </td>
                  <td className="p-3">
                    <p className="text-white">
                      <span className="font-semibold text-green-400">{batch.available_quantity}</span>
                      <span className="text-nobel"> / {batch.total_quantity}</span>
                    </p>
                    <p className="text-xs text-nobel">available / total</p>
                  </td>
                  <td className="p-3">
                    <p className="font-medium text-gray-900">
                      {batch.minimum_order_quantity}
                    </p>
                  </td>
                  <td className="p-3">
                    {getStatusBadge(batch)}
                    {batch.rejection_reason && (
                      <p className="text-xs text-red-400 mt-1 max-w-xs truncate" title={batch.rejection_reason}>
                        {batch.rejection_reason}
                      </p>
                    )}
                    {batch.admin_notes && batch.status === 'approved' && (
                      <p className="text-xs text-blue-400 mt-1 max-w-xs truncate" title={batch.admin_notes}>
                        Note: {batch.admin_notes}
                      </p>
                    )}
                  </td>
                  <td className="p-3 text-nobel text-xs">
                    {format(new Date(batch.created_at), 'MMM dd, yyyy')}
                    {batch.approved_at && (
                      <p className="text-green-400 mt-1">
                        ✓ {format(new Date(batch.approved_at), 'MMM dd')}
                      </p>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1">
                      {onView && (
                        <button
                          onClick={() => onView(batch)}
                          className="p-2 text-blue-500 hover:bg-blue-500/10 rounded transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      {batch.status === 'pending' && onApprove && (
                        <button
                          onClick={() => onApprove(batch)}
                          className="p-2 text-green-500 hover:bg-green-500/10 rounded transition-colors"
                          title="Approve batch"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      {batch.status === 'pending' && onReject && (
                        <button
                          onClick={() => onReject(batch)}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                          title="Reject batch"
                        >
                          <X className="w-4 h-4" />
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
