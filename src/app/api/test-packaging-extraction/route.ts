/**
 * Test Packaging Extraction API Endpoint
 * 
 * POST /api/test-packaging-extraction
 * 
 * Tests product packaging information extraction using Gemini Vision.
 * Extracts: product name, brand, size, category, packaging type.
 * Saves results to products_dev table for analysis.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getGeminiWrapper } from '@/lib/gemini-wrapper';
import { ExtractionPrompts } from '@/lib/prompts/extraction-prompts';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PackagingExtractionRequest {
  image: string; // base64 image data
}

interface PackagingExtractionResponse {
  success: boolean;
  productName?: string;
  brand?: string;
  size?: string;
  category?: string;
  packagingType?: string;
  rawText?: string;
  confidence: number;
  savedToDb: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: PackagingExtractionRequest = await request.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'Image is required', confidence: 0, savedToDb: false },
        { status: 400 }
      );
    }

    console.log('[Test Packaging API] 📥 Request received');

    const gemini = getGeminiWrapper();
    
    // Strip data URL prefix if present
    let base64Data = image;
    if (image.includes('base64,')) {
      base64Data = image.split('base64,')[1];
    }

    const result = await gemini.generateContent({
      prompt: ExtractionPrompts.packaging,
      imageData: base64Data,
      imageMimeType: 'image/jpeg',
      maxRetries: 2,
      retryDelayMs: 5000,
    });

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error,
          confidence: 0, 
          savedToDb: false 
        },
        { status: 500 }
      );
    }

    const rawText = result.text!.trim();
    
    console.log('[Test Packaging API] Raw response:', rawText);

    // Parse JSON response
    let extractedData: any = {};
    let confidence = 0.5;
    
    try {
      // Remove markdown code blocks if present
      let jsonText = rawText;
      if (jsonText.includes('```json')) {
        jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      } else if (jsonText.includes('```')) {
        jsonText = jsonText.replace(/```\s*/g, '');
      }
      
      extractedData = JSON.parse(jsonText);
      confidence = extractedData.confidence || 0.5;
      
      console.log('[Test Packaging API] ✅ Parsed data:', extractedData);
    } catch (parseError) {
      console.error('[Test Packaging API] ❌ JSON parse failed:', parseError);
      
      // Fallback: Try to extract fields manually from text
      extractedData = {
        productName: extractFieldFromText(rawText, 'productName'),
        brand: extractFieldFromText(rawText, 'brand'),
        size: extractFieldFromText(rawText, 'size'),
        category: extractFieldFromText(rawText, 'category'),
        packagingType: extractFieldFromText(rawText, 'packagingType'),
        confidence: 0.3, // Lower confidence for fallback extraction
      };
      confidence = 0.3;
    }

    // Save to products_dev table
    let savedToDb = false;
    
    try {
      const { error: dbError } = await supabase
        .from('products_dev')
        .insert({
          name: extractedData.productName || null,
          brand: extractedData.brand || null,
          size: extractedData.size || null,
          category: extractedData.category || null,
          metadata: {
            packaging_type: extractedData.packagingType,
            detection_method: 'OCR',
            confidence,
            raw_ocr_text: rawText,
            image_preview: image.substring(0, 100) + '...',
            extraction_type: 'packaging',
          },
        });

      if (dbError) {
        console.error('[Test Packaging API] ❌ Database save failed:', dbError);
      } else {
        savedToDb = true;
        console.log('[Test Packaging API] 💾 Saved to products_dev');
      }
    } catch (dbError) {
      console.error('[Test Packaging API] ❌ Database error:', dbError);
    }

    const apiResponse: PackagingExtractionResponse = {
      success: true,
      productName: extractedData.productName,
      brand: extractedData.brand,
      size: extractedData.size,
      category: extractedData.category,
      packagingType: extractedData.packagingType,
      rawText,
      confidence,
      savedToDb,
    };

    return NextResponse.json(apiResponse);

  } catch (error) {
    console.error('[Test Packaging API] ❌ Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        savedToDb: false,
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to extract field from text when JSON parsing fails
 */
function extractFieldFromText(text: string, fieldName: string): string | null {
  const patterns: Record<string, RegExp> = {
    productName: /"productName":\s*"([^"]+)"/i,
    brand: /"brand":\s*"([^"]+)"/i,
    size: /"size":\s*"([^"]+)"/i,
    category: /"category":\s*"([^"]+)"/i,
    packagingType: /"packagingType":\s*"([^"]+)"/i,
  };

  const pattern = patterns[fieldName];
  if (!pattern) return null;

  const match = text.match(pattern);
  return match ? match[1] : null;
}
