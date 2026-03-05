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
    
    const prompt = `Extract nutrition facts from this Nutrition Facts label image.

CRITICAL RULES:

1. TABLE INTEGRITY:
   - Only extract values found INSIDE the official Nutrition Facts table/box
   - The table typically has a bold header "Nutrition Facts" at the top
   - Ignore any text outside the bordered table area

2. DISCARD MARKETING CLAIMS:
   - Ignore callouts like "Excellent source of Calcium", "Zero Sugar!", "Low Fat"
   - Ignore colorful bubbles or large promotional text outside the table
   - Only extract data from the structured table rows

3. UNIT MAPPING:
   - Always include the unit (g, mg, mcg, kcal) for every value
   - Common units: g (grams), mg (milligrams), mcg (micrograms)
   - Calories are typically in kcal (kilocalories)

4. DAILY VALUE (%DV):
   - Extract the percentage if present (usually on the right side)
   - Prioritize the absolute weight/mass value
   - Not all nutrients have %DV (e.g., trans fat, total sugars)

5. SERVING SIZE LOGIC:
   - Always capture "Serving Size" (e.g., "1 cup (240ml)", "2 pieces (50g)")
   - Always capture "Servings Per Container" (number)
   - This ensures data is scalable for different portion sizes

6. REQUIRED FIELDS:
   - Serving Size (string with units)
   - Servings Per Container (number)
   - Calories per serving (number)
   - Total Fat, Saturated Fat, Trans Fat
   - Cholesterol, Sodium
   - Total Carbohydrate, Dietary Fiber, Total Sugars, Added Sugars
   - Protein

7. OPTIONAL FIELDS (if present):
   - Vitamins and Minerals (Vitamin D, Calcium, Iron, Potassium, etc.)
   - Other nutrients listed in the table

Return ONLY a JSON object with this EXACT structure:

{
  "serving_size": "string with units (e.g., '1 cup (240ml)')",
  "servings_per_container": number,
  "calories_per_serving": number,
  "macros": {
    "total_fat": {"value": number, "unit": "g", "dv_percent": number or null},
    "saturated_fat": {"value": number, "unit": "g", "dv_percent": number or null},
    "trans_fat": {"value": number, "unit": "g"},
    "cholesterol": {"value": number, "unit": "mg", "dv_percent": number or null},
    "sodium": {"value": number, "unit": "mg", "dv_percent": number or null},
    "total_carbohydrate": {"value": number, "unit": "g", "dv_percent": number or null},
    "dietary_fiber": {"value": number, "unit": "g", "dv_percent": number or null},
    "total_sugars": {"value": number, "unit": "g"},
    "added_sugars": {"value": number, "unit": "g", "dv_percent": number or null},
    "protein": {"value": number, "unit": "g", "dv_percent": number or null}
  },
  "vitamins_minerals": {
    "vitamin_d": {"value": number, "unit": "mcg", "dv_percent": number or null},
    "calcium": {"value": number, "unit": "mg", "dv_percent": number or null},
    "iron": {"value": number, "unit": "mg", "dv_percent": number or null},
    "potassium": {"value": number, "unit": "mg", "dv_percent": number or null}
  },
  "confidence": 0.0-1.0,
  "notes": "any extraction notes or warnings"
}

EXAMPLE OUTPUT:
{
  "serving_size": "1 cup (240ml)",
  "servings_per_container": 8,
  "calories_per_serving": 150,
  "macros": {
    "total_fat": {"value": 8, "unit": "g", "dv_percent": 10},
    "saturated_fat": {"value": 1, "unit": "g", "dv_percent": 5},
    "trans_fat": {"value": 0, "unit": "g"},
    "cholesterol": {"value": 0, "unit": "mg", "dv_percent": 0},
    "sodium": {"value": 100, "unit": "mg", "dv_percent": 4},
    "total_carbohydrate": {"value": 12, "unit": "g", "dv_percent": 4},
    "dietary_fiber": {"value": 0, "unit": "g", "dv_percent": 0},
    "total_sugars": {"value": 12, "unit": "g"},
    "added_sugars": {"value": 0, "unit": "g", "dv_percent": 0},
    "protein": {"value": 8, "unit": "g", "dv_percent": 16}
  },
  "vitamins_minerals": {
    "vitamin_d": {"value": 2.5, "unit": "mcg", "dv_percent": 10},
    "calcium": {"value": 300, "unit": "mg", "dv_percent": 25},
    "iron": {"value": 0, "unit": "mg", "dv_percent": 0},
    "potassium": {"value": 350, "unit": "mg", "dv_percent": 8}
  },
  "confidence": 0.95,
  "notes": "Complete nutrition facts extracted"
}

IMPORTANT:
- If a value is not present or unclear, use null
- If you cannot find a clear Nutrition Facts table, return confidence: 0.0
- Do not guess or hallucinate values`;

    const result = await gemini.generateContent({
      prompt,
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
