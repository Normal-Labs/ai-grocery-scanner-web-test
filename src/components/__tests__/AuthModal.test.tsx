/**
 * Unit tests for AuthModal component
 * 
 * Tests authentication modal functionality including sign in, sign up,
 * form validation, error handling, and user interactions.
 * 
 * Requirements: 1.1, 1.5
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthModal from '../AuthModal';
import { useAuth } from '@/contexts/AuthContext';

// Mock the useAuth hook
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('AuthModal', () => {
  const mockSignIn = jest.fn();
  const mockSignUp = jest.fn();
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signIn: mockSignIn,
      signUp: mockSignUp,
      signOut: jest.fn(),
    });
  });

  describe('rendering', () => {
    it('should not render when isOpen is false', () => {
      const { container } = render(
        <AuthModal isOpen={false} onClose={mockOnClose} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render when isOpen is true', () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    });

    it('should render sign in form by default', () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.queryByLabelText('Confirm Password')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should render sign up form when toggled', () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);

      // Click toggle button
      const toggleButton = screen.getByText(/don't have an account\? sign up/i);
      fireEvent.click(toggleButton);

      expect(screen.getByRole('heading', { name: 'Sign Up' })).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('should show error for invalid email', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const form = screen.getByRole('dialog').querySelector('form')!;

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });

      expect(mockSignIn).not.toHaveBeenCalled();
    });

    it('should show error for short password', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const form = screen.getByRole('dialog').querySelector('form')!;

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: '12345' } });
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
      });

      expect(mockSignIn).not.toHaveBeenCalled();
    });

    it('should show error for mismatched passwords in sign up', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);

      // Switch to sign up mode
      const toggleButton = screen.getByText(/don't have an account\? sign up/i);
      fireEvent.click(toggleButton);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const form = screen.getByRole('dialog').querySelector('form')!;

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password456' } });
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      });

      expect(mockSignUp).not.toHaveBeenCalled();
    });
  });

  describe('sign in functionality', () => {
    it('should call signIn with correct credentials', async () => {
      mockSignIn.mockResolvedValue({ error: null });

      render(
        <AuthModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('should call onSuccess and onClose after successful sign in', async () => {
      mockSignIn.mockResolvedValue({ error: null });

      render(
        <AuthModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should display error message on sign in failure', async () => {
      mockSignIn.mockResolvedValue({
        error: { message: 'Invalid credentials', name: 'AuthError', status: 401 },
      });

      render(<AuthModal isOpen={true} onClose={mockOnClose} />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('sign up functionality', () => {
    it('should call signUp with correct credentials', async () => {
      mockSignUp.mockResolvedValue({ error: null });

      render(
        <AuthModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Switch to sign up mode
      const toggleButton = screen.getByText(/don't have an account\? sign up/i);
      fireEvent.click(toggleButton);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith('newuser@example.com', 'password123');
      });
    });

    it('should call onSuccess and onClose after successful sign up', async () => {
      mockSignUp.mockResolvedValue({ error: null });

      render(
        <AuthModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Switch to sign up mode
      const toggleButton = screen.getByText(/don't have an account\? sign up/i);
      fireEvent.click(toggleButton);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should display error message on sign up failure', async () => {
      mockSignUp.mockResolvedValue({
        error: { message: 'Email already registered', name: 'AuthError', status: 400 },
      });

      render(<AuthModal isOpen={true} onClose={mockOnClose} />);

      // Switch to sign up mode
      const toggleButton = screen.getByText(/don't have an account\? sign up/i);
      fireEvent.click(toggleButton);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email already registered')).toBeInTheDocument();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('should show loading state during sign in', async () => {
      mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100)));

      render(<AuthModal isOpen={true} onClose={mockOnClose} />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      // Check for loading state
      expect(screen.getByText('Signing In...')).toBeInTheDocument();
      expect(screen.getByLabelText('Loading')).toBeInTheDocument();

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalled();
      });
    });

    it('should disable inputs during loading', async () => {
      mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100)));

      render(<AuthModal isOpen={true} onClose={mockOnClose} />);

      const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      // Check that inputs are disabled
      expect(emailInput.disabled).toBe(true);
      expect(passwordInput.disabled).toBe(true);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalled();
      });
    });
  });

  describe('modal interactions', () => {
    it('should close modal when close button is clicked', () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);

      const closeButton = screen.getByLabelText('Close modal');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close modal when backdrop is clicked', () => {
      const { container } = render(<AuthModal isOpen={true} onClose={mockOnClose} />);

      // Find the backdrop (first div child)
      const backdrop = container.querySelector('.fixed.inset-0.bg-black') as HTMLElement;
      fireEvent.click(backdrop);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close modal when modal content is clicked', () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);

      const modalContent = screen.getByRole('dialog');
      fireEvent.click(modalContent);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should toggle between sign in and sign up modes', () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);

      // Initially in sign in mode
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();

      // Toggle to sign up
      const toggleButton = screen.getByText(/don't have an account\? sign up/i);
      fireEvent.click(toggleButton);
      expect(screen.getByRole('heading', { name: 'Sign Up' })).toBeInTheDocument();

      // Toggle back to sign in
      const toggleBackButton = screen.getByText(/already have an account\? sign in/i);
      fireEvent.click(toggleBackButton);
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    });

    it('should clear error when toggling modes', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);

      // Trigger validation error
      const form = screen.getByRole('dialog').querySelector('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });

      // Toggle mode
      const toggleButton = screen.getByText(/don't have an account\? sign up/i);
      fireEvent.click(toggleButton);

      // Error should be cleared
      expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'auth-modal-title');
    });

    it('should have proper form labels', () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('should have proper error alert role', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);

      const form = screen.getByRole('dialog').querySelector('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
      });
    });
  });
});
