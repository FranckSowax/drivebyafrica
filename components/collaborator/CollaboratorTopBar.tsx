'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useCollaboratorLocale } from './CollaboratorLocaleProvider';
import { CollaboratorLanguageSwitcher } from './CollaboratorLanguageSwitcher';
import { CollaboratorSettingsModal } from './CollaboratorSettingsModal';
import { Bell, User, Check, X, LogOut, ChevronDown, Settings } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message?: string;
  created_at: string;
  read: boolean;
}

interface CollaboratorTopBarProps {
  title?: string;
  userName?: string;
  userEmail?: string;
  notifications?: Notification[];
  unreadCount?: number;
  onMarkAsRead?: (id: string) => void;
  onMarkAllRead?: () => void;
  onDismiss?: (id: string) => void;
  onLogout?: () => void;
}

export function CollaboratorTopBar({
  title,
  userName,
  userEmail,
  notifications = [],
  unreadCount = 0,
  onMarkAsRead,
  onMarkAllRead,
  onDismiss,
  onLogout,
}: CollaboratorTopBarProps) {
  const { t } = useCollaboratorLocale();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);

    if (diffMins < 1) return t('time.justNow');
    if (diffMins < 60) return t('time.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('time.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('time.daysAgo', { count: diffDays });
    return t('time.weeksAgo', { count: diffWeeks });
  };

  return (
    <header className="h-16 bg-cod-gray border-b border-nobel/20 flex items-center justify-between px-4 lg:px-6">
      {/* Title - with left margin on mobile for menu button */}
      <h1 className="text-lg lg:text-xl font-semibold text-white ml-12 lg:ml-0">
        {title}
      </h1>

      {/* Right section */}
      <div className="flex items-center gap-3 lg:gap-4">
        {/* Language switcher */}
        <CollaboratorLanguageSwitcher variant="compact" />

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={cn(
              'relative p-2 rounded-lg transition-colors',
              'text-gray-400 hover:text-white hover:bg-nobel/20',
              showNotifications && 'bg-nobel/20 text-white'
            )}
            aria-label={t('notifications.title')}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs font-bold bg-mandarin text-white rounded-full">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-cod-gray border border-nobel/20 rounded-xl shadow-xl z-50 overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-nobel/20 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{t('notifications.title')}</h3>
                {unreadCount > 0 && onMarkAllRead && (
                  <button
                    onClick={onMarkAllRead}
                    className="text-xs text-mandarin hover:text-mandarin/80"
                  >
                    {t('notifications.markAllRead')}
                  </button>
                )}
              </div>

              {/* Notifications list */}
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t('notifications.noNotifications')}</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        'p-4 border-b border-nobel/10 last:border-b-0',
                        'hover:bg-nobel/10 transition-colors',
                        !notification.read && 'bg-mandarin/5'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            'text-sm font-medium truncate',
                            notification.read ? 'text-gray-300' : 'text-white'
                          )}>
                            {notification.title}
                          </p>
                          {notification.message && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                          )}
                          <p className="text-xs text-gray-600 mt-1">
                            {formatTime(notification.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {!notification.read && onMarkAsRead && (
                            <button
                              onClick={() => onMarkAsRead(notification.id)}
                              className="p-1 text-gray-500 hover:text-mandarin"
                              title={t('notifications.markAsRead')}
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                          {onDismiss && (
                            <button
                              onClick={() => onDismiss(notification.id)}
                              className="p-1 text-gray-500 hover:text-red-400"
                              title={t('notifications.dismiss')}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative pl-3 border-l border-nobel/20" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={cn(
              'flex items-center gap-2 p-1.5 rounded-lg transition-colors',
              'hover:bg-nobel/20',
              showUserMenu && 'bg-nobel/20'
            )}
          >
            <div className="h-8 w-8 rounded-full bg-mandarin/20 flex items-center justify-center">
              <User className="h-4 w-4 text-mandarin" />
            </div>
            {userName && (
              <span className="text-sm text-gray-300 hidden sm:inline max-w-[120px] truncate">
                {userName}
              </span>
            )}
            <ChevronDown className={cn(
              'h-4 w-4 text-gray-400 transition-transform hidden sm:block',
              showUserMenu && 'rotate-180'
            )} />
          </button>

          {/* User dropdown menu */}
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-cod-gray border border-nobel/20 rounded-xl shadow-xl z-50 overflow-hidden">
              {userName && (
                <div className="px-4 py-3 border-b border-nobel/20">
                  <p className="text-sm font-medium text-white truncate">{userName}</p>
                  {userEmail && (
                    <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                  )}
                  <p className="text-xs text-gray-600 mt-0.5">{t('collaborator.portal')}</p>
                </div>
              )}

              {/* Settings */}
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  setShowSettingsModal(true);
                }}
                className="w-full px-4 py-3 flex items-center gap-3 text-sm text-gray-300 hover:bg-nobel/10 hover:text-white transition-colors border-b border-nobel/10"
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>

              {/* Logout */}
              {onLogout && (
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout();
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 text-sm text-gray-300 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  {t('collaborator.logout')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <CollaboratorSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        userEmail={userEmail}
      />
    </header>
  );
}
