import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  anonKey?: string;
  serviceRoleKey?: string;
}

let supabaseClient: SupabaseClient | null = null;
let supabaseAdminClient: SupabaseClient | null = null;

/**
 * Initialize Supabase client with anon key (for regular operations)
 */
export function initializeSupabase(config: SupabaseConfig): SupabaseClient {
  if (!config.url) {
    throw new Error('SUPABASE_URL is required');
  }

  if (!config.anonKey && !config.serviceRoleKey) {
    throw new Error('Either SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY is required');
  }

  const key = config.anonKey || config.serviceRoleKey!;

  supabaseClient = createClient(config.url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });

  return supabaseClient;
}

/**
 * Initialize Supabase admin client with service role key (for admin operations)
 */
export function initializeSupabaseAdmin(config: SupabaseConfig): SupabaseClient {
  if (!config.url || !config.serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for admin client');
  }

  supabaseAdminClient = createClient(config.url, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });

  return supabaseAdminClient;
}

/**
 * Get the initialized Supabase client
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    throw new Error('Supabase client not initialized. Call initializeSupabase first.');
  }
  return supabaseClient;
}

/**
 * Get the initialized Supabase admin client
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (!supabaseAdminClient) {
    throw new Error('Supabase admin client not initialized. Call initializeSupabaseAdmin first.');
  }
  return supabaseAdminClient;
}

/**
 * Check if admin client is available
 */
export function hasAdminClient(): boolean {
  return supabaseAdminClient !== null;
}
