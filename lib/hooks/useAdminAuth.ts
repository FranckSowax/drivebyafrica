'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { User, Session, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

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

// Créer un client Supabase dédié pour l'admin auth
function getSupabaseClient(): SupabaseClient<Database> {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
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

  const supabaseRef = useRef<SupabaseClient<Database> | null>(null);
  const initializedRef = useRef(false);

  // Obtenir le client Supabase (créé une seule fois)
  const getClient = useCallback(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = getSupabaseClient();
    }
    return supabaseRef.current;
  }, []);

  // Vérifier le rôle admin dans profiles
  const checkAdminRole = useCallback(async (userId: string): Promise<AdminRole | null> => {
    const supabase = getClient();

    try {
      console.log('[useAdminAuth] Checking admin role for:', userId);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[useAdminAuth] Profile fetch error:', error.message, error.code);
        return null;
      }

      if (!profile) {
        console.error('[useAdminAuth] No profile found');
        return null;
      }

      console.log('[useAdminAuth] Profile role:', profile.role);

      const role = profile.role as string;
      if (role === 'admin' || role === 'super_admin') {
        return role as AdminRole;
      }
      return null;
    } catch (err) {
      console.error('[useAdminAuth] Error checking admin role:', err);
      return null;
    }
  }, [getClient]);

  // Initialiser l'auth
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const supabase = getClient();
    let mounted = true;

    const initializeAuth = async () => {
      console.log('[useAdminAuth] Initializing...');

      try {
        // Utiliser getUser() qui valide le token côté serveur
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        console.log('[useAdminAuth] getUser result:', user?.id, userError?.message);

        if (userError || !user) {
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
          return;
        }

        // Vérifier le rôle admin
        const role = await checkAdminRole(user.id);
        const { data: { session } } = await supabase.auth.getSession();

        console.log('[useAdminAuth] Final state - role:', role, 'isAdmin:', role !== null);

        if (mounted) {
          setState({
            user,
            session,
            role,
            isLoading: false,
            isAuthenticated: true,
            isAdmin: role !== null,
            error: role === null ? 'Accès non autorisé' : null,
          });
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

    // Écouter les changements
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
          const role = await checkAdminRole(session.user.id);

          if (mounted) {
            setState({
              user: session.user,
              session,
              role,
              isLoading: false,
              isAuthenticated: true,
              isAdmin: role !== null,
              error: role === null ? 'Accès non autorisé' : null,
            });
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [getClient, checkAdminRole]);

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

      console.log('[useAdminAuth] Signed in, checking role...');

      // Vérifier le rôle admin
      const role = await checkAdminRole(data.user.id);

      if (!role) {
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
  }, [getClient, checkAdminRole]);

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

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
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

    const role = await checkAdminRole(user.id);
    const { data: { session } } = await supabase.auth.getSession();

    setState({
      user,
      session,
      role,
      isLoading: false,
      isAuthenticated: true,
      isAdmin: role !== null,
      error: null,
    });
  }, [getClient, checkAdminRole]);

  return {
    ...state,
    signIn,
    signOut,
    refreshSession,
  };
}
