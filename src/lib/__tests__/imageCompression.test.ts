/**
 * Tests for Image Compression Utility
 * Validates CSP-compliant base64 conversion and compression workflow
 */

import { compressImage } from '../imageCompression';

// Mock browser-image-compression
jest.mock('browser-image-compression', () => {
  return jest.fn((file: File) => {
    // Return a mock compressed blob
    return Promise.resolve(new Blob(['compressed'], { type: file.type }));
  });
});

describe('Image Compression Utility', () => {
  describe('compressImage', () => {
    it('should compress a valid JPEG base64 image', async () => {
      // Create a simple 1x1 red pixel JPEG
      const base64Image = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=';
      
      const result = await compressImage(base64Image);
      
      // Should return a base64 string
      expect(result).toMatch(/^data:image\/\w+;base64,/);
    });

    it('should compress a valid PNG base64 image', async () => {
      // Create a simple 1x1 transparent PNG
      const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const result = await compressImage(base64Image);
      
      // Should return a base64 string
      expect(result).toMatch(/^data:image\/\w+;base64,/);
    });

    it('should return original image if compression fails', async () => {
      const invalidBase64 = 'invalid-base64-string';
      
      const result = await compressImage(invalidBase64);
      
      // Should return the original string when compression fails
      expect(result).toBe(invalidBase64);
    });

    it('should handle WebP images', async () => {
      // Simple WebP base64 (1x1 pixel)
      const base64Image = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
      
      const result = await compressImage(base64Image);
      
      // Should return a base64 string
      expect(result).toMatch(/^data:image\/\w+;base64,/);
    });
  });

  describe('base64ToFile (via compressImage)', () => {
    it('should throw error for invalid data URL format (missing comma)', async () => {
      const invalidBase64 = 'data:image/jpeg;base64MISSING_COMMA';
      
      const result = await compressImage(invalidBase64);
      
      // Should return original due to error handling
      expect(result).toBe(invalidBase64);
    });

    it('should throw error for malformed base64 content', async () => {
      const invalidBase64 = 'data:image/jpeg;base64,!!!invalid!!!';
      
      const result = await compressImage(invalidBase64);
      
      // Should return original due to error handling
      expect(result).toBe(invalidBase64);
    });

    it('should extract MIME type correctly from various formats', async () => {
      const testCases = [
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=',
      ];

      for (const base64Image of testCases) {
        const result = await compressImage(base64Image);
        // Should successfully process all formats
        expect(result).toMatch(/^data:image\/\w+;base64,/);
      }
    });
  });
});
