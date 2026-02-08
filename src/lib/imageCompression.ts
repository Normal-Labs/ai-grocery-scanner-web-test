/**
 * Image Compression Utility
 * 
 * Compresses images before sending to Gemini API to reduce costs.
 * Resizes images to 1024x1024 max while maintaining aspect ratio.
 */

import imageCompression from 'browser-image-compression';

/**
 * Compression options optimized for Gemini API
 * - Max dimension: 1024px (sufficient for label reading)
 * - Quality: 0.8 (good balance between quality and size)
 * - Format: JPEG (smaller than PNG for photos)
 * - Web Worker disabled to comply with CSP restrictions
 */
const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5, // Max file size in MB
  maxWidthOrHeight: 1024, // Max dimension in pixels
  useWebWorker: false, // Disabled to comply with CSP (blob URLs violate script-src)
  fileType: 'image/jpeg' as const,
  initialQuality: 0.8, // JPEG quality
};

/**
 * Compress a base64 image to reduce API costs
 * 
 * @param base64Image - Base64-encoded image with data URI prefix
 * @returns Compressed base64 image
 */
export async function compressImage(base64Image: string): Promise<string> {
  try {
    // Convert base64 to File (required by browser-image-compression)
    const file = base64ToFile(base64Image);
    
    // Compress the image
    const compressedBlob = await imageCompression(file, COMPRESSION_OPTIONS);
    
    // Convert back to base64
    const compressedBase64 = await blobToBase64(compressedBlob);
    
    return compressedBase64;
  } catch (error) {
    console.error('Image compression failed:', error);
    // Return original image if compression fails
    return base64Image;
  }
}

/**
 * Convert base64 string to File object
 * Uses native browser APIs (atob, Uint8Array, Blob) to comply with CSP restrictions
 */
function base64ToFile(base64: string): File {
  // 1. Parse the data URL to extract MIME type and base64 content
  const parts = base64.split(',');
  if (parts.length !== 2) {
    throw new Error('Invalid base64 data URL format');
  }
  
  const header = parts[0]; // e.g., "data:image/jpeg;base64"
  const base64Data = parts[1]; // The actual base64 content
  
  // 2. Extract MIME type from header using regex
  const mimeMatch = header.match(/:(.*?);/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  
  // 3. Decode base64 to binary string using atob()
  const binaryString = atob(base64Data);
  
  // 4. Convert binary string to Uint8Array
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // 5. Create Blob from Uint8Array
  const blob = new Blob([bytes], { type: mimeType });
  
  // 6. Convert Blob to File
  return new File([blob], 'image.jpg', { type: mimeType });
}

/**
 * Convert Blob to base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
