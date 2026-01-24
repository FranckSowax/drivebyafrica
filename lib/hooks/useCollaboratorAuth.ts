'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

/**
 * Hook to protect collaborator pages
 * Redirects to /collaborator/login if user is not authenticated or not a collaborator
 */
export function useCollaboratorAuth() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          // Not authenticated - redirect to login
          router.push('/collaborator/login');
          return;
        }

        // Check if user has collaborator role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!profile || profile.role !== 'collaborator') {
          // Not a collaborator - sign out and redirect to login
          await supabase.auth.signOut();
          router.push('/collaborator/login');
          return;
        }

        // User is authorized
        setIsAuthorized(true);
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/collaborator/login');
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router, supabase]);

  return { isChecking, isAuthorized };
}
