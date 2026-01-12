'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Car,
  Gavel,
  Package,
  Heart,
  Wallet,
  MessageSquare,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const sidebarLinks = [
  {
    label: 'Tableau de bord',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Mes enchères',
    href: '/dashboard/bids',
    icon: Gavel,
  },
  {
    label: 'Mes commandes',
    href: '/dashboard/orders',
    icon: Package,
  },
  {
    label: 'Favoris',
    href: '/dashboard/favorites',
    icon: Heart,
  },
  {
    label: 'Portefeuille',
    href: '/dashboard/wallet',
    icon: Wallet,
  },
  {
    label: 'Messages',
    href: '/dashboard/messages',
    icon: MessageSquare,
  },
];

const bottomLinks = [
  {
    label: 'Paramètres',
    href: '/dashboard/settings',
    icon: Settings,
  },
  {
    label: 'Aide',
    href: '/help',
    icon: HelpCircle,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-cod-gray border-r border-nobel/20">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-nobel/20">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-mandarin rounded-lg flex items-center justify-center">
            <Car className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-white">
            Driveby<span className="text-mandarin">Africa</span>
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {sidebarLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive(link.href)
                    ? 'bg-mandarin/10 text-mandarin'
                    : 'text-nobel hover:text-white hover:bg-surface-hover'
                )}
              >
                <link.icon className="w-5 h-5" />
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom Links */}
      <div className="px-3 py-4 border-t border-nobel/20">
        <ul className="space-y-1">
          {bottomLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive(link.href)
                    ? 'bg-mandarin/10 text-mandarin'
                    : 'text-nobel hover:text-white hover:bg-surface-hover'
                )}
              >
                <link.icon className="w-5 h-5" />
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
