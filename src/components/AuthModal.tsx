/**
 * AuthModal Component
 * 
 * Modal dialog for user authentication (sign up and sign in).
 * Provides a clean, accessible interface for email/password authentication.
 * 
 * Requirements: 1.1, 1.5
 */

'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AuthModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Optional callback after successful authentication */
  onSuccess?: () => void;
}

type AuthMode = 'signin' | 'signup';

/**
 * AuthModal Component
 * 
 * Displays a modal dialog for user authentication with sign in and sign up modes.
 * Handles form validation, error display, and loading states.
 * 
 * Requirements:
 * - 1.1: Authenticate users using Supabase Auth
 * - 1.5: Prompt for authentication when user is not authenticated
 * 
 * @example
 * ```tsx
 * const [showAuth, setShowAuth] = useState(false);
 * 
 * <AuthModal
 *   isOpen={showAuth}
 *   onClose={() => setShowAuth(false)}
 *   onSuccess={() => console.log('User authenticated!')}
 * />
 * ```
 */
export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Don't render if not open
  if (!isOpen) return null;

  /**
   * Reset form state
   */
  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setIsLoading(false);
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    resetForm();
    onClose();
  };

  /**
   * Toggle between sign in and sign up modes
   */
  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError(null);
  };

  /**
   * Validate form inputs
   */
  const validateForm = (): boolean => {
    // Email validation
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }

    // Password validation
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }

    // Confirm password validation (sign up only)
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  /**
   * Handle form submission
   * 
   * Requirement 1.1: Authenticate users using Supabase Auth
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Call appropriate auth method
      const { error: authError } = mode === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password);

      if (authError) {
        setError(authError.message);
        setIsLoading(false);
        return;
      }

      // Success!
      resetForm();
      onSuccess?.();
      onClose();
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <div
          className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2
              id="auth-modal-title"
              className="text-2xl font-bold text-gray-900"
            >
              {mode === 'signin' ? 'Sign In' : 'Sign Up'}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <span className="text-2xl">&times;</span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="••••••••"
                required
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                minLength={6}
              />
            </div>

            {/* Confirm Password Input (Sign Up Only) */}
            {mode === 'signup' && (
              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div
                className="p-3 bg-red-50 border border-red-200 rounded-md"
                role="alert"
              >
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`
                w-full min-h-[44px] px-6 py-3
                bg-green-600 hover:bg-green-700
                text-white font-semibold
                rounded-lg shadow-md
                transition-all duration-200
                flex items-center justify-center gap-3
                ${isLoading ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
              `}
            >
              {isLoading && (
                <span
                  className="inline-block w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"
                  role="status"
                  aria-label="Loading"
                />
              )}
              <span>
                {isLoading
                  ? mode === 'signin' ? 'Signing In...' : 'Signing Up...'
                  : mode === 'signin' ? 'Sign In' : 'Sign Up'
                }
              </span>
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-4 text-center">
            <button
              onClick={toggleMode}
              disabled={isLoading}
              className="text-sm text-green-600 hover:text-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mode === 'signin'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'
              }
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
