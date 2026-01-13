'use client';

import { useState } from 'react';
import { Users, Search, Eye, Mail, Phone, MapPin, Calendar, Shield, User } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// Mock data for users
const mockUsers = [
  {
    id: '1',
    name: 'Jean Mbarga',
    email: 'jean.mbarga@email.com',
    phone: '+241 77 12 34 56',
    location: 'Libreville, Gabon',
    flag: '🇬🇦',
    role: 'user',
    ordersCount: 3,
    totalSpent: 142500,
    createdAt: '2023-06-15',
    lastLogin: '2024-01-12',
  },
  {
    id: '2',
    name: 'Marie Nguema',
    email: 'marie.nguema@email.com',
    phone: '+237 6 98 76 54 32',
    location: 'Douala, Cameroun',
    flag: '🇨🇲',
    role: 'user',
    ordersCount: 5,
    totalSpent: 287000,
    createdAt: '2023-04-22',
    lastLogin: '2024-01-11',
  },
  {
    id: '3',
    name: 'Paul Essono',
    email: 'paul.essono@email.com',
    phone: '+242 06 123 45 67',
    location: 'Pointe-Noire, Congo',
    flag: '🇨🇬',
    role: 'vip',
    ordersCount: 12,
    totalSpent: 584000,
    createdAt: '2022-11-08',
    lastLogin: '2024-01-10',
  },
  {
    id: '4',
    name: 'Sophie Mba',
    email: 'sophie.mba@email.com',
    phone: '+225 07 89 01 23 45',
    location: 'Abidjan, Côte d\'Ivoire',
    flag: '🇨🇮',
    role: 'user',
    ordersCount: 1,
    totalSpent: 39000,
    createdAt: '2024-01-02',
    lastLogin: '2024-01-12',
  },
  {
    id: '5',
    name: 'Admin Driveby',
    email: 'admin@drivebyafrica.com',
    phone: '+241 77 00 00 00',
    location: 'Libreville, Gabon',
    flag: '🇬🇦',
    role: 'admin',
    ordersCount: 0,
    totalSpent: 0,
    createdAt: '2022-01-01',
    lastLogin: '2024-01-12',
  },
];

const roleConfig = {
  user: { label: 'Utilisateur', color: 'text-[var(--text-muted)]', bg: 'bg-[var(--surface)]', icon: User },
  vip: { label: 'VIP', color: 'text-mandarin', bg: 'bg-mandarin/10', icon: Shield },
  admin: { label: 'Admin', color: 'text-royal-blue', bg: 'bg-royal-blue/10', icon: Shield },
};

export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const filteredUsers = mockUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-royal-blue/10 rounded-xl">
            <Users className="w-6 h-6 text-royal-blue" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Gestion des utilisateurs</h1>
            <p className="text-[var(--text-muted)]">{mockUsers.length} utilisateurs inscrits</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-2xl font-bold text-[var(--text-primary)]">{mockUsers.length}</p>
          <p className="text-xs text-[var(--text-muted)]">Total utilisateurs</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {mockUsers.filter((u) => u.role === 'vip').length}
          </p>
          <p className="text-xs text-[var(--text-muted)]">Clients VIP</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {mockUsers.filter((u) => new Date(u.createdAt) > new Date('2024-01-01')).length}
          </p>
          <p className="text-xs text-[var(--text-muted)]">Nouveaux ce mois</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {mockUsers.reduce((acc, u) => acc + u.ordersCount, 0)}
          </p>
          <p className="text-xs text-[var(--text-muted)]">Commandes totales</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Rechercher par nom, email ou localisation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-mandarin focus:outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] focus:border-mandarin focus:outline-none"
        >
          <option value="all">Tous les rôles</option>
          <option value="user">Utilisateurs</option>
          <option value="vip">VIP</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((user) => {
          const role = roleConfig[user.role as keyof typeof roleConfig];
          return (
            <Card key={user.id} className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[var(--surface)] rounded-full flex items-center justify-center">
                    <span className="text-xl font-bold text-[var(--text-primary)]">
                      {user.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">{user.name}</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${role.bg} ${role.color}`}>
                      {role.label}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Eye className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-[var(--text-muted)]">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--text-muted)]">
                  <Phone className="w-4 h-4" />
                  <span>{user.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--text-muted)]">
                  <MapPin className="w-4 h-4" />
                  <span className="flex items-center gap-1">
                    <span>{user.flag}</span>
                    {user.location}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[var(--card-border)] grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Commandes</p>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">{user.ordersCount}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Total dépensé</p>
                  <p className="text-lg font-semibold text-mandarin">{formatCurrency(user.totalSpent)}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-1 text-xs text-[var(--text-muted)]">
                <Calendar className="w-3 h-3" />
                Inscrit le {formatDate(user.createdAt)}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
