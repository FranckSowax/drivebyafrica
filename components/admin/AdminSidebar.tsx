'use client';

import Link from 'next/link';
import Image from 'next/image';
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
  AlertTriangle,
  DollarSign,
  Briefcase,
  Bell,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  subItems?: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
}

interface AdminSidebarProps {
  collapsed?: boolean;
  onCollapse?: (value: boolean) => void;
}

const mainNavItems: NavItem[] = [
  { href: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
  { href: '/admin/vehicles', label: 'Véhicules', icon: Car },
  { href: '/admin/shipping', label: 'Transport', icon: Ship },
  {
    href: '/admin/quotes',
    label: 'Devis',
    icon: FileText,
    subItems: [
      { href: '/admin/quotes/reassignments', label: 'Réassignations', icon: AlertTriangle },
    ]
  },
  { href: '/admin/orders', label: 'Commandes', icon: CreditCard },
  { href: '/admin/batches', label: 'Lots de véhicules', icon: Package },
  { href: '/admin/users', label: 'Utilisateurs', icon: Users },
  { href: '/admin/messages', label: 'Messages', icon: MessageSquare },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
];

const secondaryNavItems = [
  { href: '/admin/analytics', label: 'Analytiques', icon: BarChart3 },
  { href: '/admin/transitaires', label: 'Transitaires', icon: Briefcase },
  { href: '/admin/currencies', label: 'Devises', icon: DollarSign },
  { href: '/admin/api', label: 'APIs externes', icon: Globe },
  { href: '/admin/settings', label: 'Paramètres', icon: Settings },
];

export function AdminSidebar({ collapsed, onCollapse }: AdminSidebarProps = {}) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // Force black text color style for sidebar links
  const linkBaseStyle = 'no-underline';
  const inactiveStyle = `${linkBaseStyle} !text-black hover:!text-black`;
  const activeStyle = `${linkBaseStyle} !text-white`;

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-gradient-to-b from-mandarin via-mandarin to-[#e85d04] z-40 flex flex-col shadow-xl [&_a]:no-underline">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-black/10">
        <Link href="/admin" className="flex items-center gap-2 no-underline">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
            <Image
              src="/Favcon -driveby-africa-dark.png"
              alt="Driveby Africa"
              width={36}
              height={36}
              className="object-contain"
            />
          </div>
          <span className="font-bold text-lg !text-black">
            Driveby<span className="!text-white">Admin</span>
          </span>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <div key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 no-underline',
                  isActive(item.href, item.exact)
                    ? `bg-black shadow-lg ${activeStyle}`
                    : `hover:bg-black/10 ${inactiveStyle}`
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
              {/* Sub-items */}
              {item.subItems && item.subItems.length > 0 && (
                <div className="ml-6 mt-1 space-y-1">
                  {item.subItems.map((subItem) => (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 no-underline',
                        pathname === subItem.href
                          ? `bg-black/80 ${activeStyle}`
                          : `hover:bg-black/10 ${inactiveStyle}`
                      )}
                    >
                      <subItem.icon className="w-4 h-4" />
                      {subItem.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Secondary Navigation */}
        <div className="mt-8 pt-6 border-t border-black/10">
          <p className="px-3 mb-2 text-xs font-bold !text-black/60 uppercase tracking-wider">
            Configuration
          </p>
          <div className="space-y-1">
            {secondaryNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 no-underline',
                  isActive(item.href)
                    ? `bg-black shadow-lg ${activeStyle}`
                    : `hover:bg-black/10 ${inactiveStyle}`
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
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 no-underline hover:bg-black/10',
            inactiveStyle
          )}
        >
          <ChevronLeft className="w-5 h-5" />
          Retour au site
        </Link>
      </div>
    </aside>
  );
}
