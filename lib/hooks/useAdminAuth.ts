'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

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

/**
 * Hook robuste pour l'authentification admin
 * Gère la synchronisation session/cookies et les états de chargement
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

  const supabase = createClient();

  // Vérifier le rôle admin dans profiles
  const checkAdminRole = useCallback(async (userId: string): Promise<AdminRole | null> => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error || !profile) {
        console.error('Error fetching profile:', error);
        return null;
      }

      const role = profile.role as string;
      if (role === 'admin' || role === 'super_admin') {
        return role as AdminRole;
      }
      return null;
    } catch (err) {
      console.error('Error checking admin role:', err);
      return null;
    }
  }, [supabase]);

  // Initialiser et écouter les changements d'auth
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Récupérer la session actuelle
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          if (mounted) {
            setState(prev => ({
              ...prev,
              isLoading: false,
              error: 'Erreur de session',
            }));
          }
          return;
        }

        if (!session?.user) {
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
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (mounted) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Erreur d\'initialisation',
          }));
        }
      }
    };

    initializeAuth();

    // Écouter les changements d'état d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

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

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            setState(prev => ({ ...prev, isLoading: true }));
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
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, checkAdminRole]);

  // Fonction de connexion
  const signIn = useCallback(async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
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

      // Vérifier le rôle admin
      const role = await checkAdminRole(data.user.id);

      if (!role) {
        // Déconnecter si pas admin
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

      // Succès - l'état sera mis à jour par onAuthStateChange
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
      console.error('Sign in error:', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Erreur de connexion au serveur',
      }));
      return { success: false, error: 'Erreur de connexion au serveur' };
    }
  }, [supabase, checkAdminRole]);

  // Fonction de déconnexion
  const signOut = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    await supabase.auth.signOut();
    // L'état sera mis à jour par onAuthStateChange
  }, [supabase]);

  // Rafraîchir la session
  const refreshSession = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    const { data: { session }, error } = await supabase.auth.refreshSession();

    if (error || !session) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Erreur de rafraîchissement de session',
      }));
      return;
    }

    const role = await checkAdminRole(session.user.id);
    setState({
      user: session.user,
      session,
      role,
      isLoading: false,
      isAuthenticated: true,
      isAdmin: role !== null,
      error: null,
    });
  }, [supabase, checkAdminRole]);

  return {
    ...state,
    signIn,
    signOut,
    refreshSession,
  };
}
