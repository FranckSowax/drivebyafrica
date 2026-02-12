'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Eye,
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
  Shield,
  UserCog,
  Check,
  Pencil,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

type UserRole = 'user' | 'admin' | 'super_admin' | 'collaborator';

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
  role: UserRole;
  created_at: string;
  updated_at: string;
  quotes_count: number;
  orders_count: number;
  favorites_count: number;
  total_spent_usd: number;
}

const roleLabels: Record<UserRole, string> = {
  user: 'Utilisateur',
  admin: 'Admin',
  super_admin: 'Super Admin',
  collaborator: 'Collaborateur',
};

const roleColors: Record<UserRole, string> = {
  user: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  admin: 'bg-royal-blue/10 text-royal-blue border-royal-blue/20',
  super_admin: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  collaborator: 'bg-mandarin/10 text-mandarin border-mandarin/20',
};

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
  // Afrique Centrale
  'Gabon': '🇬🇦',
  'Cameroun': '🇨🇲',
  'Congo': '🇨🇬',
  'RD Congo': '🇨🇩',
  'Centrafrique': '🇨🇫',
  'Tchad': '🇹🇩',
  'Guinée Équatoriale': '🇬🇶',
  // Afrique de l'Ouest
  "Côte d'Ivoire": '🇨🇮',
  'Sénégal': '🇸🇳',
  'Togo': '🇹🇬',
  'Bénin': '🇧🇯',
  'Nigeria': '🇳🇬',
  'Ghana': '🇬🇭',
  'Mali': '🇲🇱',
  'Burkina Faso': '🇧🇫',
  'Niger': '🇳🇪',
  'Guinée': '🇬🇳',
  'Guinée-Bissau': '🇬🇼',
  'Sierra Leone': '🇸🇱',
  'Liberia': '🇱🇷',
  'Cap-Vert': '🇨🇻',
  'Gambie': '🇬🇲',
  'Mauritanie': '🇲🇷',
  // Afrique de l'Est
  'Kenya': '🇰🇪',
  'Tanzanie': '🇹🇿',
  'Ouganda': '🇺🇬',
  'Rwanda': '🇷🇼',
  'Burundi': '🇧🇮',
  'Éthiopie': '🇪🇹',
  'Érythrée': '🇪🇷',
  'Djibouti': '🇩🇯',
  'Somalie': '🇸🇴',
  'Soudan': '🇸🇩',
  'Soudan du Sud': '🇸🇸',
  // Afrique du Nord
  'Maroc': '🇲🇦',
  'Algérie': '🇩🇿',
  'Tunisie': '🇹🇳',
  'Libye': '🇱🇾',
  'Égypte': '🇪🇬',
  // Afrique Australe
  'Afrique du Sud': '🇿🇦',
  'Namibie': '🇳🇦',
  'Botswana': '🇧🇼',
  'Zimbabwe': '🇿🇼',
  'Zambie': '🇿🇲',
  'Mozambique': '🇲🇿',
  'Malawi': '🇲🇼',
  'Angola': '🇦🇴',
  'Lesotho': '🇱🇸',
  'Eswatini': '🇸🇿',
  'Madagascar': '🇲🇬',
  'Maurice': '🇲🇺',
  'Comores': '🇰🇲',
  'Seychelles': '🇸🇨',
  // Pays sources (Asie/Moyen-Orient)
  'Chine': '🇨🇳',
  'Corée du Sud': '🇰🇷',
  'Dubaï (EAU)': '🇦🇪',
  // Autres
  'Non spécifié': '🌍',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [countryDistribution, setCountryDistribution] = useState<Record<string, number>>({});
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    assignedCountry: '' as '' | 'all' | 'china' | 'korea' | 'dubai',
  });

  // Edit user state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    whatsappNumber: '',
    country: '',
    city: '',
  });

  // Delete user state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Source country options for collaborators
  const sourceCountryOptions = [
    { value: 'all', label: '🌍 Tous les pays', description: 'Accès à toutes les commandes (Chine, Corée, Dubaï)' },
    { value: 'china', label: '🇨🇳 Chine', description: 'Véhicules CHE168, Dongchedi' },
    { value: 'korea', label: '🇰🇷 Corée du Sud', description: 'Véhicules Encar' },
    { value: 'dubai', label: '🇦🇪 Dubaï', description: 'Véhicules Dubicars' },
  ];

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });

      if (searchQuery) {
        params.set('search', searchQuery);
      }

      const response = await fetch(`/api/admin/users?${params}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur ${response.status}`);
      }

      const data = await response.json();

      if (data.users) {
        setUsers(data.users);
        setStats(data.stats);
        setCountryDistribution(data.countryDistribution || {});
        setPagination(data.pagination);
      } else {
        throw new Error('Format de réponse invalide');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('La requête a pris trop de temps. Veuillez réessayer.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Erreur lors du chargement des utilisateurs');
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const formatCurrency = (value: number) => {
    // Format with regular spaces as thousand separators
    const formatted = Math.round(value)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `$${formatted}`;
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

  // Update user role
  const updateUserRole = async (userId: string, newRole: UserRole) => {
    setIsUpdatingRole(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la mise à jour');
      }

      // Update local state
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, role: newRole } : u
      ));
      if (selectedUser?.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, role: newRole } : null);
      }
    } catch (error) {
      console.error('Error updating role:', error);
      alert(error instanceof Error ? error.message : 'Erreur lors de la mise à jour du rôle');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // Create collaborator
  const createCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création');
      }

      // Reset form and close modal
      setCreateForm({ email: '', password: '', fullName: '', phone: '', assignedCountry: '' });
      setShowCreateModal(false);

      // Refresh users list
      fetchUsers();

      alert(`Collaborateur créé avec succès!\nEmail: ${data.user.email}`);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error creating collaborator:', error);

      if (error instanceof Error && error.name === 'AbortError') {
        alert('La requête a expiré. Veuillez réessayer.');
      } else {
        alert(error instanceof Error ? error.message : 'Erreur lors de la création du collaborateur');
      }
    } finally {
      setIsCreating(false);
    }
  };

  // Open edit modal
  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEditForm({
      fullName: user.full_name,
      phone: user.phone || '',
      whatsappNumber: user.whatsapp_number || '',
      country: user.country || '',
      city: user.city || '',
    });
    setShowEditModal(true);
  };

  // Update user profile
  const updateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsEditing(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingUser.id,
          fullName: editForm.fullName,
          phone: editForm.phone,
          whatsappNumber: editForm.whatsappNumber,
          country: editForm.country,
          city: editForm.city,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la mise à jour');
      }

      // Update local state
      setUsers(prev => prev.map(u =>
        u.id === editingUser.id ? {
          ...u,
          full_name: editForm.fullName,
          phone: editForm.phone || null,
          whatsapp_number: editForm.whatsappNumber || null,
          country: editForm.country || 'Non spécifié',
          city: editForm.city || null,
        } : u
      ));

      // Close modal
      setShowEditModal(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      alert(error instanceof Error ? error.message : 'Erreur lors de la mise à jour');
    } finally {
      setIsEditing(false);
    }
  };

  // Open delete confirmation
  const openDeleteConfirm = (user: User) => {
    setDeletingUser(user);
    setShowDeleteConfirm(true);
  };

  // Delete user
  const deleteUser = async () => {
    if (!deletingUser) return;

    setIsDeleting(true);

    // Create AbortController for timeout (45s - Netlify has 26s limit for functions)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch(`/api/admin/users?userId=${deletingUser.id}`, {
        method: 'DELETE',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-JSON responses (like 504 Gateway Timeout which returns HTML)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        if (response.status === 504) {
          throw new Error('La suppression a pris trop de temps. L\'utilisateur a peut-être été supprimé. Actualisez la page pour vérifier.');
        }
        throw new Error(`Erreur serveur (${response.status})`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la suppression');
      }

      // Remove from local state
      setUsers(prev => prev.filter(u => u.id !== deletingUser.id));

      // Close confirmation and detail modal if open
      setShowDeleteConfirm(false);
      setDeletingUser(null);
      if (selectedUser?.id === deletingUser.id) {
        setSelectedUser(null);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error deleting user:', error);

      if (error instanceof Error && error.name === 'AbortError') {
        alert('La requête a expiré. L\'utilisateur a peut-être été supprimé. Actualisez la page pour vérifier.');
        // Refresh the list in case the deletion succeeded
        fetchUsers();
      } else {
        alert(error instanceof Error ? error.message : 'Erreur lors de la suppression');
      }

      // Close modals anyway
      setShowDeleteConfirm(false);
      setDeletingUser(null);
    } finally {
      setIsDeleting(false);
    }
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
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Utilisateurs</h1>
            <p className="text-[var(--text-muted)]">
              {stats?.total || 0} utilisateurs inscrits
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-mandarin hover:bg-mandarin/90"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Créer un collaborateur
          </Button>
          <Button onClick={fetchUsers} disabled={loading} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
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
        {error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <p className="text-red-400 font-medium mb-2">Erreur de chargement</p>
            <p className="text-[var(--text-muted)] text-sm mb-4">{error}</p>
            <Button onClick={fetchUsers} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Réessayer
            </Button>
          </div>
        ) : loading && users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-mandarin mb-4" />
            <p className="text-[var(--text-muted)] text-sm">Chargement des utilisateurs...</p>
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
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Rôle</th>
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
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${roleColors[user.role] || roleColors.user}`}>
                          {user.role === 'collaborator' && <UserCog className="w-3 h-3" />}
                          {(user.role === 'admin' || user.role === 'super_admin') && <Shield className="w-3 h-3" />}
                          {roleLabels[user.role] || 'Utilisateur'}
                        </span>
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(user)}
                            title="Modifier"
                            className="text-royal-blue hover:text-royal-blue/80"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          {user.role !== 'super_admin' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteConfirm(user)}
                              title="Supprimer"
                              className="text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
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
              {/* Role Management */}
              <div>
                <h4 className="text-sm font-medium text-[var(--text-muted)] mb-3">Rôle de l&apos;utilisateur</h4>
                <div className="bg-[var(--surface)] rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${roleColors[selectedUser.role]?.split(' ')[0] || 'bg-gray-500/10'}`}>
                        {selectedUser.role === 'collaborator' ? (
                          <UserCog className="w-5 h-5" />
                        ) : (
                          <Shield className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {roleLabels[selectedUser.role] || 'Utilisateur'}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {selectedUser.role === 'collaborator' && 'Accès au portail collaborateur'}
                          {selectedUser.role === 'admin' && 'Accès au panneau admin'}
                          {selectedUser.role === 'super_admin' && 'Tous les droits'}
                          {selectedUser.role === 'user' && 'Utilisateur standard'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
                    <p className="text-xs text-[var(--text-muted)] mb-2">Changer le rôle:</p>
                    <div className="flex flex-wrap gap-2">
                      {(['user', 'collaborator', 'admin', 'super_admin'] as UserRole[]).map((role) => (
                        <button
                          key={role}
                          onClick={() => updateUserRole(selectedUser.id, role)}
                          disabled={isUpdatingRole || selectedUser.role === role}
                          className={`
                            flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all
                            ${selectedUser.role === role
                              ? `${roleColors[role]} cursor-default`
                              : 'border-[var(--card-border)] text-[var(--text-muted)] hover:border-mandarin hover:text-mandarin'
                            }
                            ${isUpdatingRole ? 'opacity-50 cursor-wait' : ''}
                          `}
                        >
                          {selectedUser.role === role && <Check className="w-3 h-3" />}
                          {roleLabels[role]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

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

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-[var(--card-border)]">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    openEditModal(selectedUser);
                    setSelectedUser(null);
                  }}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Modifier
                </Button>
                {selectedUser.role !== 'super_admin' && (
                  <Button
                    variant="outline"
                    className="flex-1 text-red-500 border-red-500/30 hover:bg-red-500/10"
                    onClick={() => {
                      openDeleteConfirm(selectedUser);
                      setSelectedUser(null);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Collaborator Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-bg)] rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-[var(--card-border)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-mandarin/10 rounded-lg">
                    <UserPlus className="w-5 h-5 text-mandarin" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">
                      Créer un collaborateur
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      Nouveau compte avec accès au portail collaborateur
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <form onSubmit={createCollaborator} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                  Nom complet *
                </label>
                <input
                  type="text"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Ex: Zhang Wei"
                  required
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-mandarin focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="collaborateur@example.com"
                  required
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-mandarin focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                  Mot de passe temporaire *
                </label>
                <input
                  type="text"
                  value={createForm.password}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Minimum 8 caractères"
                  required
                  minLength={8}
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-mandarin focus:outline-none"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Le collaborateur devra changer ce mot de passe à sa première connexion
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                  Téléphone (optionnel)
                </label>
                <input
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+86 123 456 7890"
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-mandarin focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                  Pays source (accès véhicules) *
                </label>
                <div className="space-y-2">
                  {sourceCountryOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`
                        flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                        ${createForm.assignedCountry === option.value
                          ? 'border-mandarin bg-mandarin/10'
                          : 'border-[var(--card-border)] hover:border-mandarin/50'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="assignedCountry"
                        value={option.value}
                        checked={createForm.assignedCountry === option.value}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, assignedCountry: e.target.value as 'all' | 'china' | 'korea' | 'dubai' }))}
                        className="sr-only"
                        required
                      />
                      <div className={`
                        w-5 h-5 rounded-full border-2 flex items-center justify-center
                        ${createForm.assignedCountry === option.value
                          ? 'border-mandarin'
                          : 'border-[var(--card-border)]'
                        }
                      `}>
                        {createForm.assignedCountry === option.value && (
                          <div className="w-3 h-3 rounded-full bg-mandarin" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{option.label}</p>
                        <p className="text-xs text-[var(--text-muted)]">{option.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  Le collaborateur aura accès uniquement aux commandes de véhicules provenant de ce pays
                </p>
              </div>

              <div className="pt-4 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCreateModal(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 bg-mandarin hover:bg-mandarin/90"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Créer le compte
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-bg)] rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-[var(--card-border)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-royal-blue/10 rounded-lg">
                    <Pencil className="w-5 h-5 text-royal-blue" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">
                      Modifier l&apos;utilisateur
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      {editingUser.full_name}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowEditModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <form onSubmit={updateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                  Nom complet
                </label>
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Nom complet"
                  required
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-royal-blue focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+241 XX XX XX XX"
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-royal-blue focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                  WhatsApp
                </label>
                <input
                  type="tel"
                  value={editForm.whatsappNumber}
                  onChange={(e) => setEditForm(prev => ({ ...prev, whatsappNumber: e.target.value }))}
                  placeholder="+241 XX XX XX XX"
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-royal-blue focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                  Pays
                </label>
                <select
                  value={editForm.country}
                  onChange={(e) => setEditForm(prev => ({ ...prev, country: e.target.value }))}
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] focus:border-royal-blue focus:outline-none"
                >
                  <option value="">Sélectionner un pays</option>
                  {Object.keys(countryFlags).map(country => (
                    <option key={country} value={country}>
                      {countryFlags[country]} {country}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                  Ville
                </label>
                <input
                  type="text"
                  value={editForm.city}
                  onChange={(e) => setEditForm(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Ville"
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-royal-blue focus:outline-none"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowEditModal(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={isEditing}
                  className="flex-1 bg-royal-blue hover:bg-royal-blue/90"
                >
                  {isEditing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Mise à jour...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Enregistrer
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-bg)] rounded-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-500/10 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    Supprimer l&apos;utilisateur ?
                  </h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    Cette action est irréversible
                  </p>
                </div>
              </div>

              <div className="bg-[var(--surface)] rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-mandarin to-jewel rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-white">
                      {getInitials(deletingUser.full_name)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {deletingUser.full_name}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {roleLabels[deletingUser.role]} - {deletingUser.country}
                    </p>
                  </div>
                </div>
                {(deletingUser.quotes_count > 0 || deletingUser.orders_count > 0) && (
                  <div className="mt-3 pt-3 border-t border-[var(--card-border)]">
                    <p className="text-xs text-[var(--text-muted)]">
                      Cet utilisateur a {deletingUser.quotes_count} devis et {deletingUser.orders_count} commandes.
                      Ces données seront également supprimées.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletingUser(null);
                  }}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  disabled={isDeleting}
                  onClick={deleteUser}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Suppression...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
