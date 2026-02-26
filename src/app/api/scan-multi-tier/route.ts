/**
 * Multi-Tier Scan API Endpoint with Dimension Analysis
 * 
 * POST /api/scan-multi-tier
 * 
 * This endpoint handles product scanning using the multi-tier identification system
 * and extends it with AI-powered dimension analysis across 5 dimensions.
 * 
 * Requirements: 1.2, 2.1, 4.1, 8.1, 8.2, 8.3, 8.5, 8.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { createScanOrchestrator } from '@/lib/orchestrator/ScanOrchestratorMultiTier';
import { IntegrationLayer } from '@/lib/integration/IntegrationLayer';
import { dimensionAnalyzer } from '@/lib/analyzer/DimensionAnalyzer';
import { hashImage } from '@/lib/imageHash';
import { ScanRequest, ImageData } from '@/lib/types/multi-tier';

/**
 * POST /api/scan-multi-tier
 * 
 * Request body:
 * {
 *   barcode?: string;                    // Optional barcode from Tier 1 scanner
 *   image?: string;                      // Optional base64 image data
 *   imageMimeType?: string;              // Image MIME type (e.g., 'image/jpeg')
 *   userId: string;                      // User ID for tracking
 *   sessionId: string;                   // Session ID for grouping scans
 *   skipDimensionAnalysis?: boolean;     // Optional flag to skip dimension analysis
 *   pollToken?: string;                  // Optional token for polling dimension status
 *   devUserTier?: 'free' | 'premium';    // Development: Override user tier
 * }
 * 
 * Response:
 * {
 *   success: boolean;
 *   product?: ProductData;
 *   tier: 1 | 2 | 3 | 4;
 *   confidenceScore: number;
 *   processingTimeMs: number;
 *   cached: boolean;
 *   
 *   // New dimension analysis fields
 *   dimensionAnalysis?: DimensionAnalysisResult;
 *   dimensionStatus: 'completed' | 'processing' | 'failed' | 'skipped';
 *   dimensionCached?: boolean;
 *   userTier: 'free' | 'premium';
 *   availableDimensions: string[];
 *   upgradePrompt?: string;
 *   
 *   error?: ErrorDetails;
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('[Scan API Multi-Tier] 📥 Received scan request');

    // Parse request body
    const body = await request.json();
    const { 
      barcode, 
      image, 
      imageMimeType, 
      userId, 
      sessionId,
      skipDimensionAnalysis = false,  // Requirement 8.3
      pollToken,                       // Requirement 8.5
      devUserTier,                     // Development: Override user tier
    } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'userId is required',
            tier: 0,
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_SESSION_ID',
            message: 'sessionId is required',
            tier: 0,
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    // Validate that at least barcode or image is provided
    if (!barcode && !image) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_INPUT',
            message: 'Either barcode or image must be provided',
            tier: 0,
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    // Prepare image data if provided
    let imageData: ImageData | undefined;
    let imageHash: string | undefined;

    if (image) {
      // Remove data URL prefix if present
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      
      imageData = {
        base64: base64Data,
        mimeType: imageMimeType || 'image/jpeg',
      };

      // Generate image hash for caching
      imageHash = await hashImage(base64Data);
      console.log('[Scan API Multi-Tier] 🔐 Generated image hash:', imageHash.substring(0, 16) + '...');
    }

    // Create scan request
    const scanRequest: ScanRequest = {
      barcode: barcode || undefined,
      image: imageData,
      imageHash,
      userId,
      sessionId,
    };

    console.log('[Scan API Multi-Tier] 🚀 Invoking Integration Layer:', {
      hasBarcode: !!barcode,
      hasImage: !!imageData,
      userId,
      sessionId,
      skipDimensionAnalysis,
      devUserTier: devUserTier || 'not set',
    });

    // Set development tier override if provided
    if (devUserTier === 'premium' || devUserTier === 'free') {
      process.env.DEV_USER_TIER = devUserTier;
      console.log(`[Scan API Multi-Tier] 🔧 DEV MODE: User tier set to '${devUserTier}'`);
    }

    // Create orchestrator and integration layer
    // Requirement 8.1: Extend existing /api/scan endpoint
    const orchestrator = createScanOrchestrator();
    const integrationLayer = new IntegrationLayer(orchestrator, dimensionAnalyzer);
    
    // Process scan with dimension analysis
    // Requirement 8.2: Return both product identification and dimension analysis
    const result = await integrationLayer.processScan(scanRequest, skipDimensionAnalysis);

    const totalTime = Date.now() - startTime;

    // Requirement 6.7: Update scan log with dimension analysis fields
    if (result.success && result.product) {
      try {
        const { getSupabaseServerClient } = await import('@/lib/supabase/server-client');
        const supabase = getSupabaseServerClient();
        
        // Find the most recent scan log for this session and product
        const { data: scanLog } = await supabase
          .from('scan_logs')
          .select('id')
          .eq('session_id', sessionId)
          .eq('product_id', result.product.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (scanLog) {
          // Update with dimension analysis fields
          await supabase
            .from('scan_logs')
            .update({
              dimension_analysis_cached: result.dimensionCached || false,
              dimension_analysis_time_ms: result.dimensionAnalysis 
                ? (totalTime - result.processingTimeMs) 
                : null,
              dimension_analysis_status: result.dimensionStatus,
              user_tier: result.userTier,
            })
            .eq('id', scanLog.id);

          console.log('[Scan API Multi-Tier] ✅ Updated scan log with dimension fields');
        }
      } catch (logError) {
        // Don't throw - logging failures shouldn't block the response
        console.error('[Scan API Multi-Tier] ⚠️  Failed to update scan log:', logError);
      }
    }

    console.log('[Scan API Multi-Tier] ✅ Scan complete:', {
      success: result.success,
      tier: result.tier,
      confidence: result.confidenceScore,
      cached: result.cached,
      dimensionStatus: result.dimensionStatus,
      dimensionCached: result.dimensionCached,
      userTier: result.userTier,
      processingTimeMs: result.processingTimeMs,
      totalTimeMs: totalTime,
    });

    // Log tier usage summary
    console.log('═══════════════════════════════════════════════════');
    console.log('📋 MULTI-TIER SCAN SUMMARY');
    console.log('═══════════════════════════════════════════════════');
    if (result.success && result.product) {
      console.log(`Product: ${result.product.name}`);
      console.log(`Brand: ${result.product.brand}`);
      console.log(`Barcode: ${result.product.barcode || 'Not available'}`);
    }
    console.log(`Tier Used: ${result.tier}`);
    console.log(`Confidence: ${(result.confidenceScore * 100).toFixed(1)}%`);
    console.log(`Data Source: ${result.cached ? '💾 Cache' : '🤖 Fresh Analysis'}`);
    console.log(`Processing Time: ${result.processingTimeMs}ms`);
    console.log('───────────────────────────────────────────────────');
    console.log('🎯 DIMENSION ANALYSIS');
    console.log('───────────────────────────────────────────────────');
    console.log(`Status: ${result.dimensionStatus}`);
    console.log(`User Tier: ${result.userTier}`);
    console.log(`Available Dimensions: ${result.availableDimensions.join(', ')}`);
    if (result.dimensionAnalysis) {
      console.log(`Dimension Cache: ${result.dimensionCached ? '💾 Hit' : '🤖 Fresh'}`);
      console.log(`Overall Confidence: ${(result.dimensionAnalysis.overallConfidence * 100).toFixed(1)}%`);
    }
    console.log(`Total Time: ${totalTime}ms`);
    console.log('═══════════════════════════════════════════════════');

    // Return response (Requirement 8.7: Maintain backward compatibility)
    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    const totalTime = Date.now() - startTime;
    
    console.error('[Scan API Multi-Tier] ❌ Unexpected error:', error);
    console.error('[Scan API Multi-Tier] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      totalTimeMs: totalTime,
    });

    return NextResponse.json(
      {
        success: false,
        tier: 0,
        confidenceScore: 0,
        processingTimeMs: totalTime,
        cached: false,
        dimensionStatus: 'failed',
        userTier: 'free',
        availableDimensions: [],
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          tier: 0,
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/scan-multi-tier
 * 
 * Returns API information and health status
 */
