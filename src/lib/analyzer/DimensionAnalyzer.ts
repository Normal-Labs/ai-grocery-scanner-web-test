/**
 * Dimension Analyzer Service
 * 
 * Analyzes products across 5 dimensions using Gemini AI with cache-first strategy.
 * Implements 30-day cache TTL and validates AI responses.
 * 
 * Requirements: 2.1, 2.2, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 7.1, 11.2, 11.5, 12.7
 */

import { DimensionCacheService } from '@/lib/cache/DimensionCacheService';
import { GeminiClient } from '@/lib/services/gemini-client';
import {
  AnalyzeDimensionsRequest,
  AnalyzeDimensionsResponse,
  DimensionAnalysisResult,
  DimensionScore,
  RawAIResponse,
} from '@/lib/types/dimension-analysis';
import { ImageData, ProductData } from '@/lib/types/multi-tier';

/**
 * Dimension Analyzer class
 * Implements cache-first dimension analysis with AI fallback
 */
export class DimensionAnalyzer {
  constructor(
    private dimensionCache: DimensionCacheService,
    private geminiClient: GeminiClient
  ) {}

  /**
   * Analyze product dimensions with cache-first strategy
   * Requirements: 2.1, 2.2, 2.5, 2.6, 7.1
   * 
   * @param request - Analysis request with product data and image
   * @returns Analysis response with cached or fresh results
   */
  async analyze(request: AnalyzeDimensionsRequest): Promise<AnalyzeDimensionsResponse> {
    const startTime = Date.now();

    try {
      // Step 1: Check cache first (Requirements 2.1, 7.1)
      const cacheResult = await this.dimensionCache.lookup(request.productId);

      if (cacheResult.found && !cacheResult.expired) {
        // Cache hit - update access timestamp (Requirement 2.5)
        await this.dimensionCache.updateAccess(request.productId);

        const analysis = this.dimensionCache.toAnalysisResult(cacheResult.entry!);

        return {
          success: true,
          analysis,
          cached: true,
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Step 2: Cache miss or expired - perform fresh analysis (Requirement 3.1)
      console.log('[Dimension Analyzer] 🔄 Performing fresh analysis...');

      const freshAnalysis = await this.performFreshAnalysis(
        request.productData,
        request.image
      );

      // Step 3: Store in cache (Requirement 3.5)
      const cacheEntry = this.dimensionCache.toCacheEntry(freshAnalysis);
      await this.dimensionCache.store(cacheEntry);

      return {
        success: true,
        analysis: freshAnalysis,
        cached: false,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      console.error('[Dimension Analyzer] ❌ Analysis failed:', error);

      return {
        success: false,
        processingTimeMs: Date.now() - startTime,
        cached: false,
        error: {
          code: 'AI_ANALYSIS_FAILED',
          message: 'Failed to analyze product dimensions',
          retryable: true,
        },
      };
    }
  }

  /**
   * Perform fresh dimension analysis using Gemini AI
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.6
   * 
   * @param productData - Product context
   * @param image - Product image
   * @returns Fresh dimension analysis result
   */
  private async performFreshAnalysis(
    productData: ProductData,
    image: ImageData
  ): Promise<DimensionAnalysisResult> {
    // Requirement 11.4: Set timeout for dimension analysis (10 seconds)
    const DIMENSION_ANALYSIS_TIMEOUT = 10000;
    
    // Call Gemini AI with retry logic and timeout (Requirements 3.2, 11.4)
    const aiResponsePromise = this.geminiClient.withRetry(
      () => this.geminiClient.analyzeDimensions(image, {
        name: productData.name,
        brand: productData.brand,
        category: productData.category,
      }),
      3 // Max 3 retries
    );

    // Add timeout wrapper
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Dimension analysis timeout')), DIMENSION_ANALYSIS_TIMEOUT);
    });

    const aiResponse = await Promise.race([aiResponsePromise, timeoutPromise]);

    // Parse and validate response (Requirements 3.3, 3.4)
    const parsedResult = this.parseAIResponse(aiResponse);
    this.validateDimensionScores(parsedResult);

    // Build result
    const result: DimensionAnalysisResult = {
      productId: productData.id,
      dimensions: {
        health: {
          ...parsedResult.dimensions.health,
          available: true,
          locked: false,
        },
        processing: {
          ...parsedResult.dimensions.processing,
          available: true,
          locked: false,
        },
        allergens: {
          ...parsedResult.dimensions.allergens,
          available: true,
          locked: false,
        },
        responsiblyProduced: {
          ...parsedResult.dimensions.responsiblyProduced,
          available: true,
          locked: false,
        },
        environmentalImpact: {
          ...parsedResult.dimensions.environmentalImpact,
          available: true,
          locked: false,
        },
      },
      overallConfidence: parsedResult.overallConfidence,
      analyzedAt: new Date(),
      cached: false,
    };

    return result;
  }

  /**
   * Parse AI response from JSON string
   * Requirements: 3.3, 11.5, 12.7
   * 
   * @param response - Raw AI response string
   * @returns Parsed AI response object
   */
  parseAIResponse(response: string): RawAIResponse {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch =
        response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('Failed to find JSON in AI response');
      }

      const jsonText = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonText);

      // Validate structure (Requirement 11.5)
      if (!parsed.dimensions || !parsed.overallConfidence) {
        throw new Error('Invalid response structure: missing dimensions or overallConfidence');
      }

      return parsed as RawAIResponse;
    } catch (error) {
      console.error('[Dimension Analyzer] ❌ Failed to parse AI response:', error);
      throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate dimension scores are within valid range
   * Requirement 3.4: Validate scores are 0-100
   * 
   * @param result - Parsed AI response
   * @throws Error if validation fails
   */
  validateDimensionScores(result: RawAIResponse): void {
    const requiredDimensions = [
      'health',
      'processing',
      'allergens',
      'responsiblyProduced',
      'environmentalImpact',
    ];

    for (const dim of requiredDimensions) {
      const dimension = result.dimensions[dim as keyof typeof result.dimensions];

      if (!dimension) {
        throw new Error(`Missing dimension: ${dim}`);
      }

      const score = dimension.score;
      if (typeof score !== 'number' || score < 0 || score > 100) {
        throw new Error(`Invalid score for ${dim}: ${score} (must be 0-100)`);
      }

      if (!dimension.explanation || typeof dimension.explanation !== 'string') {
        throw new Error(`Missing or invalid explanation for ${dim}`);
      }

      if (!Array.isArray(dimension.keyFactors) || dimension.keyFactors.length === 0) {
        throw new Error(`Missing or invalid keyFactors for ${dim}`);
      }
    }

    // Validate overall confidence (Requirement 3.4)
    if (
      typeof result.overallConfidence !== 'number' ||
      result.overallConfidence < 0 ||
      result.overallConfidence > 1
    ) {
      throw new Error(
        `Invalid overallConfidence: ${result.overallConfidence} (must be 0.0-1.0)`
      );
    }
  }
}

// Export singleton instance
export const dimensionAnalyzer = new DimensionAnalyzer(
  new DimensionCacheService(),
  new GeminiClient()
);
