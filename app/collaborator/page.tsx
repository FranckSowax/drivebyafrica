'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useCollaboratorLocale } from '@/components/collaborator/CollaboratorLocaleProvider';
import { CollaboratorSidebar } from '@/components/collaborator/CollaboratorSidebar';
import { CollaboratorTopBar } from '@/components/collaborator/CollaboratorTopBar';
import { useCollaboratorNotifications } from '@/lib/hooks/useCollaboratorNotifications';
import { useCollaboratorAuth } from '@/lib/hooks/useCollaboratorAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { authFetch } from '@/lib/supabase/auth-helpers';
import {
  Package,
  Truck,
  Ship,
  CheckCircle,
  Loader2,
  ArrowRight,
  Clock,
  TrendingUp,
  Calendar,
  Bell,
  Eye,
  ShoppingCart,
  Anchor,
  FileCheck,
  MapPin,
  Home,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { format, formatDistanceToNow, isToday, isYesterday, startOfDay, subDays } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';
import { getProxiedImageUrl } from '@/lib/utils/imageProxy';

interface Order {
  id: string;
  order_number: string;
  order_status: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_price_usd: number;
  vehicle_image_url?: string | null;
  customer_name: string;
  destination_country: string;
  destination_name: string;
  created_at: string;
  updated_at: string;
}

interface DailyStats {
  newOrdersToday: number;
  newOrdersYesterday: number;
  processedToday: number;
  completedToday: number;
  pendingAction: number;
}

interface StatusBreakdown {
  inProgress: number;
  inTransit: number;
  shipping: number;
  completed: number;
}

const statusConfig: Record<string, { label: string; labelZh: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  deposit_paid: { label: 'Deposit Paid', labelZh: '已付定金', color: 'text-yellow-500', icon: Clock },
  vehicle_locked: { label: 'Vehicle Locked', labelZh: '车辆锁定', color: 'text-blue-500', icon: Package },
  inspection_sent: { label: 'Inspection Sent', labelZh: '检验已发送', color: 'text-cyan-500', icon: FileCheck },
  full_payment_received: { label: 'Full Payment', labelZh: '全款已收', color: 'text-green-500', icon: CheckCircle },
  vehicle_purchased: { label: 'Purchased', labelZh: '已购买', color: 'text-emerald-500', icon: ShoppingCart },
  export_customs: { label: 'Export Customs', labelZh: '出口报关', color: 'text-amber-500', icon: FileCheck },
  in_transit: { label: 'In Transit', labelZh: '运输中', color: 'text-purple-500', icon: Truck },
  at_port: { label: 'At Port', labelZh: '已到港', color: 'text-sky-500', icon: Anchor },
  shipping: { label: 'Shipping', labelZh: '海运中', color: 'text-indigo-500', icon: Ship },
  documents_ready: { label: 'Docs Ready', labelZh: '文件就绪', color: 'text-violet-500', icon: FileCheck },
  customs: { label: 'In Customs', labelZh: '清关中', color: 'text-orange-500', icon: FileCheck },
  ready_pickup: { label: 'Ready Pickup', labelZh: '可提车', color: 'text-teal-500', icon: MapPin },
  delivered: { label: 'Delivered', labelZh: '已交付', color: 'text-jewel', icon: Home },
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
};

export default function CollaboratorDashboardPage() {
  const { t, locale } = useCollaboratorLocale();
  const router = useRouter();
  const dateLocale = locale === 'zh' ? zhCN : enUS;

  // Auth hook - handles authentication, provides user info and signOut
  const { isChecking, isAuthorized, userName, userEmail, signOut } = useCollaboratorAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats>({
    newOrdersToday: 0,
    newOrdersYesterday: 0,
    processedToday: 0,
    completedToday: 0,
    pendingAction: 0,
  });
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown>({
    inProgress: 0,
    inTransit: 0,
    shipping: 0,
    completed: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismiss,
  } = useCollaboratorNotifications();

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);

        const response = await authFetch('/api/collaborator/orders?limit=100');
        if (!response.ok) throw new Error('Failed to fetch orders');

        const data = await response.json();
        const allOrders: Order[] = data.orders || [];
        setOrders(allOrders);

        const today = startOfDay(new Date());
        const yesterday = startOfDay(subDays(new Date(), 1));

        // Calculate daily stats
        const newToday = allOrders.filter(o => isToday(new Date(o.created_at))).length;
        const newYesterday = allOrders.filter(o => isYesterday(new Date(o.created_at))).length;
        const processedToday = allOrders.filter(o => {
          const updated = new Date(o.updated_at);
          return isToday(updated) && o.order_status !== 'deposit_paid';
        }).length;
        const completedToday = allOrders.filter(o => {
          const updated = new Date(o.updated_at);
          return isToday(updated) && o.order_status === 'delivered';
        }).length;
        const pendingAction = allOrders.filter(o =>
          ['deposit_paid', 'vehicle_locked', 'inspection_sent'].includes(o.order_status)
        ).length;

        setDailyStats({
          newOrdersToday: newToday,
          newOrdersYesterday: newYesterday,
          processedToday,
          completedToday,
          pendingAction,
        });

        // Calculate status breakdown
        const inProgress = allOrders.filter(o =>
          ['deposit_paid', 'vehicle_locked', 'inspection_sent', 'full_payment_received', 'vehicle_purchased', 'export_customs'].includes(o.order_status)
        ).length;
        const inTransit = allOrders.filter(o =>
          ['in_transit', 'at_port'].includes(o.order_status)
        ).length;
        const shipping = allOrders.filter(o =>
          ['shipping', 'documents_ready', 'customs'].includes(o.order_status)
        ).length;
        const completed = allOrders.filter(o =>
          ['ready_pickup', 'delivered'].includes(o.order_status)
        ).length;

        setStatusBreakdown({ inProgress, inTransit, shipping, completed });

        // Get recent orders (last 5, sorted by updated_at)
        const recent = [...allOrders]
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          .slice(0, 5);
        setRecentOrders(recent);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getStatusLabel = (status: string) => {
    const config = statusConfig[status];
    if (!config) return status;
    return locale === 'zh' ? config.labelZh : config.label;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (locale === 'zh') {
      if (hour < 12) return '早上好';
      if (hour < 18) return '下午好';
      return '晚上好';
    }
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Show loading spinner while checking auth
  if (isChecking || !isAuthorized) {
    return (
      <div className="min-h-screen bg-cod-gray flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-mandarin animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cod-gray">
      <CollaboratorSidebar onLogout={signOut} />

      <div className="lg:pl-64">
        <CollaboratorTopBar
          title={locale === 'zh' ? '仪表板' : 'Dashboard'}
          userName={userName}
          userEmail={userEmail}
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAsRead={markAsRead}
          onMarkAllRead={markAllAsRead}
          onDismiss={dismiss}
          onLogout={signOut}
        />

        <main className="p-4 lg:p-6">
          {/* Welcome Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-mandarin to-jewel flex items-center justify-center">
                <span className="text-xl font-bold text-white">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {getGreeting()}, {userName.split(' ')[0]}!
                </h1>
                <p className="text-gray-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(), 'EEEE, d MMMM yyyy', { locale: dateLocale })}
                </p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-mandarin animate-spin" />
            </div>
          ) : (
            <>
              {/* Daily Stats Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* New Orders Today */}
                <Card className="p-5 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-blue-400 mb-1">
                        {t('stats.todayNewOrders')}
                      </p>
                      <p className="text-3xl font-bold text-gray-900">{dailyStats.newOrdersToday}</p>
                      {dailyStats.newOrdersYesterday > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {t('stats.yesterday')}: {dailyStats.newOrdersYesterday}
                        </p>
                      )}
                    </div>
                    <div className="p-3 bg-blue-500/20 rounded-xl">
                      <Package className="w-6 h-6 text-blue-400" />
                    </div>
                  </div>
                </Card>

                {/* Processed Today */}
                <Card className="p-5 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-purple-400 mb-1">
                        {t('stats.processedToday')}
                      </p>
                      <p className="text-3xl font-bold text-gray-900">{dailyStats.processedToday}</p>
                    </div>
                    <div className="p-3 bg-purple-500/20 rounded-xl">
                      <TrendingUp className="w-6 h-6 text-purple-400" />
                    </div>
                  </div>
                </Card>

                {/* Completed Today */}
                <Card className="p-5 bg-gradient-to-br from-jewel/10 to-emerald-600/5 border-jewel/20">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-emerald-400 mb-1">
                        {t('stats.completedToday')}
                      </p>
                      <p className="text-3xl font-bold text-gray-900">{dailyStats.completedToday}</p>
                    </div>
                    <div className="p-3 bg-jewel/20 rounded-xl">
                      <CheckCircle className="w-6 h-6 text-emerald-400" />
                    </div>
                  </div>
                </Card>

                {/* Pending Action */}
                <Card className="p-5 bg-gradient-to-br from-amber-500/10 to-orange-600/5 border-amber-500/20">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-amber-400 mb-1">
                        {t('stats.pendingAction')}
                      </p>
                      <p className="text-3xl font-bold text-gray-900">{dailyStats.pendingAction}</p>
                    </div>
                    <div className="p-3 bg-amber-500/20 rounded-xl">
                      <AlertCircle className="w-6 h-6 text-amber-400" />
                    </div>
                  </div>
                </Card>
              </div>

              {/* Status Breakdown */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card className="p-4 bg-cod-gray border-nobel/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <ShoppingCart className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">{t('stats.inProgress')}</p>
                      <p className="text-xl font-bold text-gray-900">{statusBreakdown.inProgress}</p>
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
                      <p className="text-xl font-bold text-gray-900">{statusBreakdown.inTransit}</p>
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
                      <p className="text-xl font-bold text-gray-900">{statusBreakdown.shipping}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4 bg-cod-gray border-nobel/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-jewel/10 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-jewel" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">{t('stats.completed')}</p>
                      <p className="text-xl font-bold text-gray-900">{statusBreakdown.completed}</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Main Content Grid */}
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Recent Orders - Takes 2 columns */}
                <Card className="lg:col-span-2 bg-cod-gray border-nobel/20">
                  <div className="p-4 border-b border-nobel/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-mandarin/10 rounded-lg">
                        <Package className="w-5 h-5 text-mandarin" />
                      </div>
                      <h3 className="font-semibold text-gray-900">
                        {locale === 'zh' ? '最近订单' : 'Recent Orders'}
                      </h3>
                    </div>
                    <Link
                      href="/collaborator/orders"
                      className="text-sm text-mandarin hover:text-mandarin/80 flex items-center gap-1"
                    >
                      {locale === 'zh' ? '查看全部' : 'View All'}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>

                  {recentOrders.length === 0 ? (
                    <div className="p-8 text-center">
                      <Package className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                      <p className="text-gray-400">{locale === 'zh' ? '暂无订单' : 'No orders yet'}</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-nobel/10">
                      {recentOrders.map((order) => {
                        const config = statusConfig[order.order_status] || statusConfig.deposit_paid;
                        const StatusIcon = config.icon;
                        const flag = countryFlags[order.destination_country] || '🌍';

                        return (
                          <Link
                            key={order.id}
                            href={`/collaborator/orders?order=${order.id}`}
                            className="flex items-center gap-4 p-4 hover:bg-nobel/5 transition-colors"
                          >
                            {/* Vehicle Image */}
                            <div className="w-16 h-12 rounded-lg overflow-hidden bg-nobel/20 flex-shrink-0">
                              {order.vehicle_image_url ? (
                                <img
                                  src={getProxiedImageUrl(order.vehicle_image_url)}
                                  alt={`${order.vehicle_make} ${order.vehicle_model}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-5 h-5 text-gray-500" />
                                </div>
                              )}
                            </div>

                            {/* Order Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-mono text-mandarin">{order.order_number}</span>
                                <span className="text-lg">{flag}</span>
                              </div>
                              <p className="text-sm text-white truncate">
                                {order.vehicle_year} {order.vehicle_make} {order.vehicle_model}
                              </p>
                              <p className="text-xs text-gray-500">{order.customer_name}</p>
                            </div>

                            {/* Status */}
                            <div className="text-right flex-shrink-0">
                              <div className={cn('flex items-center gap-1.5 text-sm', config.color)}>
                                <StatusIcon className="w-4 h-4" />
                                <span>{getStatusLabel(order.order_status)}</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDistanceToNow(new Date(order.updated_at), { addSuffix: true, locale: dateLocale })}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </Card>

                {/* Notifications Panel */}
                <Card className="bg-cod-gray border-nobel/20">
                  <div className="p-4 border-b border-nobel/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Bell className="w-5 h-5 text-blue-500" />
                      </div>
                      <h3 className="font-semibold text-gray-900">
                        {locale === 'zh' ? '通知' : 'Notifications'}
                      </h3>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-mandarin text-white rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-gray-400 hover:text-white transition-colors"
                      >
                        {locale === 'zh' ? '全部已读' : 'Mark all read'}
                      </button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                      <p className="text-gray-400">{locale === 'zh' ? '暂无通知' : 'No notifications'}</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-nobel/10 max-h-[400px] overflow-y-auto">
                      {notifications.slice(0, 10).map((notification) => (
                        <div
                          key={notification.id}
                          className={cn(
                            'p-4 hover:bg-nobel/5 transition-colors cursor-pointer',
                            !notification.read && 'bg-blue-500/5'
                          )}
                          onClick={() => {
                            markAsRead(notification.id);
                            if (notification.action_url) {
                              router.push(notification.action_url);
                            }
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              'w-2 h-2 rounded-full mt-2 flex-shrink-0',
                              notification.read ? 'bg-gray-500' : 'bg-mandarin'
                            )} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900 font-medium truncate">
                                {notification.title}
                              </p>
                              {notification.message && (
                                <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                                  {notification.message}
                                </p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: dateLocale })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {/* Quick Actions */}
              <div className="mt-8">
                <h3 className="text-sm font-medium text-gray-400 mb-4">
                  {locale === 'zh' ? '快捷操作' : 'Quick Actions'}
                </h3>
                <div className="flex flex-wrap gap-3">
                  <Link href="/collaborator/orders">
                    <Button className="bg-mandarin hover:bg-mandarin/90">
                      <Package className="w-4 h-4 mr-2" />
                      {locale === 'zh' ? '管理订单' : 'Manage Orders'}
                    </Button>
                  </Link>
                  <Link href="/collaborator/orders?status=deposit_paid">
                    <Button variant="outline" className="border-nobel/40 bg-white text-gray-900 hover:bg-gray-100">
                      <Clock className="w-4 h-4 mr-2" />
                      {locale === 'zh' ? '待处理订单' : 'Pending Orders'}
                      {dailyStats.pendingAction > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-500 text-white rounded">
                          {dailyStats.pendingAction}
                        </span>
                      )}
                    </Button>
                  </Link>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
