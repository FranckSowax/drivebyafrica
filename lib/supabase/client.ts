import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

// Singleton instance to prevent multiple clients in React Strict Mode
let supabaseInstance: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  supabaseInstance = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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

  return supabaseInstance;
}
