'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  Trash2,
  CheckCheck,
  ExternalLink,
  Clock,
  Package,
  ShoppingCart,
  FileText,
  Car,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { authFetch } from '@/lib/supabase/auth-helpers';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  data: Record<string, unknown>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  action_url: string | null;
  action_label: string | null;
  icon: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  read_by: string[];
  dismissed_by: string[];
  created_at: string;
  expires_at: string | null;
}

const priorityConfig = {
  urgent: {
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    icon: AlertCircle,
    label: 'Urgent',
  },
  high: {
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    icon: AlertTriangle,
    label: 'Important',
  },
  normal: {
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: Info,
    label: 'Normal',
  },
  low: {
    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    icon: Bell,
    label: 'Faible',
  },
};

const typeConfig: Record<string, { icon: typeof Bell; label: string }> = {
  new_order: { icon: ShoppingCart, label: 'Nouvelle commande' },
  new_quote: { icon: FileText, label: 'Nouveau devis' },
  new_reassignment: { icon: Car, label: 'Réassignation' },
  payment_received: { icon: CheckCircle, label: 'Paiement reçu' },
  status_update: { icon: Package, label: 'Mise à jour statut' },
  default: { icon: Bell, label: 'Notification' },
};

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const toast = useToast();

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', '100');
      if (filterPriority) params.append('priority', filterPriority);
      if (showUnreadOnly) params.append('unread', 'true');

      const response = await authFetch(`/api/admin/notifications?${params}`);
      const data = await response.json();

      if (data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount || 0);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [filterPriority, showUnreadOnly]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (notificationIds: string[]) => {
    try {
      const response = await authFetch('/api/admin/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ notification_ids: notificationIds }),
      });

      if (response.ok) {
        fetchNotifications();
        toast.success('Notification(s) marquée(s) comme lue(s)');
      }
    } catch (error) {
      console.error('Error marking as read:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await authFetch('/api/admin/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ mark_all: true }),
      });

      if (response.ok) {
        fetchNotifications();
        toast.success('Toutes les notifications marquées comme lues');
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const dismissNotification = async (notificationId: string) => {
    try {
      const response = await authFetch(`/api/admin/notifications?id=${notificationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchNotifications();
        toast.success('Notification supprimée');
      }
    } catch (error) {
      console.error('Error dismissing notification:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        n.title.toLowerCase().includes(searchLower) ||
        (n.message && n.message.toLowerCase().includes(searchLower)) ||
        n.type.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const getNotificationIcon = (notification: AdminNotification) => {
    const config = typeConfig[notification.type] || typeConfig.default;
    const Icon = config.icon;
    return <Icon className="w-5 h-5" />;
  };

  const isUnread = (notification: AdminNotification) => {
    // This would require the current user ID to check properly
    // For now, we'll assume read_by is empty means unread
    return !notification.read_by || notification.read_by.length === 0;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Bell className="w-7 h-7 text-mandarin" />
            Notifications
          </h1>
          <p className="text-gray-400 mt-1">
            {total} notification{total > 1 ? 's' : ''} • {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNotifications}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Actualiser
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={markAllAsRead}
              leftIcon={<CheckCheck className="w-4 h-4" />}
            >
              Tout marquer comme lu
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(priorityConfig).map(([key, config]) => {
          const count = notifications.filter((n) => n.priority === key).length;
          const Icon = config.icon;
          return (
            <div
              key={key}
              onClick={() => setFilterPriority(filterPriority === key ? '' : key)}
              className={`p-4 cursor-pointer transition-all rounded-xl border border-nobel/20 bg-[var(--surface)] ${
                filterPriority === key ? 'ring-2 ring-mandarin' : 'hover:border-nobel/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{count}</p>
                  <p className="text-sm text-gray-400">{config.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Rechercher dans les notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-cod-gray border border-nobel/30 rounded-lg text-white placeholder-gray-500 focus:border-mandarin focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-4 py-2 bg-cod-gray border border-nobel/30 rounded-lg text-white focus:border-mandarin focus:outline-none"
            >
              <option value="">Toutes priorités</option>
              <option value="urgent">Urgent</option>
              <option value="high">Important</option>
              <option value="normal">Normal</option>
              <option value="low">Faible</option>
            </select>
            <Button
              variant={showUnreadOnly ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              leftIcon={<Filter className="w-4 h-4" />}
            >
              Non lues
            </Button>
          </div>
        </div>
      </Card>

      {/* Notifications List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-mandarin" />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <Card className="p-12 text-center">
          <Bell className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Aucune notification</h3>
          <p className="text-gray-400">
            {searchTerm || filterPriority
              ? 'Aucune notification ne correspond à vos critères'
              : 'Vous êtes à jour !'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const priorityConf = priorityConfig[notification.priority];
            const unread = isUnread(notification);

            return (
              <Card
                key={notification.id}
                className={`p-4 transition-all hover:border-nobel/50 ${
                  unread ? 'border-l-4 border-l-mandarin bg-mandarin/5' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`p-2 rounded-lg flex-shrink-0 ${priorityConf.color}`}>
                    {getNotificationIcon(notification)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className={`font-semibold ${unread ? 'text-white' : 'text-gray-300'}`}>
                          {notification.title}
                        </h3>
                        {notification.message && (
                          <p className="text-sm text-gray-400 mt-1">{notification.message}</p>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs ${priorityConf.color}`}>
                        {priorityConf.label}
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </span>
                      <span className="text-gray-600">•</span>
                      <span>{format(new Date(notification.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</span>
                      {notification.related_entity_type && (
                        <>
                          <span className="text-gray-600">•</span>
                          <span className="capitalize">{notification.related_entity_type}</span>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3">
                      {notification.action_url && (
                        <Link href={notification.action_url}>
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<ExternalLink className="w-4 h-4" />}
                          >
                            {notification.action_label || 'Voir'}
                          </Button>
                        </Link>
                      )}
                      {unread && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead([notification.id])}
                          leftIcon={<CheckCircle className="w-4 h-4" />}
                        >
                          Marquer comme lu
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dismissNotification(notification.id)}
                        leftIcon={<Trash2 className="w-4 h-4" />}
                        className="text-red-400 hover:text-red-300"
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
