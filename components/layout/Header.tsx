'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  User,
  LogOut,
  Settings,
  Package,
  Wallet,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useTheme } from '@/components/providers/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';

const userMenuLinks = [
  { href: '/dashboard', label: 'Tableau de bord', icon: User },
  { href: '/dashboard/orders', label: 'Mes commandes', icon: Package },
  { href: '/dashboard/favorites', label: 'Favoris', icon: Heart },
  { href: '/dashboard/wallet', label: 'Portefeuille', icon: Wallet },
  { href: '/dashboard/settings', label: 'Paramètres', icon: Settings },
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
    <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-[var(--header-bg)] backdrop-blur-md border-b border-[var(--card-border)]">
      <div className="container mx-auto px-4 h-full">
        <div className="flex items-center justify-between h-full">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src={logoSrc}
              alt="Driveby Africa"
              width={200}
              height={50}
              className="h-10 w-auto"
              priority
            />
          </Link>

          {/* Right Side */}
          <div className="flex items-center gap-3">
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
                          className="absolute right-0 mt-2 w-56 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-xl overflow-hidden z-20"
                        >
                          <div className="p-3 border-b border-[var(--card-border)]">
                            <p className="font-medium text-[var(--text-primary)] truncate">
                              {profile?.full_name || 'Utilisateur'}
                            </p>
                            <p className="text-xs text-[var(--text-muted)] truncate">
                              {user.email}
                            </p>
                          </div>
                          <div className="py-2">
                            {userMenuLinks.map((link) => (
                              <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsUserMenuOpen(false)}
                                className="flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface)] transition-colors"
                              >
                                <link.icon className="w-4 h-4 text-[var(--text-muted)]" />
                                {link.label}
                              </Link>
                            ))}
                          </div>
                          <div className="border-t border-[var(--card-border)] py-2">
                            <button
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                signOut();
                              }}
                              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-500 hover:bg-[var(--surface)] transition-colors"
                            >
                              <LogOut className="w-4 h-4" />
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
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg h-8 px-3 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface)] active:bg-[var(--surface)]"
                >
                  Connexion
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg h-8 px-3 text-sm bg-mandarin text-white hover:bg-orange-600 active:bg-orange-700 shadow-md"
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
