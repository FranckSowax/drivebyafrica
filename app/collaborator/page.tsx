'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { cn } from '@/lib/utils';
import { useCollaboratorLocale } from '@/components/collaborator/CollaboratorLocaleProvider';
import { CollaboratorSidebar } from '@/components/collaborator/CollaboratorSidebar';
import { CollaboratorTopBar } from '@/components/collaborator/CollaboratorTopBar';
import { useCollaboratorNotifications } from '@/lib/hooks/useCollaboratorNotifications';
import {
  Package,
  DollarSign,
  Truck,
  Ship,
  CheckCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

interface Stats {
  total: number;
  depositPaid: number;
  purchased: number;
  inTransit: number;
  shipping: number;
  delivered: number;
  totalDeposits: number;
}

interface RecentOrder {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  vehicle?: {
    make?: string;
    model?: string;
    year?: number;
  };
  user?: {
    full_name?: string;
  };
}

export default function CollaboratorDashboardPage() {
  const { t } = useCollaboratorLocale();
  const router = useRouter();
  const [userName, setUserName] = useState<string>('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);

        const response = await fetch('/api/collaborator/orders');
        if (!response.ok) throw new Error('Failed to fetch orders');

        const data = await response.json();
        const orders = data.orders || [];

        // Calculate stats
        const calculatedStats: Stats = {
          total: orders.length,
          depositPaid: orders.filter((o: RecentOrder) => o.status === 'deposit_paid').length,
          purchased: orders.filter((o: RecentOrder) =>
            ['vehicle_purchased', 'export_customs'].includes(o.status)
          ).length,
          inTransit: orders.filter((o: RecentOrder) =>
            ['in_transit', 'at_port'].includes(o.status)
          ).length,
          shipping: orders.filter((o: RecentOrder) =>
            ['shipping', 'documents_ready', 'customs'].includes(o.status)
          ).length,
          delivered: orders.filter((o: RecentOrder) =>
            ['ready_pickup', 'delivered'].includes(o.status)
          ).length,
          totalDeposits: orders.reduce(
            (sum: number, o: { deposit_amount_usd?: number }) => sum + (o.deposit_amount_usd || 0),
            0
          ),
        };

        setStats(calculatedStats);

        // Get recent orders (last 5)
        const recent = orders
          .sort((a: RecentOrder, b: RecentOrder) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/collaborator/login');
    router.refresh();
  };

  const statCards = [
    { key: 'total', icon: Package, color: 'bg-blue-500', value: stats?.total },
    { key: 'depositPaid', icon: DollarSign, color: 'bg-purple-500', value: stats?.depositPaid },
    { key: 'purchased', icon: CheckCircle, color: 'bg-teal-500', value: stats?.purchased },
    { key: 'inTransit', icon: Truck, color: 'bg-orange-500', value: stats?.inTransit },
    { key: 'shipping', icon: Ship, color: 'bg-sky-500', value: stats?.shipping },
    { key: 'delivered', icon: CheckCircle, color: 'bg-jewel', value: stats?.delivered },
  ];

  return (
    <div className="min-h-screen bg-cod-gray">
      <CollaboratorSidebar onLogout={handleLogout} />

      <div className="lg:pl-64">
        <CollaboratorTopBar
          title={t('collaborator.dashboard')}
          userName={userName}
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAsRead={markAsRead}
          onMarkAllRead={markAllAsRead}
          onDismiss={dismiss}
        />

        <main className="p-4 lg:p-6">
          {/* Welcome */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-1">
              {t('collaborator.welcome')}, {userName.split(' ')[0]}!
            </h2>
            <p className="text-gray-400">{t('collaborator.ordersDescription')}</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-mandarin animate-spin" />
            </div>
          ) : (
            <>
              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                {statCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.key}
                      className="bg-nobel/10 rounded-xl p-4 border border-nobel/20"
                    >
                      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', card.color)}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <p className="text-2xl font-bold text-white">{card.value ?? 0}</p>
                      <p className="text-sm text-gray-400">{t(`stats.${card.key}`)}</p>
                    </div>
                  );
                })}
              </div>

              {/* Total deposits card */}
              <div className="bg-mandarin/10 border border-mandarin/20 rounded-xl p-6 mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-mandarin mb-1">{t('stats.totalDeposits')}</p>
                    <p className="text-3xl font-bold text-white">
                      ${stats?.totalDeposits?.toLocaleString() ?? 0}
                    </p>
                  </div>
                  <DollarSign className="h-12 w-12 text-mandarin/50" />
                </div>
              </div>

              {/* Recent orders */}
              <div className="bg-nobel/10 rounded-xl border border-nobel/20">
                <div className="p-4 border-b border-nobel/20 flex items-center justify-between">
                  <h3 className="font-semibold text-white">{t('orders.title')}</h3>
                  <Link
                    href="/collaborator/orders"
                    className="text-sm text-mandarin hover:text-mandarin/80 flex items-center gap-1"
                  >
                    {t('common.seeAll')}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                {recentOrders.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>{t('orders.noOrders')}</p>
                    <p className="text-sm mt-1">{t('orders.noOrdersHint')}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-nobel/10">
                    {recentOrders.map((order) => (
                      <Link
                        key={order.id}
                        href={`/collaborator/orders?order=${order.id}`}
                        className="block p-4 hover:bg-nobel/5 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-white">
                              #{order.order_number}
                            </p>
                            <p className="text-sm text-gray-400">
                              {order.vehicle?.year} {order.vehicle?.make} {order.vehicle?.model}
                            </p>
                            <p className="text-xs text-gray-500">
                              {order.user?.full_name}
                            </p>
                          </div>
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-nobel/20 text-gray-300">
                            {t(`statuses.${order.status}`)}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
