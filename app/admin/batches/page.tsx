'use client';

import { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { format } from 'date-fns';
import {
  Loader2,
  Package,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  ShoppingCart,
  User,
  Eye,
  Check,
  X,
} from 'lucide-react';
import type { VehicleBatchWithCollaborator } from '@/types/vehicle-batch';

export default function AdminBatchesPage() {
  const [batches, setBatches] = useState<VehicleBatchWithCollaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<VehicleBatchWithCollaborator | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBatches();
  }, [statusFilter, currentPage]);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/admin/batches?${params}`);
      const data = await response.json();

      if (response.ok) {
        setBatches(data.batches || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
    } finally {
      setLoading(false);
    }
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

  const getStatusBadge = (batch: VehicleBatchWithCollaborator) => {
    switch (batch.status) {
      case 'approved':
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-400">
            <CheckCircle className="w-3 h-3" />
            Approved
          </div>
        );
      case 'rejected':
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
            <XCircle className="w-3 h-3" />
            Rejected
          </div>
        );
      case 'sold_out':
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-500/10 border border-gray-500/20 rounded text-xs text-gray-400">
            <ShoppingCart className="w-3 h-3" />
            Sold Out
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-400">
            <Clock className="w-3 h-3" />
            Pending
          </div>
        );
    }
  };

  const filteredBatches = batches.filter(batch => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
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

          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nobel" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search batches or collaborators..."
                className="w-full pl-10 pr-4 py-2 bg-surface border border-nobel/20 rounded-lg text-white placeholder-nobel focus:outline-none focus:border-alto-orange"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="px-4 py-2 bg-surface border border-nobel/20 rounded-lg text-white focus:outline-none focus:border-alto-orange"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Batches List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-alto-orange animate-spin" />
            </div>
          ) : filteredBatches.length === 0 ? (
            <Card className="p-12 text-center">
              <Package className="w-12 h-12 text-nobel mx-auto mb-4" />
              <p className="text-nobel">No batches found</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredBatches.map((batch) => (
                <Card key={batch.id} className="overflow-hidden hover:border-alto-orange/50 transition-colors">
                  <div className="flex gap-4 p-4">
                    {/* Image */}
                    <div className="relative w-48 h-32 flex-shrink-0 bg-surface rounded-lg overflow-hidden">
                      {batch.thumbnail_url || batch.images[0] ? (
                        <img
                          src={batch.thumbnail_url || batch.images[0]}
                          alt={batch.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-nobel" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-white mb-1">{batch.title}</h3>
                          <p className="text-sm text-nobel mb-1">
                            {batch.year} {batch.make} {batch.model} • {batch.source_country.toUpperCase()}
                          </p>
                          {batch.collaborator_name && (
                            <p className="text-xs text-nobel flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {batch.collaborator_name}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(batch)}
                          {batch.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApproveClick(batch)}
                                className="text-green-400 border-green-400 hover:bg-green-400/10"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectClick(batch)}
                                className="text-red-400 border-red-400 hover:bg-red-400/10"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 mt-4">
                        <div>
                          <div className="text-xs text-nobel">Price per Unit</div>
                          <div className="text-lg font-semibold text-alto-orange">
                            ${batch.price_per_unit_usd.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-nobel">Total Quantity</div>
                          <div className="text-lg font-semibold text-white">
                            {batch.total_quantity}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-nobel">Available</div>
                          <div className="text-lg font-semibold text-green-400">
                            {batch.available_quantity}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-nobel">Min. Order</div>
                          <div className="text-lg font-semibold text-white">
                            {batch.minimum_order_quantity}
                          </div>
                        </div>
                      </div>

                      {batch.collaborator_notes && (
                        <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-400">
                          <strong>Collaborator Note:</strong> {batch.collaborator_notes}
                        </div>
                      )}

                      {batch.rejection_reason && (
                        <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                          <strong>Rejection Reason:</strong> {batch.rejection_reason}
                        </div>
                      )}

                      {batch.admin_notes && batch.status === 'approved' && (
                        <div className="mt-3 p-2 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-400">
                          <strong>Admin Note:</strong> {batch.admin_notes}
                        </div>
                      )}

                      <div className="mt-3 text-xs text-nobel">
                        Added {format(new Date(batch.created_at), 'MMM dd, yyyy')}
                        {batch.approved_at && ` • Approved ${format(new Date(batch.approved_at), 'MMM dd, yyyy')}`}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-nobel">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
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
    </div>
  );
}
