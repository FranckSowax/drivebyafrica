'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuthStore } from '@/store/useAuthStore';
import { Spinner } from '@/components/ui/Spinner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading, isInitialized } = useAuthStore();

  useEffect(() => {
    // Wait for auth to initialize before checking
    if (isInitialized && !user) {
      router.replace('/login?redirect=/dashboard');
    }
  }, [isInitialized, user, router]);

  // Show loading while auth is initializing
  if (!isInitialized || isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Don't render until we have a user
  if (!user) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0 border-r border-nobel/20">
        <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          <Sidebar />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
