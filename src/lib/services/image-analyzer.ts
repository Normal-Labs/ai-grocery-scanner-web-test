/**
 * Image Analyzer Service for Multi-Tier Product Identification
 * 
 * This service performs comprehensive product analysis using Gemini AI.
 * Used as Tier 4 fallback when other methods fail.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */

import { geminiClient, GeminiClient } from './gemini-client';
import {
  ImageData,
  ProductMetadata,
  VisualCharacteristics,
  AnalyzeImageRequest,
  AnalyzeImageResponse,
  ConfidenceScore,
} from '@/lib/types/multi-tier';

/**
 * Image Analyzer Service class
 * 
 * Performs comprehensive product analysis from images using Gemini AI.
 * This is the most expensive tier but handles any product image.
 */
export class ImageAnalyzerService {
  private geminiClient: GeminiClient;
  private minConfidenceThreshold: number = 0.6; // Requirement 4.5

  constructor(geminiClient?: GeminiClient) {
    this.geminiClient = geminiClient || new GeminiClient();
  }

  /**
   * Analyze product image comprehensively
   * Requirement 4.2, 4.3, 4.4: Extract product details and calculate confidence
   * Requirement 4.7: Complete within 8 seconds
   * 
   * @param request - Analyze image request with image and hash
   * @returns Promise resolving to analyze image response
   */
  async analyzeImage(request: AnalyzeImageRequest): Promise<AnalyzeImageResponse> {
    const startTime = Date.now();
    
    try {
      console.log('[Image Analyzer] 🔍 Starting comprehensive image analysis...');

      // Analyze product using Gemini AI
      const result = await this.geminiClient.analyzeProduct(request.image);

      const processingTimeMs = Date.now() - startTime;

      // Check confidence threshold
      // Requirement 4.5: Prompt user to retake if confidence < 0.6
      if (result.confidence < this.minConfidenceThreshold) {
        console.log(`[Image Analyzer] ⚠️  Low confidence: ${result.confidence.toFixed(2)} < ${this.minConfidenceThreshold}`);
        console.log('[Image Analyzer] User should be prompted to retake image');
      }

      console.log('[Image Analyzer] ✅ Image analysis complete');
      console.log('[Image Analyzer] Result:', {
        productName: result.metadata.productName,
        brandName: result.metadata.brandName,
        confidence: result.confidence.toFixed(2),
        processingTimeMs,
      });

      return {
        success: true,
        metadata: result.metadata,
        confidence: result.confidence,
        visualCharacteristics: result.visualCharacteristics,
        processingTimeMs,
      };
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      
      console.error('[Image Analyzer] ❌ Image analysis failed:', error);

      return {
        success: false,
        metadata: {
          keywords: [],
        },
        confidence: 0,
        visualCharacteristics: {
          colors: [],
          packaging: 'unknown',
          shape: 'unknown',
        },
        processingTimeMs,
        error: {
          code: 'IMAGE_ANALYSIS_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          tier: 4,
          retryable: true,
        },
      };
    }
  }

  /**
   * Check if confidence score meets minimum threshold
   * Requirement 4.5: Check confidence threshold
   * 
   * @param confidence - Confidence score to check
   * @returns True if confidence meets threshold
   */
  isConfidenceSufficient(confidence: ConfidenceScore): boolean {
    return confidence >= this.minConfidenceThreshold;
  }

  /**
   * Get minimum confidence threshold
   * 
   * @returns Minimum confidence threshold
   */
  getMinConfidenceThreshold(): number {
    return this.minConfidenceThreshold;
  }

  /**
   * Set minimum confidence threshold
   * 
   * @param threshold - New threshold value (0.0 to 1.0)
   */
  setMinConfidenceThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Confidence threshold must be between 0.0 and 1.0');
    }
    this.minConfidenceThreshold = threshold;
  }
}

// Export singleton instance
export const imageAnalyzerService = new ImageAnalyzerService();
