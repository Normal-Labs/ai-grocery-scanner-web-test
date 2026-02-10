/**
 * Unit tests for AuthContext
 * 
 * Tests authentication context functionality including:
 * - Provider initialization
 * - Session persistence across refreshes
 * - Sign up, sign in, and sign out flows
 * - Error handling
 * - Hook usage validation
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { AuthProvider, useAuth } from '../AuthContext';
import { getSupabaseClient } from '@/lib/supabase/client';
import { User, Session, AuthError } from '@supabase/supabase-js';

// Mock the Supabase client
jest.mock('@/lib/supabase/client');

describe('AuthContext', () => {
  let mockSupabase: any;
  let mockAuthStateChangeCallback: any;
  let mockUnsubscribe: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock unsubscribe function
    mockUnsubscribe = jest.fn();
    
    // Create mock Supabase client
    mockSupabase = {
      auth: {
        getSession: jest.fn(),
        onAuthStateChange: jest.fn(),
        signUp: jest.fn(),
        signInWithPassword: jest.fn(),
        signOut: jest.fn(),
      },
    };
    
    // Setup default mock implementations
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    
    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      mockAuthStateChangeCallback = callback;
      return {
        data: {
          subscription: {
            unsubscribe: mockUnsubscribe,
          },
        },
      };
    });
    
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('Provider initialization', () => {
    it('should initialize with loading state', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });

    it('should load initial session on mount', async () => {
      const mockUser: Partial<User> = {
        id: 'user-123',
        email: 'test@example.com',
      };
      
      const mockSession: Partial<Session> = {
        user: mockUser as User,
        access_token: 'token-123',
      };
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.session).toEqual(mockSession);
    });

    it('should handle session loading errors gracefully', async () => {
      const mockError = new Error('Session load failed');
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: mockError,
      });
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error getting initial session:',
        mockError
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('should subscribe to auth state changes', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      
      renderHook(() => useAuth(), { wrapper });
      
      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('should unsubscribe from auth state changes on unmount', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      
      const { unmount } = renderHook(() => useAuth(), { wrapper });
      
      unmount();
      
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Session persistence (Requirement 1.6)', () => {
    it('should maintain session state across page refreshes', async () => {
      const mockUser: Partial<User> = {
        id: 'user-123',
        email: 'test@example.com',
      };
      
      const mockSession: Partial<Session> = {
        user: mockUser as User,
        access_token: 'token-123',
      };
      
      // Simulate existing session on page load
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.session).toEqual(mockSession);
    });
  });

  describe('Auth state changes (Requirement 6.5)', () => {
    it('should update state when user signs in', async () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      const mockUser: Partial<User> = {
        id: 'user-123',
        email: 'test@example.com',
      };
      
      const mockSession: Partial<Session> = {
        user: mockUser as User,
        access_token: 'token-123',
      };
      
      // Simulate auth state change
      act(() => {
        mockAuthStateChangeCallback('SIGNED_IN', mockSession);
      });
      
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.loading).toBe(false);
    });

    it('should update state when user signs out', async () => {
      const mockUser: Partial<User> = {
        id: 'user-123',
        email: 'test@example.com',
      };
      
      const mockSession: Partial<Session> = {
        user: mockUser as User,
        access_token: 'token-123',
      };
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });
      
      // Simulate sign out
      act(() => {
        mockAuthStateChangeCallback('SIGNED_OUT', null);
      });
      
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it('should update state when token is refreshed', async () => {
      const mockUser: Partial<User> = {
        id: 'user-123',
        email: 'test@example.com',
      };
      
      const oldSession: Partial<Session> = {
        user: mockUser as User,
        access_token: 'old-token',
      };
      
      const newSession: Partial<Session> = {
        user: mockUser as User,
        access_token: 'new-token',
      };
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: oldSession },
        error: null,
      });
      
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.session).toEqual(oldSession);
      });
      
      // Simulate token refresh
      act(() => {
        mockAuthStateChangeCallback('TOKEN_REFRESHED', newSession);
      });
      
      expect(result.current.session).toEqual(newSession);
    });
  });

  describe('signUp method (Requirement 1.1, 1.3)', () => {
    it('should sign up a new user successfully', async () => {
      const mockUser: Partial<User> = {
        id: 'user-123',
        email: 'newuser@example.com',
      };
      
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });
      
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      let signUpResult: any;
      await act(async () => {
        signUpResult = await result.current.signUp('newuser@example.com', 'password123');
      });
      
      expect(signUpResult.error).toBeNull();
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
      });
    });

    it('should handle sign up errors', async () => {
      const mockError: Partial<AuthError> = {
        message: 'Email already registered',
        name: 'AuthError',
        status: 400,
      };
      
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      let signUpResult: any;
      await act(async () => {
        signUpResult = await result.current.signUp('existing@example.com', 'password123');
      });
      
      expect(signUpResult.error).toEqual(mockError);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Sign up error:', mockError);
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle unexpected sign up errors', async () => {
      mockSupabase.auth.signUp.mockRejectedValue(new Error('Network error'));
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      let signUpResult: any;
      await act(async () => {
        signUpResult = await result.current.signUp('user@example.com', 'password123');
      });
      
      expect(signUpResult.error).toEqual({
        message: 'An unexpected error occurred during sign up',
        name: 'UnexpectedError',
        status: 500,
      });
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('signIn method (Requirement 1.1, 1.3)', () => {
    it('should sign in an existing user successfully', async () => {
      const mockUser: Partial<User> = {
        id: 'user-123',
        email: 'user@example.com',
      };
      
      const mockSession: Partial<Session> = {
        user: mockUser as User,
        access_token: 'token-123',
      };
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });
      
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      let signInResult: any;
      await act(async () => {
        signInResult = await result.current.signIn('user@example.com', 'password123');
      });
      
      expect(signInResult.error).toBeNull();
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
      });
    });

    it('should handle sign in errors', async () => {
      const mockError: Partial<AuthError> = {
        message: 'Invalid credentials',
        name: 'AuthError',
        status: 401,
      };
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      let signInResult: any;
      await act(async () => {
        signInResult = await result.current.signIn('user@example.com', 'wrongpassword');
      });
      
      expect(signInResult.error).toEqual(mockError);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Sign in error:', mockError);
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle unexpected sign in errors', async () => {
      mockSupabase.auth.signInWithPassword.mockRejectedValue(new Error('Network error'));
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      let signInResult: any;
      await act(async () => {
        signInResult = await result.current.signIn('user@example.com', 'password123');
      });
      
      expect(signInResult.error).toEqual({
        message: 'An unexpected error occurred during sign in',
        name: 'UnexpectedError',
        status: 500,
      });
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('signOut method (Requirement 1.1)', () => {
    it('should sign out the current user successfully', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: null,
      });
      
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      let signOutResult: any;
      await act(async () => {
        signOutResult = await result.current.signOut();
      });
      
      expect(signOutResult.error).toBeNull();
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle sign out errors', async () => {
      const mockError: Partial<AuthError> = {
        message: 'Sign out failed',
        name: 'AuthError',
        status: 500,
      };
      
      mockSupabase.auth.signOut.mockResolvedValue({
        error: mockError,
      });
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      let signOutResult: any;
      await act(async () => {
        signOutResult = await result.current.signOut();
      });
      
      expect(signOutResult.error).toEqual(mockError);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Sign out error:', mockError);
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle unexpected sign out errors', async () => {
      mockSupabase.auth.signOut.mockRejectedValue(new Error('Network error'));
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      let signOutResult: any;
      await act(async () => {
        signOutResult = await result.current.signOut();
      });
      
      expect(signOutResult.error).toEqual({
        message: 'An unexpected error occurred during sign out',
        name: 'UnexpectedError',
        status: 500,
      });
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');
      
      consoleErrorSpy.mockRestore();
    });

    it('should provide auth context when used within AuthProvider', async () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('session');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('signUp');
      expect(result.current).toHaveProperty('signIn');
      expect(result.current).toHaveProperty('signOut');
    });
  });
});
