/**
 * useScan Hook
 * 
 * Custom React hook for managing product scan API calls with Supabase authentication.
 * Handles POST requests to the /api/scan endpoint, manages loading state,
 * tracks cache status, handles authentication errors, and parses/validates JSON responses.
 * 
 * This hook replaces useAnalysis for the new cache-first scan flow with Supabase.
 * 
 * Requirements: 1.2, 5.1, 5.2, 5.3
 */

'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { AnalysisResult, TierType, InsightCategory } from '@/lib/types';
import type { ScanResult } from '@/lib/orchestrator/types';
import { compressImage } from '@/lib/imageCompression';

/**
 * Scan request parameters
 */
export interface ScanParams {
  imageData: string;
  barcode?: string;
  tier: TierType;
  dimension?: InsightCategory;
  location?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Return type for useScan hook
 */
export interface UseScanReturn {
  scanProduct: (params: ScanParams) => Promise<AnalysisResult>;
  isLoading: boolean;
  error: string | null;
  fromCache: boolean | null;
}

/**
 * Custom hook for managing scan API calls with authentication
 * 
 * @returns {UseScanReturn} Scan function, loading state, error state, and cache status
 * 
 * @example
 * ```tsx
 * const { scanProduct, isLoading, error, fromCache } = useScan();
 * 
 * // Scan a product
 * try {
 *   const results = await scanProduct({
 *     imageData: base64ImageData,
 *     barcode: '1234567890',
 *     tier: 'free',
 *     dimension: 'health',
 *     location: { latitude: 37.7749, longitude: -122.4194 }
 *   });
 *   console.log('Scan results:', results);
 *   console.log('From cache:', fromCache);
 * } catch (err) {
 *   console.error('Scan failed:', error);
 * }
 * ```
 */
export function useScan(): UseScanReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState<boolean | null>(null);
  const { session } = useAuth();

