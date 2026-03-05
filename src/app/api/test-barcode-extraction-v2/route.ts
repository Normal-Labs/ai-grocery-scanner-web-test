/**
 * Test Barcode Extraction API Endpoint (V2 with Enhanced Error Tracking)
 * 
 * POST /api/test-barcode-extraction-v2
 * 
 * Uses the GeminiWrapper for detailed 429 error tracking and quota monitoring.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getGeminiWrapper } from '@/lib/gemini-wrapper';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface BarcodeExtractionRequest {
  image: string;
  detectedBarcode?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: BarcodeExtractionRequest = await request.json();
    const { image, detectedBarcode } = body;

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'Image is required' },
        { status: 400 }
      );
    }

    console.log('[Test Barcode V2 API] 📥 Request received');

    let method: 'BarcodeDetector' | 'OCR' | 'Failed' = 'Failed';
    let barcode: string | undefined;
    let confidence: number | undefined;

    // Method 1: Use BarcodeDetector result if available
    if (detectedBarcode) {
      method = 'BarcodeDetector';
      barcode = detectedBarcode;
      confidence = 1.0;
      console.log('[Test Barcode V2 API] ✅ Using BarcodeDetector result:', barcode);
    } else {
      // Method 2: OCR Fallback using Gemini Wrapper
      console.log('[Test Barcode V2 API] 🔄 Attempting OCR extraction...');
      
      const gemini = getGeminiWrapper();
      
      // Strip data URL prefix if present
      let base64Data = image;
      if (image.includes('base64,')) {
        base64Data = image.split('base64,')[1];
      }
      
      const prompt = `Extract the barcode number from this image.

INSTRUCTIONS:
1. Look for a barcode (UPC, EAN, or similar)
2. Extract ONLY the numeric digits below or near the barcode
3. Return ONLY the barcode number, nothing else
4. If you cannot find a barcode, return "NONE"

Return format: Just the barcode number (e.g., "012345678901")`;

      const result = await gemini.generateContent({
        prompt,
        imageData: base64Data,
        imageMimeType: 'image/jpeg',
        maxRetries: 2,
        retryDelayMs: 5000,
      });

      if (result.success && result.text) {
        const rawText = result.text.trim();
        console.log('[Test Barcode V2 API] OCR raw response:', rawText);

        // Extract barcode pattern from response
        if (rawText && rawText !== 'NONE') {
          const barcodeMatch = rawText.match(/\b\d{8,14}\b/);
          
          if (barcodeMatch) {
            method = 'OCR';
            barcode = barcodeMatch[0];
            confidence = 0.8;
            console.log('[Test Barcode V2 API] ✅ Extracted barcode via OCR:', barcode);
          }
        }
      } else {
        console.error('[Test Barcode V2 API] ❌ OCR extraction failed:', result.error);
        
        // Return detailed error information
        if (result.rateLimitInfo) {
          return NextResponse.json(
            {
              success: false,
              method: 'Failed',
              error: result.error,
              rateLimitInfo: result.rateLimitInfo,
              retryCount: result.retryCount,
              totalDuration: result.totalDuration,
              savedToDb: false,
            },
            { status: 429 }
          );
        }
      }
    }

    // Save to database
    let savedToDb = false;
    
    if (barcode) {
      try {
        const { error: dbError } = await supabase
          .from('products_dev')
          .insert({
            barcode,
            metadata: {
              detection_method: method,
              confidence,
              image_preview: image.substring(0, 100) + '...',
              extraction_type: 'barcode',
              api_version: 'v2',
            },
          });

        if (dbError) {
          console.error('[Test Barcode V2 API] ❌ Database save failed:', dbError);
        } else {
          savedToDb = true;
          console.log('[Test Barcode V2 API] 💾 Saved to products_dev');
        }
      } catch (dbError) {
        console.error('[Test Barcode V2 API] ❌ Database error:', dbError);
      }
    }

    return NextResponse.json({
      success: !!barcode,
      method,
      barcode,
      confidence,
      savedToDb,
    });

  } catch (error) {
    console.error('[Test Barcode V2 API] ❌ Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        method: 'Failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        savedToDb: false,
      },
      { status: 500 }
    );
  }
}
