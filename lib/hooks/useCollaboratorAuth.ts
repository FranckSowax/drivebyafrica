'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

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

// Cookie helper
function clearAuthMarkerCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = 'dba-auth-marker=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  }
}

function hardRedirectToLogin() {
  clearAuthMarkerCookie();
  if (typeof window !== 'undefined') {
    window.location.href = '/collaborator/login';
  }
}

/**
 * Hook to protect collaborator pages
 * - Uses getSession() as primary check (reads from localStorage)
 * - Listens for auth state changes (sign out, token refresh)
 * - Validates user role via profile query
 * - Redirects to /collaborator/login if not authenticated or not authorized
 */
export function useCollaboratorAuth(): CollaboratorAuthState {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');

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

  const signOut = useCallback(async () => {
    try {
      if (isMounted.current) {
        setIsAuthorized(false);
        setUser(null);
        setUserName('');
        setUserEmail('');
      }
      clearAuthMarkerCookie();
      await getSupabase().auth.signOut();
      hardRedirectToLogin();
    } catch (error) {
      console.error('Sign out error:', error);
      hardRedirectToLogin();
    }
  }, [getSupabase]);

  useEffect(() => {
    isMounted.current = true;
    const supabase = getSupabase();
    let isRedirecting = false;

    // Validate session and check role
    const validateAndAuthorize = async (session: Session) => {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', session.user.id)
          .single();

        if (!isMounted.current) return;

        if (profileError || !profile || !ALLOWED_ROLES.includes(profile.role)) {
          console.log('Auth check: user not authorized for collaborator portal');
          setIsAuthorized(false);
          setIsChecking(false);
          isRedirecting = true;
          clearAuthMarkerCookie();
          await supabase.auth.signOut();
          hardRedirectToLogin();
          return;
        }

        // User is authorized
        setUser(session.user);
        setUserName(profile.full_name || session.user.email || '');
        setUserEmail(session.user.email || '');
        setIsAuthorized(true);
        setIsChecking(false);
      } catch (error) {
        console.error('Auth validation error:', error);
        if (isMounted.current) {
          setIsAuthorized(false);
          setIsChecking(false);
        }
        isRedirecting = true;
        hardRedirectToLogin();
      }
    };

    // Primary auth check: use getSession() which reads from localStorage directly
    // This is more reliable than onAuthStateChange INITIAL_SESSION which can fire
    // before the session is loaded from storage
    const checkAuth = async () => {
      try {
        console.log('Collaborator auth: checking session...');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!isMounted.current || isRedirecting) return;

        if (error || !session?.user) {
          console.log('Collaborator auth: no session found, redirecting to login');
          setIsAuthorized(false);
          setIsChecking(false);
          isRedirecting = true;
          hardRedirectToLogin();
          return;
        }

        console.log('Collaborator auth: session found, validating role...');
        await validateAndAuthorize(session);
      } catch (error) {
        // Ignore AbortError from Supabase lock acquisition
        if (error instanceof Error && error.name === 'AbortError') {
          console.debug('Collaborator auth: AbortError ignored');
          return;
        }
        console.error('Collaborator auth check error:', error);
        if (isMounted.current) {
          setIsAuthorized(false);
          setIsChecking(false);
        }
        isRedirecting = true;
        hardRedirectToLogin();
      }
    };

    checkAuth();

    // Listen for auth state changes AFTER initial check
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip INITIAL_SESSION - we handle it above via getSession()
      if (event === 'INITIAL_SESSION') return;

      console.log('Collaborator auth event:', event);

      if (event === 'SIGNED_OUT') {
        clearAuthMarkerCookie();
        if (isMounted.current) {
          setUser(null);
          setUserName('');
          setUserEmail('');
          setIsAuthorized(false);
          setIsChecking(false);
        }
        if (!isRedirecting) {
          isRedirecting = true;
          hardRedirectToLogin();
        }
        return;
      }

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        if (!isRedirecting && isMounted.current) {
          await validateAndAuthorize(session);
        }
      }
    });

    // Safety timeout
    const timeout = setTimeout(() => {
      if (isMounted.current && isChecking) {
        console.log('Collaborator auth: timeout - redirecting to login');
        setIsChecking(false);
        if (!isRedirecting) {
          isRedirecting = true;
          hardRedirectToLogin();
        }
      }
    }, 10000);

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [getSupabase]);

  return { isChecking, isAuthorized, user, userName, userEmail, signOut };
}
