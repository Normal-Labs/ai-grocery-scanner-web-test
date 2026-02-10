/**
 * Unit tests for AuthGuard component
 * 
 * Tests route protection, authentication prompts, loading states,
 * and proper rendering of protected content.
 * 
 * Requirements: 1.1, 1.5
 */

import { render, screen, waitFor } from '@testing-library/react';
import AuthGuard from '../AuthGuard';
import { useAuth } from '@/contexts/AuthContext';

// Mock the useAuth hook
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock AuthModal component
jest.mock('../AuthModal', () => {
  return function MockAuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    if (!isOpen) return null;
    return (
      <div data-testid="auth-modal">
        <button onClick={onClose}>Close Modal</button>
      </div>
    );
  };
});

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('AuthGuard', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00Z',
    app_metadata: {},
    user_metadata: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading state', () => {
    it('should show default loading component while checking authentication', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: true,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.getByLabelText('Loading')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should show custom loading component when provided', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: true,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      });

      render(
        <AuthGuard loadingComponent={<div>Custom Loading...</div>}>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.getByText('Custom Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('unauthenticated state', () => {
    it('should show authentication prompt when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      expect(screen.getByText(/please sign in to access this feature/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should show auth modal automatically when not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
      });
    });

    it('should not show auth modal when showModal is false', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      });

      render(
        <AuthGuard showModal={false}>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument();
    });

    it('should show custom fallback when provided', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      });

      render(
        <AuthGuard fallback={<div>Custom Auth Prompt</div>} showModal={false}>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.getByText('Custom Auth Prompt')).toBeInTheDocument();
      expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('authenticated state', () => {
    it('should render children when user is authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: { user: mockUser } as any,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
      expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
      expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument();
    });

    it('should render multiple children when authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: { user: mockUser } as any,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      });

      render(
        <AuthGuard>
          <div>First Child</div>
          <div>Second Child</div>
          <div>Third Child</div>
        </AuthGuard>
      );

      expect(screen.getByText('First Child')).toBeInTheDocument();
      expect(screen.getByText('Second Child')).toBeInTheDocument();
      expect(screen.getByText('Third Child')).toBeInTheDocument();
    });

    it('should render complex component tree when authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: { user: mockUser } as any,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      });

      render(
        <AuthGuard>
          <div>
            <h1>Dashboard</h1>
            <div>
              <p>Welcome back!</p>
              <button>Action</button>
            </div>
          </div>
        </AuthGuard>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Welcome back!')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });
  });

  describe('authentication state transitions', () => {
    it('should transition from loading to authenticated', () => {
      const { rerender } = render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      // Initially loading
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: true,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      });
      rerender(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );
      expect(screen.getByLabelText('Loading')).toBeInTheDocument();

      // Then authenticated
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: { user: mockUser } as any,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      });
      rerender(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should transition from loading to unauthenticated', () => {
      const { rerender } = render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      // Initially loading
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: true,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      });
      rerender(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );
      expect(screen.getByLabelText('Loading')).toBeInTheDocument();

      // Then unauthenticated
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      });
      rerender(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );
      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    });

    it('should transition from authenticated to unauthenticated', () => {
      const { rerender } = render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      // Initially authenticated
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: { user: mockUser } as any,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      });
      rerender(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );
      expect(screen.getByText('Protected Content')).toBeInTheDocument();

      // Then unauthenticated (user logged out)
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      });
      rerender(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );
      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper loading state accessibility', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: true,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      const loadingSpinner = screen.getByLabelText('Loading');
      expect(loadingSpinner).toHaveAttribute('role', 'status');
    });

    it('should have accessible sign in button in unauthenticated state', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      expect(signInButton).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle null children gracefully', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: { user: mockUser } as any,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      });

      const { container } = render(
        <AuthGuard>
          {null}
        </AuthGuard>
      );

      // Should render without errors
      expect(container).toBeInTheDocument();
    });

    it('should handle undefined children gracefully', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: { user: mockUser } as any,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      });

      const { container } = render(
        <AuthGuard>
          {undefined}
        </AuthGuard>
      );

      // Should render without errors
      expect(container).toBeInTheDocument();
    });

    it('should handle conditional children', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: { user: mockUser } as any,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      });

      const showContent = true;

      render(
        <AuthGuard>
          {showContent && <div>Conditional Content</div>}
        </AuthGuard>
      );

      expect(screen.getByText('Conditional Content')).toBeInTheDocument();
    });
  });
});
