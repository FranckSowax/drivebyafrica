'use client';

import { useEffect, useState } from 'react';
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
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Use individual selectors for better reactivity
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const initialize = useAuthStore((state) => state.initialize);

  // Ensure auth is initialized
  useEffect(() => {
    if (!isInitialized && !isLoading) {
      console.log('Dashboard: Triggering auth initialization');
      initialize();
    }
  }, [isInitialized, isLoading, initialize]);

  // Handle redirect when not authenticated
  useEffect(() => {
    if (isInitialized && !user && !isRedirecting) {
      console.log('Dashboard: No user after init, redirecting to login');
      setIsRedirecting(true);
      router.replace('/login?redirect=/dashboard');
    }
  }, [isInitialized, user, router, isRedirecting]);

  // Show loading while auth is initializing
  if (!isInitialized || isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Show loading while redirecting (no user)
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
