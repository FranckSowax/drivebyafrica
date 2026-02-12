import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { resolveCountryName } from '@/lib/utils/countries';

// Lightweight localStorage helper for collaborator quick-checks
function setCollaboratorLocal(info: { id: string; email?: string | null; role?: string | null; full_name?: string | null } | null) {
  if (typeof localStorage === 'undefined') return;
  try {
    if (info) {
      localStorage.setItem('dba-collaborator', JSON.stringify(info));
    } else {
      localStorage.removeItem('dba-collaborator');
    }
  } catch {
    // Ignore localStorage errors
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

/**
 * Checks if a profile is missing fields that exist in user_metadata,
 * and updates the profile in the background if needed.
 */
async function completeProfileIfNeeded(
  supabase: ReturnType<typeof createClient>,
  user: User,
  profile: Profile | null
) {
  if (!profile || !user.user_metadata) return;

  const meta = user.user_metadata;
  const updates: Record<string, string> = {};

  if (!profile.whatsapp_number && meta.whatsapp) {
    updates.whatsapp_number = meta.whatsapp;
  }

  if ((!profile.country || profile.country === 'Gabon') && meta.country && meta.country !== 'GA') {
    const resolved = resolveCountryName(meta.country);
    if (resolved !== profile.country) {
      updates.country = resolved;
    }
  }

  if (!profile.full_name && meta.full_name) {
    updates.full_name = meta.full_name;
  }

  if (Object.keys(updates).length === 0) return;

  try {
    await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id);
  } catch {
    // Non-critical — profile will be updated on next settings save
  }
}

// Track if we've already set up the auth listener to avoid duplicates
let authListenerSetup = false;

function setupAuthListener(
  supabase: ReturnType<typeof createClient>,
  set: (state: Partial<AuthState>) => void
) {
  if (authListenerSetup) return;
  authListenerSetup = true;

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_OUT') {
      set({ user: null, profile: null });
      return;
    }

    if (session?.user) {
      set({ user: session.user });
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      set({ profile });
      completeProfileIfNeeded(supabase, session.user, profile);
    } else if (event !== 'INITIAL_SESSION') {
      set({ user: null, profile: null });
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

  setAuthenticated: (user, profile = null) => {
    setCollaboratorLocal({ id: user.id, email: user.email || null, role: profile?.role || null, full_name: profile?.full_name || null });
    set({
      user,
      profile,
      isLoading: false,
      isInitialized: true,
    });
  },

  initialize: async () => {
    if (get().isInitialized) return;

    const supabase = createClient();

    try {
      // getUser() validates the JWT with the server — secure check
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (user && !userError) {
        set({ user });
        setCollaboratorLocal({ id: user.id, email: user.email || null, role: null, full_name: null });

        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        set({ profile });
        if (profile) {
          setCollaboratorLocal({ id: user.id, email: user.email || null, role: profile.role || null, full_name: profile.full_name || null });
          completeProfileIfNeeded(supabase, user, profile);
        }
      } else {
        set({ user: null, profile: null });
      }

      setupAuthListener(supabase, set);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Auth initialization error:', error);
      set({ user: null, profile: null });
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  signOut: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    set({ user: null, profile: null });
    setCollaboratorLocal(null);
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
