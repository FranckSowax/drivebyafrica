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
} from 'lucide-react';

interface CollaboratorSidebarProps {
  className?: string;
  onLogout: () => void;
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
];

export function CollaboratorSidebar({ className, onLogout }: CollaboratorSidebarProps) {
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
      <div className="p-6 border-b border-nobel/20">
        <Link href="/collaborator" className="flex items-center gap-3">
          <Image
            src="/logo-driveby-africa-dark.png"
            alt="Driveby Africa"
            width={180}
            height={60}
            className="h-10 w-auto"
          />
        </Link>
        <p className="text-xs text-gray-500 mt-2">{t('collaborator.portal')}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all',
                'text-sm font-medium',
                active
                  ? 'bg-mandarin text-white'
                  : 'text-gray-400 hover:text-white hover:bg-nobel/20'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{t(`collaborator.${item.key}`)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-nobel/20">
        <button
          onClick={() => {
            setIsMobileOpen(false);
            onLogout();
          }}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg w-full',
            'text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10',
            'transition-all'
          )}
        >
          <LogOut className="h-5 w-5" />
          <span>{t('collaborator.logout')}</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-lg bg-nobel/20 text-white"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-cod-gray border-r border-nobel/20',
          'flex flex-col transform transition-transform duration-300',
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
          'hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 bg-cod-gray border-r border-nobel/20',
          'flex-col',
          className
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
