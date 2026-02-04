import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Use globalThis for the singleton so it works across Next.js chunks.
// Module-level variables don't work because Next.js may bundle the same module
// into multiple chunks (root layout vs route groups), each with their own scope.
const GLOBAL_KEY = '__supabase_client' as const;

type GlobalWithSupabase = typeof globalThis & {
  [GLOBAL_KEY]?: SupabaseClient<Database>;
};

export function createClient() {
  const isBrowser = typeof window !== 'undefined';

  // On the server, always create a fresh instance (no caching)
  // On the client, use global singleton to prevent duplicate GoTrue clients
  // which cause AbortError from competing navigator.locks
  if (isBrowser) {
    const existing = (globalThis as GlobalWithSupabase)[GLOBAL_KEY];
    if (existing) return existing;
  }

  const client = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        storageKey: 'driveby-africa-auth',
        storage: isBrowser ? window.localStorage : undefined,
        autoRefreshToken: true,
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

  // Only cache on client side via globalThis
  if (isBrowser) {
    (globalThis as GlobalWithSupabase)[GLOBAL_KEY] = client;
  }

  return client;
}
