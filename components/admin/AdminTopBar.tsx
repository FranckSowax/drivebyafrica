'use client';

import { usePathname } from 'next/navigation';
import { NotificationBell } from '@/components/notifications';

// Map paths to page titles
const pageTitles: Record<string, string> = {
  '/admin': 'Tableau de bord',
  '/admin/vehicles': 'Véhicules',
  '/admin/shipping': 'Transport',
  '/admin/quotes': 'Devis',
  '/admin/quotes/reassignments': 'Réassignations',
  '/admin/orders': 'Commandes',
  '/admin/users': 'Utilisateurs',
  '/admin/messages': 'Messages',
  '/admin/analytics': 'Analytiques',
  '/admin/currencies': 'Devises',
  '/admin/api': 'APIs externes',
  '/admin/settings': 'Paramètres',
};

export function AdminTopBar() {
  const pathname = usePathname();

  // Get title based on current path
  const getPageTitle = () => {
    // Exact match first
    if (pageTitles[pathname]) {
      return pageTitles[pathname];
    }
    // Try partial match for dynamic routes
    for (const [path, title] of Object.entries(pageTitles)) {
      if (pathname.startsWith(path) && path !== '/admin') {
        return title;
      }
    }
    return 'Admin';
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
      {/* Page Title */}
      <h1 className="text-xl font-semibold text-gray-900">
        {getPageTitle()}
      </h1>

      {/* Right Section - Notifications */}
      <div className="flex items-center gap-4">
        <NotificationBell isAdmin className="text-gray-600 hover:text-gray-900" />
      </div>
    </header>
  );
}
