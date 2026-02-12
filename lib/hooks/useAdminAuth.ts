'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

export type AdminRole = 'admin' | 'super_admin';

export interface AdminAuthState {
  user: User | null;
  session: Session | null;
  role: AdminRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  error: string | null;
}

export interface UseAdminAuthReturn extends AdminAuthState {
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

function getSupabaseClient() {
  return createClient();
}

/**
 * Vérifier le rôle admin via l'API (côté serveur)
 * Plus fiable que la requête client car évite les problèmes RLS
 */
async function checkAdminRoleViaAPI(): Promise<{ isAdmin: boolean; role: AdminRole | null }> {
  try {
    console.log('[useAdminAuth] Checking role via API...');

    // Cookies are sent automatically with same-origin fetch
    const response = await fetch('/api/admin/check-role');

    if (!response.ok) {
      console.error('[useAdminAuth] API check failed:', response.status);
      return { isAdmin: false, role: null };
    }

    const data = await response.json();
    console.log('[useAdminAuth] API check result:', data);

    return {
      isAdmin: data.isAdmin === true,
      role: data.role as AdminRole | null,
    };
  } catch (error) {
    console.error('[useAdminAuth] API check error:', error);
    return { isAdmin: false, role: null };
  }
}

/**
 * Hook robuste pour l'authentification admin
 */
export function useAdminAuth(): UseAdminAuthReturn {
  const [state, setState] = useState<AdminAuthState>({
    user: null,
    session: null,
    role: null,
    isLoading: true,
    isAuthenticated: false,
    isAdmin: false,
    error: null,
  });

  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const initializedRef = useRef(false);

  // Obtenir le client Supabase (créé une seule fois)
  const getClient = useCallback(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = getSupabaseClient();
    }
    return supabaseRef.current;
  }, []);

  // Initialiser l'auth
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const supabase = getClient();
    let mounted = true;

    const initializeAuth = async () => {
      console.log('[useAdminAuth] Initializing...');

      try {
        // Vérifier le rôle via l'API serveur (plus fiable)
        const { isAdmin, role } = await checkAdminRoleViaAPI();

        // Récupérer les infos utilisateur localement
        const { data: { user } } = await supabase.auth.getUser();
        const { data: { session } } = await supabase.auth.getSession();

        console.log('[useAdminAuth] Init complete - user:', user?.id, 'isAdmin:', isAdmin);

        if (mounted) {
          if (user && isAdmin) {
            setState({
              user,
              session,
              role,
              isLoading: false,
              isAuthenticated: true,
              isAdmin: true,
              error: null,
            });
          } else if (user && !isAdmin) {
            setState({
              user,
              session,
              role: null,
              isLoading: false,
              isAuthenticated: true,
              isAdmin: false,
              error: 'Accès non autorisé',
            });
          } else {
            setState({
              user: null,
              session: null,
              role: null,
              isLoading: false,
              isAuthenticated: false,
              isAdmin: false,
              error: null,
            });
          }
        }
      } catch (err) {
        console.error('[useAdminAuth] Init error:', err);
        if (mounted) {
          setState({
            user: null,
            session: null,
            role: null,
            isLoading: false,
            isAuthenticated: false,
            isAdmin: false,
            error: null,
          });
        }
      }
    };

    initializeAuth();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('[useAdminAuth] Auth state change:', event);

        if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            session: null,
            role: null,
            isLoading: false,
            isAuthenticated: false,
            isAdmin: false,
            error: null,
          });
          return;
        }

        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
          // Vérifier le rôle via l'API
          const { isAdmin, role } = await checkAdminRoleViaAPI();

          if (mounted) {
            setState({
              user: session.user,
              session,
              role,
              isLoading: false,
              isAuthenticated: true,
              isAdmin,
              error: isAdmin ? null : 'Accès non autorisé',
            });
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [getClient]);

  // Fonction de connexion
  const signIn = useCallback(async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const supabase = getClient();
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('[useAdminAuth] Signing in:', email);

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('[useAdminAuth] Sign in error:', authError.message);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Email ou mot de passe incorrect',
        }));
        return { success: false, error: 'Email ou mot de passe incorrect' };
      }

      if (!data.user || !data.session) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Erreur de connexion',
        }));
        return { success: false, error: 'Erreur de connexion' };
      }

      console.log('[useAdminAuth] Signed in, checking role via API...');

      // Vérifier le rôle via l'API serveur
      const { isAdmin, role } = await checkAdminRoleViaAPI();

      if (!isAdmin) {
        console.log('[useAdminAuth] Not admin, signing out');
        await supabase.auth.signOut();
        setState({
          user: null,
          session: null,
          role: null,
          isLoading: false,
          isAuthenticated: false,
          isAdmin: false,
          error: 'Accès réservé aux administrateurs',
        });
        return { success: false, error: 'Accès réservé aux administrateurs' };
      }

      console.log('[useAdminAuth] Admin verified, success!');

      setState({
        user: data.user,
        session: data.session,
        role,
        isLoading: false,
        isAuthenticated: true,
        isAdmin: true,
        error: null,
      });

      return { success: true };
    } catch (err) {
      console.error('[useAdminAuth] Sign in exception:', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Erreur de connexion au serveur',
      }));
      return { success: false, error: 'Erreur de connexion au serveur' };
    }
  }, [getClient]);

  // Fonction de déconnexion
  const signOut = useCallback(async () => {
    const supabase = getClient();
    setState(prev => ({ ...prev, isLoading: true }));
    await supabase.auth.signOut();
  }, [getClient]);

  // Rafraîchir la session
  const refreshSession = useCallback(async () => {
    const supabase = getClient();
    setState(prev => ({ ...prev, isLoading: true }));

    const { isAdmin, role } = await checkAdminRoleViaAPI();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: { session } } = await supabase.auth.getSession();

    if (!user) {
      setState({
        user: null,
        session: null,
        role: null,
        isLoading: false,
        isAuthenticated: false,
        isAdmin: false,
        error: null,
      });
      return;
    }

    setState({
      user,
      session,
      role,
      isLoading: false,
      isAuthenticated: true,
      isAdmin,
      error: isAdmin ? null : 'Accès non autorisé',
    });
  }, [getClient]);

  return {
    ...state,
    signIn,
    signOut,
    refreshSession,
  };
}
