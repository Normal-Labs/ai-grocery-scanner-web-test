/**
 * Integration Layer
 * 
 * Coordinates product identification (multi-tier orchestrator) and dimension analysis.
 * Implements progressive response delivery and tier-based access control.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 5.1, 5.2, 5.3, 5.4, 5.7, 8.4, 11.1, 11.2, 11.3, 11.4, 11.7
 */

import { ScanOrchestratorMultiTier } from '@/lib/orchestrator/ScanOrchestratorMultiTier';
import { DimensionAnalyzer } from '@/lib/analyzer/DimensionAnalyzer';
import {
  ScanRequest,
  ScanResponse,
  ProductData,
  ImageData,
} from '@/lib/types/multi-tier';
import {
  ExtendedScanResponse,
  DimensionAnalysisResult,
  UserTier,
  DimensionStatus,
} from '@/lib/types/dimension-analysis';
import {
  logDimensionMetrics,
  calculateDimensionAnalysisCost,
} from '@/lib/services/dimension-metrics';
import type { IProgressEmitter } from '../progress/ProgressEmitter';

/**
 * Integration Layer class
 * Coordinates multi-tier product identification and dimension analysis
 */
export class IntegrationLayer {
  constructor(
    private multiTierOrchestrator: ScanOrchestratorMultiTier,
    private dimensionAnalyzer: DimensionAnalyzer
  ) {}

  /**
   * Process scan request with product identification and dimension analysis
   * Requirements: 1.1, 1.2, 1.4, 1.5, 1.6
   * 
   * @param request - Scan request with barcode/image
   * @param skipDimensionAnalysis - Optional flag to skip dimension analysis
   * @param progressEmitter - Optional progress emitter for real-time updates
   * @returns Extended scan response with product and dimension data
   */
  async processScan(
    request: ScanRequest,
    skipDimensionAnalysis: boolean = false,
    progressEmitter?: IProgressEmitter
  ): Promise<ExtendedScanResponse> {
    const startTime = Date.now();

    // Step 1: Product identification using existing multi-tier orchestrator
    // Requirement 1.2: Pass barcode/image unchanged
    const identificationResult = await this.multiTierOrchestrator.scan({
      barcode: request.barcode,
      image: request.image,
      imageHash: request.imageHash,
      userId: request.userId,
      sessionId: request.sessionId,
    }, progressEmitter);

    // If identification failed, return early
    if (!identificationResult.success || !identificationResult.product) {
      return {
        ...identificationResult,
        dimensionStatus: 'skipped' as DimensionStatus,
        userTier: await this.getUserTier(request.userId),
        availableDimensions: [],
      };
    }

    // Step 2: Determine user tier (Requirement 5.3)
    const userTier = await this.getUserTier(request.userId);

    // Step 3: Skip dimension analysis if requested (Requirement 8.3)
    if (skipDimensionAnalysis) {
      return {
        ...identificationResult,
        dimensionStatus: 'skipped' as DimensionStatus,
        userTier,
        availableDimensions: this.getAvailableDimensions(userTier),
      };
    }

    // Step 4: Dimension analysis (Requirements 1.4, 1.5)
    // Note: In production, this could be done asynchronously for progressive updates
    try {
      const dimensionResult = await this.dimensionAnalyzer.analyze({
        productId: identificationResult.product.id,
        productData: identificationResult.product,
        image: request.image!,
        userTier,
      });

      if (!dimensionResult.success || !dimensionResult.analysis) {
        // Graceful degradation (Requirement 11.1)
        
        // Log error metrics (Requirement 14.5)
        await logDimensionMetrics({
          productId: identificationResult.product.id,
          userId: request.userId,
          userTier,
          cached: false,
          processingTimeMs: dimensionResult.processingTimeMs,
          success: false,
          errorCode: dimensionResult.error?.code,
          apiCost: 0,
        });

        return {
          ...identificationResult,
          dimensionStatus: 'failed' as DimensionStatus,
          userTier,
          availableDimensions: this.getAvailableDimensions(userTier),
          error: dimensionResult.error
            ? {
                code: dimensionResult.error.code,
                message: dimensionResult.error.message,
                tier: identificationResult.tier,
                retryable: dimensionResult.error.retryable,
              }
            : undefined,
        };
      }

      // Apply tier-based filtering (Requirements 5.1, 5.2, 5.4)
      const filteredAnalysis = this.filterByTier(dimensionResult.analysis, userTier);

      // Performance monitoring (Requirements 6.1, 6.2, 6.3, 6.4)
      const totalTime = Date.now() - startTime;
      const dimensionTime = dimensionResult.processingTimeMs;
      
      // Alert if cached responses exceed 5 seconds (Requirement 6.4)
      if (dimensionResult.cached && dimensionTime > 5000) {
        console.warn(`[Integration Layer] ⚠️  PERFORMANCE: Cached dimension analysis took ${dimensionTime}ms (target: <5s)`);
      }
      
      // Alert if fresh analysis exceeds 12 seconds (Requirement 6.3)
      if (!dimensionResult.cached && dimensionTime > 12000) {
        console.warn(`[Integration Layer] ⚠️  PERFORMANCE: Fresh dimension analysis took ${dimensionTime}ms (target: <12s)`);
      }

      // Log metrics (Requirements 7.5, 7.6, 14.1, 14.2, 14.3, 14.4, 14.5)
      await logDimensionMetrics({
        productId: identificationResult.product.id,
        userId: request.userId,
        userTier,
        cached: dimensionResult.cached,
        processingTimeMs: dimensionResult.processingTimeMs,
        success: true,
        apiCost: calculateDimensionAnalysisCost(dimensionResult.cached),
        dimensionsViewed: this.getAvailableDimensions(userTier),
      });

      return {
        ...identificationResult,
        dimensionAnalysis: filteredAnalysis,
        dimensionStatus: 'completed' as DimensionStatus,
        dimensionCached: dimensionResult.cached,
        userTier,
        availableDimensions: this.getAvailableDimensions(userTier),
        upgradePrompt:
          userTier === 'free'
            ? 'Upgrade to Premium to see all 5 dimensions'
            : undefined,
      };
    } catch (error) {
      // Graceful degradation: return product info even if dimension analysis fails
      // Requirement 11.1, 11.7
      console.error('[Integration Layer] Dimension analysis failed:', error);

      // Log error metrics (Requirement 14.5)
      await logDimensionMetrics({
        productId: identificationResult.product!.id,
        userId: request.userId,
        userTier,
        cached: false,
        processingTimeMs: Date.now() - startTime,
        success: false,
        errorCode: 'DIMENSION_ANALYSIS_EXCEPTION',
        apiCost: 0,
      });

      return {
        ...identificationResult,
        dimensionStatus: 'failed' as DimensionStatus,
        userTier,
        availableDimensions: this.getAvailableDimensions(userTier),
        error: {
          code: 'DIMENSION_ANALYSIS_FAILED',
          message: 'Product identified, but dimension analysis unavailable',
          tier: identificationResult.tier,
          retryable: true,
        },
      };
    }
  }

