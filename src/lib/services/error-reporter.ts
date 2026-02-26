/**
 * Error Reporter Service
 * 
 * Handles reporting of incorrect product identifications and triggers
 * corrective actions like cache invalidation and re-analysis.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */

import { productRepositoryMultiTier } from '../supabase/repositories/ProductRepositoryMultiTier';
import { cacheService } from '../mongodb/cache-service';
import { imageAnalyzerService } from './image-analyzer';
import type { ProductData, ImageData } from '../types/multi-tier';

/**
 * Error report data
 */
export interface ErrorReport {
  userId: string;
  sessionId: string;
  incorrectProduct: ProductData;
  imageData?: ImageData;
  imageHash?: string;
  barcode?: string;
  userFeedback?: string;
  tier: number;
  timestamp: Date;
}

/**
 * Error report response
 */
export interface ErrorReportResponse {
  success: boolean;
  reportId?: string;
  alternativeProduct?: ProductData;
  message: string;
}

/**
 * Error Reporter Service
 */
export class ErrorReporterService {
  /**
   * Report an incorrect product identification
   * Requirement 5.1, 5.2: Accept and store error reports
   */
  async reportError(report: ErrorReport): Promise<ErrorReportResponse> {
    const startTime = Date.now();
    
    try {
      console.log('[Error Reporter] 📝 Reporting error for product:', report.incorrectProduct.id);

      // Requirement 5.2: Store error context to database
      const errorRecord = await this.storeErrorReport(report);
      
      // Requirement 5.3: Invalidate cache entries
      await this.invalidateCacheEntries(report);
      
      // Requirement 5.4: Flag product for manual review
      await this.flagProductForReview(report.incorrectProduct.id);
      
      // Requirement 5.5: Trigger Tier 4 re-analysis for alternative
      let alternativeProduct: ProductData | undefined;
      if (report.imageData) {
        alternativeProduct = await this.findAlternativeIdentification(report);
      }

      const processingTime = Date.now() - startTime;
      console.log(`[Error Reporter] ✅ Error reported successfully (${processingTime}ms)`);

      return {
        success: true,
        reportId: errorRecord.id,
        alternativeProduct,
        message: alternativeProduct 
          ? 'Error reported. Alternative product identified.'
          : 'Error reported. Product flagged for manual review.',
      };

    } catch (error) {
      console.error('[Error Reporter] ❌ Failed to report error:', error);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to report error',
      };
    }
  }

  /**
   * Store error report to database
   * Requirement 5.2: Record error context
   * Requirement 12.7: Use retry logic for database operations
   */
  private async storeErrorReport(report: ErrorReport): Promise<{ id: string }> {
    try {
      // Store to Supabase error_reports table with retry logic
      const { getSupabaseClient } = require('../supabase/client');
      const supabase = getSupabaseClient();

      // Use retry logic with exponential backoff
      let lastError: Error | null = null;
      const maxRetries = 3;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const { data, error } = await supabase
            .from('error_reports')
            .insert({
              user_id: report.userId,
              session_id: report.sessionId,
              product_id: report.incorrectProduct.id,
              barcode: report.barcode,
              image_hash: report.imageHash,
              tier_used: report.tier,
              user_feedback: report.userFeedback,
              scan_context: {
                productName: report.incorrectProduct.name,
                brand: report.incorrectProduct.brand,
                category: report.incorrectProduct.category,
              },
              created_at: report.timestamp.toISOString(),
            })
            .select('id')
            .single();

          if (error) {
            throw new Error(`Failed to store error report: ${error.message}`);
          }

          if (attempt > 0) {
            console.log(`[Error Reporter] ✅ Store succeeded on attempt ${attempt + 1}`);
          }

          console.log('[Error Reporter] 💾 Error report stored:', data.id);
          return { id: data.id };
          
        } catch (error) {
          lastError = error as Error;
          
          if (attempt < maxRetries) {
            // Calculate exponential backoff delay (100ms, 200ms, 400ms)
            const delay = Math.min(100 * Math.pow(2, attempt), 400);
            console.log(`[Error Reporter] ⚠️  Store failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      console.error(`[Error Reporter] ❌ Store failed after ${maxRetries + 1} attempts`);
      throw lastError || new Error('Failed to store error report');

    } catch (error) {
      console.error('[Error Reporter] ❌ Failed to store error report:', error);
      throw error;
    }
  }

  /**
   * Invalidate cache entries for incorrect identification
   * Requirement 5.3: Cache invalidation on error
   * Requirement 12.3: Ensure consistency between Supabase and MongoDB
   */
  private async invalidateCacheEntries(report: ErrorReport): Promise<void> {
    try {
      const invalidations: Promise<void>[] = [];

      // Invalidate by barcode if available
      if (report.barcode) {
        console.log('[Error Reporter] 🗑️  Invalidating cache by barcode:', report.barcode);
        invalidations.push(cacheService.invalidate(report.barcode, 'barcode'));
      }

      // Invalidate by image hash if available
      if (report.imageHash) {
        console.log('[Error Reporter] 🗑️  Invalidating cache by image hash');
        invalidations.push(cacheService.invalidate(report.imageHash, 'imageHash'));
      }

      // Invalidate all cache entries for the incorrect product
      // This ensures consistency across all cache keys (barcode and imageHash)
      console.log('[Error Reporter] 🗑️  Invalidating all cache entries for product:', report.incorrectProduct.id);
      invalidations.push(cacheService.invalidateByProductId(report.incorrectProduct.id));

      // Requirement 13.2: Invalidate dimension cache on error reports
      try {
        const { dimensionCacheService } = await import('@/lib/cache/DimensionCacheService');
        console.log('[Error Reporter] 🗑️  Invalidating dimension cache for product:', report.incorrectProduct.id);
        invalidations.push(dimensionCacheService.invalidate(report.incorrectProduct.id));
      } catch (dimError) {
        console.error('[Error Reporter] ⚠️  Failed to invalidate dimension cache:', dimError);
        // Best-effort invalidation - don't throw
      }

      await Promise.all(invalidations);
      console.log('[Error Reporter] ✅ Cache invalidated');

    } catch (error) {
      console.error('[Error Reporter] ⚠️  Failed to invalidate cache:', error);
      // Don't throw - cache invalidation failure shouldn't block error reporting
      console.error('[Error Reporter] ⚠️  DATA CONSISTENCY WARNING: Cache may be stale');
    }
  }

  /**
   * Flag product for manual review
   * Requirement 5.4: Product flagging on error
   * Requirement 12.7: Use retry logic for database operations
   */
  private async flagProductForReview(productId: string): Promise<void> {
    try {
      console.log('[Error Reporter] 🚩 Flagging product for review:', productId);
      
      const { getSupabaseClient } = require('../supabase/client');
      const supabase = getSupabaseClient();

      // Use retry logic with exponential backoff
      let lastError: Error | null = null;
      const maxRetries = 3;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const { error } = await supabase
            .from('products')
            .update({ flagged_for_review: true })
            .eq('id', productId);

          if (error) {
            throw new Error(`Failed to flag product: ${error.message}`);
          }

          if (attempt > 0) {
            console.log(`[Error Reporter] ✅ Flag succeeded on attempt ${attempt + 1}`);
          }

          console.log('[Error Reporter] ✅ Product flagged for review');
          return;
          
        } catch (error) {
          lastError = error as Error;
          
          if (attempt < maxRetries) {
            // Calculate exponential backoff delay (100ms, 200ms, 400ms)
            const delay = Math.min(100 * Math.pow(2, attempt), 400);
            console.log(`[Error Reporter] ⚠️  Flag failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      console.error(`[Error Reporter] ❌ Flag failed after ${maxRetries + 1} attempts`);
      console.error('[Error Reporter] ⚠️  Failed to flag product:', lastError);
      // Don't throw - flagging failure shouldn't block error reporting

    } catch (error) {
      console.error('[Error Reporter] ⚠️  Failed to flag product:', error);
      // Don't throw - flagging failure shouldn't block error reporting
    }
  }

  /**
   * Find alternative product identification using Tier 4
   * Requirement 5.5: Alternative identification on error
   */
  private async findAlternativeIdentification(
    report: ErrorReport
  ): Promise<ProductData | undefined> {
    try {
      if (!report.imageData) {
        return undefined;
      }

      console.log('[Error Reporter] 🔄 Attempting alternative identification...');

      // Use Image Analyzer for fresh analysis
      const analysisResult = await imageAnalyzerService.analyzeImage({
        image: report.imageData,
        imageHash: report.imageHash || '',
      });

      if (!analysisResult.success || !analysisResult.metadata.productName) {
        console.log('[Error Reporter] ❌ No alternative found');
        return undefined;
      }

      // Create product data from metadata
      const alternativeProduct: ProductData = {
        id: '', // Will be assigned if saved
        name: analysisResult.metadata.productName,
        brand: analysisResult.metadata.brandName || 'Unknown Brand',
        size: analysisResult.metadata.size,
        category: analysisResult.metadata.category || 'Unknown',
        metadata: {
          ...analysisResult.metadata,
          visualCharacteristics: analysisResult.visualCharacteristics,
        },
      };

      // Check if alternative is different from incorrect product
      if (alternativeProduct.name === report.incorrectProduct.name &&
          alternativeProduct.brand === report.incorrectProduct.brand) {
        console.log('[Error Reporter] ⚠️  Alternative matches incorrect product');
        return undefined;
      }

      console.log('[Error Reporter] ✅ Alternative product found:', alternativeProduct.name);
      return alternativeProduct;

    } catch (error) {
      console.error('[Error Reporter] ❌ Failed to find alternative:', error);
      return undefined;
    }
  }

  /**
   * Get error statistics for monitoring
   * Requirement 5.7: Performance tracking
   */
  async getErrorStats(timeRangeHours: number = 24): Promise<{
    totalErrors: number;
    errorsByTier: Record<number, number>;
    errorRate: number;
  }> {
    try {
      const { getSupabaseClient } = require('../supabase/client');
      const supabase = getSupabaseClient();

      const since = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000).toISOString();

      // Get error counts
      const { data: errors, error: errorsError } = await supabase
        .from('error_reports')
        .select('tier_used')
        .gte('created_at', since);

      if (errorsError) {
        throw new Error(`Failed to fetch error stats: ${errorsError.message}`);
      }

      // Get total scan counts
      const { count: totalScans, error: scansError } = await supabase
        .from('scan_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', since);

      if (scansError) {
        throw new Error(`Failed to fetch scan stats: ${scansError.message}`);
      }

      // Calculate stats
      const errorsByTier: Record<number, number> = {};
      errors?.forEach((errorRecord: { tier_used: number }) => {
        errorsByTier[errorRecord.tier_used] = (errorsByTier[errorRecord.tier_used] || 0) + 1;
      });

      const totalErrors = errors?.length || 0;
      const errorRate = totalScans ? totalErrors / totalScans : 0;

      return {
        totalErrors,
        errorsByTier,
        errorRate,
      };

    } catch (error) {
      console.error('[Error Reporter] ❌ Failed to get error stats:', error);
      return {
        totalErrors: 0,
        errorsByTier: {},
        errorRate: 0,
      };
    }
  }
}

// Singleton instance
export const errorReporterService = new ErrorReporterService();
