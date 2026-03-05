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
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODEL } from '@/lib/config/gemini';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

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

    // Extract ingredients using Gemini Vision with specialized prompt
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    
    // Strip data URL prefix if present
    let base64Data = image;
    if (image.includes('base64,')) {
      base64Data = image.split('base64,')[1];
    }
    
    const prompt = `Extract the ingredient list from this product label image.

CRITICAL RULES:

1. IGNORE MARKETING TEXT:
   - Discard all promotional phrases like "Now with less salt!", "Organic!", "Family Size", "New Recipe", etc.
   - Skip any text that is not part of the actual ingredient list

2. BOUNDARY DETECTION:
   - Start extraction at the word "Ingredients" (or "INGREDIENTS:", "Ingredientes:", etc.)
   - Stop extraction once the list ends (usually marked by a change in font/layout or start of nutrition facts)
   - Do NOT include allergen statements like "Contains: milk, soy"
   - Do NOT include manufacturing statements like "Manufactured in a facility..."

3. PRESERVE SUB-INGREDIENTS:
   - If an ingredient has components in parentheses, you MUST include them
   - Example: "Enriched Flour (wheat flour, niacin, reduced iron)" - keep the entire structure
   - Maintain nested parentheses if present

4. FORMATTING:
   - Return ingredients as a comma-separated list
   - Preserve capitalization as it appears
   - Keep percentage indicators if present (e.g., "Water (60%)")
   - Maintain "and/or" statements if present

5. NO HALLUCINATION:
   - If you cannot find a clear ingredient list, return "NONE"
   - Do not generate or guess ingredients
   - Only extract what is clearly visible

Return ONLY a JSON object with this structure:
{
  "ingredients": ["ingredient 1", "ingredient 2", "ingredient 3 (with sub-ingredients)", ...],
  "confidence": 0.0-1.0,
  "notes": "any extraction notes or warnings"
}

EXAMPLE OUTPUT:
{
  "ingredients": [
    "Water",
    "Enriched Flour (wheat flour, niacin, reduced iron, thiamine mononitrate, riboflavin, folic acid)",
    "Sugar",
    "Vegetable Oil (soybean and/or palm oil)",
    "Salt"
  ],
  "confidence": 0.95,
  "notes": "Clear ingredient list found"
}`;

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
    const rawText = response.text().trim();
    
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
      
      console.log('[Test Ingredients API] ✅ Parsed ingredients:', ingredients.length, 'items');
    } catch (parseError) {
      console.error('[Test Ingredients API] ❌ JSON parse failed:', parseError);
      
      // Fallback: Try to extract ingredients from text
      if (rawText.toLowerCase().includes('none') || rawText.toLowerCase().includes('not found')) {
        ingredients = [];
        confidence = 0.0;
      } else {
        // Try to find array-like structure in text
        const arrayMatch = rawText.match(/\[(.*?)\]/s);
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
