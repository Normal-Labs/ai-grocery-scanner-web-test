/**
 * Test Ingredients Extraction API Endpoint
 * 
 * POST /api/test-ingredients-extraction
 * 
 * Tests ingredient list extraction using Gemini Vision with specialized prompts.
 * Extracts: ingredient list with proper formatting and sub-ingredients.
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

interface IngredientsExtractionRequest {
  image: string; // base64 image data
}

interface IngredientsExtractionResponse {
  success: boolean;
  ingredients?: string[];
  rawText?: string;
  confidence: number;
  ingredientCount?: number;
  savedToDb: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: IngredientsExtractionRequest = await request.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'Image is required', confidence: 0, savedToDb: false },
        { status: 400 }
      );
    }

    console.log('[Test Ingredients API] 📥 Request received');

    const gemini = getGeminiWrapper();
    
    // Strip data URL prefix if present
    let base64Data = image;
    if (image.includes('base64,')) {
      base64Data = image.split('base64,')[1];
    }

    const result = await gemini.generateContent({
      prompt: ExtractionPrompts.ingredients,
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
    
    console.log('[Test Ingredients API] Raw response:', rawText);

    // Parse JSON response
    let extractedData: any = {};
    let confidence = 0.5;
    let ingredients: string[] = [];
    
    try {
      // Remove markdown code blocks if present
      let jsonText = rawText;
      if (jsonText.includes('```json')) {
        jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      } else if (jsonText.includes('```')) {
        jsonText = jsonText.replace(/```\s*/g, '');
      }
      
      extractedData = JSON.parse(jsonText);
      ingredients = extractedData.ingredients || [];
      confidence = extractedData.confidence || 0.5;
      
      // Post-processing: Remove "INGREDIENTS:" prefix from first ingredient if present
      if (ingredients.length > 0) {
        ingredients[0] = ingredients[0]
          .replace(/^INGREDIENTS:\s*/i, '')
          .replace(/^Ingredients:\s*/i, '')
          .trim();
      }
      
      console.log('[Test Ingredients API] ✅ Parsed ingredients:', ingredients.length, 'items');
    } catch (parseError) {
      console.error('[Test Ingredients API] ❌ JSON parse failed:', parseError);
      
      // Fallback: Try to extract ingredients from text
      if (rawText.toLowerCase().includes('none') || rawText.toLowerCase().includes('not found')) {
        ingredients = [];
        confidence = 0.0;
      } else {
        // Try to find array-like structure in text
        const arrayMatch = rawText.match(/\[([\s\S]*?)\]/);
        if (arrayMatch) {
          try {
            ingredients = JSON.parse('[' + arrayMatch[1] + ']');
            confidence = 0.4; // Lower confidence for fallback
          } catch {
            ingredients = [];
            confidence = 0.0;
          }
        }
      }
    }

    // Save to products_dev table
    let savedToDb = false;
    
    if (ingredients.length > 0) {
      try {
        const { error: dbError } = await supabase
          .from('products_dev')
          .insert({
            ingredients, // Store in dedicated ingredients column
            metadata: {
              ingredient_count: ingredients.length,
              detection_method: 'OCR',
              confidence,
              raw_ocr_text: rawText,
              image_preview: image.substring(0, 100) + '...',
              extraction_type: 'ingredients',
              notes: extractedData.notes || null,
            },
          });

        if (dbError) {
          console.error('[Test Ingredients API] ❌ Database save failed:', dbError);
        } else {
          savedToDb = true;
          console.log('[Test Ingredients API] 💾 Saved to products_dev');
        }
      } catch (dbError) {
        console.error('[Test Ingredients API] ❌ Database error:', dbError);
      }
    }

    const apiResponse: IngredientsExtractionResponse = {
      success: ingredients.length > 0,
      ingredients,
      rawText,
      confidence,
      ingredientCount: ingredients.length,
      savedToDb,
    };

    return NextResponse.json(apiResponse);

  } catch (error) {
    console.error('[Test Ingredients API] ❌ Unexpected error:', error);
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
