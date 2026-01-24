'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Check,
  CheckCheck,
  Bell,
  BellOff,
  Package,
  FileText,
  CreditCard,
  Car,
  RefreshCw,
  MessageCircle,
  ShoppingCart,
  AlertTriangle,
  AlertCircle,
  Clock,
  Truck,
  Info,
  XCircle,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import {
  useNotifications,
  useAdminNotifications,
  PRIORITY_COLORS,
  PRIORITY_BG_COLORS,
} from '@/lib/hooks/useNotifications';
import type { Notification, AdminNotification } from '@/types/database';

interface NotificationPanelProps {
  isAdmin?: boolean;
  onClose?: () => void;
}

// Icon mapping
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  package: Package,
  'file-text': FileText,
  'credit-card': CreditCard,
  car: Car,
  'refresh-cw': RefreshCw,
  'message-circle': MessageCircle,
  'shopping-cart': ShoppingCart,
  'alert-triangle': AlertTriangle,
  'alert-circle': AlertCircle,
  clock: Clock,
  truck: Truck,
  info: Info,
  'x-circle': XCircle,
  'check-circle': CheckCircle,
  bell: Bell,
};

function getIcon(iconName: string | null | undefined) {
  if (!iconName) return Bell;
  return ICON_MAP[iconName] || Bell;
}

export function NotificationPanel({ isAdmin = false, onClose }: NotificationPanelProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  // Use appropriate hook
  const userHook = useNotifications({ includeDismissed: false });
  const adminHook = useAdminNotifications();

  const {
    notifications,
    isLoading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
  } = isAdmin ? adminHook : userHook;

  const filteredNotifications = activeTab === 'unread'
    ? notifications.filter(n => {
        if (isAdmin) {
          // For admin notifications, check if current user has read it
          return true; // We'll filter in the component
        }
        return !(n as Notification).read;
      })
    : notifications;

  return (
    <div className="w-[380px] max-h-[500px] bg-cod-gray border border-nobel/20 rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-nobel/20">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-mandarin" />
          <h3 className="font-bold text-white">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold text-white bg-mandarin rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && !isAdmin && (
            <button
              onClick={() => (markAllAsRead as () => Promise<{ success: boolean }>)()}
              className="p-1.5 text-nobel hover:text-white hover:bg-surface rounded-lg transition-colors"
              title="Tout marquer comme lu"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-nobel hover:text-white hover:bg-surface rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-nobel/20">
        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            'flex-1 py-2 text-sm font-medium transition-colors',
            activeTab === 'all'
              ? 'text-mandarin border-b-2 border-mandarin'
              : 'text-nobel hover:text-white'
          )}
        >
          Toutes
        </button>
        <button
          onClick={() => setActiveTab('unread')}
          className={cn(
            'flex-1 py-2 text-sm font-medium transition-colors',
            activeTab === 'unread'
              ? 'text-mandarin border-b-2 border-mandarin'
              : 'text-nobel hover:text-white'
          )}
        >
          Non lues ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="overflow-y-auto max-h-[350px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-mandarin border-t-transparent rounded-full" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <BellOff className="w-12 h-12 text-nobel/50 mb-3" />
            <p className="text-nobel">
              {activeTab === 'unread'
                ? 'Aucune notification non lue'
                : 'Aucune notification'}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredNotifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
              >
                <NotificationItem
                  notification={notification}
                  isAdmin={isAdmin}
                  onMarkAsRead={() => markAsRead(notification.id)}
                  onDismiss={() => dismissNotification(notification.id)}
                  onClose={onClose}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-3 border-t border-nobel/20">
          <Link
            href={isAdmin ? '/admin/notifications' : '/dashboard/notifications'}
            onClick={onClose}
          >
            <Button variant="ghost" size="sm" className="w-full">
              Voir toutes les notifications
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification | AdminNotification;
  isAdmin: boolean;
  onMarkAsRead: () => void;
  onDismiss: () => void;
  onClose?: () => void;
}

function NotificationItem({
  notification,
  isAdmin,
  onMarkAsRead,
  onDismiss,
  onClose,
}: NotificationItemProps) {
  const isRead = isAdmin
    ? false // Admin notifications use read_by array, handled differently
    : (notification as Notification).read;

  const Icon = getIcon(notification.icon);
  const priority = notification.priority || 'normal';
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: fr,
  });

  const handleClick = () => {
    if (!isRead) {
      onMarkAsRead();
    }
    if (notification.action_url && onClose) {
      onClose();
    }
  };

  const content = (
    <div
      className={cn(
        'relative flex gap-3 px-4 py-3 transition-colors cursor-pointer',
        'hover:bg-surface/50',
        !isRead && 'bg-mandarin/5'
      )}
      onClick={handleClick}
    >
      {/* Priority indicator */}
      {priority !== 'normal' && (
        <div
          className={cn(
            'absolute left-0 top-0 bottom-0 w-1',
            priority === 'urgent' && 'bg-red-500',
            priority === 'high' && 'bg-orange-500',
            priority === 'low' && 'bg-gray-500'
          )}
        />
      )}

      {/* Icon */}
      <div
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
          PRIORITY_BG_COLORS[priority]
        )}
      >
        <Icon className={cn('w-5 h-5', PRIORITY_COLORS[priority])} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className={cn('text-sm font-medium', isRead ? 'text-nobel' : 'text-white')}>
            {notification.title}
          </h4>
          <span className="text-xs text-nobel whitespace-nowrap">{timeAgo}</span>
        </div>
        {notification.message && (
          <p className="text-xs text-nobel mt-0.5 line-clamp-2">{notification.message}</p>
        )}
        {notification.action_label && (
          <span className="inline-flex items-center text-xs text-mandarin mt-1 hover:underline">
            {notification.action_label}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-start gap-1">
        {!isRead && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead();
            }}
            className="p-1 text-nobel hover:text-green-500 hover:bg-green-500/10 rounded transition-colors"
            title="Marquer comme lu"
          >
            <Check className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="p-1 text-nobel hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
          title="Supprimer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Unread indicator */}
      {!isRead && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-mandarin rounded-full" />
      )}
    </div>
  );

  if (notification.action_url) {
    return (
      <Link href={notification.action_url} onClick={onClose}>
        {content}
      </Link>
    );
  }

  return content;
}
