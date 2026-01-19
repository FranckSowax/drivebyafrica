'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LocaleSwitcher } from '@/components/ui/LocaleSwitcher';
import { NotificationBell } from '@/components/notifications';
import { useTheme } from '@/components/providers/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { AuthButtons } from './AuthButtons';
import { UserMenu } from './UserMenu';

export function Header() {
  const { user } = useAuthStore();
  const { theme, mounted } = useTheme();

  // Use dark logo as default during SSR to prevent flash
  // The inline script sets the correct theme before React hydrates
  const logoSrc = mounted
    ? (theme === 'dark' ? '/logo-driveby-africa.png' : '/logo-driveby-africa-dark.png')
    : '/logo-driveby-africa-dark.png';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 sm:h-16 bg-[var(--header-bg)] backdrop-blur-md border-b border-[var(--card-border)] transition-all duration-200">
      <div className="container mx-auto px-3 sm:px-4 h-full">
        <div className="flex items-center justify-between h-full gap-2">
          {/* Logo - Fixed size to prevent compression */}
          <Link href="/" className="flex-shrink-0 relative z-20 block hover:opacity-90 transition-opacity">
            <Image
              src={logoSrc}
              alt="Driveby Africa"
              width={200}
              height={50}
              className="h-8 sm:h-10 w-auto object-contain"
              priority
            />
          </Link>

          {/* Right Side - Responsive layout */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Locale Switcher (Language & Currency) */}
            <div className="relative z-30">
              <LocaleSwitcher />
            </div>

            {/* Theme Toggle */}
            <div className="hidden sm:block relative z-20">
              <ThemeToggle />
            </div>

            {user ? (
              <>
                {/* Notifications */}
                <div className="relative z-20">
                  <NotificationBell />
                </div>

                {/* Favorites */}
                <Link
                  href="/dashboard/favorites"
                  className="relative z-20 p-2 text-[var(--text-muted)] hover:text-mandarin transition-colors hidden sm:block"
                  aria-label="Favoris"
                >
                  <Heart className="w-5 h-5" />
                </Link>

                {/* User Menu */}
                <div className="relative z-40 pl-1">
                  <UserMenu />
                </div>
              </>
            ) : (
              <div className="relative z-20">
                <AuthButtons />
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
