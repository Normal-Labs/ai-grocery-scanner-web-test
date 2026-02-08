/**
 * useAnalysis Hook
 * 
 * Custom React hook for managing image analysis API calls with tier support.
 * Handles POST requests to the /api/analyze endpoint, manages loading state,
 * tracks progress steps, handles network errors, and parses/validates JSON responses.
 * 
 * Requirements: 3.1, 3.8, 8.2, 11.2, 11.4, 12.1
 */

'use client';

import { useState, useCallback } from 'react';
import type { AnalysisResult, EnhancedAnalyzeResponse, TierType, InsightCategory, ProgressStep } from '@/lib/types';
import { compressImage } from '@/lib/imageCompression';

/**
 * Return type for useAnalysis hook
 */
export interface UseAnalysisReturn {
  analyzeImage: (imageData: string, tier: TierType, dimension?: InsightCategory) => Promise<AnalysisResult>;
  isLoading: boolean;
  error: string | null;
  progressSteps: ProgressStep[];
}

/**
 * Custom hook for managing analysis API calls
 * 
 * @returns {UseAnalysisReturn} Analysis function, loading state, and error state
 * 
 * @example
 * ```tsx
 * const { analyzeImage, isLoading, error } = useAnalysis();
 * 
 * // Analyze an image
 * try {
 *   const results = await analyzeImage(base64ImageData);
 *   console.log('Analysis results:', results);
 * } catch (err) {
 *   console.error('Analysis failed:', error);
 * }
 * ```
 */
export function useAnalysis(): UseAnalysisReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);

  /**
   * Analyze an image by sending it to the API endpoint with tier support
   * 
   * Requirements: 3.1, 3.8, 8.2, 11.2, 11.4, 12.1
   * 
   * @param {string} imageData - Base64-encoded image data with data URI prefix
   * @param {TierType} tier - User's access tier (free or premium)
   * @param {InsightCategory} dimension - Dimension to analyze (required for free tier)
   * @returns {Promise<AnalysisResult>} Analysis results containing detected products and insights
   * @throws {Error} If the API call fails or returns an invalid response
   */
  const analyzeImage = useCallback(async (
    imageData: string,
    tier: TierType,
    dimension?: InsightCategory
  ): Promise<AnalysisResult> => {
    // Reset error state and progress
    setError(null);
    setIsLoading(true);
    setProgressSteps([]);

    try {
      // Validate input
      if (!imageData || typeof imageData !== 'string') {
        throw new Error('Invalid image data provided');
      }

      // Validate tier-specific requirements
      if (tier === 'free' && !dimension) {
        throw new Error('Dimension is required for free tier');
      }

      // Compress image before sending to API (reduces costs)
      console.log('[Image Compression]', {
        originalSize: Math.round(imageData.length / 1024),
        unit: 'KB'
      });
      
      const compressedImage = await compressImage(imageData);
      
      console.log('[Image Compression]', {
        compressedSize: Math.round(compressedImage.length / 1024),
        unit: 'KB',
        reduction: Math.round((1 - compressedImage.length / imageData.length) * 100) + '%'
      });

      // Make POST request to analysis API with tier and dimension
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          imageData: compressedImage,
          tier,
          dimension
        }),
      });

      // Handle non-OK responses
      if (!response.ok) {
        // Try to parse error message from response
        let errorMessage = 'Failed to analyze image. Please try again.';
        
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // If JSON parsing fails, use status-based messages
          if (response.status === 400) {
            errorMessage = 'Invalid image data. Please try a different image.';
          } else if (response.status === 429) {
            errorMessage = 'Too many requests. Please wait a moment and try again.';
          } else if (response.status === 500) {
            errorMessage = 'Server error. Please try again later.';
          } else if (response.status === 502) {
            errorMessage = 'Analysis service unavailable. Please try again.';
          } else {
            errorMessage = `Request failed with status ${response.status}. Please try again.`;
          }
        }

        setError(errorMessage);
        throw new Error(errorMessage);
      }

      // Parse JSON response
      let responseData: EnhancedAnalyzeResponse;
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
        const errorMessage = responseData.error || 'Analysis failed. Please try again.';
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      // Validate that data exists
      if (!responseData.data) {
        const errorMessage = 'No analysis data returned from server.';
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      // Update progress steps if available (Premium tier)
      if (responseData.steps && responseData.steps.length > 0) {
        setProgressSteps(responseData.steps);
      }

      // Validate AnalysisResult structure
      const analysisResult = responseData.data;
      
      if (!analysisResult.products || !Array.isArray(analysisResult.products)) {
        const errorMessage = 'Invalid analysis result format.';
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      // Validate each product in the results
      for (const product of analysisResult.products) {
        if (!product.productName || typeof product.productName !== 'string') {
          const errorMessage = 'Invalid product data in analysis results.';
          setError(errorMessage);
          throw new Error(errorMessage);
        }

        if (!product.insights || typeof product.insights !== 'object') {
          const errorMessage = 'Invalid insights data in analysis results.';
          setError(errorMessage);
          throw new Error(errorMessage);
        }

        // Validate all five insight categories are present
        const requiredCategories = ['health', 'preservatives', 'allergies', 'sustainability', 'carbon'];
        for (const category of requiredCategories) {
          const insight = product.insights[category as keyof typeof product.insights];
          
          if (!insight || typeof insight !== 'object') {
            const errorMessage = `Missing or invalid ${category} insight in analysis results.`;
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
  }, [error]);

  return {
    analyzeImage,
    isLoading,
    error,
    progressSteps,
  };
}
