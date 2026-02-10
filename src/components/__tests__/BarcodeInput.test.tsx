/**
 * Unit tests for BarcodeInput component
 * 
 * Tests barcode input validation, user interactions, and accessibility.
 * 
 * Requirements: 2.1, 2.2
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import BarcodeInput, { isValidBarcode } from '../BarcodeInput';

describe('BarcodeInput', () => {
  describe('Rendering', () => {
    it('should render input field with label', () => {
      const mockOnChange = jest.fn();
      render(<BarcodeInput value="" onChange={mockOnChange} />);

      expect(screen.getByLabelText('Product Barcode')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter 8-13 digit barcode')).toBeInTheDocument();
    });

    it('should display current value', () => {
      const mockOnChange = jest.fn();
      render(<BarcodeInput value="12345678" onChange={mockOnChange} />);

      const input = screen.getByLabelText('Product Barcode') as HTMLInputElement;
      expect(input.value).toBe('12345678');
    });

    it('should be disabled when disabled prop is true', () => {
      const mockOnChange = jest.fn();
      render(<BarcodeInput value="" onChange={mockOnChange} disabled={true} />);

      const input = screen.getByLabelText('Product Barcode');
      expect(input).toBeDisabled();
    });

    it('should not be disabled by default', () => {
      const mockOnChange = jest.fn();
      render(<BarcodeInput value="" onChange={mockOnChange} />);

      const input = screen.getByLabelText('Product Barcode');
      expect(input).not.toBeDisabled();
    });
  });

  describe('Input Validation', () => {
    it('should accept numeric input', () => {
      const mockOnChange = jest.fn();
      render(<BarcodeInput value="" onChange={mockOnChange} />);

      const input = screen.getByLabelText('Product Barcode');
      fireEvent.change(input, { target: { value: '123' } });

      expect(mockOnChange).toHaveBeenCalledWith('123');
    });

    it('should reject non-numeric input', () => {
      const mockOnChange = jest.fn();
      render(<BarcodeInput value="" onChange={mockOnChange} />);

      const input = screen.getByLabelText('Product Barcode');
      fireEvent.change(input, { target: { value: 'abc' } });

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should reject mixed alphanumeric input', () => {
      const mockOnChange = jest.fn();
      render(<BarcodeInput value="" onChange={mockOnChange} />);

      const input = screen.getByLabelText('Product Barcode');
      fireEvent.change(input, { target: { value: '123abc' } });

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should limit input to 13 digits', () => {
      const mockOnChange = jest.fn();
      render(<BarcodeInput value="1234567890123" onChange={mockOnChange} />);

      const input = screen.getByLabelText('Product Barcode');
      fireEvent.change(input, { target: { value: '12345678901234' } });

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should allow exactly 13 digits', () => {
      const mockOnChange = jest.fn();
      render(<BarcodeInput value="" onChange={mockOnChange} />);

      const input = screen.getByLabelText('Product Barcode');
      fireEvent.change(input, { target: { value: '1234567890123' } });

      expect(mockOnChange).toHaveBeenCalledWith('1234567890123');
    });

    it('should allow empty input', () => {
      const mockOnChange = jest.fn();
      render(<BarcodeInput value="123" onChange={mockOnChange} />);

      const input = screen.getByLabelText('Product Barcode');
      fireEvent.change(input, { target: { value: '' } });

      expect(mockOnChange).toHaveBeenCalledWith('');
    });
  });

  describe('Validation Display', () => {
    it('should show error for barcode less than 8 digits after blur', () => {
      const mockOnChange = jest.fn();
      render(<BarcodeInput value="1234567" onChange={mockOnChange} showValidation={true} />);

      const input = screen.getByLabelText('Product Barcode');
      fireEvent.blur(input);

      expect(screen.getByText(/Barcode must be at least 8 digits/)).toBeInTheDocument();
      expect(screen.getByText(/currently 7/)).toBeInTheDocument();
    });

    it('should show success for valid 8-digit barcode', () => {
      const mockOnChange = jest.fn();
      render(<BarcodeInput value="12345678" onChange={mockOnChange} showValidation={true} />);

      expect(screen.getByText('Valid barcode format')).toBeInTheDocument();
    });

    it('should show success for valid 12-digit barcode (UPC-A)', () => {
      const mockOnChange = jest.fn();
      render(<BarcodeInput value="123456789012" onChange={mockOnChange} showValidation={true} />);

      expect(screen.getByText('Valid barcode format')).toBeInTheDocument();
    });

    it('should show success for valid 13-digit barcode (EAN-13)', () => {
      const mockOnChange = jest.fn();
      render(<BarcodeInput value="1234567890123" onChange={mockOnChange} showValidation={true} />);

      expect(screen.getByText('Valid barcode format')).toBeInTheDocument();
    });

    it('should not show validation when showValidation is false', () => {
      const mockOnChange = jest.fn();
      render(<BarcodeInput value="123" onChange={mockOnChange} showValidation={false} />);

      const input = screen.getByLabelText('Product Barcode');
      fireEvent.blur(input);

      expect(screen.queryByText(/Barcode must be at least 8 digits/)).not.toBeInTheDocument();
    });

    it('should hide error on focus', () => {
      const mockOnChange = jest.fn();
      render(<BarcodeInput value="1234567" onChange={mockOnChange} showValidation={true} />);

      const input = screen.getByLabelText('Product Barcode');
      
      // Blur to show error
      fireEvent.blur(input);
      expect(screen.getByText(/Barcode must be at least 8 digits/)).toBeInTheDocument();

      // Focus to hide error
      fireEvent.focus(input);
      expect(screen.queryByText(/Barcode must be at least 8 digits/)).not.toBeInTheDocument();
    });

    it('should show helper text when no validation message is displayed', () => {
      const mockOnChange = jest.fn();
      render(<BarcodeInput value="" onChange={mockOnChange} showValidation={true} />);

      expect(screen.getByText(/Enter the product barcode/)).toBeInTheDocument();
      expect(screen.getByText(/Common formats: UPC-A/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-invalid attribute when invalid', () => {
      const mockOnChange = jest.fn();
      render(<BarcodeInput value="123" onChange={mockOnChange} showValidation={true} />);

      const input = screen.getByLabelText('Product Barcode');
      fireEvent.blur(input);

      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should have aria-describedby pointing to error message', () => {
      const mockOnChange = jest.fn();
      render(<BarcodeInput value="123" onChange={mockOnChange} showValidation={true} />);

      const input = screen.getByLabelText('Product Barcode');
      fireEvent.blur(input);

      expect(input).toHaveAttribute('aria-describedby', 'barcode-error');
    });

    it('should have aria-describedby pointing to success message', () => {
      const mockOnChange = jest.fn();
      render(<BarcodeInput value="12345678" onChange={mockOnChange} showValidation={true} />);

      const input = screen.getByLabelText('Product Barcode');
      expect(input).toHaveAttribute('aria-describedby', 'barcode-success');
    });

    it('should have role="alert" on error message', () => {
      const mockOnChange = jest.fn();
      render(<BarcodeInput value="123" onChange={mockOnChange} showValidation={true} />);

      const input = screen.getByLabelText('Product Barcode');
      fireEvent.blur(input);

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent(/Barcode must be at least 8 digits/);
    });

    it('should have inputMode="numeric" for mobile keyboards', () => {
      const mockOnChange = jest.fn();
      render(<BarcodeInput value="" onChange={mockOnChange} />);

      const input = screen.getByLabelText('Product Barcode');
      expect(input).toHaveAttribute('inputMode', 'numeric');
    });

    it('should have pattern attribute for numeric input', () => {
      const mockOnChange = jest.fn();
      render(<BarcodeInput value="" onChange={mockOnChange} />);

      const input = screen.getByLabelText('Product Barcode');
      expect(input).toHaveAttribute('pattern', '\\d*');
    });
  });

  describe('Visual Feedback', () => {
    it('should show checkmark icon for valid barcode', () => {
      const mockOnChange = jest.fn();
      render(<BarcodeInput value="12345678" onChange={mockOnChange} showValidation={true} />);

      expect(screen.getByLabelText('valid')).toBeInTheDocument();
    });

    it('should show X icon for invalid barcode', () => {
      const mockOnChange = jest.fn();
      render(<BarcodeInput value="123" onChange={mockOnChange} showValidation={true} />);

      expect(screen.getByLabelText('invalid')).toBeInTheDocument();
    });

    it('should not show icons when showValidation is false', () => {
      const mockOnChange = jest.fn();
      render(<BarcodeInput value="12345678" onChange={mockOnChange} showValidation={false} />);

      expect(screen.queryByLabelText('valid')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('invalid')).not.toBeInTheDocument();
    });

    it('should not show icons when value is empty', () => {
      const mockOnChange = jest.fn();
      render(<BarcodeInput value="" onChange={mockOnChange} showValidation={true} />);

      expect(screen.queryByLabelText('valid')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('invalid')).not.toBeInTheDocument();
    });
  });
});

describe('isValidBarcode', () => {
  it('should return true for 8-digit barcode', () => {
    expect(isValidBarcode('12345678')).toBe(true);
  });

  it('should return true for 12-digit barcode (UPC-A)', () => {
    expect(isValidBarcode('123456789012')).toBe(true);
  });

  it('should return true for 13-digit barcode (EAN-13)', () => {
    expect(isValidBarcode('1234567890123')).toBe(true);
  });

  it('should return false for barcode with less than 8 digits', () => {
    expect(isValidBarcode('1234567')).toBe(false);
  });

  it('should return false for barcode with more than 13 digits', () => {
    expect(isValidBarcode('12345678901234')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isValidBarcode('')).toBe(false);
  });

  it('should return false for non-numeric barcode', () => {
    expect(isValidBarcode('abcdefgh')).toBe(false);
  });

  it('should return false for mixed alphanumeric barcode', () => {
    expect(isValidBarcode('1234abcd')).toBe(false);
  });

  it('should return false for barcode with spaces', () => {
    expect(isValidBarcode('1234 5678')).toBe(false);
  });

  it('should return false for barcode with special characters', () => {
    expect(isValidBarcode('1234-5678')).toBe(false);
  });
});
