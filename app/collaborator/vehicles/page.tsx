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
  const { t } = useCollaboratorLocale();

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
    } catch (error) {
      console.error('Error fetching vehicles:', error);
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
    } catch (error) {
      console.error('Error deleting vehicle:', error);
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
        <Loader2 className="h-8 w-8 text-alto-orange animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cod-gray">
      <CollaboratorSidebar
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
        onLogout={signOut}
      />

      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <CollaboratorTopBar
          userName={userName}
          userEmail={userEmail}
          onLogout={signOut}
        />

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
            <Card className="p-4 bg-white border-nobel/20">
              <div className="text-sm text-gray-600">{t('stats.total')}</div>
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
                {t('stats.published')}
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
          </div>

          {/* CollaboratorVehicle Table */}
          <Card className="p-6 bg-surface border-nobel/20">
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
