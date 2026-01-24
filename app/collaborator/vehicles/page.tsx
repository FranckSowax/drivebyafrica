'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useCollaboratorLocale } from '@/components/collaborator/CollaboratorLocaleProvider';
import { CollaboratorSidebar } from '@/components/collaborator/CollaboratorSidebar';
import { CollaboratorTopBar } from '@/components/collaborator/CollaboratorTopBar';
import { AddVehicleModal } from '@/components/collaborator/AddVehicleModal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { format } from 'date-fns';
import {
  Plus,
  Loader2,
  Car,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Pencil,
  Trash2,
  Search,
} from 'lucide-react';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  title: string;
  description?: string;
  price: number;
  mileage?: number;
  fuel_type?: string;
  transmission?: string;
  condition?: string;
  images: string[];
  thumbnail_url?: string;
  is_collaborator_listing: boolean;
  collaborator_approved: boolean;
  is_visible: boolean;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export default function CollaboratorVehiclesPage() {
  const { t } = useCollaboratorLocale();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, [statusFilter, currentPage]);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/collaborator/vehicles?${params}`);
      const data = await response.json();

      if (response.ok) {
        setVehicles(data.vehicles || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (vehicle: Vehicle) => {
    if (vehicle.collaborator_approved && vehicle.is_visible) {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-400">
          <CheckCircle className="w-3 h-3" />
          Approved
        </div>
      );
    }

    if (vehicle.rejection_reason) {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
          <XCircle className="w-3 h-3" />
          Rejected
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-400">
        <Clock className="w-3 h-3" />
        Pending
      </div>
    );
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      vehicle.make.toLowerCase().includes(query) ||
      vehicle.model.toLowerCase().includes(query) ||
      vehicle.title.toLowerCase().includes(query)
    );
  });

  const stats = {
    total: vehicles.length,
    pending: vehicles.filter(v => !v.collaborator_approved && !v.rejection_reason).length,
    approved: vehicles.filter(v => v.collaborator_approved).length,
    rejected: vehicles.filter(v => v.rejection_reason).length,
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
                <Car className="w-7 h-7 text-alto-orange" />
                My Vehicles
              </h1>
              <p className="text-sm text-nobel mt-1">
                Manage your vehicle listings
              </p>
            </div>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Vehicle
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="text-sm text-gray-900">{t('stats.total')}</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-yellow-400">{t('stats.pending')}</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{stats.pending}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-green-400">{t('stats.approved')}</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{stats.approved}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-red-400">{t('stats.rejected')}</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{stats.rejected}</div>
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
                placeholder="Search vehicles..."
                className="w-full pl-10 pr-4 py-2 bg-surface border border-nobel/20 rounded-lg text-white placeholder-nobel focus:outline-none focus:border-alto-orange"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'approved')}
              className="px-4 py-2 bg-surface border border-nobel/20 rounded-lg text-gray-900 focus:outline-none focus:border-alto-orange"
            >
              <option value="all">{t('stats.allStatuses')}</option>
              <option value="pending">{t('stats.pending')}</option>
              <option value="approved">{t('stats.approved')}</option>
            </select>
          </div>

          {/* Vehicles List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-alto-orange animate-spin" />
            </div>
          ) : filteredVehicles.length === 0 ? (
            <Card className="p-12 text-center">
              <Car className="w-12 h-12 text-nobel mx-auto mb-4" />
              <p className="text-nobel">No vehicles found</p>
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-4"
                variant="outline"
              >
                Add Your First Vehicle
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVehicles.map((vehicle) => (
                <Card key={vehicle.id} className="overflow-hidden hover:border-alto-orange/50 transition-colors">
                  {/* Image */}
                  <div className="relative h-48 bg-surface">
                    {vehicle.thumbnail_url || vehicle.images[0] ? (
                      <img
                        src={vehicle.thumbnail_url || vehicle.images[0]}
                        alt={vehicle.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Car className="w-12 h-12 text-nobel" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      {getStatusBadge(vehicle)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-semibold text-white mb-1">{vehicle.title}</h3>
                    <p className="text-sm text-nobel mb-2">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </p>

                    <div className="flex items-center justify-between text-sm mb-3">
                      <span className="text-alto-orange font-semibold">
                        ${vehicle.price.toLocaleString()}
                      </span>
                      {vehicle.mileage && (
                        <span className="text-nobel">
                          {vehicle.mileage.toLocaleString()} km
                        </span>
                      )}
                    </div>

                    {vehicle.rejection_reason && (
                      <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400 mb-3">
                        <strong>Rejected:</strong> {vehicle.rejection_reason}
                      </div>
                    )}

                    <div className="text-xs text-nobel">
                      Added {format(new Date(vehicle.created_at), 'MMM dd, yyyy')}
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

      {/* Add Vehicle Modal */}
      <AddVehicleModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          fetchVehicles();
        }}
      />
    </div>
  );
}
