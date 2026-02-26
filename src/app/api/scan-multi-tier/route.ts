/**
 * Multi-Tier Scan API Endpoint
 * 
 * POST /api/scan-multi-tier
 * 
 * This endpoint handles product scanning using the multi-tier identification system.
 * Supports both barcode-based and image-based scanning with intelligent fallback.
 * 
 * Requirements: 1.2, 2.1, 4.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { createScanOrchestrator } from '@/lib/orchestrator/ScanOrchestratorMultiTier';
import { hashImage } from '@/lib/imageHash';
import { ScanRequest, ImageData } from '@/lib/types/multi-tier';

/**
 * POST /api/scan-multi-tier
 * 
 * Request body:
 * {
 *   barcode?: string;           // Optional barcode from Tier 1 scanner
 *   image?: string;             // Optional base64 image data
 *   imageMimeType?: string;     // Image MIME type (e.g., 'image/jpeg')
 *   userId: string;             // User ID for tracking
 *   sessionId: string;          // Session ID for grouping scans
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
 *   error?: ErrorDetails;
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('[Scan API Multi-Tier] 📥 Received scan request');

    // Parse request body
    const body = await request.json();
    const { barcode, image, imageMimeType, userId, sessionId } = body;

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

    console.log('[Scan API Multi-Tier] 🚀 Invoking Scan Orchestrator:', {
      hasBarcode: !!barcode,
      hasImage: !!imageData,
      userId,
      sessionId,
    });

    // Create orchestrator and process scan
    const orchestrator = createScanOrchestrator();
    const result = await orchestrator.scan(scanRequest);

    const totalTime = Date.now() - startTime;

    console.log('[Scan API Multi-Tier] ✅ Scan complete:', {
      success: result.success,
      tier: result.tier,
      confidence: result.confidenceScore,
      cached: result.cached,
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
    console.log(`Total Time: ${totalTime}ms`);
    console.log('═══════════════════════════════════════════════════');

    // Return response
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
    name: 'Multi-Tier Product Identification API',
    version: '1.0.0',
    tiers: {
      1: 'Direct Barcode Scanning (Cache + Database)',
      2: 'Visual Text Extraction (Gemini OCR)',
      3: 'Discovery Search (Barcode Lookup API) - Not Implemented',
      4: 'Comprehensive Image Analysis (Gemini AI)',
    },
    endpoints: {
      scan: 'POST /api/scan-multi-tier',
    },
    status: 'operational',
  });
}