export async function GET() {
  return NextResponse.json({
    name: 'Multi-Tier Product Identification & Dimension Analysis API',
    version: '2.0.0',
    tiers: {
      1: 'Direct Barcode Scanning (Cache + Database)',
      2: 'Visual Text Extraction (Gemini OCR)',
      3: 'Discovery Search (Barcode Lookup API)',
      4: 'Comprehensive Image Analysis (Gemini AI)',
    },
    dimensions: {
      health: 'Nutritional value and health impact',
      processing: 'Level of processing and preservatives',
      allergens: 'Common allergens and cross-contamination risks',
      responsiblyProduced: 'Ethical sourcing and fair trade practices',
      environmentalImpact: 'Packaging sustainability and carbon footprint',
    },
    features: {
      productIdentification: 'Multi-tier product identification with intelligent fallback',
      dimensionAnalysis: 'AI-powered analysis across 5 dimensions',
      caching: '90-day cache for product identification, 30-day cache for dimension analysis',
      tierBasedAccess: 'Free tier: 1 dimension (Health), Premium tier: all 5 dimensions',
    },
    development: {
      tierToggle: 'Set devUserTier to "free" or "premium" in request body to override user tier',
      envVariable: 'Or set DEV_USER_TIER environment variable to "free" or "premium"',
    },
    endpoints: {
      scan: 'POST /api/scan-multi-tier',
      info: 'GET /api/scan-multi-tier',
    },
    status: 'operational',
  });
}
