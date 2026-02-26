/**
 * Dimension Analysis Metrics Service
 * 
 * Logs metrics for dimension analysis operations including cache hits/misses,
 * processing times, user tier distribution, API costs, and error rates.
 * 
 * Requirements: 7.5, 7.6, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
 */

import { getSupabaseServerClient } from '@/lib/supabase/server-client';

export interface DimensionMetricsLog {
  productId: string;
  userId: string;
  userTier: 'free' | 'premium';
  cached: boolean;
  processingTimeMs: number;
  success: boolean;
  errorCode?: string;
  dimensionsViewed?: string[]; // Which dimensions were actually viewed by user
  apiCost?: number; // Estimated API cost for this analysis
}

/**
 * Log dimension analysis metrics
 * Requirements: 7.5, 7.6, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
 */
export async function logDimensionMetrics(metrics: DimensionMetricsLog): Promise<void> {
  try {
    // Log to console for immediate visibility
    console.log('[Dimension Metrics] 📊', {
      productId: metrics.productId.substring(0, 16) + '...',
      userTier: metrics.userTier,
      cached: metrics.cached,
      processingTimeMs: metrics.processingTimeMs,
      success: metrics.success,
      errorCode: metrics.errorCode,
      apiCost: metrics.apiCost,
    });

    // Store in database for aggregation
    // Note: This requires a dimension_metrics table in Supabase
    // For now, we'll log to console. In production, uncomment the database insert:
    
    /*
    const supabase = getSupabaseServerClient();
    await supabase.from('dimension_metrics').insert({
      product_id: metrics.productId,
      user_id: metrics.userId,
      user_tier: metrics.userTier,
      cached: metrics.cached,
      processing_time_ms: metrics.processingTimeMs,
      success: metrics.success,
      error_code: metrics.errorCode,
      dimensions_viewed: metrics.dimensionsViewed,
      api_cost: metrics.apiCost,
      created_at: new Date().toISOString(),
    });
    */
  } catch (error) {
    // Don't throw - metrics logging should never break the main flow
    console.error('[Dimension Metrics] ⚠️  Failed to log metrics:', error);
  }
}

/**
 * Calculate estimated API cost for dimension analysis
 * Requirement 14.4: Log API costs per dimension analysis
 * 
 * Gemini API pricing (approximate):
 * - Flash model: ~$0.001 per request for dimension analysis
 */
export function calculateDimensionAnalysisCost(cached: boolean): number {
  if (cached) {
    return 0; // No API cost for cached results
  }
  
  // Estimated cost for one Gemini API call for dimension analysis
  return 0.001;
}

/**
 * Get aggregated dimension metrics
 * Requirement 14.7: Extend /api/metrics endpoint
 */
export async function getAggregatedDimensionMetrics(
  startDate: Date,
  endDate: Date
): Promise<{
  totalAnalyses: number;
  cacheHitRate: number;
  avgProcessingTimeCached: number;
  avgProcessingTimeFresh: number;
  tierDistribution: { free: number; premium: number };
  totalApiCost: number;
  errorRate: number;
  dimensionPopularity: { [dimension: string]: number };
}> {
  try {
    // For now, return mock data
    // In production, query the dimension_metrics table
    
    console.log('[Dimension Metrics] 📊 Fetching aggregated metrics:', {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    });

    // TODO: Implement actual database queries
    // This is a placeholder implementation
    
    return {
      totalAnalyses: 0,
      cacheHitRate: 0,
      avgProcessingTimeCached: 0,
      avgProcessingTimeFresh: 0,
      tierDistribution: { free: 0, premium: 0 },
      totalApiCost: 0,
      errorRate: 0,
      dimensionPopularity: {
        health: 0,
        processing: 0,
        allergens: 0,
        responsiblyProduced: 0,
        environmentalImpact: 0,
      },
    };
  } catch (error) {
    console.error('[Dimension Metrics] ❌ Failed to fetch aggregated metrics:', error);
    throw error;
  }
}
