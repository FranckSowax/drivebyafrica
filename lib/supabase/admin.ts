import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Admin client for server-side operations that bypass RLS
// Only use this in API routes and server actions, never expose to client
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
