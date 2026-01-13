'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Car, Gavel, Package, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Accueil', icon: Home },
  { href: '/cars', label: 'Véhicules', icon: Car },
  { href: '/auctions', label: 'Enchères', icon: Gavel },
  { href: '/dashboard/orders', label: 'Commandes', icon: Package },
  { href: '/dashboard', label: 'Compte', icon: User },
];

export function MobileNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--header-bg)] backdrop-blur-md border-t border-[var(--card-border)] safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-3 py-2 transition-colors',
              isActive(item.href) ? 'text-mandarin' : 'text-[var(--text-muted)]'
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
