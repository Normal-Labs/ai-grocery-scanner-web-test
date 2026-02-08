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
 */
const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5, // Max file size in MB
  maxWidthOrHeight: 1024, // Max dimension in pixels
  useWebWorker: true, // Use web worker for better performance
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
    // Convert base64 to Blob
    const blob = await base64ToBlob(base64Image);
    
    // Compress the image
    const compressedBlob = await imageCompression(blob, COMPRESSION_OPTIONS);
    
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
 * Convert base64 string to Blob
 */
async function base64ToBlob(base64: string): Promise<Blob> {
  const response = await fetch(base64);
  return response.blob();
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
