'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Car,
  Ship,
  FileText,
  Users,
  Settings,
  BarChart3,
  MessageSquare,
  CreditCard,
  Globe,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const mainNavItems = [
  { href: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
  { href: '/admin/vehicles', label: 'Véhicules', icon: Car },
  { href: '/admin/shipping', label: 'Transport', icon: Ship },
  { href: '/admin/quotes', label: 'Devis', icon: FileText },
  { href: '/admin/orders', label: 'Commandes', icon: CreditCard },
  { href: '/admin/users', label: 'Utilisateurs', icon: Users },
  { href: '/admin/messages', label: 'Messages', icon: MessageSquare },
];

const secondaryNavItems = [
  { href: '/admin/analytics', label: 'Analytiques', icon: BarChart3 },
  { href: '/admin/api', label: 'APIs externes', icon: Globe },
  { href: '/admin/settings', label: 'Paramètres', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[var(--card-bg)] border-r border-[var(--card-border)] z-40 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-[var(--card-border)]">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-mandarin rounded-lg flex items-center justify-center">
            <Car className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-[var(--text-primary)]">
            Driveby<span className="text-mandarin">Admin</span>
          </span>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive(item.href, item.exact)
                  ? 'bg-mandarin/10 text-mandarin'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </div>

        {/* Secondary Navigation */}
        <div className="mt-8 pt-6 border-t border-[var(--card-border)]">
          <p className="px-3 mb-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Configuration
          </p>
          <div className="space-y-1">
            {secondaryNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-mandarin/10 text-mandarin'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Back to Site */}
      <div className="px-3 py-4 border-t border-[var(--card-border)]">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Retour au site
        </Link>
      </div>
    </aside>
  );
}
