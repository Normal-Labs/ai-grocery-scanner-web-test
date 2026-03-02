/**
 * Multi-Image Scan API Route
 * 
 * Server-side endpoint for multi-image product capture workflow.
 * Calls MultiImageOrchestrator which uses MongoDB and other server-only services.
 * 
 * Requirements: 2.5, 2.6, 4.1, 4.2, 4.3, 4.4, 4.5, 9.1, 9.5, 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { multiImageOrchestrator } from '@/lib/multi-image/MultiImageOrchestrator';
import type { ImageType } from '@/lib/multi-image/DataMerger';

/**
 * Request body interface
 */
interface ScanMultiImageRequest {
  imageData: string; // Base64 encoded image
  userId: string;
  workflowMode: 'guided' | 'progressive';
  sessionId?: string;
  imageType?: ImageType; // Optional for guided mode
}

/**
 * POST /api/scan-multi-image
 * 
 * Process a single image through the multi-image capture workflow
 */
export async function POST(request: NextRequest) {
  try {
    const body: ScanMultiImageRequest = await request.json();
    
    // Validate required fields
    if (!body.imageData) {
      return NextResponse.json(
        { error: 'Missing required field: imageData' },
        { status: 400 }
      );
    }
    
    if (!body.userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }
    
    if (!body.workflowMode || !['guided', 'progressive'].includes(body.workflowMode)) {
      return NextResponse.json(
        { error: 'Invalid workflowMode. Must be "guided" or "progressive"' },
        { status: 400 }
      );
    }
    
    console.log('[API] 🔄 Processing multi-image scan:', {
      userId: body.userId,
      workflowMode: body.workflowMode,
      sessionId: body.sessionId,
      hasImage: !!body.imageData,
    });
    
    // Call MultiImageOrchestrator
    const result = await multiImageOrchestrator.processImage(
      { 
        base64: body.imageData,
        mimeType: 'image/jpeg', // Default to JPEG, could be extracted from base64 prefix
      },
      body.userId,
      body.workflowMode,
      body.sessionId
    );
    
    console.log('[API] ✅ Multi-image scan complete:', {
      success: result.success,
      productId: result.product.id,
      imageType: result.imageType,
      sessionId: result.sessionId,
      complete: result.completionStatus.complete,
    });
    
    // Return result
    return NextResponse.json(result, { status: 200 });
    
  } catch (error) {
    console.error('[API] ❌ Multi-image scan error:', error);
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
