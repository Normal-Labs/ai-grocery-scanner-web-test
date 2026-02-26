/**
 * Image Hashing Utility
 * 
 * Provides functions to generate consistent hashes from image data
 * for cache lookup purposes when barcode is not available.
 */

/**
 * Generate a hash from base64 image data
 * 
 * Creates a SHA-256 hash of the image data for use as a cache key.
 * This allows caching of products even when no barcode is provided.
 * Works in both browser and Node.js environments.
 * 
 * @param imageData - Base64 encoded image data with data URI prefix
 * @returns Hex string hash of the image
 * 
 * @example
 * ```typescript
 * const hash = await hashImage('data:image/jpeg;base64,/9j/4AAQ...');
 * console.log('Image hash:', hash);
 * ```
 */
export async function hashImage(imageData: string): Promise<string> {
  // Remove data URI prefix if present
  const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
  
  // Check if we're in Node.js or browser environment
  if (typeof window === 'undefined') {
    // Node.js environment - use crypto module
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(base64Data);
    return hash.digest('hex');
  } else {
    // Browser environment - use Web Crypto API
    // Convert base64 to Uint8Array
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Generate SHA-256 hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    
    // Convert hash to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  }
}

/**
 * Generate a short hash (first 16 characters) for display purposes
 * 
 * @param imageData - Base64 encoded image data
 * @returns Short hex string hash
 */
export async function hashImageShort(imageData: string): Promise<string> {
  const fullHash = await hashImage(imageData);
  return fullHash.substring(0, 16);
}
