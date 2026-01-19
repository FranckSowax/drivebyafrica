'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Loader2 } from 'lucide-react';

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

export function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const checkAuth = async () => {
      // Skip auth check for login page
      if (pathname === '/admin/login') {
        setIsAuthorized(true);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/admin/login');
        return;
      }

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = profile?.role as string | undefined;
      const isAdmin = role === 'admin' || role === 'super_admin';

      if (!isAdmin) {
        await supabase.auth.signOut();
        router.push('/admin/login');
        return;
      }

      setIsAuthorized(true);
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' && pathname !== '/admin/login') {
          router.push('/admin/login');
        } else if (event === 'SIGNED_IN' && session?.user) {
          // Re-check admin status on sign in
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          const role = profile?.role as string | undefined;
          const isAdmin = role === 'admin' || role === 'super_admin';

          if (!isAdmin) {
            await supabase.auth.signOut();
            router.push('/admin/login');
          } else {
            setIsAuthorized(true);
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router, supabase]);

  // Show loading while checking auth
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-cod-gray flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-royal-blue animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
