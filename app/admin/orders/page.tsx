'use client';

import { useState } from 'react';
import { Package, Search, Eye, Truck, CheckCircle, Clock, Ship } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// Mock data for orders
const mockOrders = [
  {
    id: 'ORD-2024-001',
    vehicle: 'Toyota Land Cruiser 2023',
    customer: 'Jean Mbarga',
    destination: 'Libreville, Gabon',
    flag: '🇬🇦',
    totalPrice: 47500,
    status: 'shipped',
    eta: '2024-02-15',
    createdAt: '2024-01-05',
  },
  {
    id: 'ORD-2024-002',
    vehicle: 'Mercedes GLE 350 2022',
    customer: 'Marie Nguema',
    destination: 'Douala, Cameroun',
    flag: '🇨🇲',
    totalPrice: 64000,
    status: 'processing',
    eta: '2024-02-20',
    createdAt: '2024-01-08',
  },
  {
    id: 'ORD-2024-003',
    vehicle: 'Hyundai Palisade 2023',
    customer: 'Paul Essono',
    destination: 'Pointe-Noire, Congo',
    flag: '🇨🇬',
    totalPrice: 42000,
    status: 'delivered',
    eta: '2024-01-10',
    createdAt: '2023-12-20',
  },
  {
    id: 'ORD-2024-004',
    vehicle: 'Kia Sorento 2024',
    customer: 'Sophie Mba',
    destination: 'Abidjan, Côte d\'Ivoire',
    flag: '🇨🇮',
    totalPrice: 39000,
    status: 'pending',
    eta: 'À confirmer',
    createdAt: '2024-01-12',
  },
];

const statusConfig = {
  pending: { label: 'En attente', color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: Clock },
  processing: { label: 'En traitement', color: 'text-royal-blue', bg: 'bg-royal-blue/10', icon: Package },
  shipped: { label: 'En transit', color: 'text-purple-500', bg: 'bg-purple-500/10', icon: Ship },
  delivered: { label: 'Livré', color: 'text-jewel', bg: 'bg-jewel/10', icon: CheckCircle },
};

export default function AdminOrdersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredOrders = mockOrders.filter((order) => {
    const matchesSearch =
      order.vehicle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/10 rounded-xl">
            <Package className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Gestion des commandes</h1>
            <p className="text-[var(--text-muted)]">{mockOrders.length} commandes au total</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {Object.entries(statusConfig).map(([key, config]) => {
          const count = mockOrders.filter((o) => o.status === key).length;
          return (
            <Card key={key} className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.bg}`}>
                  <config.icon className={`w-5 h-5 ${config.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{count}</p>
                  <p className="text-xs text-[var(--text-muted)]">{config.label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Rechercher par véhicule, client ou ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-mandarin focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] focus:border-mandarin focus:outline-none"
        >
          <option value="all">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="processing">En traitement</option>
          <option value="shipped">En transit</option>
          <option value="delivered">Livrées</option>
        </select>
      </div>

      {/* Orders Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--card-border)]">
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Commande</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Véhicule</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Client</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Destination</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Total</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Statut</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">ETA</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const status = statusConfig[order.status as keyof typeof statusConfig];
                return (
                  <tr
                    key={order.id}
                    className="border-b border-[var(--card-border)]/50 hover:bg-[var(--surface)]/50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <span className="text-sm font-mono text-mandarin">{order.id}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-[var(--text-primary)]">{order.vehicle}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm font-medium text-[var(--text-primary)]">{order.customer}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{order.flag}</span>
                        <span className="text-sm text-[var(--text-primary)]">{order.destination}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {formatCurrency(order.totalPrice)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                        <status.icon className="w-3.5 h-3.5" />
                        {status.label}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-sm text-[var(--text-muted)]">{order.eta}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
