'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { cn } from '@/lib/utils';
import { getProxiedImageUrl } from '@/lib/utils/imageProxy';
import { useCollaboratorLocale } from '@/components/collaborator/CollaboratorLocaleProvider';
import { CollaboratorSidebar } from '@/components/collaborator/CollaboratorSidebar';
import { CollaboratorTopBar } from '@/components/collaborator/CollaboratorTopBar';
import { useCollaboratorNotifications } from '@/lib/hooks/useCollaboratorNotifications';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { format, formatDistanceToNow } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';
import {
  Search,
  Loader2,
  Package,
  X,
  MessageCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Eye,
  CheckCircle,
  Ship,
  Truck,
  DollarSign,
  MapPin,
  ShoppingCart,
  Anchor,
  FileCheck,
  Home,
  Lock,
  ClipboardCheck,
  CreditCard,
  FileText,
  Building,
  Upload,
  ExternalLink,
  Image as ImageIcon,
} from 'lucide-react';
import { StatusDocumentsSection, MissingDocsBadge } from '@/components/shared/StatusDocumentsSection';
import { CollaboratorBadgeCompact } from '@/components/shared/CollaboratorBadge';
import { OrderActivityHistory } from '@/components/shared/OrderActivityHistory';
import { subscribeToOrders } from '@/lib/realtime/orders-sync';
import type { UploadedStatusDocument } from '@/lib/order-documents-config';

// Order interface matching API response (flat structure)
interface Order {
  id: string;
  order_number: string;
  quote_number?: string | null;
  quote_id?: string | null;
  user_id: string;
  vehicle_id: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_price_usd: number;
  vehicle_source: string;
  vehicle_source_url?: string | null;
  vehicle_image_url?: string | null;
  destination_country: string;
  destination_name: string;
  shipping_cost_xaf?: number | null;
  insurance_cost_xaf?: number | null;
  total_cost_xaf?: number | null;
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
  source: string;
  uploaded_documents?: UploadedDocument[];
  // Modifier tracking for collaborator badges
  last_modified_by?: string | null;
  last_modified_by_name?: string | null;
  last_modified_by_color?: string | null;
  last_modified_at?: string | null;
}

interface TrackingStep {
  status: string;
  timestamp: string;
  note?: string;
  updated_by?: string;
}

