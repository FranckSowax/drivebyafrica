'use client';

import { usePathname } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { AdminAuthGuard } from '@/components/admin/AdminAuthGuard';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  // Login page has its own layout
  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-[var(--background)]">
        {/* Sidebar */}
        <AdminSidebar />

        {/* Main Content Area */}
        <div className="ml-64 min-h-screen flex flex-col">
          {/* Top Bar */}
          <AdminTopBar />

          {/* Page Content */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </AdminAuthGuard>
  );
}
