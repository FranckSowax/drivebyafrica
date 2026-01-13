import { Metadata } from 'next';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

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

      {/* Main Content */}
      <main className="ml-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}
