'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useCollaboratorLocale } from './CollaboratorLocaleProvider';
import {
  LayoutDashboard,
  Package,
  LogOut,
  X,
  Menu,
  Car,
  Layers,
  BookOpen,
} from 'lucide-react';

interface CollaboratorSidebarProps {
  className?: string;
  onLogout?: () => void;
  collapsed?: boolean;
  onCollapse?: (value: boolean) => void;
}

const navItems = [
  {
    key: 'dashboard',
    href: '/collaborator',
    icon: LayoutDashboard,
  },
  {
    key: 'orders',
    href: '/collaborator/orders',
    icon: Package,
  },
  {
    key: 'vehicles',
    href: '/collaborator/vehicles',
    icon: Car,
  },
  {
    key: 'batches',
    href: '/collaborator/batches',
    icon: Layers,
  },
  {
    key: 'guides',
    href: '/collaborator/guides',
    icon: BookOpen,
  },
];

export function CollaboratorSidebar({ className, onLogout, collapsed, onCollapse }: CollaboratorSidebarProps) {
  const { t } = useCollaboratorLocale();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/collaborator') {
      return pathname === '/collaborator';
    }
    return pathname.startsWith(href);
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <Link href="/collaborator" className="flex items-center gap-3">
          <Image
            src="/logo-driveby-africa.png"
            alt="Driveby Africa"
            width={180}
            height={60}
            className="h-10 w-auto"
          />
        </Link>
        <p className="text-xs text-gray-400 mt-2">{t('collaborator.portal')}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                'text-sm font-medium',
                active
                  ? 'bg-mandarin text-white shadow-lg shadow-mandarin/20'
                  : 'text-white hover:text-mandarin hover:bg-gray-700/50'
              )}
            >
              <Icon className={cn('h-5 w-5', active ? 'text-white' : 'text-mandarin')} />
              <span>{t(`collaborator.${item.key}`)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      {onLogout && (
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={() => {
              setIsMobileOpen(false);
              onLogout();
            }}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl w-full',
              'text-sm font-medium text-gray-300 hover:text-red-400 hover:bg-red-500/10',
              'transition-all'
            )}
          >
            <LogOut className="h-5 w-5" />
            <span>{t('collaborator.logout')}</span>
          </button>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Mobile menu button - positioned better */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2.5 rounded-xl bg-mandarin/90 text-white shadow-lg shadow-mandarin/20 backdrop-blur-sm"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay with blur */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-gray-800 border-r border-gray-700',
          'flex flex-col transform transition-transform duration-300 ease-out',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Close button */}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-nobel/20"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 bg-gray-800 border-r border-gray-700',
          'flex-col',
          className
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
