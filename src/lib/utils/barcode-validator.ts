/**
 * Barcode Validator Utility
 * 
 * Validates UPC-A (12-digit) and EAN-13 (13-digit) barcodes
 * using the standard Modulo 10 checksum algorithm.
 */

/**
 * Validates a UPC-A (12-digit) or EAN-13 (13-digit) barcode using Modulo 10.
 */
export function isValidBarcode(barcode: string): boolean {
  if (!/^\d{12,13}$/.test(barcode)) return false;

  const digits = barcode.split('').map(Number);
  const lastDigit = digits.pop()!;

  // Calculate checksum
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    const multiplier = (digits.length - i) % 2 === 0 ? 1 : 3;
    sum += digits[i] * multiplier;
  }

  const calculatedCheckDigit = (10 - (sum % 10)) % 10;
  return lastDigit === calculatedCheckDigit;
}
