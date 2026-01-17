'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useNotifications, useAdminNotifications } from '@/lib/hooks/useNotifications';
import { NotificationPanel } from './NotificationPanel';
import { useAuthStore } from '@/store/useAuthStore';

interface NotificationBellProps {
  className?: string;
  isAdmin?: boolean;
}

export function NotificationBell({ className, isAdmin = false }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { profile } = useAuthStore();

  // Use appropriate hook based on context
  const userNotifications = useNotifications({ includeDismissed: false });
  const adminNotifications = useAdminNotifications();

  const showAdmin = isAdmin && (profile?.role === 'admin' || profile?.role === 'super_admin');
  const { unreadCount, urgentNotifications } = showAdmin ? adminNotifications : userNotifications;

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        panelRef.current &&
        bellRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        !bellRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const hasUrgent = urgentNotifications.length > 0;

  return (
    <div className="relative">
      <button
        ref={bellRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative p-2 rounded-lg transition-colors',
          'hover:bg-surface text-nobel hover:text-white',
          isOpen && 'bg-surface text-white',
          className
        )}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
      >
        <Bell className="w-5 h-5" />

        {/* Badge */}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={cn(
              'absolute -top-0.5 -right-0.5 flex items-center justify-center',
              'min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white rounded-full',
              hasUrgent ? 'bg-red-500' : 'bg-mandarin'
            )}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}

        {/* Pulse animation for urgent */}
        {hasUrgent && (
          <span className="absolute -top-0.5 -right-0.5 flex h-[18px] w-[18px]">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          </span>
        )}
      </button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-50"
          >
            <NotificationPanel
              isAdmin={showAdmin}
              onClose={() => setIsOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
