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

const ALLOWED_ROLES = ['collaborator', 'admin', 'super_admin'];

function hardRedirectToLogin() {
  if (typeof window !== 'undefined') {
    window.location.href = '/collaborator/login';
  }
}

export function useCollaboratorAuth(): CollaboratorAuthState {
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

  useEffect(() => {
    if (!isInitialized) return;

    if (!storeUser) {
      setIsAuthorized(false);
      setIsChecking(false);
      hardRedirectToLogin();
      return;
    }

    if (!storeProfile) return;

    if (!ALLOWED_ROLES.includes(storeProfile.role)) {
      setIsAuthorized(false);
      setIsChecking(false);
      useAuthStore.getState().signOut();
      hardRedirectToLogin();
      return;
    }

    setUserName(storeProfile.full_name || storeUser.email || '');
    setUserEmail(storeUser.email || '');
    setIsAuthorized(true);
    setIsChecking(false);
  }, [isInitialized, storeUser, storeProfile]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isChecking) {
        setIsChecking(false);
        hardRedirectToLogin();
      }
    }, 8000);
    return () => clearTimeout(timeout);
  }, [isChecking]);

  const signOut = useCallback(async () => {
    try {
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
