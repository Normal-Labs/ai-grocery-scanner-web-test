/**
 * Unit tests for Supabase client singleton
 * 
 * Tests client initialization, singleton behavior, environment configuration,
 * and compatibility with Next.js server and client contexts.
 * 
 * Requirements: 6.3, 6.4
 */

import {
  getSupabaseClient,
  resetSupabaseClient,
  getSession,
  getCurrentUser,
  onAuthStateChange,
} from '../client';

// Mock the @supabase/supabase-js module
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn((url: string, key: string, options: any) => ({
    auth: {
      getSession: jest.fn(),
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: {
          subscription: {
            unsubscribe: jest.fn(),
          },
        },
      })),
    },
    from: jest.fn(),
    _url: url,
    _key: key,
    _options: options,
  })),
}));

describe('Supabase Client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    jest.resetModules();
    process.env = { ...originalEnv };
    
    // Set required environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-anon-key';
    
    // Reset the singleton instance
    resetSupabaseClient();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    resetSupabaseClient();
  });

  describe('getSupabaseClient', () => {
    it('should create a client with environment variables', () => {
      const client = getSupabaseClient();
      
      expect(client).toBeDefined();
      expect((client as any)._url).toBe('https://test.supabase.co');
      expect((client as any)._key).toBe('test-anon-key');
    });

    it('should return the same instance on multiple calls (singleton)', () => {
      const client1 = getSupabaseClient();
      const client2 = getSupabaseClient();
      
      expect(client1).toBe(client2);
    });

    it('should throw error if NEXT_PUBLIC_SUPABASE_URL is missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      resetSupabaseClient();
      
      expect(() => getSupabaseClient()).toThrow(
        'Missing NEXT_PUBLIC_SUPABASE_URL environment variable'
      );
    });

    it('should throw error if NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      resetSupabaseClient();
      
      expect(() => getSupabaseClient()).toThrow(
        'Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variable'
      );
    });

    it('should configure auth with autoRefreshToken enabled', () => {
      const client = getSupabaseClient();
      const options = (client as any)._options;
      
      expect(options.auth.autoRefreshToken).toBe(true);
    });

    it('should configure auth with persistSession enabled', () => {
      const client = getSupabaseClient();
      const options = (client as any)._options;
      
      expect(options.auth.persistSession).toBe(true);
    });

    it('should configure auth with detectSessionInUrl enabled', () => {
      const client = getSupabaseClient();
      const options = (client as any)._options;
      
      expect(options.auth.detectSessionInUrl).toBe(true);
    });

    it('should set X-Client-Info header for Next.js', () => {
      const client = getSupabaseClient();
      const options = (client as any)._options;
      
      expect(options.global.headers['X-Client-Info']).toBe('supabase-js-nextjs');
    });

    it('should work in server context (no window)', () => {
      // Simulate server environment
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;
      
      resetSupabaseClient();
      
      // Should not throw error in server context
      expect(() => getSupabaseClient()).not.toThrow();
      
      const client = getSupabaseClient();
      expect(client).toBeDefined();
      expect(client.auth).toBeDefined();
      
      // Restore window
      global.window = originalWindow;
    });

    it('should work in client context (with window)', () => {
      // Simulate browser environment
      const mockLocalStorage = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
        length: 0,
        key: jest.fn(),
      };
      
      global.window = {
        localStorage: mockLocalStorage,
      } as any;
      
      resetSupabaseClient();
      const client = getSupabaseClient();
      
      expect(client).toBeDefined();
      const options = (client as any)._options;
      // In client context, storage should be set to localStorage
      expect(options.auth.storage).toBeDefined();
    });
  });

  describe('resetSupabaseClient', () => {
    it('should reset the singleton instance', () => {
      const client1 = getSupabaseClient();
      resetSupabaseClient();
      const client2 = getSupabaseClient();
      
      // After reset, a new instance should be created
      expect(client1).not.toBe(client2);
    });
  });

  describe('getSession', () => {
    it('should return session when available', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        access_token: 'token-123',
      };
      
      const client = getSupabaseClient();
      (client.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      
      const session = await getSession();
      
      expect(session).toEqual(mockSession);
      expect(client.auth.getSession).toHaveBeenCalled();
    });

    it('should return null when no session exists', async () => {
      const client = getSupabaseClient();
      (client.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });
      
      const session = await getSession();
      
      expect(session).toBeNull();
    });

    it('should return null and log error on failure', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockError = new Error('Session error');
      
      const client = getSupabaseClient();
      (client.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: mockError,
      });
      
      const session = await getSession();
      
      expect(session).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error getting session:', mockError);
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getCurrentUser', () => {
    it('should return user when authenticated', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        aud: 'authenticated',
        role: 'authenticated',
      };
      
      const client = getSupabaseClient();
      (client.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      
      const user = await getCurrentUser();
      
      expect(user).toEqual(mockUser);
      expect(client.auth.getUser).toHaveBeenCalled();
    });

    it('should return null when not authenticated', async () => {
      const client = getSupabaseClient();
      (client.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });
      
      const user = await getCurrentUser();
      
      expect(user).toBeNull();
    });

    it('should return null and log error on failure', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockError = new Error('User error');
      
      const client = getSupabaseClient();
      (client.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: mockError,
      });
      
      const user = await getCurrentUser();
      
      expect(user).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error getting user:', mockError);
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('onAuthStateChange', () => {
    it('should subscribe to auth state changes', () => {
      const callback = jest.fn();
      const client = getSupabaseClient();
      
      const unsubscribe = onAuthStateChange(callback);
      
      expect(client.auth.onAuthStateChange).toHaveBeenCalledWith(callback);
      expect(typeof unsubscribe).toBe('function');
    });

    it('should return unsubscribe function that calls subscription.unsubscribe', () => {
      const callback = jest.fn();
      const mockUnsubscribe = jest.fn();
      
      const client = getSupabaseClient();
      (client.auth.onAuthStateChange as jest.Mock).mockReturnValue({
        data: {
          subscription: {
            unsubscribe: mockUnsubscribe,
          },
        },
      });
      
      const unsubscribe = onAuthStateChange(callback);
      unsubscribe();
      
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Environment variable validation', () => {
    it('should provide helpful error message for missing URL', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      resetSupabaseClient();
      
      expect(() => getSupabaseClient()).toThrow(
        'Please add it to your .env.local file'
      );
    });

    it('should provide helpful error message for missing key', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      resetSupabaseClient();
      
      expect(() => getSupabaseClient()).toThrow(
        'Please add it to your .env.local file'
      );
    });
  });

  describe('Type safety', () => {
    it('should return typed client with Database schema', () => {
      const client = getSupabaseClient();
      
      // This is a compile-time check, but we can verify the client has expected methods
      expect(client.from).toBeDefined();
      expect(client.auth).toBeDefined();
    });
  });
});