interface UploadedDocument {
  id?: string;
  name: string;
  url: string;
  type: string;
  status?: string;
  uploaded_at?: string;
  visible_to_client?: boolean;
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

const statusConfig: Record<string, { label: string; labelZh: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }>; step: number }> = {
  deposit_paid: {
    label: 'Deposit Paid',
    labelZh: '已支付定金',
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    icon: DollarSign,
    step: 1,
  },
  vehicle_locked: {
    label: 'Vehicle Locked',
    labelZh: '车辆已锁定',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    icon: Lock,
    step: 2,
  },
  inspection_sent: {
    label: 'Inspection Sent',
    labelZh: '检验报告已发送',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
    icon: ClipboardCheck,
    step: 3,
  },
  full_payment_received: {
    label: 'Full Payment Received',
    labelZh: '全款已收到',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    icon: CreditCard,
    step: 4,
  },
  vehicle_purchased: {
    label: 'Vehicle Purchased',
    labelZh: '车辆已购买',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    icon: ShoppingCart,
    step: 5,
  },
  export_customs: {
    label: 'Export Customs',
    labelZh: '出口报关',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    icon: Building,
    step: 6,
  },
  in_transit: {
    label: 'In Transit',
    labelZh: '运输中',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    icon: Truck,
    step: 7,
  },
  at_port: {
    label: 'At Port',
    labelZh: '已到港',
    color: 'text-sky-500',
    bg: 'bg-sky-500/10',
    icon: Anchor,
    step: 8,
  },
  shipping: {
    label: 'Shipping',
    labelZh: '海运中',
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
    icon: Ship,
    step: 9,
  },
  documents_ready: {
    label: 'Documents Ready',
    labelZh: '文件已准备',
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    icon: FileText,
    step: 10,
  },
  customs: {
    label: 'In Customs',
    labelZh: '清关中',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    icon: FileCheck,
    step: 11,
  },
  ready_pickup: {
    label: 'Ready for Pickup',
    labelZh: '可提车',
    color: 'text-teal-500',
    bg: 'bg-teal-500/10',
    icon: MapPin,
    step: 12,
  },
  delivered: {
    label: 'Delivered',
    labelZh: '已交付',
    color: 'text-jewel',
    bg: 'bg-jewel/10',
    icon: Home,
    step: 13,
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
  'South Africa': '🇿🇦',
  'Afrique du Sud': '🇿🇦',
  'Morocco': '🇲🇦',
  'Maroc': '🇲🇦',
};

function CollaboratorOrdersContent() {
  const { t, locale } = useCollaboratorLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedOrderId = searchParams.get('order');
  const dateLocale = locale === 'zh' ? zhCN : enUS;

  const [userName, setUserName] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [newEta, setNewEta] = useState('');
  const [actualPurchasePrice, setActualPurchasePrice] = useState('');

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismiss,
  } = useCollaboratorNotifications();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch user info
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        setUserName(profile?.full_name || user.email || '');
      }
    };
    fetchUser();
  }, [supabase]);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
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

      const response = await fetch(`/api/collaborator/orders?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch orders');

      const data = await response.json();
      setOrders(data.orders || []);
      setStats(data.stats || null);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, statusFilter, searchQuery]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Real-time synchronization for orders
  useEffect(() => {
    const cleanup = subscribeToOrders({
      onOrderChange: (payload) => {
        console.log('📡 Order changed:', payload.eventType, payload.orderId);
        // Refresh orders when any order changes
        fetchOrders();
      },
      onError: (error) => {
        console.error('❌ Real-time sync error:', error);
      },
    });

    return cleanup;
  }, [fetchOrders]);

  // Open order from URL
  useEffect(() => {
    if (selectedOrderId && orders.length > 0) {
      const order = orders.find((o) => o.id === selectedOrderId);
      if (order) {
        setSelectedOrder(order);
        setNewStatus(order.order_status);
        setNewEta(order.shipping_eta || '');
        setShowDetailModal(true);
      }
    }
  }, [selectedOrderId, orders]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/collaborator/login');
    router.refresh();
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setNewStatus(order.order_status);
    setNewEta(order.shipping_eta || '');
    setStatusNote('');
    setShowDetailModal(true);
    router.push(`/collaborator/orders?order=${order.id}`, { scroll: false });
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedOrder(null);
    router.push('/collaborator/orders', { scroll: false });
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !newStatus) return;

    // Validate actual purchase price for 'vehicle_purchased' status
    if (newStatus === 'vehicle_purchased' && !actualPurchasePrice) {
      alert(locale === 'zh' ? '请输入实际购买价格' : 'Please enter the actual purchase price');
      return;
    }

    try {
      setIsUpdatingStatus(true);

      const response = await fetch('/api/collaborator/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orderId: selectedOrder.id,
          status: newStatus,
          notes: statusNote || undefined,
          eta: newEta || undefined,
          actualPurchasePrice: actualPurchasePrice || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.error_zh || 'Failed to update status');
      }

      await fetchOrders();
      setStatusNote('');
      setActualPurchasePrice('');

      // Refresh selected order with new data
      const updatedOrder = orders.find(o => o.id === selectedOrder.id);
      if (updatedOrder) {
        setSelectedOrder({ ...updatedOrder, order_status: newStatus, shipping_eta: newEta || updatedOrder.shipping_eta });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };


  const handleContactWhatsApp = (order: Order) => {
    const phone = order.customer_whatsapp || order.customer_phone;
    if (phone) {
      let formattedPhone = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+241' + formattedPhone.replace(/^0+/, '');
      }
      formattedPhone = formattedPhone.replace('+', '');

      const message = encodeURIComponent(
        `Hello ${order.customer_name},\n\nRegarding your order ${order.order_number} at Driveby Africa.\n\n`
      );
      window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
    }
  };

  const formatPrice = (price: number) => {
    if (isNaN(price) || price === null || price === undefined) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getStatusProgress = (status: string) => {
    const config = statusConfig[status];
    return config ? (config.step / 13) * 100 : 0;
  };

  const getStatusLabel = (status: string) => {
    const config = statusConfig[status];
    if (!config) return status;
    return locale === 'zh' ? config.labelZh : config.label;
  };

  return (
    <div className="min-h-screen bg-cod-gray">
      <CollaboratorSidebar onLogout={handleLogout} />

      <div className="lg:pl-64">
        <CollaboratorTopBar
          title={t('orders.title')}
          userName={userName}
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAsRead={markAsRead}
          onMarkAllRead={markAllAsRead}
          onDismiss={dismiss}
          onLogout={handleLogout}
        />

        <main className="p-4 lg:p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-jewel/10 rounded-xl">
                <Package className="w-6 h-6 text-jewel" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{t('orders.title')}</h1>
                <p className="text-gray-400 text-sm">
                  {stats?.total || orders.length} {locale === 'zh' ? '个订单' : 'orders'}
                </p>
              </div>
            </div>
            <Button onClick={fetchOrders} disabled={isLoading} className="bg-mandarin hover:bg-mandarin/90">
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {locale === 'zh' ? '刷新' : 'Refresh'}
            </Button>
          </div>

          {/* Stats Cards - Only operational stats, no financial */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="p-4 bg-cod-gray border-nobel/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <ShoppingCart className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{t('stats.purchased')}</p>
                    <p className="text-xl font-bold text-gray-900">{stats.vehicle_purchased}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 bg-cod-gray border-nobel/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Truck className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{t('stats.inTransit')}</p>
                    <p className="text-xl font-bold text-gray-900">{stats.in_transit}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 bg-cod-gray border-nobel/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <Ship className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{t('stats.shipping')}</p>
                    <p className="text-xl font-bold text-gray-900">{stats.shipping}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 bg-cod-gray border-nobel/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-jewel/10 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-jewel" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{t('stats.delivered')}</p>
                    <p className="text-xl font-bold text-gray-900">{stats.delivered}</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder={locale === 'zh' ? '搜索订单号、品牌或型号...' : 'Search by order number, make or model...'}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-3 bg-[var(--card-bg)] border border-nobel/20 rounded-xl text-[var(--text-primary)] placeholder-gray-500 focus:border-mandarin focus:outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-3 bg-[var(--card-bg)] border border-nobel/20 rounded-xl text-gray-900 focus:border-mandarin focus:outline-none"
            >
              <option value="all">{t('stats.allStatuses')}</option>
              {Object.entries(statusConfig).map(([key, config]) => (
                <option key={key} value={key}>
                  {locale === 'zh' ? config.labelZh : config.label}
                </option>
              ))}
            </select>
          </div>

          {/* Orders Table */}
          <Card className="bg-cod-gray border-nobel/20">
            {isLoading && orders.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-mandarin" />
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-600 mb-4" />
                <p className="text-gray-400">{locale === 'zh' ? '暂无订单' : 'No orders found'}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {locale === 'zh' ? '支付定金后订单将显示在这里' : 'Orders appear here once deposit is paid'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-nobel/20">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                        {locale === 'zh' ? '订单' : 'Order'}
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                        {locale === 'zh' ? '车辆' : 'Vehicle'}
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                        {locale === 'zh' ? '客户' : 'Customer'}
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                        {locale === 'zh' ? '目的地' : 'Destination'}
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">
                        {locale === 'zh' ? '进度' : 'Progress'}
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">
                        {locale === 'zh' ? '预计到达' : 'ETA'}
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">
                        {locale === 'zh' ? '操作' : 'Actions'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const status = statusConfig[order.order_status] || statusConfig.deposit_paid;
                      const flag = countryFlags[order.destination_country] || '🌍';
                      const progress = getStatusProgress(order.order_status);

                      return (
                        <tr
                          key={order.id}
                          className="border-b border-nobel/10 hover:bg-nobel/5 transition-colors"
                        >
                          <td className="py-4 px-4">
                            <div>
                              <span className="text-sm font-mono text-mandarin">{order.order_number}</span>
                              <p className="text-xs text-gray-500">
                                {order.updated_at && formatDistanceToNow(new Date(order.updated_at), { addSuffix: true, locale: dateLocale })}
                              </p>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              {/* Vehicle thumbnail */}
                              <div className="w-14 h-10 rounded-lg overflow-hidden bg-nobel/20 flex-shrink-0">
                                {order.vehicle_image_url ? (
                                  <img
                                    src={getProxiedImageUrl(order.vehicle_image_url)}
                                    alt={`${order.vehicle_make} ${order.vehicle_model}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="w-5 h-5 text-gray-500" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-[var(--text-primary)]">
                                  {order.vehicle_make} {order.vehicle_model}
                                </p>
                                <p className="text-xs text-[var(--text-muted)]">
                                  {order.vehicle_year} - {formatPrice(order.vehicle_price_usd)}
                                </p>
                              </div>
                              {order.vehicle_source_url && (
                                <a
                                  href={order.vehicle_source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-nobel hover:text-mandarin hover:bg-mandarin/10 rounded-lg transition-colors"
                                  title={locale === 'zh' ? '查看原始列表' : 'View source listing'}
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <div>
                                <p className="text-sm font-medium text-[var(--text-primary)]">{order.customer_name}</p>
                                {(order.customer_whatsapp || order.customer_phone) && (
                                  <button
                                    onClick={() => handleContactWhatsApp(order)}
                                    className="flex items-center gap-1 text-xs text-green-500 hover:text-green-400 transition-colors"
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
                            <div className="w-36 mx-auto">
                              <div className="flex items-center justify-between mb-1">
                                <span className={`text-xs font-medium ${status.color}`}>
                                  {getStatusLabel(order.order_status)}
                                </span>
                                {order.last_modified_by && (
                                  <CollaboratorBadgeCompact
                                    collaboratorId={order.last_modified_by}
                                    collaboratorName={order.last_modified_by_name}
                                    badgeColor={order.last_modified_by_color}
                                  />
                                )}
                              </div>
                              <div className="w-full h-2 bg-nobel/20 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-mandarin to-jewel rounded-full transition-all duration-500"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            {order.shipping_eta ? (
                              <div className="flex items-center justify-center gap-1 text-sm text-gray-400">
                                <Calendar className="w-3.5 h-3.5" />
                                {format(new Date(order.shipping_eta), 'dd/MM/yy')}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500">
                                {locale === 'zh' ? '待定' : 'TBD'}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(order)}
                                title={locale === 'zh' ? '查看/编辑' : 'View/Edit'}
                                className="text-mandarin hover:text-mandarin/80 hover:bg-mandarin/10"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {(order.customer_whatsapp || order.customer_phone) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleContactWhatsApp(order)}
                                  className="text-green-500 hover:text-green-400 hover:bg-green-500/10"
                                  title="WhatsApp"
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
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-nobel/20">
                <p className="text-sm text-gray-400">
                  {locale === 'zh'
                    ? `第 ${currentPage} 页，共 ${totalPages} 页`
                    : `Page ${currentPage} of ${totalPages}`}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="border-nobel/30 text-white hover:bg-nobel/20"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="border-nobel/30 text-white hover:bg-nobel/20"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </main>
      </div>

      {/* Order Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[var(--card-border)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Vehicle image in modal header */}
                  {selectedOrder.vehicle_image_url && (
                    <div className="w-16 h-12 rounded-lg overflow-hidden bg-nobel/20 flex-shrink-0">
                      <img
                        src={getProxiedImageUrl(selectedOrder.vehicle_image_url)}
                        alt={`${selectedOrder.vehicle_make} ${selectedOrder.vehicle_model}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">
                      {locale === 'zh' ? '订单' : 'Order'} {selectedOrder.order_number}
                    </h3>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-[var(--text-muted)]">
                        {selectedOrder.vehicle_make} {selectedOrder.vehicle_model} {selectedOrder.vehicle_year}
                      </p>
                      {selectedOrder.vehicle_id && (
                        <a
                          href={`/cars/${selectedOrder.vehicle_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-nobel hover:text-jewel hover:bg-jewel/10 rounded transition-colors"
                          title={locale === 'zh' ? '在Driveby Africa上查看' : 'View on Driveby Africa'}
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                      )}
                      {selectedOrder.vehicle_source_url && (
                        <a
                          href={selectedOrder.vehicle_source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-nobel hover:text-mandarin hover:bg-mandarin/10 rounded transition-colors"
                          title={locale === 'zh' ? '查看原始列表' : 'View source listing'}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleCloseModal} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Progress Timeline */}
              <div>
                <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-4">
                  {locale === 'zh' ? '订单进度' : 'Order Progress'}
                </h4>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-nobel/20" />
                  <div className="space-y-4">
                    {Object.entries(statusConfig).map(([key, config]) => {
                      const currentStep = statusConfig[selectedOrder.order_status]?.step || 1;
                      const isCompleted = config.step <= currentStep;
                      const isCurrent = key === selectedOrder.order_status;
                      const trackingStep = selectedOrder.tracking_steps?.find(s => s.status === key);
                      const StatusIcon = config.icon;

                      return (
                        <div key={key} className="relative flex items-start gap-4 pl-8">
                          <div
                            className={cn(
                              'absolute left-2 w-5 h-5 rounded-full flex items-center justify-center',
                              isCompleted
                                ? isCurrent
                                  ? 'bg-mandarin ring-4 ring-mandarin/20'
                                  : 'bg-jewel'
                                : 'bg-cod-gray border-2 border-nobel/30'
                            )}
                          >
                            {isCompleted && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                          <div className={`flex-1 ${isCompleted ? '' : 'opacity-50'}`}>
                            <div className="flex items-center gap-2">
                              <StatusIcon className={`w-4 h-4 ${isCompleted ? config.color : 'text-gray-500'}`} />
                              <span className={`text-sm font-medium ${isCompleted ? 'text-[var(--text-primary)]' : 'text-gray-500'}`}>
                                {locale === 'zh' ? config.labelZh : config.label}
                              </span>
                              {isCurrent && (
                                <span className="text-xs px-2 py-0.5 bg-mandarin/10 text-mandarin rounded-full">
                                  {locale === 'zh' ? '当前' : 'Current'}
                                </span>
                              )}
                            </div>
                            {trackingStep && (
                              <div className="mt-1">
                                <p className="text-xs text-[var(--text-muted)]">
                                  {format(new Date(trackingStep.timestamp), "dd/MM/yyyy HH:mm", { locale: dateLocale })}
                                </p>
                                {trackingStep.note && (
                                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{trackingStep.note}</p>
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
              <div className="bg-[var(--bg-secondary)] rounded-xl p-4">
                <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">
                  {locale === 'zh' ? '更新状态' : 'Update Status'}
                </h4>
                <div className="space-y-3">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg text-[var(--text-primary)] focus:border-mandarin focus:outline-none"
                  >
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <option key={key} value={key}>
                        {locale === 'zh' ? config.labelZh : config.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder={locale === 'zh' ? '备注（可选）' : 'Note (optional)'}
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg text-[var(--text-primary)] placeholder-gray-500 focus:border-mandarin focus:outline-none"
                  />
                  {/* Actual Purchase Price - Only shown for 'vehicle_purchased' status */}
                  {newStatus === 'vehicle_purchased' && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <label className="block text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">
                        {locale === 'zh' ? '实际购买价格 (USD)' : 'Actual Purchase Price (USD)'} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={locale === 'zh' ? '输入实际购买价格' : 'Enter actual purchase price'}
                        value={actualPurchasePrice}
                        onChange={(e) => setActualPurchasePrice(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 bg-[var(--card-bg)] border border-amber-500/50 rounded-lg text-[var(--text-primary)] placeholder-gray-500 focus:border-amber-500 focus:outline-none"
                      />
                      <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">
                        {locale === 'zh' ? '此信息仅对管理员和协作者可见' : 'This information is only visible to admins and collaborators'}
                      </p>
                    </div>
                  )}
                  {/* Status Documents Section - Upload documents for current status */}
                  <StatusDocumentsSection
                    orderId={selectedOrder.id}
                    orderNumber={selectedOrder.order_number}
                    currentStatus={selectedOrder.order_status}
                    uploadedDocuments={(selectedOrder.uploaded_documents || []) as UploadedStatusDocument[]}
                    onDocumentsUpdated={fetchOrders}
                    isAdmin={false}
                    locale={locale}
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
                      onClick={handleUpdateStatus}
                      disabled={isUpdatingStatus || newStatus === selectedOrder.order_status}
                      className="bg-mandarin hover:bg-mandarin/90"
                    >
                      {isUpdatingStatus ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          {locale === 'zh' ? '更新' : 'Update'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Activity History - Shows who modified the order */}
              <OrderActivityHistory orderId={selectedOrder.id} locale={locale} />

              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[var(--bg-secondary)] rounded-xl p-4">
                  <h4 className="text-sm font-medium text-[var(--text-muted)] mb-2">
                    {locale === 'zh' ? '客户' : 'Customer'}
                  </h4>
                  <p className="font-medium text-[var(--text-primary)]">{selectedOrder.customer_name}</p>
                  <p className="text-sm text-[var(--text-muted)]">{selectedOrder.customer_country}</p>
                </div>
                <div className="bg-[var(--bg-secondary)] rounded-xl p-4">
                  <h4 className="text-sm font-medium text-[var(--text-muted)] mb-2">
                    {locale === 'zh' ? '目的地' : 'Destination'}
                  </h4>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{countryFlags[selectedOrder.destination_country] || '🌍'}</span>
                    <p className="font-medium text-[var(--text-primary)]">{selectedOrder.destination_name}</p>
                  </div>
                  <p className="text-sm text-[var(--text-muted)]">{selectedOrder.destination_country}</p>
                  {selectedOrder.shipping_eta && (
                    <div className="flex items-center gap-2 mt-2 text-sm">
                      <Calendar className="w-4 h-4 text-mandarin" />
                      <span className="text-[var(--text-primary)]">
                        ETA: {format(new Date(selectedOrder.shipping_eta), 'dd MMM yyyy', { locale: dateLocale })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-cod-gray flex items-center justify-center">
      <Loader2 className="h-8 w-8 text-mandarin animate-spin" />
    </div>
  );
}

export default function CollaboratorOrdersPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CollaboratorOrdersContent />
    </Suspense>
  );
}
