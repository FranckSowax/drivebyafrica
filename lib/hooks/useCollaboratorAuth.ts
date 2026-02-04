'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface CollaboratorAuthState {
  isChecking: boolean;
  isAuthorized: boolean;
  user: User | null;
  userName: string;
  userEmail: string;
  signOut: () => Promise<void>;
}

// Valid roles for collaborator portal access
const ALLOWED_ROLES = ['collaborator', 'admin', 'super_admin'];

/**
 * Hook to protect collaborator pages
 * - Uses singleton Supabase client for consistent auth state
 * - Listens for auth changes (logout, session expiration)
 * - Returns user info and signOut function
 * - Redirects to /collaborator/login if user is not authenticated or not authorized
 */
export function useCollaboratorAuth(): CollaboratorAuthState {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');

  // Track if we've set up the auth listener to prevent duplicates
  const authListenerSetup = useRef(false);
  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);

  // Use ref for supabase client to avoid creating during SSR render
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (typeof window !== 'undefined' && !supabaseRef.current) {
    supabaseRef.current = createClient();
  }

  const getSupabase = useCallback(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient();
    }
    return supabaseRef.current;
  }, []);

  const redirectToLogin = useCallback(() => {
    // Clear the auth marker cookie so middleware doesn't redirect back
    if (typeof document !== 'undefined') {
      document.cookie = 'dba-auth-marker=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    }
    // Use hard navigation to ensure middleware processes the cleared cookie
    if (typeof window !== 'undefined') {
      window.location.href = '/collaborator/login';
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      // Clear state first
      if (isMounted.current) {
        setIsAuthorized(false);
        setUser(null);
        setUserName('');
        setUserEmail('');
      }

      // Clear auth marker cookie
      if (typeof document !== 'undefined') {
        document.cookie = 'dba-auth-marker=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      }

      // Then sign out from Supabase
      await getSupabase().auth.signOut();

      // Force redirect
      redirectToLogin();
    } catch (error) {
      console.error('Sign out error:', error);
      // Still redirect even if signOut fails
      redirectToLogin();
    }
  }, [getSupabase, redirectToLogin]);

  useEffect(() => {
    isMounted.current = true;
    const supabase = getSupabase();

    const checkAuth = async () => {
      try {
        // Use getUser() to validate session server-side (not getSession() which can be stale)
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();

        if (!currentUser || userError) {
          // Not authenticated or session invalid
          if (userError) {
            console.log('Auth check: session invalid, clearing');
            await supabase.auth.signOut();
          }
          if (isMounted.current) {
            setIsAuthorized(false);
            setIsChecking(false);
          }
          redirectToLogin();
          return;
        }

        // Check if user has allowed role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', currentUser.id)
          .single();

        if (profileError || !profile || !ALLOWED_ROLES.includes(profile.role)) {
          // Not authorized - sign out and redirect
          console.log('Auth check: user not authorized for collaborator portal');
          await supabase.auth.signOut();
          if (isMounted.current) {
            setIsAuthorized(false);
            setIsChecking(false);
          }
          redirectToLogin();
          return;
        }

        // User is authorized
        if (isMounted.current) {
          setUser(currentUser);
          setUserName(profile.full_name || currentUser.email || '');
          setUserEmail(currentUser.email || '');
          setIsAuthorized(true);
          setIsChecking(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        if (isMounted.current) {
          setIsAuthorized(false);
          setIsChecking(false);
        }
        redirectToLogin();
      }
    };

    checkAuth();

    // Set up auth state listener (only once)
    if (!authListenerSetup.current) {
      authListenerSetup.current = true;

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Collaborator auth state changed:', event);

        if (event === 'SIGNED_OUT' || !session?.user) {
          // User signed out or session expired - clear auth marker cookie
          if (typeof document !== 'undefined') {
            document.cookie = 'dba-auth-marker=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
          }
          if (isMounted.current) {
            setUser(null);
            setUserName('');
            setUserEmail('');
            setIsAuthorized(false);
          }
          redirectToLogin();
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Re-check authorization on sign in or token refresh
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, full_name')
            .eq('id', session.user.id)
            .single();

          if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
            await supabase.auth.signOut();
            if (isMounted.current) {
              setIsAuthorized(false);
            }
            redirectToLogin();
            return;
          }

          if (isMounted.current) {
            setUser(session.user);
            setUserName(profile.full_name || session.user.email || '');
            setUserEmail(session.user.email || '');
            setIsAuthorized(true);
          }
        }
      });

      // Cleanup subscription on unmount
      return () => {
        isMounted.current = false;
        subscription.unsubscribe();
        authListenerSetup.current = false;
      };
    }

    return () => {
      isMounted.current = false;
    };
  }, [getSupabase, redirectToLogin]);

  return { isChecking, isAuthorized, user, userName, userEmail, signOut };
}
