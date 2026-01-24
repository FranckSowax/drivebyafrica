'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Home, Car, Calculator, Heart, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';

const navItems = [
  { href: '/', label: 'Accueil', icon: Home },
  { href: '/cars', label: 'Véhicules', icon: Car },
  { href: '/calculator', label: 'Estimer', icon: Calculator },
  { href: '/dashboard/favorites', label: 'Favoris', icon: Heart, requiresAuth: true },
  { href: '/dashboard', label: 'Compte', icon: User, requiresAuth: true },
];

function MobileNavContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  // Build current URL with search params for redirect after login
  const currentUrl = searchParams.toString()
    ? `${pathname}?${searchParams.toString()}`
    : pathname;

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const handleNavClick = (e: React.MouseEvent, item: typeof navItems[0]) => {
    if (item.requiresAuth && !user) {
      e.preventDefault();
      // Redirect to login with return URL to current page
      router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`);
    }
  };

  return (
    <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
      {navItems.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={(e) => handleNavClick(e, item)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-3 py-2 transition-all duration-200 rounded-lg active:scale-95',
              active 
                ? 'text-mandarin bg-mandarin/5' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]'
            )}
          >
            <item.icon className={cn("w-5 h-5", active && "fill-current")} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function MobileNavFallback() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const handleNavClick = (e: React.MouseEvent, item: typeof navItems[0]) => {
    if (item.requiresAuth && !user) {
      e.preventDefault();
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  };

  return (
    <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
      {navItems.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={(e) => handleNavClick(e, item)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-3 py-2 transition-all duration-200 rounded-lg active:scale-95',
              active 
                ? 'text-mandarin bg-mandarin/5' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]'
            )}
          >
            <item.icon className={cn("w-5 h-5", active && "fill-current")} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function MobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--header-bg)] backdrop-blur-md border-t border-[var(--card-border)] safe-area-inset-bottom pb-[env(safe-area-inset-bottom)]">
      <Suspense fallback={<MobileNavFallback />}>
        <MobileNavContent />
      </Suspense>
    </nav>
  );
}
