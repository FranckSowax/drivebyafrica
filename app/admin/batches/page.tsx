'use client';

import { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { AdminBatchTable } from '@/components/admin/AdminBatchTable';
import { AdminBatchDetailsModal } from '@/components/admin/AdminBatchDetailsModal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import {
  Package,
  CheckCircle,
  Clock,
  XCircle,
  ShoppingCart,
} from 'lucide-react';
import type { VehicleBatchWithCollaborator } from '@/types/vehicle-batch';

export default function AdminBatchesPage() {
  const [batches, setBatches] = useState<VehicleBatchWithCollaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<VehicleBatchWithCollaborator | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

      const response = await fetch(`/api/admin/batches?${params}`);
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

  const handleViewBatch = (batch: VehicleBatchWithCollaborator) => {
    setSelectedBatch(batch);
    setIsDetailsModalOpen(true);
  };

  const handleApproveClick = (batch: VehicleBatchWithCollaborator) => {
    setSelectedBatch(batch);
    setApprovalAction('approve');
    setAdminNotes('');
    setIsApprovalModalOpen(true);
  };

  const handleRejectClick = (batch: VehicleBatchWithCollaborator) => {
    setSelectedBatch(batch);
    setApprovalAction('reject');
    setAdminNotes('');
    setIsApprovalModalOpen(true);
  };

  const handleSubmitApproval = async () => {
    if (!selectedBatch) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/admin/batches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: selectedBatch.id,
          action: approvalAction,
          adminNotes: adminNotes || undefined,
        }),
      });

      if (response.ok) {
        setIsApprovalModalOpen(false);
        fetchBatches();
      }
    } catch (error) {
      console.error('Error submitting approval:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBatches = batches.filter(batch => {
    if (!filters.search) return true;
    const query = filters.search.toLowerCase();
    return (
      batch.make.toLowerCase().includes(query) ||
      batch.model.toLowerCase().includes(query) ||
      batch.title.toLowerCase().includes(query) ||
      batch.collaborator_name?.toLowerCase().includes(query)
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
      <AdminSidebar
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
      />

      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <AdminTopBar />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Package className="w-7 h-7 text-alto-orange" />
                Vehicle Batches
              </h1>
              <p className="text-sm text-nobel mt-1">
                Manage collaborator-submitted vehicle batches
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-6 gap-4 mb-6">
            <Card className="p-4">
              <div className="text-sm text-nobel">Total Batches</div>
              <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-yellow-400">Pending</div>
              <div className="text-2xl font-bold text-white mt-1">{stats.pending}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-green-400">Approved</div>
              <div className="text-2xl font-bold text-white mt-1">{stats.approved}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-red-400">Rejected</div>
              <div className="text-2xl font-bold text-white mt-1">{stats.rejected}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-nobel">Total Vehicles</div>
              <div className="text-2xl font-bold text-white mt-1">{stats.totalVehicles}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-blue-400">Available</div>
              <div className="text-2xl font-bold text-white mt-1">{stats.availableVehicles}</div>
            </Card>
          </div>

          {/* Batch Table */}
          <Card className="p-6 bg-surface border-nobel/20">
            <AdminBatchTable
              batches={filteredBatches}
              total={total}
              page={currentPage}
              totalPages={totalPages}
              isLoading={loading}
              onPageChange={setCurrentPage}
              filters={filters}
              onFilterChange={handleFilterChange}
              onView={handleViewBatch}
              onApprove={handleApproveClick}
              onReject={handleRejectClick}
            />
          </Card>
        </div>
      </div>

      {/* Approval Modal */}
      {selectedBatch && (
        <Modal
          isOpen={isApprovalModalOpen}
          onClose={() => setIsApprovalModalOpen(false)}
          title={approvalAction === 'approve' ? 'Approve Batch' : 'Reject Batch'}
          description={`${selectedBatch.year} ${selectedBatch.make} ${selectedBatch.model}`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-nobel mb-2">
                {approvalAction === 'approve' ? 'Admin Notes (optional)' : 'Rejection Reason'}
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={4}
                required={approvalAction === 'reject'}
                placeholder={approvalAction === 'approve' ? 'Any notes for the collaborator...' : 'Explain why this batch is being rejected...'}
                className="w-full px-3 py-2 bg-surface border border-nobel/20 rounded-lg text-white placeholder-nobel focus:outline-none focus:border-alto-orange resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIsApprovalModalOpen(false)}
                disabled={submitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitApproval}
                disabled={submitting || (approvalAction === 'reject' && !adminNotes)}
                className={`flex-1 ${approvalAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {submitting ? 'Processing...' : approvalAction === 'approve' ? 'Approve Batch' : 'Reject Batch'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Batch Details Modal */}
      <AdminBatchDetailsModal
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
