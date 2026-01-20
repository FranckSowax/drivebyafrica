'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { cn } from '@/lib/utils';
import { getProxiedImageUrl } from '@/lib/utils/imageProxy';
import { useCollaboratorLocale } from '@/components/collaborator/CollaboratorLocaleProvider';
import { CollaboratorSidebar } from '@/components/collaborator/CollaboratorSidebar';
import { CollaboratorTopBar } from '@/components/collaborator/CollaboratorTopBar';
import { CollaboratorOrderCard } from '@/components/collaborator/CollaboratorOrderCard';
import { useCollaboratorNotifications } from '@/lib/hooks/useCollaboratorNotifications';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  Search,
  Filter,
  Loader2,
  Package,
  X,
  Car,
  User,
  MapPin,
  Calendar,
  FileText,
  Upload,
  MessageCircle,
  Check,
  ChevronDown,
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

const statusOrder = [
  'deposit_paid',
  'vehicle_locked',
  'inspection_sent',
  'full_payment_received',
  'vehicle_purchased',
  'export_customs',
  'in_transit',
  'at_port',
  'shipping',
  'documents_ready',
  'customs',
  'ready_pickup',
  'delivered',
];

const statusColors: Record<string, string> = {
  deposit_paid: 'bg-blue-500',
  vehicle_locked: 'bg-purple-500',
  inspection_sent: 'bg-indigo-500',
  full_payment_received: 'bg-cyan-500',
  vehicle_purchased: 'bg-teal-500',
  export_customs: 'bg-yellow-500',
  in_transit: 'bg-orange-500',
  at_port: 'bg-amber-500',
  shipping: 'bg-sky-500',
  documents_ready: 'bg-emerald-500',
  customs: 'bg-lime-500',
  ready_pickup: 'bg-green-500',
  delivered: 'bg-jewel',
};

