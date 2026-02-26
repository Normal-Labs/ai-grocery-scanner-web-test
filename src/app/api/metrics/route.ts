/**
 * Metrics API Endpoint
 * 
 * GET /api/metrics
 * 
 * This endpoint provides aggregated metrics for monitoring system performance.
 * Returns tier usage statistics, success rates, processing times, cache hit rates,
 * and API usage tracking.
 * 
 * Requirements: 14.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server-client';

interface TierMetrics {
  totalScans: number;
  successRate: number;
  avgProcessingTime: number;
  cacheHitRate: number;
}

interface ApiUsage {
  geminiCalls: number;
  barcodeLookupCalls: number;
  estimatedCost: number;
}

interface OverallMetrics {
  totalScans: number;
  successRate: number;
  avgProcessingTime: number;
  cacheHitRate: number;
}

interface MetricsResponse {
  timeRange: {
    start: string;
    end: string;
  };
  tierMetrics: {
    [tier: number]: TierMetrics;
  };
  apiUsage: ApiUsage;
  overallMetrics: OverallMetrics;
}

/**
 * GET /api/metrics
 * 
 * Query parameters:
 * - startDate?: ISO date string (default: 24 hours ago)
 * - endDate?: ISO date string (default: now)
 * 
 * Response:
 * {
 *   timeRange: { start: string, end: string },
 *   tierMetrics: {
 *     [tier: number]: {
 *       totalScans: number,
 *       successRate: number,
 *       avgProcessingTime: number,
 *       cacheHitRate: number
 *     }
 *   },
 *   apiUsage: {
 *     geminiCalls: number,
 *     barcodeLookupCalls: number,
 *     estimatedCost: number
 *   },
 *   overallMetrics: {
 *     totalScans: number,
 *     successRate: number,
 *     avgProcessingTime: number,
 *     cacheHitRate: number
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Metrics API] 📊 Received metrics request');

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Default to last 24 hours if not specified
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam 
      ? new Date(startDateParam) 
      : new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

    console.log('[Metrics API] 📅 Time range:', {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    });

    // Get Supabase client
    const supabase = getSupabaseServerClient();

    // Query scan logs for the time range
    const { data: scanLogs, error: scanLogsError } = await supabase
      .from('scan_logs')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (scanLogsError) {
      console.error('[Metrics API] ❌ Error fetching scan logs:', scanLogsError);
      throw new Error(`Failed to fetch scan logs: ${scanLogsError.message}`);
    }

    console.log('[Metrics API] 📋 Fetched scan logs:', scanLogs?.length || 0);

    // Query error reports for the time range
    const { data: errorReports, error: errorReportsError } = await supabase
      .from('error_reports')
      .select('tier')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (errorReportsError) {
      console.error('[Metrics API] ❌ Error fetching error reports:', errorReportsError);
      throw new Error(`Failed to fetch error reports: ${errorReportsError.message}`);
    }

    console.log('[Metrics API] 🚨 Fetched error reports:', errorReports?.length || 0);

    // Calculate metrics by tier
    const tierMetrics: { [tier: number]: TierMetrics } = {};
    const tiers = [1, 2, 3, 4];

    for (const tier of tiers) {
      const tierLogs = scanLogs?.filter((log) => log.tier === tier) || [];
      const totalScans = tierLogs.length;
      const successfulScans = tierLogs.filter((log) => log.success).length;
      const cachedScans = tierLogs.filter((log) => log.cached).length;
      
      // Calculate average processing time (only for successful scans with processing time)
      const logsWithProcessingTime = tierLogs.filter(
        (log) => log.success && log.processing_time_ms !== null
      );
      const avgProcessingTime = logsWithProcessingTime.length > 0
        ? logsWithProcessingTime.reduce((sum, log) => sum + (log.processing_time_ms || 0), 0) / 
          logsWithProcessingTime.length
        : 0;

      tierMetrics[tier] = {
        totalScans,
        successRate: totalScans > 0 ? successfulScans / totalScans : 0,
        avgProcessingTime: Math.round(avgProcessingTime),
        cacheHitRate: totalScans > 0 ? cachedScans / totalScans : 0,
      };
    }

    // Calculate API usage
    // Tier 2 uses Gemini OCR, Tier 3 uses Barcode Lookup API, Tier 4 uses Gemini AI
    const tier2Scans = scanLogs?.filter((log) => log.tier === 2 && !log.cached).length || 0;
    const tier3Scans = scanLogs?.filter((log) => log.tier === 3 && !log.cached).length || 0;
    const tier4Scans = scanLogs?.filter((log) => log.tier === 4 && !log.cached).length || 0;

    const geminiCalls = tier2Scans + tier4Scans; // Tier 2 (OCR) + Tier 4 (full analysis)
    const barcodeLookupCalls = tier3Scans;

    // Estimated costs (approximate values, adjust based on actual API pricing)
    // Gemini: ~$0.001 per call, Barcode Lookup: ~$0.005 per call
    const estimatedCost = (geminiCalls * 0.001) + (barcodeLookupCalls * 0.005);

    const apiUsage: ApiUsage = {
      geminiCalls,
      barcodeLookupCalls,
      estimatedCost: Math.round(estimatedCost * 1000) / 1000, // Round to 3 decimal places
    };

    // Calculate overall metrics
    const totalScans = scanLogs?.length || 0;
    const successfulScans = scanLogs?.filter((log) => log.success).length || 0;
    const cachedScans = scanLogs?.filter((log) => log.cached).length || 0;
    
    const logsWithProcessingTime = scanLogs?.filter(
      (log) => log.success && log.processing_time_ms !== null
    ) || [];
    const overallAvgProcessingTime = logsWithProcessingTime.length > 0
      ? logsWithProcessingTime.reduce((sum, log) => sum + (log.processing_time_ms || 0), 0) / 
        logsWithProcessingTime.length
      : 0;

    const overallMetrics: OverallMetrics = {
      totalScans,
      successRate: totalScans > 0 ? successfulScans / totalScans : 0,
      avgProcessingTime: Math.round(overallAvgProcessingTime),
      cacheHitRate: totalScans > 0 ? cachedScans / totalScans : 0,
    };

    // Build response
    const response: MetricsResponse = {
      timeRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      tierMetrics,
      apiUsage,
      overallMetrics,
    };

    console.log('[Metrics API] ✅ Metrics calculated successfully');
    console.log('[Metrics API] 📊 Overall metrics:', {
      totalScans: overallMetrics.totalScans,
      successRate: `${(overallMetrics.successRate * 100).toFixed(1)}%`,
      avgProcessingTime: `${overallMetrics.avgProcessingTime}ms`,
      cacheHitRate: `${(overallMetrics.cacheHitRate * 100).toFixed(1)}%`,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('[Metrics API] ❌ Unexpected error:', error);
    console.error('[Metrics API] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
        },
      },
      { status: 500 }
    );
  }
}
