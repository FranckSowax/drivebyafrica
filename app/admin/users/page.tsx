'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Eye,
  Mail,
  Phone,
  MapPin,
  Calendar,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  X,
  FileText,
  ShoppingCart,
  Heart,
  DollarSign,
  Globe,
  MessageCircle,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface User {
  id: string;
  full_name: string;
  phone: string | null;
  whatsapp_number: string | null;
  country: string;
  city: string | null;
  preferred_currency: string;
  avatar_url: string | null;
  verification_status: string;
  created_at: string;
  updated_at: string;
  quotes_count: number;
  orders_count: number;
  favorites_count: number;
  total_spent_usd: number;
}

interface Stats {
  total: number;
  newThisMonth: number;
  newThisYear: number;
  withOrders: number;
  totalQuotes: number;
  totalOrders: number;
  totalDeposits: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const countryFlags: Record<string, string> = {
  'Gabon': '🇬🇦',
  'Cameroun': '🇨🇲',
  'Congo': '🇨🇬',
  "Côte d'Ivoire": '🇨🇮',
  'Sénégal': '🇸🇳',
  'Togo': '🇹🇬',
  'Bénin': '🇧🇯',
  'Nigeria': '🇳🇬',
  'Ghana': '🇬🇭',
  'Kenya': '🇰🇪',
  'Tanzanie': '🇹🇿',
  'Afrique du Sud': '🇿🇦',
  'Maroc': '🇲🇦',
  'Non spécifié': '🌍',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [countryDistribution, setCountryDistribution] = useState<Record<string, number>>({});
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });

      if (searchQuery) {
        params.set('search', searchQuery);
      }

      const response = await fetch(`/api/admin/users?${params}`);
      const data = await response.json();

      if (data.users) {
        setUsers(data.users);
        setStats(data.stats);
        setCountryDistribution(data.countryDistribution || {});
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const openWhatsApp = (phone: string, userName: string) => {
    let formattedPhone = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+241' + formattedPhone.replace(/^0+/, '');
    }
    formattedPhone = formattedPhone.replace('+', '');

    const message = encodeURIComponent(
      `Bonjour ${userName},\n\nNous vous contactons de Driveby Africa.\n\n`
    );

    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Top countries for display
  const topCountries = Object.entries(countryDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-royal-blue/10 rounded-xl">
            <Users className="w-6 h-6 text-royal-blue" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Utilisateurs</h1>
            <p className="text-[var(--text-muted)]">
              {stats?.total || 0} utilisateurs inscrits
            </p>
          </div>
        </div>
        <Button onClick={fetchUsers} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-royal-blue/10 rounded-lg">
              <Users className="w-5 h-5 text-royal-blue" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Total</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{stats?.total || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <UserPlus className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Ce mois</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{stats?.newThisMonth || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Cette année</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{stats?.newThisYear || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-jewel/10 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-jewel" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Avec commandes</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{stats?.withOrders || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-mandarin/10 rounded-lg">
              <FileText className="w-5 h-5 text-mandarin" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Total devis</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{stats?.totalQuotes || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-mandarin/10 to-jewel/10 border-mandarin/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-mandarin/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-mandarin" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Total acomptes</p>
              <p className="text-xl font-bold text-mandarin">{formatCurrency(stats?.totalDeposits || 0)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Country Distribution */}
      {topCountries.length > 0 && (
        <Card className="p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-sm font-medium text-[var(--text-primary)]">Répartition par pays</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {topCountries.map(([country, count]) => (
              <div
                key={country}
                className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface)] rounded-full"
              >
                <span className="text-lg">{countryFlags[country] || '🌍'}</span>
                <span className="text-sm text-[var(--text-primary)]">{country}</span>
                <span className="text-xs text-[var(--text-muted)] bg-[var(--card-bg)] px-2 py-0.5 rounded-full">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Rechercher par nom, téléphone ou pays..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-mandarin focus:outline-none"
          />
        </div>
      </div>

      {/* Users Table */}
      <Card>
        {loading && users.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-mandarin" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-[var(--text-muted)] mb-4" />
            <p className="text-[var(--text-muted)]">Aucun utilisateur trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Utilisateur</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Contact</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Pays</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Devis</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Commandes</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Favoris</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Acomptes</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const flag = countryFlags[user.country] || '🌍';

                  return (
                    <tr
                      key={user.id}
                      className="border-b border-[var(--card-border)]/50 hover:bg-[var(--surface)]/50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-mandarin to-jewel rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-white">
                              {getInitials(user.full_name)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">{user.full_name}</p>
                            <p className="text-xs text-[var(--text-muted)]">
                              {formatDistanceToNow(new Date(user.created_at), { addSuffix: true, locale: fr })}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          {user.phone && (
                            <div className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
                              <Phone className="w-3.5 h-3.5" />
                              {user.phone}
                            </div>
                          )}
                          {user.whatsapp_number && user.whatsapp_number !== user.phone && (
                            <button
                              onClick={() => openWhatsApp(user.whatsapp_number!, user.full_name)}
                              className="flex items-center gap-1.5 text-xs text-green-500 hover:text-green-600"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              WhatsApp
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{flag}</span>
                          <div>
                            <p className="text-sm text-[var(--text-primary)]">{user.country}</p>
                            {user.city && (
                              <p className="text-xs text-[var(--text-muted)]">{user.city}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`text-sm font-medium ${user.quotes_count > 0 ? 'text-mandarin' : 'text-[var(--text-muted)]'}`}>
                          {user.quotes_count}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`text-sm font-medium ${user.orders_count > 0 ? 'text-jewel' : 'text-[var(--text-muted)]'}`}>
                          {user.orders_count}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`text-sm ${user.favorites_count > 0 ? 'text-red-500' : 'text-[var(--text-muted)]'}`}>
                          {user.favorites_count}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className={`text-sm font-semibold ${user.total_spent_usd > 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                          {user.total_spent_usd > 0 ? formatCurrency(user.total_spent_usd) : '-'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                            title="Voir détails"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {(user.whatsapp_number || user.phone) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openWhatsApp(user.whatsapp_number || user.phone!, user.full_name)}
                              className="text-green-500 hover:text-green-600"
                              title="Contacter sur WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-[var(--card-border)]">
            <p className="text-sm text-[var(--text-muted)]">
              Page {pagination.page} sur {pagination.totalPages} ({pagination.total} résultats)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === pagination.totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-bg)] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[var(--card-border)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-mandarin to-jewel rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-white">
                      {getInitials(selectedUser.full_name)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">
                      {selectedUser.full_name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                      <span>{countryFlags[selectedUser.country] || '🌍'}</span>
                      <span>{selectedUser.country}</span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Contact Info */}
              <div>
                <h4 className="text-sm font-medium text-[var(--text-muted)] mb-3">Contact</h4>
                <div className="bg-[var(--surface)] rounded-xl p-4 space-y-3">
                  {selectedUser.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-[var(--text-muted)]" />
                      <span className="text-sm text-[var(--text-primary)]">{selectedUser.phone}</span>
                    </div>
                  )}
                  {selectedUser.whatsapp_number && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <MessageCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-[var(--text-primary)]">{selectedUser.whatsapp_number}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-500 border-green-500 hover:bg-green-500/10"
                        onClick={() => openWhatsApp(selectedUser.whatsapp_number!, selectedUser.full_name)}
                      >
                        Contacter
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-[var(--text-muted)]" />
                    <span className="text-sm text-[var(--text-primary)]">
                      {selectedUser.city ? `${selectedUser.city}, ` : ''}{selectedUser.country}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div>
                <h4 className="text-sm font-medium text-[var(--text-muted)] mb-3">Statistiques</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[var(--surface)] rounded-xl p-4 text-center">
                    <FileText className="w-5 h-5 text-mandarin mx-auto mb-2" />
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{selectedUser.quotes_count}</p>
                    <p className="text-xs text-[var(--text-muted)]">Devis</p>
                  </div>
                  <div className="bg-[var(--surface)] rounded-xl p-4 text-center">
                    <ShoppingCart className="w-5 h-5 text-jewel mx-auto mb-2" />
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{selectedUser.orders_count}</p>
                    <p className="text-xs text-[var(--text-muted)]">Commandes</p>
                  </div>
                  <div className="bg-[var(--surface)] rounded-xl p-4 text-center">
                    <Heart className="w-5 h-5 text-red-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{selectedUser.favorites_count}</p>
                    <p className="text-xs text-[var(--text-muted)]">Favoris</p>
                  </div>
                  <div className="bg-gradient-to-br from-mandarin/10 to-jewel/10 rounded-xl p-4 text-center border border-mandarin/20">
                    <DollarSign className="w-5 h-5 text-mandarin mx-auto mb-2" />
                    <p className="text-2xl font-bold text-mandarin">{formatCurrency(selectedUser.total_spent_usd)}</p>
                    <p className="text-xs text-[var(--text-muted)]">Acomptes payés</p>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="flex items-center justify-between text-sm text-[var(--text-muted)] pt-4 border-t border-[var(--card-border)]">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Inscrit le {format(new Date(selectedUser.created_at), 'dd MMMM yyyy', { locale: fr })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