function CollaboratorOrdersContent() {
  const { t } = useCollaboratorLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedOrderId = searchParams.get('order');

  const [userName, setUserName] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

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
      const response = await fetch('/api/collaborator/orders');
      if (!response.ok) throw new Error('Failed to fetch orders');

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Filter orders
  useEffect(() => {
    let filtered = [...orders];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.order_number.toLowerCase().includes(query) ||
          o.vehicle?.make?.toLowerCase().includes(query) ||
          o.vehicle?.model?.toLowerCase().includes(query) ||
          o.user?.full_name?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((o) => o.status === statusFilter);
    }

    setFilteredOrders(filtered);
  }, [orders, searchQuery, statusFilter]);

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
        body: JSON.stringify({
          orderId: selectedOrder.id,
          status: newStatus,
          notes: statusNote || undefined,
          eta: newEta || undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      // Refresh orders
      await fetchOrders();

      // Update selected order
      const updatedOrder = orders.find((o) => o.id === selectedOrder.id);
      if (updatedOrder) {
        setSelectedOrder({ ...updatedOrder, status: newStatus, eta: newEta || updatedOrder.eta });
      }

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
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload document');

      // Refresh orders
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
      window.open(`https://wa.me/${phone}`, '_blank');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
              <Input
                type="text"
                placeholder={t('orders.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-nobel/10 border-nobel/20 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-lg',
                  'bg-nobel/10 border border-nobel/20 text-white',
                  'hover:bg-nobel/20 transition-colors'
                )}
              >
                <Filter className="h-4 w-4" />
                <span>
                  {statusFilter === 'all'
                    ? t('orders.allStatuses')
                    : t(`statuses.${statusFilter}`)}
                </span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {showStatusDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowStatusDropdown(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-cod-gray border border-nobel/20 rounded-xl shadow-xl z-50 overflow-hidden">
                    <button
                      onClick={() => {
                        setStatusFilter('all');
                        setShowStatusDropdown(false);
                      }}
                      className={cn(
                        'w-full px-4 py-2 text-left text-sm',
                        statusFilter === 'all'
                          ? 'bg-mandarin text-white'
                          : 'text-gray-300 hover:bg-nobel/20'
                      )}
                    >
                      {t('orders.allStatuses')}
                    </button>
                    {statusOrder.map((status) => (
                      <button
                        key={status}
                        onClick={() => {
                          setStatusFilter(status);
                          setShowStatusDropdown(false);
                        }}
                        className={cn(
                          'w-full px-4 py-2 text-left text-sm flex items-center gap-2',
                          statusFilter === status
                            ? 'bg-mandarin text-white'
                            : 'text-gray-300 hover:bg-nobel/20'
                        )}
                      >
                        <span
                          className={cn('w-2 h-2 rounded-full', statusColors[status])}
                        />
                        {t(`statuses.${status}`)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Orders */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-mandarin animate-spin" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-20">
              <Package className="h-16 w-16 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400">{t('orders.noOrders')}</p>
              <p className="text-sm text-gray-500 mt-1">{t('orders.noOrdersHint')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredOrders.map((order) => (
                <CollaboratorOrderCard
                  key={order.id}
                  order={order}
                  onViewDetails={() => handleViewDetails(order)}
                  onContactWhatsApp={
                    order.user?.phone ? () => handleContactWhatsApp(order) : undefined
                  }
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Order Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={handleCloseModal}
          />

          <div className="relative w-full max-w-3xl max-h-[90vh] bg-cod-gray border border-nobel/20 rounded-2xl overflow-hidden flex flex-col">
            {/* Modal header */}
            <div className="p-4 lg:p-6 border-b border-nobel/20 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {t('orders.orderDetails')}
                </h2>
                <p className="text-sm text-gray-400">#{selectedOrder.order_number}</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 text-gray-400 hover:text-white hover:bg-nobel/20 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal content */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
              {/* Vehicle info */}
              <div className="flex gap-4">
                <div className="w-24 h-24 flex-shrink-0 bg-nobel/20 rounded-lg overflow-hidden">
                  {selectedOrder.vehicle?.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getProxiedImageUrl(selectedOrder.vehicle.image_url)}
                      alt="Vehicle"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Car className="h-10 w-10 text-gray-600" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-white text-lg">
                    {selectedOrder.vehicle?.year} {selectedOrder.vehicle?.make}{' '}
                    {selectedOrder.vehicle?.model}
                  </h3>
                  <p className="text-gray-400 text-sm mb-2">
                    {selectedOrder.vehicle?.source && (
                      <span className="capitalize">{selectedOrder.vehicle.source}</span>
                    )}
                    {selectedOrder.vehicle?.mileage && (
                      <span> • {selectedOrder.vehicle.mileage.toLocaleString()} km</span>
                    )}
                  </p>
                  <p className="text-mandarin font-bold text-lg">
                    {formatPrice(selectedOrder.total_price_usd)}
                  </p>
                </div>
              </div>

              {/* Customer info */}
              <div className="bg-nobel/10 rounded-xl p-4">
                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {t('orders.customerInfo')}
                </h4>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-300">{selectedOrder.user?.full_name}</p>
                  <p className="text-gray-400">{selectedOrder.user?.email}</p>
                  {selectedOrder.user?.phone && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">{selectedOrder.user.phone}</span>
                      <button
                        onClick={() => handleContactWhatsApp(selectedOrder)}
                        className="text-green-400 hover:text-green-300"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Shipping info */}
              <div className="bg-nobel/10 rounded-xl p-4">
                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {t('orders.shippingInfo')}
                </h4>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-300">
                    {selectedOrder.shipping_city}, {selectedOrder.shipping_country}
                  </p>
                  {selectedOrder.eta && (
                    <p className="text-gray-400">
                      {t('orders.eta')}: {formatDate(selectedOrder.eta)}
                    </p>
                  )}
                </div>
              </div>

              {/* Status update */}
              <div className="bg-nobel/10 rounded-xl p-4">
                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  {t('orders.updateStatus')}
                </h4>

                <div className="space-y-3">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-cod-gray border border-nobel/30 text-white"
                  >
                    {statusOrder.map((status) => (
                      <option key={status} value={status}>
                        {t(`statuses.${status}`)}
                      </option>
                    ))}
                  </select>

                  <Input
                    type="text"
                    placeholder={t('orders.addNote')}
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    className="bg-cod-gray border-nobel/30 text-white"
                  />

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <Input
                      type="date"
                      placeholder={t('orders.setEta')}
                      value={newEta}
                      onChange={(e) => setNewEta(e.target.value)}
                      className="flex-1 bg-cod-gray border-nobel/30 text-white"
                    />
                  </div>

                  <Button
                    onClick={handleUpdateStatus}
                    disabled={isUpdatingStatus || newStatus === selectedOrder.status}
                    className="w-full bg-mandarin hover:bg-mandarin/90"
                  >
                    {isUpdatingStatus ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {t('orders.update')}
                  </Button>
                </div>
              </div>

              {/* Documents */}
              <div className="bg-nobel/10 rounded-xl p-4">
                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {t('orders.documents')}
                </h4>

                {/* Document list */}
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
                            {formatDate(doc.uploaded_at)}
                          </p>
                        </div>
                        <ExternalLink className="h-4 w-4 text-gray-400" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mb-4">{t('documents.noDocuments')}</p>
                )}

                {/* Upload button */}
                <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-nobel/30 text-gray-400 hover:border-mandarin/50 hover:text-mandarin cursor-pointer transition-colors">
                  {isUploadingDocument ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Upload className="h-5 w-5" />
                  )}
                  <span className="text-sm">
                    {isUploadingDocument
                      ? t('documents.uploading')
                      : t('orders.uploadDocuments')}
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
                  {t('documents.pdfOnly')} • {t('documents.maxSize')}
                </p>
              </div>

              {/* Tracking history */}
              {selectedOrder.tracking && selectedOrder.tracking.length > 0 && (
                <div className="bg-nobel/10 rounded-xl p-4">
                  <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t('orders.trackingHistory')}
                  </h4>

                  <div className="space-y-3">
                    {selectedOrder.tracking.map((entry, index) => (
                      <div
                        key={entry.id}
                        className={cn(
                          'flex gap-3',
                          index !== selectedOrder.tracking!.length - 1 &&
                            'pb-3 border-b border-nobel/10'
                        )}
                      >
                        <div
                          className={cn(
                            'w-3 h-3 rounded-full mt-1.5 flex-shrink-0',
                            statusColors[entry.status] || 'bg-gray-500'
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">
                            {t(`statuses.${entry.status}`)}
                          </p>
                          {entry.notes && (
                            <p className="text-sm text-gray-400">{entry.notes}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            {formatDate(entry.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
