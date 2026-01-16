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
  Zap,
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
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-gradient-to-b from-mandarin via-mandarin to-[#e85d04] z-40 flex flex-col shadow-xl">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-black/10">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center shadow-lg">
            <Zap className="w-5 h-5 text-mandarin" />
          </div>
          <span className="font-bold text-lg text-black">
            Driveby<span className="text-white">Admin</span>
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
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
                isActive(item.href, item.exact)
                  ? 'bg-black text-white shadow-lg'
                  : 'text-black/80 hover:text-black hover:bg-black/10'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </div>

        {/* Secondary Navigation */}
        <div className="mt-8 pt-6 border-t border-black/10">
          <p className="px-3 mb-2 text-xs font-bold text-black/60 uppercase tracking-wider">
            Configuration
          </p>
          <div className="space-y-1">
            {secondaryNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
                  isActive(item.href)
                    ? 'bg-black text-white shadow-lg'
                    : 'text-black/80 hover:text-black hover:bg-black/10'
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
      <div className="px-3 py-4 border-t border-black/10">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-black/80 hover:text-black hover:bg-black/10 transition-all duration-200"
        >
          <ChevronLeft className="w-5 h-5" />
          Retour au site
        </Link>
      </div>
    </aside>
  );
}
