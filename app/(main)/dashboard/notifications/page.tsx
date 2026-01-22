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
  ArrowLeft,
  Heart,
  CreditCard,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  data: Record<string, unknown>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: string;
  action_url: string | null;
  action_label: string | null;
  icon: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  read: boolean;
  dismissed: boolean;
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
    label: 'Info',
  },
};

const typeConfig: Record<string, { icon: typeof Bell; label: string; color: string }> = {
  order_created: { icon: ShoppingCart, label: 'Commande créée', color: 'text-green-400' },
  order_update: { icon: Package, label: 'Mise à jour commande', color: 'text-blue-400' },
  quote_accepted: { icon: CheckCircle, label: 'Devis accepté', color: 'text-green-400' },
  quote_expired: { icon: Clock, label: 'Devis expiré', color: 'text-yellow-400' },
  alternatives_available: { icon: Car, label: 'Alternatives disponibles', color: 'text-mandarin' },
  reassignment_completed: { icon: CheckCircle, label: 'Réassignation terminée', color: 'text-green-400' },
  payment_received: { icon: CreditCard, label: 'Paiement reçu', color: 'text-green-400' },
  favorite_price_drop: { icon: Heart, label: 'Baisse de prix', color: 'text-red-400' },
  default: { icon: Bell, label: 'Notification', color: 'text-gray-400' },
};

export default function UserNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const toast = useToast();

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', '100');
      if (showUnreadOnly) params.append('unread', 'true');

      const response = await fetch(`/api/notifications?${params}`);
      const data = await response.json();

      if (data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount || 0);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Erreur lors du chargement des notifications');
    } finally {
      setLoading(false);
    }
  }, [showUnreadOnly, toast]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_ids: notificationIds }),
      });

      if (response.ok) {
        fetchNotifications();
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchNotifications();
      }
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const dismissAllNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?all=true', {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchNotifications();
        toast.success('Toutes les notifications supprimées');
      }
    } catch (error) {
      console.error('Error dismissing all:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        n.title.toLowerCase().includes(searchLower) ||
        (n.message && n.message.toLowerCase().includes(searchLower))
      );
    }
    return true;
  });

  const getNotificationConfig = (notification: Notification) => {
    return typeConfig[notification.type] || typeConfig.default;
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--background)] border-b border-nobel/20 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-mandarin" />
                  Notifications
                </h1>
                <p className="text-sm text-gray-400">
                  {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout à jour'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchNotifications}
            >
              <RefreshCw className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Actions Bar */}
        {notifications.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Search on mobile */}
            <div className="flex-1 relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-cod-gray border border-nobel/30 rounded-lg text-white placeholder-gray-500 focus:border-mandarin focus:outline-none text-sm"
              />
            </div>
            <Button
              variant={showUnreadOnly ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            >
              <Filter className="w-4 h-4 mr-1" />
              Non lues
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Tout lire
              </Button>
            )}
          </div>
        )}

        {/* Notifications List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-mandarin" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Card className="p-12 text-center">
            <Bell className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              {searchTerm ? 'Aucun résultat' : 'Aucune notification'}
            </h3>
            <p className="text-gray-400">
              {searchTerm
                ? 'Essayez avec d\'autres termes de recherche'
                : 'Vous n\'avez pas encore de notifications'}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => {
              const config = getNotificationConfig(notification);
              const priorityConf = priorityConfig[notification.priority];
              const Icon = config.icon;

              return (
                <Card
                  key={notification.id}
                  className={`p-4 transition-all ${
                    !notification.read
                      ? 'border-l-4 border-l-mandarin bg-mandarin/5'
                      : 'hover:border-nobel/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`p-2 rounded-full bg-cod-gray flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={`font-medium ${!notification.read ? 'text-white' : 'text-gray-300'}`}>
                          {notification.title}
                        </h3>
                        {notification.priority === 'urgent' || notification.priority === 'high' ? (
                          <span className={`px-2 py-0.5 rounded text-xs flex-shrink-0 ${priorityConf.color}`}>
                            {priorityConf.label}
                          </span>
                        ) : null}
                      </div>

                      {notification.message && (
                        <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                      )}

                      {/* Time */}
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3">
                        {notification.action_url && (
                          <Link href={notification.action_url}>
                            <Button
                              variant="primary"
                              size="sm"
                            >
                              {notification.action_label || 'Voir'}
                              <ExternalLink className="w-4 h-4 ml-1" />
                            </Button>
                          </Link>
                        )}
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead([notification.id])}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Lu
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => dismissNotification(notification.id)}
                          className="text-gray-500 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}

            {/* Clear All Button */}
            {notifications.length > 5 && (
              <div className="text-center pt-4">
                <Button
                  variant="ghost"
                  onClick={dismissAllNotifications}
                  className="text-gray-500 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer toutes les notifications
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
