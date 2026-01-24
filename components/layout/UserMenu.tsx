'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  LogOut,
  Settings,
  Package,
  LayoutDashboard,
  FileText,
  Calculator,
  MessageSquare,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/useAuthStore';

// Main menu links - aligned with dashboard sidebar
const userMenuLinks = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/dashboard/quotes', label: 'Mes devis', icon: FileText },
  { href: '/dashboard/orders', label: 'Mes commandes', icon: Package },
  { href: '/dashboard/favorites', label: 'Favoris', icon: Heart },
  { href: '/calculator', label: 'Calculateur', icon: Calculator },
  { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
];

// Bottom menu links
const bottomMenuLinks = [
  { href: '/dashboard/settings', label: 'Paramètres', icon: Settings },
];

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, profile, signOut } = useAuthStore();

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-lg hover:bg-[var(--surface)] transition-colors relative z-10 focus:outline-none focus:ring-2 focus:ring-mandarin/20"
      >
        <Avatar src={profile?.avatar_url} size="sm" />
        <span className="hidden sm:block text-sm text-[var(--text-primary)] font-medium">
          {profile?.full_name || 'Mon compte'}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-64 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-2xl overflow-hidden z-20"
            >
              {/* User Info Header */}
              <div className="p-4 bg-gradient-to-r from-mandarin/10 to-transparent border-b border-[var(--card-border)]">
                <div className="flex items-center gap-3">
                  <Avatar src={profile?.avatar_url} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--text-primary)] truncate">
                      {profile?.full_name || 'Utilisateur'}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Main Navigation */}
              <div className="py-2 px-2">
                {userMenuLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <link.icon className="w-5 h-5 text-[var(--text-muted)]" />
                    {link.label}
                  </Link>
                ))}
              </div>

              {/* Bottom Links */}
              <div className="border-t border-[var(--card-border)] py-2 px-2">
                {bottomMenuLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <link.icon className="w-5 h-5" />
                    {link.label}
                  </Link>
                ))}
              </div>

              {/* Sign Out */}
              <div className="border-t border-[var(--card-border)] p-2">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    signOut();
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Déconnexion
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
