/**
 * AuthGuard Component
 * 
 * Protects routes and components by requiring authentication.
 * Shows authentication prompt when user is not authenticated.
 * 
 * Requirements: 1.1, 1.5
 */

'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from './AuthModal';

interface AuthGuardProps {
  /** Children to render when authenticated */
  children: ReactNode;
  /** Optional custom loading component */
  loadingComponent?: ReactNode;
  /** Optional custom fallback when not authenticated */
  fallback?: ReactNode;
  /** Whether to show the auth modal automatically (default: true) */
  showModal?: boolean;
}

/**
 * AuthGuard Component
 * 
 * Wraps content that requires authentication. Shows a loading state while
 * checking authentication status, then either renders children (if authenticated)
 * or shows an authentication prompt (if not authenticated).
 * 
 * Requirements:
 * - 1.1: Authenticate users using Supabase Auth
 * - 1.5: Prompt for authentication when user is not authenticated
 * 
 * @example
 * ```tsx
 * // Protect a component
 * <AuthGuard>
 *   <ProtectedContent />
 * </AuthGuard>
 * 
 * // With custom loading
 * <AuthGuard loadingComponent={<Spinner />}>
 *   <ProtectedContent />
 * </AuthGuard>
 * 
 * // With custom fallback
 * <AuthGuard fallback={<CustomAuthPrompt />} showModal={false}>
 *   <ProtectedContent />
 * </AuthGuard>
 * ```
 */
export default function AuthGuard({
  children,
  loadingComponent,
  fallback,
  showModal = true,
}: AuthGuardProps) {
  const { user, loading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  /**
   * Show auth modal when user is not authenticated
   * Requirement 1.5: Prompt for authentication when user is not authenticated
   */
  useEffect(() => {
    if (!loading && !user && showModal) {
      setIsAuthModalOpen(true);
    }
  }, [loading, user, showModal]);

  /**
   * Handle successful authentication
   */
  const handleAuthSuccess = () => {
    setIsAuthModalOpen(false);
  };

  /**
   * Show loading state while checking authentication
   */
  if (loading) {
    return (
      <>
        {loadingComponent || (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <div
                className="inline-block w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"
                role="status"
                aria-label="Loading"
              />
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          </div>
        )}
      </>
    );
  }

  /**
   * Show authentication prompt if not authenticated
   * Requirement 1.5: Prompt for authentication when user is not authenticated
   */
  if (!user) {
    return (
      <>
        {fallback || (
          <div className="flex items-center justify-center min-h-[200px] p-6">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-4">🔒</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Authentication Required
              </h2>
              <p className="text-gray-600 mb-6">
                Please sign in to access this feature and start scanning products.
              </p>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md transition-all duration-200 active:scale-95"
              >
                Sign In
              </button>
            </div>
          </div>
        )}

        {/* Auth Modal */}
        {showModal && (
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onSuccess={handleAuthSuccess}
          />
        )}
      </>
    );
  }

  /**
   * User is authenticated, render children
   * Requirement 1.1: Authenticate users using Supabase Auth
   */
  return <>{children}</>;
}
