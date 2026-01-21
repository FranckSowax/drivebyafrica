'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { cn } from '@/lib/utils';
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
} from 'lucide-react';

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_price_usd: number;
  deposit_amount_usd?: number;
  shipping_country?: string;
  shipping_city?: string;
  eta?: string;
  created_at: string;
  updated_at?: string;
  vehicle?: {
    make?: string;
    model?: string;
    year?: number;
    source?: string;
    image_url?: string;
    mileage?: number;
    fuel_type?: string;
    transmission?: string;
    external_id?: string;
  };
  user?: {
    id?: string;
    full_name?: string;
    email?: string;
    phone?: string;
  };
  tracking?: {
    id: string;
    status: string;
    notes?: string;
    created_at: string;
  }[];
  documents?: {
    id: string;
    file_name: string;
    file_url: string;
    uploaded_at: string;
  }[];
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
  'Morocco': '🇲🇦',
};

function CollaboratorOrdersContent() {
  const { t, locale } = useCollaboratorLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedOrderId = searchParams.get('order');
  const dateLocale = locale === 'zh' ? zhCN : enUS;

  const [userName, setUserName] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [newEta, setNewEta] = useState('');

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

  // Open order from URL
  useEffect(() => {
    if (selectedOrderId && orders.length > 0) {
      const order = orders.find((o) => o.id === selectedOrderId);
      if (order) {
        setSelectedOrder(order);
        setNewStatus(order.status);
        setNewEta(order.eta || '');
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
    setNewStatus(order.status);
    setNewEta(order.eta || '');
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
        }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      await fetchOrders();
      setStatusNote('');
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedOrder || !e.target.files?.length) return;

    const file = e.target.files[0];
    if (file.type !== 'application/pdf') {
      alert(t('documents.pdfOnly'));
      return;
    }

    try {
      setIsUploadingDocument(true);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('orderId', selectedOrder.id);
      formData.append('sendNotification', 'true');

      const response = await fetch('/api/collaborator/orders/documents', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload document');

      await fetchOrders();
    } catch (error) {
      console.error('Error uploading document:', error);
    } finally {
      setIsUploadingDocument(false);
      e.target.value = '';
    }
  };

  const handleContactWhatsApp = (order: Order) => {
    if (order.user?.phone) {
      const phone = order.user.phone.replace(/\D/g, '');
      const message = encodeURIComponent(
        `Hello ${order.user.full_name},\n\nRegarding your order ${order.order_number} at Driveby Africa.\n\n`
      );
      window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    }
  };

  const formatPrice = (price: number) => {
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
                  {orders.length} {locale === 'zh' ? '个订单' : 'orders'}
                </p>
              </div>
            </div>
            <Button onClick={fetchOrders} disabled={isLoading} className="bg-mandarin hover:bg-mandarin/90">
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {locale === 'zh' ? '刷新' : 'Refresh'}
            </Button>
          </div>

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
                className="w-full pl-10 pr-4 py-3 bg-nobel/10 border border-nobel/20 rounded-xl text-white placeholder-gray-500 focus:border-mandarin focus:outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-3 bg-nobel/10 border border-nobel/20 rounded-xl text-white focus:border-mandarin focus:outline-none"
            >
              <option value="all">{locale === 'zh' ? '所有状态' : 'All statuses'}</option>
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
                <p className="text-gray-400">{t('orders.noOrders')}</p>
                <p className="text-sm text-gray-500 mt-1">{t('orders.noOrdersHint')}</p>
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
                      const status = statusConfig[order.status] || statusConfig.deposit_paid;
                      const flag = countryFlags[order.shipping_country || ''] || '🌍';
                      const progress = getStatusProgress(order.status);

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
                            <div>
                              <p className="text-sm font-medium text-white">
                                {order.vehicle?.make} {order.vehicle?.model}
                              </p>
                              <p className="text-xs text-gray-500">
                                {order.vehicle?.year} - {formatPrice(order.total_price_usd)}
                              </p>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <div>
                                <p className="text-sm font-medium text-white">{order.user?.full_name}</p>
                                {order.user?.phone && (
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
                                <p className="text-sm text-white">{order.shipping_city}</p>
                                <p className="text-xs text-gray-500">{order.shipping_country}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="w-36 mx-auto">
                              <div className="flex items-center justify-between mb-1">
                                <span className={`text-xs font-medium ${status.color}`}>
                                  {getStatusLabel(order.status)}
                                </span>
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
                            {order.eta ? (
                              <div className="flex items-center justify-center gap-1 text-sm text-gray-400">
                                <Calendar className="w-3.5 h-3.5" />
                                {format(new Date(order.eta), 'dd/MM/yy')}
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
                                className="text-white hover:text-mandarin"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {order.user?.phone && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleContactWhatsApp(order)}
                                  className="text-green-500 hover:text-green-400"
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
          <div className="bg-cod-gray border border-nobel/20 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-nobel/20">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {locale === 'zh' ? '订单' : 'Order'} {selectedOrder.order_number}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {selectedOrder.vehicle?.make} {selectedOrder.vehicle?.model} {selectedOrder.vehicle?.year}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleCloseModal} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Progress Timeline */}
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-4">
                  {locale === 'zh' ? '订单进度' : 'Order Progress'}
                </h4>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-nobel/20" />
                  <div className="space-y-4">
                    {Object.entries(statusConfig).map(([key, config]) => {
                      const isCompleted = config.step <= (statusConfig[selectedOrder.status]?.step || 1);
                      const isCurrent = key === selectedOrder.status;
                      const trackingStep = selectedOrder.tracking?.find(s => s.status === key);
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
                              <span className={`text-sm font-medium ${isCompleted ? 'text-white' : 'text-gray-500'}`}>
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
                                <p className="text-xs text-gray-500">
                                  {format(new Date(trackingStep.created_at), "dd/MM/yyyy HH:mm", { locale: dateLocale })}
                                </p>
                                {trackingStep.notes && (
                                  <p className="text-xs text-gray-300 mt-0.5">{trackingStep.notes}</p>
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
              <div className="bg-nobel/10 rounded-xl p-4">
                <h4 className="text-sm font-medium text-white mb-3">
                  {locale === 'zh' ? '更新状态' : 'Update Status'}
                </h4>
                <div className="space-y-3">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-4 py-2.5 bg-cod-gray border border-nobel/30 rounded-lg text-white focus:border-mandarin focus:outline-none"
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
                    className="w-full px-4 py-2.5 bg-cod-gray border border-nobel/30 rounded-lg text-white placeholder-gray-500 focus:border-mandarin focus:outline-none"
                  />
                  <div className="flex gap-3">
                    <input
                      type="date"
                      placeholder="ETA"
                      value={newEta}
                      onChange={(e) => setNewEta(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-cod-gray border border-nobel/30 rounded-lg text-white focus:border-mandarin focus:outline-none"
                    />
                    <Button
                      onClick={handleUpdateStatus}
                      disabled={isUpdatingStatus || newStatus === selectedOrder.status}
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

              {/* Documents */}
              <div className="bg-nobel/10 rounded-xl p-4">
                <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {locale === 'zh' ? '文档' : 'Documents'}
                </h4>

                {selectedOrder.documents && selectedOrder.documents.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {selectedOrder.documents.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg bg-cod-gray hover:bg-nobel/20 transition-colors"
                      >
                        <FileText className="h-5 w-5 text-mandarin" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{doc.file_name}</p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(doc.uploaded_at), 'dd/MM/yyyy HH:mm')}
                          </p>
                        </div>
                        <ExternalLink className="h-4 w-4 text-gray-400" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mb-4">{t('documents.noDocuments')}</p>
                )}

                <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-nobel/30 text-gray-400 hover:border-mandarin/50 hover:text-mandarin cursor-pointer transition-colors">
                  {isUploadingDocument ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Upload className="h-5 w-5" />
                  )}
                  <span className="text-sm">
                    {isUploadingDocument
                      ? (locale === 'zh' ? '上传中...' : 'Uploading...')
                      : (locale === 'zh' ? '上传文档' : 'Upload Document')}
                  </span>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleUploadDocument}
                    disabled={isUploadingDocument}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {locale === 'zh' ? '仅限 PDF 文件 • 最大 10MB' : 'PDF only • Max 10MB'}
                </p>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-nobel/10 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">
                    {locale === 'zh' ? '客户' : 'Customer'}
                  </h4>
                  <p className="font-medium text-white">{selectedOrder.user?.full_name}</p>
                  <p className="text-sm text-gray-400">{selectedOrder.user?.email}</p>
                  {selectedOrder.user?.phone && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full text-green-500 border-green-500/30 hover:bg-green-500/10"
                      onClick={() => handleContactWhatsApp(selectedOrder)}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                  )}
                </div>
                <div className="bg-nobel/10 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">
                    {locale === 'zh' ? '目的地' : 'Destination'}
                  </h4>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{countryFlags[selectedOrder.shipping_country || ''] || '🌍'}</span>
                    <p className="font-medium text-white">{selectedOrder.shipping_city}</p>
                  </div>
                  <p className="text-sm text-gray-400">{selectedOrder.shipping_country}</p>
                  {selectedOrder.eta && (
                    <div className="flex items-center gap-2 mt-2 text-sm">
                      <Calendar className="w-4 h-4 text-mandarin" />
                      <span className="text-white">
                        ETA: {format(new Date(selectedOrder.eta), 'dd MMM yyyy', { locale: dateLocale })}
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