  /**
   * Filter dimension analysis by user tier
   * Requirements: 5.1, 5.2, 5.4
   * 
   * @param analysis - Complete dimension analysis
   * @param userTier - User's subscription tier
   * @returns Filtered analysis based on tier
   */
  private filterByTier(
    analysis: DimensionAnalysisResult,
    userTier: UserTier
  ): DimensionAnalysisResult {
    if (userTier === 'premium') {
      // Premium tier: all dimensions available
      return analysis;
    }

    // Free tier: only Health dimension (Requirement 5.1, 5.4)
    return {
      ...analysis,
      dimensions: {
        health: {
          ...analysis.dimensions.health,
          available: true,
          locked: false,
        },
        processing: {
          ...analysis.dimensions.processing,
          available: false,
          locked: true,
        },
        allergens: {
          ...analysis.dimensions.allergens,
          available: false,
          locked: true,
        },
        responsiblyProduced: {
          ...analysis.dimensions.responsiblyProduced,
          available: false,
          locked: true,
        },
        environmentalImpact: {
          ...analysis.dimensions.environmentalImpact,
          available: false,
          locked: true,
        },
      },
    };
  }

  /**
   * Get available dimensions for user tier
   * Requirement 5.5: Include tier information in response
   * 
   * @param userTier - User's subscription tier
   * @returns Array of available dimension names
   */
  private getAvailableDimensions(userTier: UserTier): string[] {
    return userTier === 'premium'
      ? ['health', 'processing', 'allergens', 'responsiblyProduced', 'environmentalImpact']
      : ['health'];
  }

  /**
   * Get user tier from authentication context
   * Requirement 5.3: Determine user tier from auth context
   * 
   * @param userId - User ID
   * @returns User's subscription tier
   */
  private async getUserTier(userId: string): Promise<UserTier> {
    // Development mode: Check environment variable for tier override
    const devTier = process.env.DEV_USER_TIER;
    if (devTier === 'premium' || devTier === 'free') {
      console.log(`[Integration Layer] 🔧 DEV MODE: Using tier '${devTier}' from DEV_USER_TIER`);
      return devTier;
    }
    
    // TODO: Query user subscription from auth context or database
    // In production, this would check Supabase auth metadata or subscription table
    
    // Default to free tier
    return 'free';
  }

  /**
   * Handle product update event
   * Requirement 13.1: Invalidate cache on product updates
   * 
   * @param productId - Product ID that was updated
   */
  async handleProductUpdate(productId: string): Promise<void> {
    try {
      const dimensionCache = this.dimensionAnalyzer['dimensionCache'];
      await dimensionCache.invalidate(productId);
      console.log(`[Integration Layer] ✅ Invalidated dimension cache for product ${productId}`);
    } catch (error) {
      // Best-effort invalidation (Requirement 13.1)
      console.error('[Integration Layer] ⚠️  Cache invalidation failed:', error);
    }
  }

  /**
   * Handle error report from user
   * Requirement 13.2: Invalidate cache on error reports
   * 
   * @param report - Error report with product ID and feedback
   */
  async handleErrorReport(report: {
    productId: string;
    userId: string;
    feedback: string;
  }): Promise<void> {
    try {
      const dimensionCache = this.dimensionAnalyzer['dimensionCache'];
      await dimensionCache.invalidate(report.productId);
      console.log(
        `[Integration Layer] ✅ Invalidated dimension cache for product ${report.productId} due to error report`
      );
    } catch (error) {
      // Best-effort invalidation (Requirement 13.2)
      console.error('[Integration Layer] ⚠️  Cache invalidation failed:', error);
    }
  }
}
