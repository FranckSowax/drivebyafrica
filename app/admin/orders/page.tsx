'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Search,
  Eye,
  CheckCircle,
  Clock,
  Ship,
  Truck,
  DollarSign,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  X,
  MessageCircle,
  MapPin,
  Calendar,
  ShoppingCart,
  Anchor,
  FileCheck,
  Home,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Order {
  id: string;
  order_number: string;
  quote_number: string;
  user_id: string;
  vehicle_id: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_price_usd: number;
  vehicle_source: string;
  destination_id: string;
  destination_name: string;
  destination_country: string;
  shipping_type: string;
  shipping_cost_xaf: number;
  insurance_cost_xaf: number;
  inspection_fee_xaf: number;
  total_cost_xaf: number;
  customer_name: string;
  customer_phone: string;
  customer_whatsapp: string;
  customer_country: string;
  order_status: string;
  tracking_steps: TrackingStep[];
  shipping_eta: string | null;
  deposit_amount_usd: number;
  created_at: string;
  updated_at: string;
}

interface TrackingStep {
  status: string;
  timestamp: string;
  note?: string;
}

interface Stats {
  total: number;
  deposit_paid: number;
  vehicle_purchased: number;
  in_transit: number;
  shipping: number;
  delivered: number;
  totalDeposits: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const statusConfig = {
  deposit_paid: {
    label: 'Acompte payé',
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    icon: DollarSign,
    step: 1,
  },
  vehicle_purchased: {
    label: 'Véhicule acheté',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: ShoppingCart,
    step: 2,
  },
  in_transit: {
    label: 'En transit',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    icon: Truck,
    step: 3,
  },
  at_port: {
    label: 'Au port',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    icon: Anchor,
    step: 4,
  },
  shipping: {
    label: 'En mer',
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    icon: Ship,
    step: 5,
  },
  customs: {
    label: 'En douane',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    icon: FileCheck,
    step: 6,
  },
  ready_pickup: {
    label: 'Prêt pour retrait',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: MapPin,
    step: 7,
  },
  delivered: {
    label: 'Livré',
    color: 'text-jewel',
    bg: 'bg-jewel/10',
    border: 'border-jewel/30',
    icon: Home,
    step: 8,
  },
};

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
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusNote, setStatusNote] = useState('');
  const [newEta, setNewEta] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });

      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      if (searchQuery) {
        params.set('search', searchQuery);
      }

      const response = await fetch(`/api/admin/orders?${params}`);
      const data = await response.json();

      if (data.orders) {
        setOrders(data.orders);
        setStats(data.stats);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, searchQuery]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Format with regular spaces as thousand separators
  const formatWithSpaces = (num: number): string => {
    return Math.round(num)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const formatCurrency = (value: number, currency: 'USD' | 'XAF' = 'XAF') => {
    if (currency === 'USD') {
      return `$${formatWithSpaces(value)}`;
    }
    return `${formatWithSpaces(value)} FCFA`;
  };

  const openWhatsApp = (phone: string, customerName: string, orderNumber: string) => {
    let formattedPhone = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+241' + formattedPhone.replace(/^0+/, '');
    }
    formattedPhone = formattedPhone.replace('+', '');

    const message = encodeURIComponent(
      `Bonjour ${customerName},\n\nConcernant votre commande ${orderNumber} chez Driveby Africa.\n\n`
    );

    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
  };

  const updateOrderStatus = async () => {
    if (!selectedOrder || !newStatus) return;

    setUpdatingStatus(true);
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: selectedOrder.id,
          orderStatus: newStatus,
          note: statusNote || undefined,
          eta: newEta || undefined,
        }),
      });

      if (response.ok) {
        await fetchOrders();
        setSelectedOrder(null);
        setNewStatus('');
        setStatusNote('');
        setNewEta('');
      } else {
        const data = await response.json();
        alert(`Erreur: ${data.error}`);
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Erreur lors de la mise à jour');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusProgress = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    return config ? (config.step / 8) * 100 : 0;
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-jewel/10 rounded-xl">
            <Package className="w-6 h-6 text-jewel" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Suivi des commandes</h1>
            <p className="text-[var(--text-muted)]">
              {stats?.total || 0} commandes avec acompte payé
            </p>
          </div>
        </div>
        <Button onClick={fetchOrders} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Acompte payé</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{stats?.deposit_paid || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Achetés</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{stats?.vehicle_purchased || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Truck className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">En transit</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{stats?.in_transit || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Ship className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">En mer</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{stats?.shipping || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-jewel/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-jewel" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Livrés</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{stats?.delivered || 0}</p>
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
              <p className="text-xl font-bold text-mandarin">{formatCurrency(stats?.totalDeposits || 0, 'USD')}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Rechercher par numéro, marque ou modèle..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-mandarin focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] focus:border-mandarin focus:outline-none"
        >
          <option value="all">Tous les statuts</option>
          <option value="deposit_paid">Acompte payé</option>
          <option value="vehicle_purchased">Véhicule acheté</option>
          <option value="in_transit">En transit</option>
          <option value="at_port">Au port</option>
          <option value="shipping">En mer</option>
          <option value="customs">En douane</option>
          <option value="ready_pickup">Prêt pour retrait</option>
          <option value="delivered">Livré</option>
        </select>
      </div>

      {/* Orders Table */}
      <Card>
        {loading && orders.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-mandarin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-[var(--text-muted)] mb-4" />
            <p className="text-[var(--text-muted)]">Aucune commande trouvée</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Les commandes apparaissent ici une fois l&apos;acompte payé
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Commande</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Véhicule</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Client</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Destination</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Progression</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">ETA</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const status = statusConfig[order.order_status as keyof typeof statusConfig] || statusConfig.deposit_paid;
                  const flag = countryFlags[order.destination_country] || '🌍';
                  const progress = getStatusProgress(order.order_status);

                  return (
                    <tr
                      key={order.id}
                      className="border-b border-[var(--card-border)]/50 hover:bg-[var(--surface)]/50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div>
                          <span className="text-sm font-mono text-mandarin">{order.order_number}</span>
                          <p className="text-xs text-[var(--text-muted)]">
                            {formatDistanceToNow(new Date(order.updated_at), { addSuffix: true, locale: fr })}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            {order.vehicle_make} {order.vehicle_model}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {order.vehicle_year} - {formatCurrency(order.vehicle_price_usd, 'USD')}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">{order.customer_name}</p>
                            {order.customer_whatsapp && (
                              <button
                                onClick={() => openWhatsApp(order.customer_whatsapp, order.customer_name, order.order_number)}
                                className="flex items-center gap-1 text-xs text-green-500 hover:text-green-600 transition-colors"
                              >
                                <MessageCircle className="w-3 h-3" />
                                WhatsApp
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{flag}</span>
                          <div>
                            <p className="text-sm text-[var(--text-primary)]">{order.destination_name}</p>
                            <p className="text-xs text-[var(--text-muted)]">{order.destination_country}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="w-32 mx-auto">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                          </div>
                          <div className="w-full h-2 bg-[var(--surface)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-mandarin to-jewel rounded-full transition-all duration-500"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        {order.shipping_eta ? (
                          <div className="flex items-center justify-center gap-1 text-sm text-[var(--text-muted)]">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(new Date(order.shipping_eta), 'dd/MM/yy')}
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)]">À définir</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setNewStatus(order.order_status);
                            }}
                            title="Voir / Modifier"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {order.customer_whatsapp && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openWhatsApp(order.customer_whatsapp, order.customer_name, order.order_number)}
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

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-bg)] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[var(--card-border)]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    Commande {selectedOrder.order_number}
                  </h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    {selectedOrder.vehicle_make} {selectedOrder.vehicle_model} {selectedOrder.vehicle_year}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Progress Timeline */}
              <div>
                <h4 className="text-sm font-medium text-[var(--text-muted)] mb-4">Progression de la commande</h4>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[var(--card-border)]" />
                  <div className="space-y-4">
                    {Object.entries(statusConfig).map(([key, config]) => {
                      const isCompleted = config.step <= (statusConfig[selectedOrder.order_status as keyof typeof statusConfig]?.step || 1);
                      const isCurrent = key === selectedOrder.order_status;
                      const trackingStep = selectedOrder.tracking_steps?.find(s => s.status === key);

                      return (
                        <div key={key} className="relative flex items-start gap-4 pl-8">
                          <div
                            className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center ${
                              isCompleted
                                ? isCurrent
                                  ? 'bg-mandarin ring-4 ring-mandarin/20'
                                  : 'bg-jewel'
                                : 'bg-[var(--surface)] border-2 border-[var(--card-border)]'
                            }`}
                          >
                            {isCompleted && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                          <div className={`flex-1 ${isCompleted ? '' : 'opacity-50'}`}>
                            <div className="flex items-center gap-2">
                              <config.icon className={`w-4 h-4 ${isCompleted ? config.color : 'text-[var(--text-muted)]'}`} />
                              <span className={`text-sm font-medium ${isCompleted ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                                {config.label}
                              </span>
                              {isCurrent && (
                                <span className="text-xs px-2 py-0.5 bg-mandarin/10 text-mandarin rounded-full">
                                  Actuel
                                </span>
                              )}
                            </div>
                            {trackingStep && (
                              <div className="mt-1">
                                <p className="text-xs text-[var(--text-muted)]">
                                  {format(new Date(trackingStep.timestamp), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}
                                </p>
                                {trackingStep.note && (
                                  <p className="text-xs text-[var(--text-primary)] mt-0.5">{trackingStep.note}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Update Status Form */}
              <div className="bg-[var(--surface)] rounded-xl p-4">
                <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">Mettre à jour le statut</h4>
                <div className="space-y-3">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg text-[var(--text-primary)] focus:border-mandarin focus:outline-none"
                  >
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Note (optionnel)"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-mandarin focus:outline-none"
                  />
                  <div className="flex gap-3">
                    <input
                      type="date"
                      placeholder="ETA"
                      value={newEta}
                      onChange={(e) => setNewEta(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg text-[var(--text-primary)] focus:border-mandarin focus:outline-none"
                    />
                    <Button
                      onClick={updateOrderStatus}
                      disabled={updatingStatus || newStatus === selectedOrder.order_status}
                      className="bg-mandarin hover:bg-mandarin/90"
                    >
                      {updatingStatus ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <ChevronRightIcon className="w-4 h-4 mr-1" />
                          Mettre à jour
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[var(--surface)] rounded-xl p-4">
                  <h4 className="text-sm font-medium text-[var(--text-muted)] mb-2">Client</h4>
                  <p className="font-medium text-[var(--text-primary)]">{selectedOrder.customer_name}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-lg">{countryFlags[selectedOrder.destination_country] || '🌍'}</span>
                    <span className="text-sm text-[var(--text-muted)]">{selectedOrder.destination_country}</span>
                  </div>
                  {selectedOrder.customer_whatsapp && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full text-green-500 border-green-500 hover:bg-green-500/10"
                      onClick={() => openWhatsApp(selectedOrder.customer_whatsapp, selectedOrder.customer_name, selectedOrder.order_number)}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Contacter
                    </Button>
                  )}
                </div>
                <div className="bg-[var(--surface)] rounded-xl p-4">
                  <h4 className="text-sm font-medium text-[var(--text-muted)] mb-2">Destination</h4>
                  <p className="font-medium text-[var(--text-primary)]">{selectedOrder.destination_name}</p>
                  <p className="text-sm text-[var(--text-muted)]">{selectedOrder.shipping_type}</p>
                  {selectedOrder.shipping_eta && (
                    <div className="flex items-center gap-2 mt-2 text-sm">
                      <Calendar className="w-4 h-4 text-mandarin" />
                      <span className="text-[var(--text-primary)]">
                        ETA: {format(new Date(selectedOrder.shipping_eta), 'dd MMMM yyyy', { locale: fr })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-[var(--surface)] rounded-xl p-4">
                <h4 className="text-sm font-medium text-[var(--text-muted)] mb-3">Résumé financier</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Prix véhicule</span>
                    <span className="text-[var(--text-primary)]">{formatCurrency(selectedOrder.vehicle_price_usd, 'USD')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Transport</span>
                    <span className="text-[var(--text-primary)]">{formatCurrency(selectedOrder.shipping_cost_xaf)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Assurance</span>
                    <span className="text-[var(--text-primary)]">{formatCurrency(selectedOrder.insurance_cost_xaf)}</span>
                  </div>
                  <div className="border-t border-[var(--card-border)] pt-2 mt-2 flex justify-between font-semibold">
                    <span className="text-[var(--text-primary)]">Total</span>
                    <span className="text-mandarin">{formatCurrency(selectedOrder.total_cost_xaf)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2">
                    <span className="text-green-500 font-medium">Acompte payé</span>
                    <span className="text-green-500 font-medium">{formatCurrency(selectedOrder.deposit_amount_usd, 'USD')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
