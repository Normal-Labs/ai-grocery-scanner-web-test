/**
 * Error Reporting API Endpoint
 * 
 * POST /api/report-error
 * Accepts error reports for incorrect product identifications
 * 
 * Requirements: 5.1, 5.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { errorReporterService, type ErrorReport } from '@/lib/services/error-reporter';
import type { ProductData, ImageData } from '@/lib/types/multi-tier';

export async function POST(request: NextRequest) {
  try {
    console.log('[Report Error API] 📥 Received error report');

    const body = await request.json();

    // Validate required fields
    if (!body.userId || !body.sessionId || !body.incorrectProduct) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, sessionId, incorrectProduct' },
        { status: 400 }
      );
    }

    // Build error report
    const errorReport: ErrorReport = {
      userId: body.userId,
      sessionId: body.sessionId,
      incorrectProduct: body.incorrectProduct as ProductData,
      imageData: body.imageData as ImageData | undefined,
      imageHash: body.imageHash,
      barcode: body.barcode,
      userFeedback: body.userFeedback,
      tier: body.tier || 4,
      timestamp: new Date(),
    };

    console.log('[Report Error API] 🚀 Processing error report');

    // Report the error
    const result = await errorReporterService.reportError(errorReport);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }

    console.log('[Report Error API] ✅ Error reported successfully');

    return NextResponse.json({
      success: true,
      reportId: result.reportId,
      alternativeProduct: result.alternativeProduct,
      message: result.message,
    });

  } catch (error) {
    console.error('[Report Error API] ❌ Unexpected error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
