import { Metadata } from 'next';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopBar } from '@/components/admin/AdminTopBar';

export const metadata: Metadata = {
  title: 'Admin - Driveby Africa',
  description: 'Administration de la plateforme Driveby Africa',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
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
  );
}
