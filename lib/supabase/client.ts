import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Singleton instance to prevent multiple clients in React Strict Mode
// Only cached on the client side to avoid SSR storage issues
let supabaseInstance: SupabaseClient<Database> | null = null;

export function createClient() {
  const isBrowser = typeof window !== 'undefined';

  // On the server, always create a fresh instance (no caching)
  // On the client, use singleton to prevent duplicates
  if (isBrowser && supabaseInstance) {
    return supabaseInstance;
  }

  const client = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Use localStorage instead of cookies
        persistSession: true,
        storageKey: 'driveby-africa-auth',
        storage: isBrowser ? window.localStorage : undefined,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
      global: {
        headers: {
          'x-application-name': 'driveby-africa',
        },
      },
    }
  );

  // Only cache on client side
  if (isBrowser) {
    supabaseInstance = client;
  }

  return client;
}
