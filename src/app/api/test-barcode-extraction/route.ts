/**
 * Test Barcode Extraction API Endpoint
 * 
 * POST /api/test-barcode-extraction
 * 
 * Tests barcode detection using both BarcodeDetector and OCR fallback.
 * Saves results to products_dev table for analysis.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODEL } from '@/lib/config/gemini';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

interface BarcodeExtractionRequest {
  image: string; // base64 image data
  detectedBarcode?: string; // barcode from BarcodeDetector API
}

interface BarcodeExtractionResponse {
  success: boolean;
  method: 'BarcodeDetector' | 'OCR' | 'Failed';
  barcode?: string;
  rawText?: string;
  confidence?: number;
  savedToDb: boolean;
  error?: string;
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

    console.log('[Test Barcode API] 📥 Request received');
    console.log('[Test Barcode API] BarcodeDetector provided:', !!detectedBarcode);

    let method: 'BarcodeDetector' | 'OCR' | 'Failed' = 'Failed';
    let barcode: string | undefined;
    let rawText: string | undefined;
    let confidence: number | undefined;

    // Method 1: Use BarcodeDetector result if available
    if (detectedBarcode) {
      method = 'BarcodeDetector';
      barcode = detectedBarcode;
      confidence = 1.0;
      console.log('[Test Barcode API] ✅ Using BarcodeDetector result:', barcode);
    } else {
      // Method 2: OCR Fallback using Gemini Vision
      console.log('[Test Barcode API] 🔄 Attempting OCR extraction...');
      
      try {
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        
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

        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/jpeg',
            },
          },
        ]);

        const response = await result.response;
        rawText = response.text().trim();
        
        console.log('[Test Barcode API] OCR raw response:', rawText);

        // Extract barcode pattern from response
        if (rawText && rawText !== 'NONE') {
          // Look for 8-14 digit numbers (common barcode formats)
          const barcodeMatch = rawText.match(/\b\d{8,14}\b/);
          
          if (barcodeMatch) {
            method = 'OCR';
            barcode = barcodeMatch[0];
            confidence = 0.8; // OCR is less reliable than BarcodeDetector
            console.log('[Test Barcode API] ✅ Extracted barcode via OCR:', barcode);
          } else {
            console.log('[Test Barcode API] ⚠️  No barcode pattern found in OCR response');
          }
        }
      } catch (ocrError) {
        console.error('[Test Barcode API] ❌ OCR extraction failed:', ocrError);
        rawText = `OCR Error: ${ocrError instanceof Error ? ocrError.message : 'Unknown error'}`;
      }
    }

    // Save to products_dev table
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
              raw_ocr_text: rawText,
              image_preview: image.substring(0, 100) + '...',
              extraction_type: 'barcode',
            },
          });

        if (dbError) {
          console.error('[Test Barcode API] ❌ Database save failed:', dbError);
        } else {
          savedToDb = true;
          console.log('[Test Barcode API] 💾 Saved to products_dev');
        }
      } catch (dbError) {
        console.error('[Test Barcode API] ❌ Database error:', dbError);
      }
    }

    const response: BarcodeExtractionResponse = {
      success: !!barcode,
      method,
      barcode,
      rawText,
      confidence,
      savedToDb,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Test Barcode API] ❌ Unexpected error:', error);
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
