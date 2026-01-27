import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

// Cookie name for auth marker (used by middleware for route protection)
const AUTH_MARKER_COOKIE = 'dba-auth-marker';

// Helper to set/remove auth marker cookie
function setAuthMarkerCookie(isAuthenticated: boolean) {
  if (typeof document === 'undefined') return;

  if (isAuthenticated) {
    // Set marker cookie (expires in 7 days, same as Supabase token)
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${AUTH_MARKER_COOKIE}=1; path=/; expires=${expires}; SameSite=Lax`;
  } else {
    // Remove marker cookie
    document.cookie = `${AUTH_MARKER_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// Track if we've already set up the auth listener to avoid duplicates
let authListenerSetup = false;

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  isInitialized: false,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),

  initialize: async () => {
    // Prevent multiple initializations
    if (get().isInitialized) return;

    const supabase = createClient();

    try {
      // Use getUser() instead of getSession() to validate the session server-side
      // getSession() can return cached/expired sessions, getUser() validates with the server
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      console.log('Auth initialize: user exists:', !!user, userError?.message || '');

      if (user && !userError) {
        set({ user });
        setAuthMarkerCookie(true); // Set marker for middleware

        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        set({ profile });
      } else {
        // Session invalid or expired - clean up completely
        // This handles stale cookies from old sessions
        if (userError) {
          console.log('Auth initialize: clearing invalid session');
          await supabase.auth.signOut();
        }
        set({ user: null, profile: null });
        setAuthMarkerCookie(false); // Remove marker
      }

      // Listen for auth changes (only set up once)
      if (!authListenerSetup) {
        authListenerSetup = true;
        supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth state changed:', event, !!session?.user);

          // Handle sign out
          if (event === 'SIGNED_OUT') {
            set({ user: null, profile: null });
            setAuthMarkerCookie(false); // Remove marker
            return;
          }

          // Handle sign in or token refresh
          if (session?.user) {
            set({ user: session.user });
            setAuthMarkerCookie(true); // Set marker for middleware
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            set({ profile });
          } else {
            set({ user: null, profile: null });
            setAuthMarkerCookie(false); // Remove marker
          }
        });
      }
    } catch (error) {
      // Ignore AbortError - this happens in React Strict Mode due to double mount
      if (error instanceof Error && error.name === 'AbortError') {
        console.debug('Auth initialization aborted (React Strict Mode)');
        return;
      }
      console.error('Auth initialization error:', error);
      // On error, clear any stale session and ensure clean state
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignore signOut errors
      }
      set({ user: null, profile: null });
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  signOut: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    set({ user: null, profile: null });
    setAuthMarkerCookie(false); // Remove marker
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;

    const supabase = createClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    set({ profile });
  },
}));
