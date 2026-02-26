/**
 * Supabase Server Client
 * 
 * This client uses the service role key to bypass Row Level Security (RLS)
 * for server-side operations like creating products from AI analysis.
 * 
 * WARNING: This client should ONLY be used in server-side code (API routes, server components)
 * NEVER expose the service role key to the client.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

let serverClientInstance: SupabaseClient<Database> | null = null;

/**
 * Get or create the Supabase server client with service role key
 * This client bypasses RLS and should only be used server-side
 */
export function getSupabaseServerClient(): SupabaseClient<Database> {
  if (serverClientInstance) {
    return serverClientInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  if (!supabaseServiceKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
      'This is required for server-side operations that bypass RLS.'
    );
  }

  serverClientInstance = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return serverClientInstance;
}

export default getSupabaseServerClient;
