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
  setAuthenticated: (user: User, profile?: Profile | null) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// Track if we've already set up the auth listener to avoid duplicates
let authListenerSetup = false;

// Helper to set up auth listener (extracted to avoid duplication)
function setupAuthListener(
  supabase: ReturnType<typeof createClient>,
  set: (state: Partial<AuthState>) => void
) {
  if (authListenerSetup) return;
  authListenerSetup = true;

  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth state changed:', event, !!session?.user);

    // Handle sign out
    if (event === 'SIGNED_OUT') {
      set({ user: null, profile: null });
      setAuthMarkerCookie(false);
      return;
    }

    // Handle sign in or token refresh
    if (session?.user) {
      set({ user: session.user });
      setAuthMarkerCookie(true);
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      set({ profile });
    } else if (event !== 'INITIAL_SESSION') {
      // Only clear state if it's not the initial session event
      set({ user: null, profile: null });
      setAuthMarkerCookie(false);
    }
  });
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  isInitialized: false,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),

  // Use this method after successful login to properly set auth state
  // This sets user, profile, isInitialized, isLoading, and the marker cookie
  setAuthenticated: (user, profile = null) => {
    console.log('Auth store: setAuthenticated called for user:', user.id);
    setAuthMarkerCookie(true);
    set({
      user,
      profile,
      isLoading: false,
      isInitialized: true, // Mark as initialized to prevent re-initialization
    });
  },

  initialize: async () => {
    // Prevent multiple initializations
    if (get().isInitialized) {
      console.log('Auth initialize: Already initialized, skipping');
      return;
    }

    console.log('Auth initialize: Starting...');
    const supabase = createClient();

    try {
      // First check for cached session (fast, from localStorage)
      const { data: { session: cachedSession }, error: sessionError } = await supabase.auth.getSession();
      console.log('Auth initialize: Cached session exists:', !!cachedSession, 'error:', sessionError?.message || 'none');

      // If we have a cached session with a valid token, we can use it directly
      // This is faster and avoids unnecessary network calls
      if (cachedSession?.user && cachedSession?.access_token) {
        // Check if token is not expired
        const expiresAt = cachedSession.expires_at || 0;
        const now = Math.floor(Date.now() / 1000);
        const isExpired = expiresAt < now;

        if (!isExpired) {
          console.log('Auth initialize: Using cached session (not expired)');
          set({ user: cachedSession.user });
          setAuthMarkerCookie(true);

          // Fetch profile in background (don't await)
          (async () => {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', cachedSession.user.id)
                .single();
              if (profile) set({ profile });
            } catch {
              // Ignore profile fetch errors
            }
          })();

          // Set up listener and finish
          setupAuthListener(supabase, set);
          set({ isLoading: false, isInitialized: true });
          return;
        }
        console.log('Auth initialize: Cached session expired, validating with server...');
      }

      // Validate with server if no valid cached session
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      console.log('Auth initialize: getUser result - user exists:', !!user, 'error:', userError?.message || 'none');

      if (user && !userError) {
        // Session is valid
        set({ user });
        setAuthMarkerCookie(true); // Set marker for middleware

        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        set({ profile });
      } else if (userError) {
        // Distinguish between session errors and network errors
        const errorMessage = userError.message?.toLowerCase() || '';
        const isSessionInvalid =
          errorMessage.includes('invalid') ||
          errorMessage.includes('expired') ||
          errorMessage.includes('jwt') ||
          errorMessage.includes('token') ||
          errorMessage.includes('not authenticated') ||
          userError.status === 401 ||
          userError.status === 403;

        if (isSessionInvalid) {
          // Session is truly invalid - clean up completely
          console.log('Auth initialize: session invalid, signing out');
          await supabase.auth.signOut();
          set({ user: null, profile: null });
          setAuthMarkerCookie(false);
        } else {
          // Network or other temporary error - use cached session if available
          console.log('Auth initialize: temporary error, using cached session');
          if (cachedSession?.user) {
            set({ user: cachedSession.user });
            setAuthMarkerCookie(true);
            // Try to fetch profile even with cached session
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', cachedSession.user.id)
                .single();
              set({ profile });
            } catch {
              // Ignore profile fetch errors with cached session
            }
          } else {
            // No cached session available
            set({ user: null, profile: null });
            setAuthMarkerCookie(false);
          }
        }
      } else {
        // No user and no error means no session exists
        set({ user: null, profile: null });
        setAuthMarkerCookie(false);
      }

      // Listen for auth changes (only set up once)
      setupAuthListener(supabase, set);
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
