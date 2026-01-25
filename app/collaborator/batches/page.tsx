'use client';

import { useState, useEffect } from 'react';
import { useCollaboratorLocale } from '@/components/collaborator/CollaboratorLocaleProvider';
import { CollaboratorSidebar } from '@/components/collaborator/CollaboratorSidebar';
import { CollaboratorTopBar } from '@/components/collaborator/CollaboratorTopBar';
import { AddBatchModal } from '@/components/collaborator/AddBatchModal';
import { CollaboratorBatchTable } from '@/components/collaborator/CollaboratorBatchTable';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  Plus,
  Package,
  CheckCircle,
  Clock,
  XCircle,
  ShoppingCart,
} from 'lucide-react';
import type { VehicleBatch } from '@/types/vehicle-batch';

export default function CollaboratorBatchesPage() {
  const { t } = useCollaboratorLocale();
  const [batches, setBatches] = useState<VehicleBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
  });

  useEffect(() => {
    fetchBatches();
  }, [filters.status, currentPage]);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });

      if (filters.status !== 'all') {
        params.append('status', filters.status);
      }

      const response = await fetch(`/api/collaborator/batches?${params}`);
      const data = await response.json();

      if (response.ok) {
        setBatches(data.batches || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: Record<string, string>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  const handleViewBatch = (batch: VehicleBatch) => {
    // TODO: Open modal with batch details
    console.log('View batch:', batch);
  };

  const handleDeleteBatch = async (id: string) => {
    if (!confirm('Are you sure you want to delete this batch?')) {
      return;
    }

    try {
      const response = await fetch(`/api/collaborator/batches/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh the list
        fetchBatches();
      } else {
        alert('Failed to delete batch');
      }
    } catch (error) {
      console.error('Error deleting batch:', error);
      alert('Error deleting batch');
    }
  };

  const filteredBatches = batches.filter(batch => {
    if (!filters.search) return true;
    const query = filters.search.toLowerCase();
    return (
      batch.make.toLowerCase().includes(query) ||
      batch.model.toLowerCase().includes(query) ||
      batch.title.toLowerCase().includes(query)
    );
  });

  const stats = {
    total: batches.length,
    pending: batches.filter(b => b.status === 'pending').length,
    approved: batches.filter(b => b.status === 'approved').length,
    rejected: batches.filter(b => b.status === 'rejected').length,
    totalVehicles: batches.reduce((sum, b) => sum + b.total_quantity, 0),
    availableVehicles: batches.reduce((sum, b) => sum + b.available_quantity, 0),
  };

  return (
    <div className="min-h-screen bg-cod-gray">
      <CollaboratorSidebar
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
      />

      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <CollaboratorTopBar />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Package className="w-7 h-7 text-alto-orange" />
                Vehicle Batches
              </h1>
              <p className="text-sm text-nobel mt-1">
                Manage your wholesale vehicle batches
              </p>
            </div>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Batch
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-6 gap-4 mb-6">
            <Card className="p-4 bg-white border-nobel/20">
              <div className="text-sm text-gray-600">{t('stats.totalBatches')}</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
            </Card>
            <Card className="p-4 bg-white border-nobel/20">
              <div className="text-sm text-yellow-600 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {t('stats.pending')}
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{stats.pending}</div>
            </Card>
            <Card className="p-4 bg-white border-nobel/20">
              <div className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {t('stats.approved')}
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{stats.approved}</div>
            </Card>
            <Card className="p-4 bg-white border-nobel/20">
              <div className="text-sm text-red-600 flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                {t('stats.rejected')}
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{stats.rejected}</div>
            </Card>
            <Card className="p-4 bg-white border-nobel/20">
              <div className="text-sm text-gray-600">{t('stats.totalVehicles')}</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{stats.totalVehicles}</div>
            </Card>
            <Card className="p-4 bg-white border-nobel/20">
              <div className="text-sm text-blue-600 flex items-center gap-1">
                <ShoppingCart className="w-3 h-3" />
                {t('stats.available')}
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{stats.availableVehicles}</div>
            </Card>
          </div>

          {/* Batch Table */}
          <Card className="p-6 bg-surface border-nobel/20">
            <CollaboratorBatchTable
              batches={filteredBatches}
              total={total}
              page={currentPage}
              totalPages={totalPages}
              isLoading={loading}
              onPageChange={setCurrentPage}
              filters={filters}
              onFilterChange={handleFilterChange}
              onView={handleViewBatch}
              onDelete={handleDeleteBatch}
            />
          </Card>
        </div>
      </div>

      {/* Add Batch Modal */}
      <AddBatchModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          fetchBatches();
        }}
      />
    </div>
  );
}
