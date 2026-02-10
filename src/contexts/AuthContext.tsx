/**
 * AuthContext - Authentication Provider
 * 
 * Wraps Supabase Auth with React context to provide authentication state
 * and methods throughout the application. Handles session management,
 * automatic token refresh, and session persistence across page refreshes.
 * 
 * Requirements: 1.1, 1.6, 6.5
 */

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';

/**
 * Authentication context value interface
 * 
 * Provides authentication state and methods for sign up, sign in, and sign out.
 */
interface AuthContextValue {
  /** Current authenticated user, null if not authenticated */
  user: User | null;
  /** Current session, null if not authenticated */
  session: Session | null;
  /** Whether the auth state is being initialized */
  loading: boolean;
  /** Sign up a new user with email and password */
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  /** Sign in an existing user with email and password */
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  /** Sign out the current user */
  signOut: () => Promise<{ error: AuthError | null }>;
}

/**
 * Create context with undefined default
 * This ensures the hook throws an error if used outside the provider
 */
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * AuthProvider component
 * 
 * Wraps the application and provides authentication state and methods.
 * Automatically handles session refresh and persistence across page refreshes.
 * 
 * Requirements:
 * - 1.1: Authenticate users using Supabase Auth
 * - 1.6: Maintain user session state across page refreshes
 * - 6.5: Handle authentication state changes automatically
 * 
 * @example
 * ```tsx
 * // In app/layout.tsx
 * <AuthProvider>
 *   <YourApp />
 * </AuthProvider>
 * ```
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  /**
   * Initialize authentication state on mount
   * Requirement 1.6: Maintain user session state across page refreshes
   */
  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting initial session:', error);
        } else {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    /**
     * Subscribe to authentication state changes
     * Requirement 6.5: Handle authentication state changes automatically
     * 
     * This listener handles:
     * - SIGNED_IN: User successfully signed in
     * - SIGNED_OUT: User signed out
     * - TOKEN_REFRESHED: Session token was refreshed
     * - USER_UPDATED: User metadata was updated
     */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state change:', event);
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        // Update loading state after initial sign in/out
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          setLoading(false);
        }
      }
    );

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  /**
   * Sign up a new user with email and password
   * 
   * Requirement 1.1: Authenticate users using Supabase Auth
   * Requirement 1.3: Support email/password authentication
   * 
   * @param email - User's email address
   * @param password - User's password
   * @returns Promise with error if sign up failed
   * 
   * @example
   * ```tsx
   * const { signUp } = useAuth();
   * const { error } = await signUp('user@example.com', 'password123');
   * if (error) {
   *   console.error('Sign up failed:', error.message);
   * }
   * ```
   */
  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error('Sign up error:', error);
        return { error };
      }

      // Session and user will be set by onAuthStateChange listener
      return { error: null };
    } catch (error) {
      console.error('Unexpected sign up error:', error);
      return { 
        error: {
          message: 'An unexpected error occurred during sign up',
          name: 'UnexpectedError',
          status: 500,
        } as AuthError
      };
    }
  };

  /**
   * Sign in an existing user with email and password
   * 
   * Requirement 1.1: Authenticate users using Supabase Auth
   * Requirement 1.3: Support email/password authentication
   * 
   * @param email - User's email address
   * @param password - User's password
   * @returns Promise with error if sign in failed
   * 
   * @example
   * ```tsx
   * const { signIn } = useAuth();
   * const { error } = await signIn('user@example.com', 'password123');
   * if (error) {
   *   console.error('Sign in failed:', error.message);
   * }
   * ```
   */
  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting sign in with:', { email, passwordLength: password.length });
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error details:', {
          message: error.message,
          status: error.status,
          name: error.name,
          error
        });
        return { error };
      }

      // Session and user will be set by onAuthStateChange listener
      return { error: null };
    } catch (error) {
      console.error('Unexpected sign in error:', error);
      return { 
        error: {
          message: 'An unexpected error occurred during sign in',
          name: 'UnexpectedError',
          status: 500,
        } as AuthError
      };
    }
  };

  /**
   * Sign out the current user
   * 
   * Requirement 1.1: Authenticate users using Supabase Auth
   * 
   * @returns Promise with error if sign out failed
   * 
   * @example
   * ```tsx
   * const { signOut } = useAuth();
   * const { error } = await signOut();
   * if (error) {
   *   console.error('Sign out failed:', error.message);
   * }
   * ```
   */
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Sign out error:', error);
        return { error };
      }

      // Session and user will be cleared by onAuthStateChange listener
      return { error: null };
    } catch (error) {
      console.error('Unexpected sign out error:', error);
      return { 
        error: {
          message: 'An unexpected error occurred during sign out',
          name: 'UnexpectedError',
          status: 500,
        } as AuthError
      };
    }
  };

  /**
   * Context value
   */
  const value: AuthContextValue = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access authentication context
 * 
 * Provides access to authentication state and methods.
 * Must be used within an AuthProvider.
 * 
 * @throws Error if used outside AuthProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, signIn, signOut } = useAuth();
 *   
 *   if (!user) {
 *     return <button onClick={() => signIn('email', 'pass')}>Sign In</button>;
 *   }
 *   
 *   return (
 *     <div>
 *       <p>Welcome, {user.email}</p>
 *       <button onClick={signOut}>Sign Out</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}