  /**
   * Scan a product by sending it to the /api/scan endpoint
   * 
   * Requirements:
   * - 1.2: Associate scans with authenticated user_id
   * - 5.1: Check MongoDB cache before triggering Research Agent
   * - 5.2: Update last_scanned_at timestamp on cache hit
   * - 5.3: Return cached insight without triggering Research Agent on cache hit
   * 
   * @param {ScanParams} params - Scan parameters including image, barcode, tier, dimension, and location
   * @returns {Promise<AnalysisResult>} Analysis results containing detected products and insights
   * @throws {Error} If the API call fails or returns an invalid response
   */
  const scanProduct = useCallback(async (params: ScanParams): Promise<AnalysisResult> => {
    // Reset error state and cache status
    setError(null);
    setIsLoading(true);
    setFromCache(null);

    try {
      // Validate authentication
      if (!session) {
        throw new Error('Authentication required. Please sign in to scan products.');
      }

      // Validate input
      if (!params.imageData || typeof params.imageData !== 'string') {
        throw new Error('Invalid image data provided');
      }

      if (params.barcode && typeof params.barcode !== 'string') {
        throw new Error('Invalid barcode provided');
      }

      // Validate tier-specific requirements
      if (params.tier === 'free' && !params.dimension) {
        throw new Error('Dimension is required for free tier');
      }

      // Compress image before sending to API (reduces costs)
      console.log('[Image Compression]', {
        originalSize: Math.round(params.imageData.length / 1024),
        unit: 'KB'
      });
      
      const compressedImage = await compressImage(params.imageData);
      
      console.log('[Image Compression]', {
        compressedSize: Math.round(compressedImage.length / 1024),
        unit: 'KB',
        reduction: Math.round((1 - compressedImage.length / params.imageData.length) * 100) + '%'
      });

      // Get access token from session
      const accessToken = session.access_token;

      // Make POST request to scan API with authentication
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          imageData: compressedImage,
          barcode: params.barcode,
          tier: params.tier,
          dimension: params.dimension,
          location: params.location,
        }),
      });

      // Handle non-OK responses
      if (!response.ok) {
        // Try to parse error message from response
        let errorMessage = 'Failed to scan product. Please try again.';
        
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // If JSON parsing fails, use status-based messages
          if (response.status === 400) {
            errorMessage = 'Invalid scan data. Please try again.';
          } else if (response.status === 401) {
            errorMessage = 'Authentication required. Please sign in to scan products.';
          } else if (response.status === 429) {
            errorMessage = 'Too many requests. Please wait a moment and try again.';
          } else if (response.status === 500) {
            errorMessage = 'Server error. Please try again later.';
          } else if (response.status === 503) {
            errorMessage = 'Service temporarily unavailable. Please try again in a moment.';
          } else {
            errorMessage = `Request failed with status ${response.status}. Please try again.`;
          }
        }

        setError(errorMessage);
        throw new Error(errorMessage);
      }

      // Parse JSON response
      let responseData: { success: boolean; data?: ScanResult; error?: string };
      try {
        responseData = await response.json();
      } catch (parseError) {
        const errorMessage = 'Invalid response from server. Please try again.';
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      // Validate response structure
      if (!responseData || typeof responseData !== 'object') {
        const errorMessage = 'Invalid response format from server.';
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      // Check for success flag
      if (!responseData.success) {
        const errorMessage = responseData.error || 'Scan failed. Please try again.';
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      // Validate that data exists
      if (!responseData.data) {
        const errorMessage = 'No scan data returned from server.';
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      const scanResult = responseData.data;

      // Update cache status
      setFromCache(scanResult.fromCache);

      // Validate ScanResult structure
      if (!scanResult.analysis || typeof scanResult.analysis !== 'object') {
        const errorMessage = 'Invalid scan result format.';
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      const analysisResult = scanResult.analysis;

      if (!analysisResult.products || !Array.isArray(analysisResult.products)) {
        const errorMessage = 'Invalid analysis result format.';
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      // Validate each product in the results
      for (const product of analysisResult.products) {
        if (!product.productName || typeof product.productName !== 'string') {
          const errorMessage = 'Invalid product data in scan results.';
          setError(errorMessage);
          throw new Error(errorMessage);
        }

        if (!product.insights || typeof product.insights !== 'object') {
          const errorMessage = 'Invalid insights data in scan results.';
          setError(errorMessage);
          throw new Error(errorMessage);
        }

        // Validate all five insight categories are present
        const requiredCategories = ['health', 'preservatives', 'allergies', 'sustainability', 'carbon'];
        for (const category of requiredCategories) {
          const insight = product.insights[category as keyof typeof product.insights];
          
          if (!insight || typeof insight !== 'object') {
            const errorMessage = `Missing or invalid ${category} insight in scan results.`;
            setError(errorMessage);
            throw new Error(errorMessage);
          }

          if (!insight.rating || typeof insight.rating !== 'string') {
            const errorMessage = `Invalid rating for ${category} insight.`;
            setError(errorMessage);
            throw new Error(errorMessage);
          }

          if (!insight.explanation || typeof insight.explanation !== 'string') {
            const errorMessage = `Invalid explanation for ${category} insight.`;
            setError(errorMessage);
            throw new Error(errorMessage);
          }
        }
      }

      // Success - return the validated analysis result
      setIsLoading(false);
      return analysisResult;

    } catch (err) {
      setIsLoading(false);

      // Handle network errors
      if (err instanceof TypeError && err.message.includes('fetch')) {
        const errorMessage = 'Network error. Please check your connection and try again.';
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      // Re-throw the error if it's already been processed
      if (err instanceof Error) {
        // If we haven't set an error yet, set it now
        if (!error) {
          setError(err.message);
        }
        throw err;
      }

      // Handle unknown errors
      const errorMessage = 'An unexpected error occurred. Please try again.';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [session, error]);

  return {
    scanProduct,
    isLoading,
    error,
    fromCache,
  };
}
