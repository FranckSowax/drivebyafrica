'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  LogOut,
  Settings,
  Package,
  LogIn,
  UserPlus,
  LayoutDashboard,
  FileText,
  Calculator,
  MessageSquare,
  HelpCircle,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LocaleSwitcher } from '@/components/ui/LocaleSwitcher';
import { useTheme } from '@/components/providers/ThemeProvider';
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
  { href: '/help', label: 'Aide', icon: HelpCircle },
];

export function Header() {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, profile, signOut } = useAuthStore();
  const { theme, mounted } = useTheme();

  // Use dark logo as default during SSR to prevent flash
  // The inline script sets the correct theme before React hydrates
  const logoSrc = mounted
    ? (theme === 'dark' ? '/logo-driveby-africa.png' : '/logo-driveby-africa-dark.png')
    : '/logo-driveby-africa-dark.png';

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 sm:h-16 bg-[var(--header-bg)] backdrop-blur-md border-b border-[var(--card-border)]">
      <div className="container mx-auto px-3 sm:px-4 h-full">
        <div className="flex items-center justify-between h-full gap-2">
          {/* Logo - Fixed size to prevent compression */}
          <Link href="/" className="flex-shrink-0">
            <Image
              src={logoSrc}
              alt="Driveby Africa"
              width={200}
              height={50}
              className="h-8 sm:h-10 w-auto"
              priority
            />
          </Link>

          {/* Right Side - Responsive layout */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Locale Switcher (Language & Currency) */}
            <LocaleSwitcher />

            {/* Theme Toggle */}
            <ThemeToggle />

            {user ? (
              <>
                {/* Favorites */}
                <Link
                  href="/dashboard/favorites"
                  className="relative p-2 text-[var(--text-muted)] hover:text-mandarin transition-colors"
                >
                  <Heart className="w-5 h-5" />
                </Link>

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-1 rounded-lg hover:bg-[var(--surface)] transition-colors"
                  >
                    <Avatar src={profile?.avatar_url} size="sm" />
                    <span className="hidden sm:block text-sm text-[var(--text-primary)]">
                      {profile?.full_name || 'Mon compte'}
                    </span>
                  </button>

                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setIsUserMenuOpen(false)}
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
                                onClick={() => setIsUserMenuOpen(false)}
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
                                onClick={() => setIsUserMenuOpen(false)}
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
                                setIsUserMenuOpen(false);
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
              </>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Mobile: Icon buttons only */}
                <Link
                  href="/login"
                  className="sm:hidden inline-flex items-center justify-center p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface)] active:bg-[var(--surface)] transition-colors"
                  aria-label="Connexion"
                >
                  <LogIn className="w-5 h-5" />
                </Link>
                <Link
                  href="/register"
                  className="sm:hidden inline-flex items-center justify-center p-2 rounded-lg bg-mandarin text-white hover:bg-orange-600 active:bg-orange-700 transition-colors"
                  aria-label="Inscription"
                >
                  <UserPlus className="w-5 h-5" />
                </Link>

                {/* Desktop: Text buttons */}
                <Link
                  href="/login"
                  className="hidden sm:inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg h-9 px-4 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface)] active:bg-[var(--surface)]"
                >
                  Connexion
                </Link>
                <Link
                  href="/register"
                  className="hidden sm:inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg h-9 px-4 text-sm bg-mandarin text-white hover:bg-orange-600 active:bg-orange-700 shadow-md"
                >
                  Inscription
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
