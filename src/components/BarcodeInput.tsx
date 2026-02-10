/**
 * BarcodeInput Component
 * 
 * Provides a manual barcode input field with validation.
 * Validates barcode format (8-13 digits) as per requirements 2.1 and 2.2.
 * 
 * Requirements: 2.1, 2.2
 */

'use client';

import { useState, useEffect } from 'react';

/**
 * Props for BarcodeInput component
 */
export interface BarcodeInputProps {
  /** Current barcode value */
  value: string;
  /** Callback when barcode changes */
  onChange: (barcode: string) => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether to show validation errors */
  showValidation?: boolean;
}

/**
 * Barcode validation regex (8-13 digits)
 * Requirement 2.2: Enforce unique index on barcode column
 */
const BARCODE_REGEX = /^\d{8,13}$/;

/**
 * BarcodeInput Component
 * 
 * Provides a text input field for manual barcode entry with real-time validation.
 * Validates that barcodes are 8-13 digits as per standard barcode formats.
 * 
 * @param {BarcodeInputProps} props - Component props
 * @returns Barcode input field with validation
 * 
 * @example
 * ```tsx
 * const [barcode, setBarcode] = useState('');
 * 
 * <BarcodeInput
 *   value={barcode}
 *   onChange={setBarcode}
 *   disabled={false}
 *   showValidation={true}
 * />
 * ```
 */
export default function BarcodeInput({
  value,
  onChange,
  disabled = false,
  showValidation = true,
}: BarcodeInputProps) {
  const [touched, setTouched] = useState(false);
  const [isValid, setIsValid] = useState(false);

  // Validate barcode whenever value changes
  useEffect(() => {
    const valid = BARCODE_REGEX.test(value);
    setIsValid(valid);
  }, [value]);

  /**
   * Handle input change
   * Only allow numeric input
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Only allow digits
    if (newValue === '' || /^\d+$/.test(newValue)) {
      // Limit to 13 digits (max barcode length)
      if (newValue.length <= 13) {
        onChange(newValue);
      }
    }
  };

  /**
   * Handle input blur
   * Mark field as touched for validation display
   */
  const handleBlur = () => {
    setTouched(true);
  };

  /**
   * Handle input focus
   * Clear touched state to hide validation while typing
   */
  const handleFocus = () => {
    setTouched(false);
  };

  // Determine if we should show validation error
  const showError = showValidation && touched && value.length > 0 && !isValid;
  const showSuccess = showValidation && value.length > 0 && isValid;

  return (
    <div className="space-y-2">
      <label
        htmlFor="barcode-input"
        className="block text-sm font-medium text-gray-700"
      >
        Product Barcode
      </label>
      
      <div className="relative">
        <input
          id="barcode-input"
          type="text"
          inputMode="numeric"
          pattern="\d*"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          disabled={disabled}
          placeholder="Enter 8-13 digit barcode"
          className={`
            w-full px-4 py-3 rounded-lg border-2 transition-all duration-200
            text-lg font-mono tracking-wider
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
            ${showError ? 'border-red-500 focus:border-red-600' : ''}
            ${showSuccess ? 'border-green-500 focus:border-green-600' : ''}
            ${!showError && !showSuccess ? 'border-gray-300 focus:border-blue-500' : ''}
            focus:outline-none focus:ring-2
            ${showError ? 'focus:ring-red-200' : ''}
            ${showSuccess ? 'focus:ring-green-200' : ''}
            ${!showError && !showSuccess ? 'focus:ring-blue-200' : ''}
          `}
          aria-invalid={showError}
          aria-describedby={showError ? 'barcode-error' : showSuccess ? 'barcode-success' : undefined}
        />
        
        {/* Validation icon */}
        {showValidation && value.length > 0 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isValid ? (
              <span
                className="text-green-500 text-xl"
                role="img"
                aria-label="valid"
              >
                ✓
              </span>
            ) : (
              <span
                className="text-red-500 text-xl"
                role="img"
                aria-label="invalid"
              >
                ✗
              </span>
            )}
          </div>
        )}
      </div>

      {/* Validation messages */}
      {showError && (
        <p
          id="barcode-error"
          className="text-sm text-red-600 flex items-start gap-2"
          role="alert"
        >
          <span className="flex-shrink-0 mt-0.5">⚠️</span>
          <span>
            {value.length < 8
              ? `Barcode must be at least 8 digits (currently ${value.length})`
              : 'Barcode must contain only digits'}
          </span>
        </p>
      )}

      {showSuccess && (
        <p
          id="barcode-success"
          className="text-sm text-green-600 flex items-center gap-2"
        >
          <span>✓</span>
          <span>Valid barcode format</span>
        </p>
      )}

      {/* Helper text */}
      {!showError && !showSuccess && (
        <p className="text-sm text-gray-500">
          Enter the product barcode (8-13 digits). Common formats: UPC-A (12), EAN-13 (13), EAN-8 (8)
        </p>
      )}
    </div>
  );
}

/**
 * Validate barcode format
 * Exported for use in other components
 * 
 * @param {string} barcode - Barcode to validate
 * @returns {boolean} True if barcode is valid (8-13 digits)
 */
export function isValidBarcode(barcode: string): boolean {
  return BARCODE_REGEX.test(barcode);
}
