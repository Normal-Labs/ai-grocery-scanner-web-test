/**
 * Supabase Client Singleton
 * 
 * This file provides a singleton instance of the Supabase client configured
 * for use in both Next.js server and client components. The client handles
 * authentication state changes automatically.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * Singleton instance of the Supabase client
 * Requirement 6.3: Initialize as singleton to prevent multiple instances
 */
let supabaseInstance: SupabaseClient<Database> | null = null;

/**
 * Get or create the Supabase client singleton
 * 
 * This function ensures only one instance of the Supabase client exists
 * throughout the application lifecycle. It configures the client for use
 * in both server and client components.
 * 
 * Requirements:
 * - 6.1: Configure client using environment variables
 * - 6.2: Use NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 * - 6.3: Initialize as singleton
 * - 6.4: Configure for Next.js server and client components
 * - 6.5: Handle authentication state changes automatically
 * 
 * @returns Configured Supabase client instance
 * @throws Error if required environment variables are not set
 * 
 * @example
 * ```typescript
 * // In a client component
 * const supabase = getSupabaseClient();
 * const { data, error } = await supabase.from('products').select('*');
 * 
 * // In a server component
 * const supabase = getSupabaseClient();
 * const { data, error } = await supabase.from('stores').select('*');
 * ```
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  // Return existing instance if already created (singleton pattern)
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // Requirement 6.1, 6.2: Get configuration from environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Validate environment variables
  if (!supabaseUrl) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL environment variable. ' +
      'Please add it to your .env.local file.'
    );
  }

  if (!supabaseAnonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variable. ' +
      'Please add it to your .env.local file.'
    );
  }

  // Requirement 6.3, 6.4, 6.5: Create client with Next.js-compatible configuration
  const authConfig: any = {
    // Requirement 6.5: Automatically handle authentication state changes
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  };

  // Only set storage in browser environment
  if (typeof window !== 'undefined' && window.localStorage) {
    authConfig.storage = window.localStorage;
  }

  supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: authConfig,
    // Requirement 6.4: Configure for both server and client components
    global: {
      headers: {
        'X-Client-Info': 'supabase-js-nextjs',
      },
    },
  });

  return supabaseInstance;
}

/**
 * Reset the Supabase client singleton
 * 
 * This function is primarily used for testing purposes to reset the singleton
 * state between tests. It should not be used in production code.
 * 
 * @internal
 */
export function resetSupabaseClient(): void {
  supabaseInstance = null;
}

/**
 * Get the current authentication session
 * 
 * Helper function to retrieve the current user session from Supabase Auth.
 * Returns null if no active session exists.
 * 
 * Requirement 1.6: Maintain user session state
 * 
 * @returns Promise resolving to the current session or null
 * 
 * @example
 * ```typescript
 * const session = await getSession();
 * if (session) {
 *   console.log('User ID:', session.user.id);
 * } else {
 *   console.log('No active session');
 * }
 * ```
 */
export async function getSession() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('Error getting session:', error);
    return null;
  }
  
  return data.session;
}

/**
 * Get the current authenticated user
 * 
 * Helper function to retrieve the current authenticated user from Supabase Auth.
 * Returns null if no user is authenticated.
 * 
 * Requirement 1.1: Authenticate users using Supabase Auth
 * 
 * @returns Promise resolving to the current user or null
 * 
 * @example
 * ```typescript
 * const user = await getCurrentUser();
 * if (user) {
 *   console.log('Authenticated as:', user.email);
 * } else {
 *   console.log('Not authenticated');
 * }
 * ```
 */
export async function getCurrentUser() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('Error getting user:', error);
    return null;
  }
  
  return data.user;
}

/**
 * Subscribe to authentication state changes
 * 
 * Helper function to listen for authentication state changes (sign in, sign out,
 * token refresh, etc.). This is useful for updating UI based on auth state.
 * 
 * Requirement 6.5: Handle authentication state changes automatically
 * 
 * @param callback - Function to call when auth state changes
 * @returns Unsubscribe function to stop listening to auth changes
 * 
 * @example
 * ```typescript
 * const unsubscribe = onAuthStateChange((event, session) => {
 *   if (event === 'SIGNED_IN') {
 *     console.log('User signed in:', session?.user.email);
 *   } else if (event === 'SIGNED_OUT') {
 *     console.log('User signed out');
 *   }
 * });
 * 
 * // Later, stop listening
 * unsubscribe();
 * ```
 */
export function onAuthStateChange(
  callback: (event: string, session: any) => void
) {
  const supabase = getSupabaseClient();
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  
  // Return unsubscribe function
  return () => {
    subscription.unsubscribe();
  };
}

// Export the client instance getter as default
export default getSupabaseClient;
