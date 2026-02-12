'use client';

import { useState, useEffect } from 'react';
import { useCollaboratorLocale } from '@/components/collaborator/CollaboratorLocaleProvider';
import { CollaboratorSidebar } from '@/components/collaborator/CollaboratorSidebar';
import { CollaboratorTopBar } from '@/components/collaborator/CollaboratorTopBar';
import { AddBatchModal } from '@/components/collaborator/AddBatchModal';
import { EditBatchModal } from '@/components/collaborator/EditBatchModal';
import { CollaboratorBatchTable } from '@/components/collaborator/CollaboratorBatchTable';
import { BatchDetailsModal } from '@/components/collaborator/BatchDetailsModal';
import { useCollaboratorAuth } from '@/lib/hooks/useCollaboratorAuth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  Plus,
  Package,
  CheckCircle,
  Clock,
  XCircle,
  ShoppingCart,
  Loader2,
} from 'lucide-react';
import type { VehicleBatch } from '@/types/vehicle-batch';

export default function CollaboratorBatchesPage() {
  const { t, locale } = useCollaboratorLocale();

  // Auth hook - handles authentication, provides user info and signOut
  const { isChecking, isAuthorized, userName, userEmail, signOut } = useCollaboratorAuth();

  const [batches, setBatches] = useState<VehicleBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<VehicleBatch | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
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
    setSelectedBatch(batch);
    setIsDetailsModalOpen(true);
  };

  const handleEditBatch = (batch: VehicleBatch) => {
    setSelectedBatch(batch);
    setIsEditModalOpen(true);
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

  // Show loading spinner while checking auth
  if (isChecking || !isAuthorized) {
    return (
      <div className="min-h-screen bg-cod-gray flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-mandarin animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cod-gray">
      <CollaboratorSidebar onLogout={signOut} />

      <div className="lg:pl-64">
        <CollaboratorTopBar
          title={locale === 'zh' ? '批量车辆' : 'Vehicle Batches'}
          userName={userName}
          userEmail={userEmail}
          onLogout={signOut}
        />

        <main className="p-4 lg:p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <Package className="w-6 h-6 sm:w-7 sm:h-7 text-mandarin" />
                {locale === 'zh' ? '批量车辆' : 'Vehicle Batches'}
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                {locale === 'zh' ? '管理您的批量车辆' : 'Manage your wholesale vehicle batches'}
              </p>
            </div>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              Add Batch
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <Card className="p-4 bg-cod-gray border-nobel/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-mandarin/10 rounded-lg">
                  <Package className="w-5 h-5 text-mandarin" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{t('stats.totalBatches')}</p>
                  <p className="text-xl font-bold text-black">{stats.total}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-cod-gray border-nobel/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{t('stats.pending')}</p>
                  <p className="text-xl font-bold text-black">{stats.pending}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-cod-gray border-nobel/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-jewel/10 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-jewel" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{t('stats.approved')}</p>
                  <p className="text-xl font-bold text-black">{stats.approved}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-cod-gray border-nobel/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{t('stats.rejected')}</p>
                  <p className="text-xl font-bold text-black">{stats.rejected}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-cod-gray border-nobel/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Package className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{t('stats.totalVehicles')}</p>
                  <p className="text-xl font-bold text-black">{stats.totalVehicles}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-cod-gray border-nobel/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <ShoppingCart className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{t('stats.available')}</p>
                  <p className="text-xl font-bold text-black">{stats.availableVehicles}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Batch Table */}
          <Card className="p-6 bg-cod-gray border-nobel/20">
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
              onEdit={handleEditBatch}
              onDelete={handleDeleteBatch}
            />
          </Card>
        </main>
      </div>

      {/* Add Batch Modal */}
      <AddBatchModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          fetchBatches();
        }}
      />

      {/* Edit Batch Modal */}
      <EditBatchModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedBatch(null);
        }}
        onSuccess={() => {
          fetchBatches();
        }}
        batch={selectedBatch}
      />

      {/* Batch Details Modal */}
      <BatchDetailsModal
        batch={selectedBatch}
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedBatch(null);
        }}
      />
    </div>
  );
}
