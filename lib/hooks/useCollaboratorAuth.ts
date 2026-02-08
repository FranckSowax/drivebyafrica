'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
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

// Cookie helper
function clearAuthMarkerCookie() {
  if (typeof document !== 'undefined') {
    const isSecure = window.location.protocol === 'https:';
    const secureFlag = isSecure ? '; Secure' : '';
    document.cookie = `dba-auth-marker=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secureFlag}`;
  }
}

function hardRedirectToLogin() {
  clearAuthMarkerCookie();
  if (typeof window !== 'undefined') {
    window.location.href = '/collaborator/login';
  }
}

/**
 * Hook to protect collaborator pages.
 * Reads auth state from useAuthStore (initialized by AuthProvider)
 * instead of running a separate auth flow to avoid race conditions.
 */
export function useCollaboratorAuth(): CollaboratorAuthState {
  // Subscribe to the global auth store (already initialized by AuthProvider)
  const storeUser = useAuthStore((s) => s.user);
  const storeProfile = useAuthStore((s) => s.profile);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');

  // Quick hydration from localStorage for snappy UX while store initializes
  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('dba-collaborator');
        if (raw) {
          const parsed = JSON.parse(raw) as { id: string; email?: string | null; role?: string | null; full_name?: string | null };
          if (parsed?.id) {
            setUserName(parsed.full_name || parsed.email || '');
            setUserEmail(parsed.email || '');
          }
        }
      }
    } catch {
      // ignore parse/localStorage errors
    }
  }, []);

  // React to auth store changes
  useEffect(() => {
    // Wait for the global auth store to finish initializing
    if (!isInitialized) return;

    // No user → not authenticated → redirect to login
    if (!storeUser) {
      setIsAuthorized(false);
      setIsChecking(false);
      hardRedirectToLogin();
      return;
    }

    // User exists but profile not yet loaded (background fetch in progress)
    if (!storeProfile) {
      // Keep checking — profile will arrive shortly via useAuthStore
      return;
    }

    // Profile loaded — check role
    if (!ALLOWED_ROLES.includes(storeProfile.role)) {
      setIsAuthorized(false);
      setIsChecking(false);
      clearAuthMarkerCookie();
      useAuthStore.getState().signOut();
      hardRedirectToLogin();
      return;
    }

    // Authorized
    setUserName(storeProfile.full_name || storeUser.email || '');
    setUserEmail(storeUser.email || '');
    setIsAuthorized(true);
    setIsChecking(false);
  }, [isInitialized, storeUser, storeProfile]);

  // Safety timeout — if still checking after 8s, redirect to login
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isChecking) {
        console.log('Collaborator auth: timeout waiting for auth store');
        setIsChecking(false);
        hardRedirectToLogin();
      }
    }, 8000);
    return () => clearTimeout(timeout);
  }, [isChecking]);

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

      setIsAuthorized(false);
      setUserName('');
      setUserEmail('');
      clearAuthMarkerCookie();
      try {
        if (typeof localStorage !== 'undefined') localStorage.removeItem('dba-collaborator');
      } catch {}
      await useAuthStore.getState().signOut();
      hardRedirectToLogin();
    } catch (error) {
      console.error('Sign out error:', error);
      hardRedirectToLogin();
    }
  }, []);

  return { isChecking, isAuthorized, user: storeUser, userName, userEmail, signOut };
}
