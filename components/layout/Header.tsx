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
    <header className="fixed top-0 left-0 right-0 z-50 h-14 sm:h-16 bg-[var(--header-bg)] backdrop-blur-md border-b border-[var(--card-border)]">
      <div className="container mx-auto px-3 sm:px-4 h-full">
        <div className="flex items-center justify-between h-full gap-2">
          {/* Logo - Ensure clickable on mobile with proper touch target */}
          <Link
            href="/"
            className="flex-shrink-0 relative z-20 block hover:opacity-90 active:opacity-70 transition-opacity touch-manipulation min-h-[44px] flex items-center"
          >
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
            <LocaleSwitcher />

            {/* Theme Toggle */}
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            {user ? (
              <>
                {/* Notifications */}
                <NotificationBell />

                {/* Favorites */}
                <Link
                  href="/dashboard/favorites"
                  className="p-2 text-[var(--text-muted)] hover:text-mandarin active:text-mandarin/70 transition-colors hidden sm:block touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Favoris"
                >
                  <Heart className="w-5 h-5" />
                </Link>

                {/* User Menu */}
                <div className="pl-1">
                  <UserMenu />
                </div>
              </>
            ) : (
              <AuthButtons />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
