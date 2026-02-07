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
    const isSecure = window.location.protocol === 'https:';
    const secureFlag = isSecure ? '; Secure' : '';
    document.cookie = `dba-auth-marker=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secureFlag}`;
  }
}

function hasAuthMarkerCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.includes('dba-auth-marker=1');
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

  // Try to hydrate quick state from localStorage for snappy UX
  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('dba-collaborator');
        if (raw) {
          const parsed = JSON.parse(raw) as { id: string; email?: string | null; role?: string | null; full_name?: string | null };
          if (parsed?.id) {
            // Populate lightweight client state while we validate the session
            setUserName(parsed.full_name || parsed.email || '');
            setUserEmail(parsed.email || '');
            // NOTE: we can't set `user` object shape (supabase User) reliably here,
            // but presence of this local entry is a quick indicator for the UI.
            setIsAuthorized(!!parsed.role && ALLOWED_ROLES.includes(parsed.role));
            // Keep isChecking true - we'll still validate with Supabase
          }
        }
      }
    } catch (e) {
      // ignore parse/localStorage errors
    }
  }, []);

  const isMounted = useRef(true);
  const sessionChecked = useRef(false);

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
      // Log logout before signing out
      fetch('/api/collaborator/log-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'logout',
          details: {},
        }),
      }).catch(() => {});

      if (isMounted.current) {
        setIsAuthorized(false);
        setUser(null);
        setUserName('');
        setUserEmail('');
      }
      clearAuthMarkerCookie();
      try {
        if (typeof localStorage !== 'undefined') localStorage.removeItem('dba-collaborator');
      } catch {}
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
        console.log('Collaborator auth: validating role for user', session.user.id);
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', session.user.id)
          .single();

        if (!isMounted.current) return;
        console.log('Collaborator auth: profile result -', profileError ? `error: ${profileError.message}` : `role: ${profile?.role}`);

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
        sessionChecked.current = true;
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
    // If no session immediately, wait for INITIAL_SESSION event before redirecting
    const checkAuth = async () => {
      try {
        console.log('Collaborator auth: checking session...');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!isMounted.current || isRedirecting) return;

        if (error || !session?.user) {
          // No session found immediately - this can happen if localStorage
          // hasn't been read yet. Wait for INITIAL_SESSION event.
          console.log('Collaborator auth: no session yet, waiting for INITIAL_SESSION...');
          // Don't redirect immediately - let the timeout or INITIAL_SESSION handler do it
          return;
        }

        console.log('Collaborator auth: session found, validating role...');
        sessionChecked.current = true;
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
      console.log('Collaborator auth event:', event, 'hasSession:', !!session);

      if (event === 'INITIAL_SESSION') {
        if (!isMounted.current || isRedirecting || sessionChecked.current) return;

        if (session?.user) {
          console.log('Collaborator auth: INITIAL_SESSION with user, validating...');
          sessionChecked.current = true;
          await validateAndAuthorize(session);
        } else {
          // No session in INITIAL_SESSION and no auth cookie - definitely not logged in
          if (!hasAuthMarkerCookie()) {
            console.log('Collaborator auth: no session and no cookie, redirecting');
            setIsAuthorized(false);
            setIsChecking(false);
            isRedirecting = true;
            hardRedirectToLogin();
          }
          // If cookie exists but no session, wait for recovery
        }
        return;
      }

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
        if (!isRedirecting && isMounted.current && !sessionChecked.current) {
          sessionChecked.current = true;
          await validateAndAuthorize(session);
        }
      }
    });

    // Safety timeout - redirect if still checking after timeout
    const timeout = setTimeout(() => {
      if (isMounted.current && isChecking && !sessionChecked.current) {
        console.log('Collaborator auth: timeout - no session found');
        setIsChecking(false);
        if (!isRedirecting) {
          isRedirecting = true;
          hardRedirectToLogin();
        }
      }
    }, 5000); // Reduced from 10s to 5s for better UX

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [getSupabase]);

  return { isChecking, isAuthorized, user, userName, userEmail, signOut };
}
