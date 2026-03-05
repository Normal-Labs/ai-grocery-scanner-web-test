/**
 * Test Nutrition Facts Extraction API Endpoint
 * 
 * POST /api/test-nutrition-extraction
 * 
 * Tests nutrition facts extraction using Gemini Vision with specialized prompts.
 * Extracts: serving size, calories, macros, and micronutrients with units and daily values.
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

interface NutritionExtractionRequest {
  image: string; // base64 image data
}

interface NutritionExtractionResponse {
  success: boolean;
  nutritionFacts?: any;
  rawText?: string;
  confidence: number;
  savedToDb: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: NutritionExtractionRequest = await request.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'Image is required', confidence: 0, savedToDb: false },
        { status: 400 }
      );
    }

    console.log('[Test Nutrition API] 📥 Request received');

    const gemini = getGeminiWrapper();
    
    // Strip data URL prefix if present
    let base64Data = image;
    if (image.includes('base64,')) {
      base64Data = image.split('base64,')[1];
    }

    const result = await gemini.generateContent({
      prompt: ExtractionPrompts.nutrition,
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
    
    console.log('[Test Nutrition API] Raw response:', rawText);

    // Parse JSON response
    let nutritionFacts: any = null;
    let confidence = 0.0;
    
    try {
      // Remove markdown code blocks if present
      let jsonText = rawText;
      if (jsonText.includes('```json')) {
        jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      } else if (jsonText.includes('```')) {
        jsonText = jsonText.replace(/```\s*/g, '');
      }
      
      nutritionFacts = JSON.parse(jsonText);
      confidence = nutritionFacts.confidence || 0.5;
      
      console.log('[Test Nutrition API] ✅ Parsed nutrition facts');
    } catch (parseError) {
      console.error('[Test Nutrition API] ❌ JSON parse failed:', parseError);
      
      return NextResponse.json(
        {
          success: false,
          confidence: 0.0,
          error: 'Failed to parse nutrition facts from image',
          rawText,
          savedToDb: false,
        },
        { status: 400 }
      );
    }

    // Validate required fields
    const hasRequiredFields = 
      nutritionFacts.serving_size &&
      nutritionFacts.calories_per_serving !== undefined &&
      nutritionFacts.macros;

    if (!hasRequiredFields) {
      return NextResponse.json(
        {
          success: false,
          confidence: 0.0,
          error: 'Incomplete nutrition facts - missing required fields',
          rawText,
          savedToDb: false,
        },
        { status: 400 }
      );
    }

    // Save to products_dev table
    let savedToDb = false;
    
    try {
      const { error: dbError } = await supabase
        .from('products_dev')
        .insert({
          nutrition_facts: nutritionFacts,
          metadata: {
            detection_method: 'OCR',
            confidence,
            raw_ocr_text: rawText,
            image_preview: image.substring(0, 100) + '...',
            extraction_type: 'nutrition',
            notes: nutritionFacts.notes || null,
          },
        });

      if (dbError) {
        console.error('[Test Nutrition API] ❌ Database save failed:', dbError);
      } else {
        savedToDb = true;
        console.log('[Test Nutrition API] 💾 Saved to products_dev');
      }
    } catch (dbError) {
      console.error('[Test Nutrition API] ❌ Database error:', dbError);
    }

    const apiResponse: NutritionExtractionResponse = {
      success: true,
      nutritionFacts,
      rawText,
      confidence,
      savedToDb,
    };

    return NextResponse.json(apiResponse);

  } catch (error) {
    console.error('[Test Nutrition API] ❌ Unexpected error:', error);
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
