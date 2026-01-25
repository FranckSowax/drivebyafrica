'use client';

import { useState, useEffect } from 'react';
import { useCollaboratorLocale } from '@/components/collaborator/CollaboratorLocaleProvider';
import { CollaboratorSidebar } from '@/components/collaborator/CollaboratorSidebar';
import { CollaboratorTopBar } from '@/components/collaborator/CollaboratorTopBar';
import { AddVehicleModal } from '@/components/collaborator/AddVehicleModal';
import { CollaboratorVehicleTable } from '@/components/collaborator/CollaboratorVehicleTable';
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

interface Vehicle {
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
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
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
            <Card className="p-4 bg-surface border-nobel/20">
              <div className="text-sm text-nobel">Total</div>
              <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
            </Card>
            <Card className="p-4 bg-surface border-nobel/20">
              <div className="text-sm text-yellow-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Pending
              </div>
              <div className="text-2xl font-bold text-white mt-1">{stats.pending}</div>
            </Card>
            <Card className="p-4 bg-surface border-nobel/20">
              <div className="text-sm text-green-400 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Published
              </div>
              <div className="text-2xl font-bold text-white mt-1">{stats.approved}</div>
            </Card>
            <Card className="p-4 bg-surface border-nobel/20">
              <div className="text-sm text-red-400 flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                Rejected
              </div>
              <div className="text-2xl font-bold text-white mt-1">{stats.rejected}</div>
            </Card>
          </div>

          {/* Vehicle Table */}
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
    </div>
  );
}
