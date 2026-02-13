'use client';

import { useState, useEffect } from 'react';
import { useCollaboratorLocale } from '@/components/collaborator/CollaboratorLocaleProvider';
import { CollaboratorSidebar } from '@/components/collaborator/CollaboratorSidebar';
import { CollaboratorTopBar } from '@/components/collaborator/CollaboratorTopBar';
import { AddVehicleModal } from '@/components/collaborator/AddVehicleModal';
import { CollaboratorVehicleTable } from '@/components/collaborator/CollaboratorVehicleTable';
import { VehicleDetailsModal } from '@/components/collaborator/VehicleDetailsModal';
import { useCollaboratorAuth } from '@/lib/hooks/useCollaboratorAuth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  Plus,
  Loader2,
  Car,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';

export interface CollaboratorVehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  title: string;
  price: number;
  mileage?: number;
  fuel_type?: string;
  transmission?: string;
  condition?: string;
  images: string[];
  thumbnail_url?: string;
  is_collaborator_listing: boolean;
  status: string;
  is_visible: boolean;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  source?: string;
}

export default function CollaboratorVehiclesPage() {
  const { t, locale } = useCollaboratorLocale();

  // Auth hook - handles authentication, provides user info and signOut
  const { isChecking, isAuthorized, userName, userEmail, signOut } = useCollaboratorAuth();

  const [vehicles, setVehicles] = useState<CollaboratorVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<CollaboratorVehicle | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
  });

  useEffect(() => {
    fetchVehicles();
  }, [filters.status, filters.search, currentPage]);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });

      if (filters.status === 'pending') {
        params.append('status', 'pending');
      } else if (filters.status === 'approved') {
        params.append('status', 'approved');
      }

      const response = await fetch(`/api/collaborator/vehicles?${params}`);
      const data = await response.json();

      if (response.ok) {
        setVehicles(data.vehicles || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch {
      // Silently ignore fetch errors
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: Record<string, string>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  const handleViewVehicle = (vehicle: CollaboratorVehicle) => {
    setSelectedVehicle(vehicle);
    setIsDetailsModalOpen(true);
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) {
      return;
    }

    try {
      const response = await fetch(`/api/collaborator/vehicles/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh the list
        fetchVehicles();
      } else {
        alert('Failed to delete vehicle');
      }
    } catch {
      alert('Error deleting vehicle');
    }
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    if (!filters.search) return true;
    const query = filters.search.toLowerCase();
    return (
      vehicle.make.toLowerCase().includes(query) ||
      vehicle.model.toLowerCase().includes(query) ||
      vehicle.title.toLowerCase().includes(query)
    );
  });

  const stats = {
    total: vehicles.length,
    pending: vehicles.filter(v => v.status !== 'available' && !v.rejection_reason).length,
    approved: vehicles.filter(v => v.status === 'available' && v.is_visible).length,
    rejected: vehicles.filter(v => v.rejection_reason).length,
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
          title={locale === 'zh' ? '我的车辆' : 'My Vehicles'}
          userName={userName}
          userEmail={userEmail}
          onLogout={signOut}
        />

        <main className="p-4 lg:p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <Car className="w-6 h-6 sm:w-7 sm:h-7 text-mandarin" />
                {locale === 'zh' ? '我的车辆' : 'My Vehicles'}
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                {locale === 'zh' ? '管理您的车辆列表' : 'Manage your vehicle listings'}
              </p>
            </div>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              Add Vehicle
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 bg-cod-gray border-nobel/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-mandarin/10 rounded-lg">
                  <Car className="w-5 h-5 text-mandarin" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{t('stats.total')}</p>
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
                  <p className="text-xs text-gray-400">{t('stats.published')}</p>
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
          </div>

          {/* CollaboratorVehicle Table */}
          <Card className="p-6 bg-cod-gray border-nobel/20">
            <CollaboratorVehicleTable
              vehicles={filteredVehicles}
              total={total}
              page={currentPage}
              totalPages={totalPages}
              isLoading={loading}
              onPageChange={setCurrentPage}
              filters={filters}
              onFilterChange={handleFilterChange}
              onView={handleViewVehicle}
              onDelete={handleDeleteVehicle}
            />
          </Card>
        </main>
      </div>

      {/* Add Vehicle Modal */}
      <AddVehicleModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          fetchVehicles();
        }}
      />

      {/* Vehicle Details Modal */}
      <VehicleDetailsModal
        vehicle={selectedVehicle}
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedVehicle(null);
        }}
      />
    </div>
  );
}
