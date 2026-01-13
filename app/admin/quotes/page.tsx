'use client';

import { useState } from 'react';
import { FileText, Search, Filter, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// Mock data for quotes
const mockQuotes = [
  {
    id: 'Q-2024-001',
    vehicle: 'Toyota Land Cruiser 2023',
    customer: 'Jean Mbarga',
    email: 'jean.mbarga@email.com',
    destination: 'Libreville, Gabon',
    flag: '🇬🇦',
    totalPrice: 45000,
    status: 'pending',
    createdAt: '2024-01-12',
  },
  {
    id: 'Q-2024-002',
    vehicle: 'Mercedes GLE 350 2022',
    customer: 'Marie Nguema',
    email: 'marie.nguema@email.com',
    destination: 'Douala, Cameroun',
    flag: '🇨🇲',
    totalPrice: 62000,
    status: 'accepted',
    createdAt: '2024-01-11',
  },
  {
    id: 'Q-2024-003',
    vehicle: 'BMW X5 2023',
    customer: 'Paul Essono',
    email: 'paul.essono@email.com',
    destination: 'Pointe-Noire, Congo',
    flag: '🇨🇬',
    totalPrice: 58000,
    status: 'rejected',
    createdAt: '2024-01-10',
  },
  {
    id: 'Q-2024-004',
    vehicle: 'Hyundai Santa Fe 2024',
    customer: 'Sophie Mba',
    email: 'sophie.mba@email.com',
    destination: 'Abidjan, Côte d\'Ivoire',
    flag: '🇨🇮',
    totalPrice: 38000,
    status: 'pending',
    createdAt: '2024-01-09',
  },
];

const statusConfig = {
  pending: { label: 'En attente', color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: Clock },
  accepted: { label: 'Accepté', color: 'text-jewel', bg: 'bg-jewel/10', icon: CheckCircle },
  rejected: { label: 'Refusé', color: 'text-red-500', bg: 'bg-red-500/10', icon: XCircle },
};

export default function AdminQuotesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredQuotes = mockQuotes.filter((quote) => {
    const matchesSearch =
      quote.vehicle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
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
          <div className="p-3 bg-jewel/10 rounded-xl">
            <FileText className="w-6 h-6 text-jewel" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Gestion des devis</h1>
            <p className="text-[var(--text-muted)]">{mockQuotes.length} devis au total</p>
          </div>
        </div>
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
          <option value="accepted">Acceptés</option>
          <option value="rejected">Refusés</option>
        </select>
      </div>

      {/* Quotes Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--card-border)]">
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">ID</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Véhicule</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Client</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Destination</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Prix total</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Statut</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.map((quote) => {
                const status = statusConfig[quote.status as keyof typeof statusConfig];
                return (
                  <tr
                    key={quote.id}
                    className="border-b border-[var(--card-border)]/50 hover:bg-[var(--surface)]/50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <span className="text-sm font-mono text-mandarin">{quote.id}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-[var(--text-primary)]">{quote.vehicle}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{quote.customer}</p>
                        <p className="text-xs text-[var(--text-muted)]">{quote.email}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{quote.flag}</span>
                        <span className="text-sm text-[var(--text-primary)]">{quote.destination}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {formatCurrency(quote.totalPrice)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                        <status.icon className="w-3.5 h-3.5" />
                        {status.label}
                      </span>
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
