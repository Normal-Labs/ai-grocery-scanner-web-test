/**
 * Test All Extraction API Endpoint
 * 
 * POST /api/test-all-extraction
 * 
 * Orchestrates all extraction types sequentially:
 * 1. Barcode detection
 * 2. Packaging information
 * 3. Ingredients list
 * 4. Nutrition facts
 * 
 * Includes rate limiting delays to avoid 429 errors.
 * Saves complete product to products_dev table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getGeminiWrapper } from '@/lib/gemini-wrapper';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Rate limiting delay between API calls (in milliseconds)
const RATE_LIMIT_DELAY = 5000; // 5 seconds - conservative to avoid 429 errors
const INITIAL_DELAY = 1000; // 1 second initial delay before first API call

interface AllExtractionRequest {
  image: string; // base64 image data
}

interface ExtractionStep {
  name: string;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'skipped';
  data?: any;
  error?: string;
  confidence?: number;
  processingTime?: number;
}

interface AllExtractionResponse {
  success: boolean;
  steps: {
    barcode: ExtractionStep;
    packaging: ExtractionStep;
    ingredients: ExtractionStep;
    nutrition: ExtractionStep;
  };
  productId?: string;
  savedToDb: boolean;
  totalProcessingTime: number;
  error?: string;
}

// Helper function to add delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  const steps: AllExtractionResponse['steps'] = {
    barcode: { name: 'Barcode Detection', status: 'pending' },
    packaging: { name: 'Packaging Information', status: 'pending' },
    ingredients: { name: 'Ingredients List', status: 'pending' },
    nutrition: { name: 'Nutrition Facts', status: 'pending' },
  };

  try {
    const body: AllExtractionRequest = await request.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Image is required',
          steps,
          savedToDb: false,
          totalProcessingTime: 0,
        },
        { status: 400 }
      );
    }

    console.log('[Test All API] 📥 Starting complete extraction');

    // Strip data URL prefix if present
    let base64Data = image;
    if (image.includes('base64,')) {
      base64Data = image.split('base64,')[1];
    }

    const gemini = getGeminiWrapper();

    // Accumulated product data
    let productData: any = {
      barcode: null,
      name: null,
      brand: null,
      size: null,
      category: null,
      ingredients: null,
      nutrition_facts: null,
      metadata: {
        extraction_type: 'complete',
        extraction_steps: {},
      },
    };

    // Initial delay to avoid immediate rate limiting
    await delay(INITIAL_DELAY);

    // STEP 1: Barcode Detection
    try {
      console.log('[Test All API] 🔍 Step 1: Barcode detection');
      steps.barcode.status = 'processing';
      const barcodeStart = Date.now();

      const barcodePrompt = `Extract the barcode number from this image.

INSTRUCTIONS:
1. Look for a barcode (UPC, EAN, or similar)
2. Extract ONLY the numeric digits below or near the barcode
3. Return ONLY the barcode number, nothing else
4. If you cannot find a barcode, return "NONE"

Return format: Just the barcode number (e.g., "012345678901")`;

      const barcodeResult = await gemini.generateContent({
        prompt: barcodePrompt,
        imageData: base64Data,
        imageMimeType: 'image/jpeg',
        maxRetries: 2,
        retryDelayMs: 5000,
      });

      if (!barcodeResult.success) {
        steps.barcode.status = 'failed';
        steps.barcode.error = barcodeResult.error;
        if (barcodeResult.rateLimitInfo) {
          console.error('[Test All API] 🚨 Rate limit details:', barcodeResult.rateLimitInfo);
        }
        productData.metadata.extraction_steps.barcode = steps.barcode;
        await delay(RATE_LIMIT_DELAY);
      } else {
        const barcodeText = barcodeResult.text!.trim();
        const barcodeMatch = barcodeText.match(/\b\d{8,14}\b/);

        if (barcodeMatch) {
          productData.barcode = barcodeMatch[0];
          steps.barcode.status = 'success';
          steps.barcode.data = { barcode: barcodeMatch[0] };
          steps.barcode.confidence = 0.9;
          console.log('[Test All API] ✅ Barcode found:', barcodeMatch[0]);
        } else {
          steps.barcode.status = 'failed';
          steps.barcode.error = 'No barcode detected';
          console.log('[Test All API] ⚠️ No barcode found');
        }

        steps.barcode.processingTime = Date.now() - barcodeStart;
        productData.metadata.extraction_steps.barcode = steps.barcode;

        // Rate limiting delay
        await delay(RATE_LIMIT_DELAY);
      }

    } catch (error) {
      steps.barcode.status = 'failed';
      steps.barcode.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Test All API] ❌ Barcode extraction failed:', error);
      productData.metadata.extraction_steps.barcode = steps.barcode;
    }

    // STEP 2: Packaging Information
    try {
      console.log('[Test All API] 📦 Step 2: Packaging information');
      steps.packaging.status = 'processing';
      const packagingStart = Date.now();

      const packagingPrompt = `Extract product packaging information from this image.

INSTRUCTIONS:
1. Identify the PRODUCT NAME (the main product title)
2. Identify the BRAND (manufacturer or company name)
3. Identify the SIZE/QUANTITY (e.g., "12 oz", "500g", "6 pack")
4. Identify the CATEGORY (e.g., Beverages, Snacks, Dairy, Bakery, etc.)
5. Identify the PACKAGING TYPE (e.g., bottle, can, box, bag, jar, carton)

Return ONLY a JSON object with these fields:
{
  "productName": "extracted product name",
  "brand": "extracted brand name",
  "size": "extracted size/quantity",
  "category": "inferred category",
  "packagingType": "type of packaging",
  "confidence": 0.0-1.0
}

RULES:
- Extract text exactly as it appears
- If a field cannot be determined, use null
- Return ONLY the JSON object, no additional text`;

      const packagingResult = await gemini.generateContent({
        prompt: packagingPrompt,
        imageData: base64Data,
        imageMimeType: 'image/jpeg',
        maxRetries: 2,
        retryDelayMs: 5000,
      });

      if (!packagingResult.success) {
        steps.packaging.status = 'failed';
        steps.packaging.error = packagingResult.error;
        if (packagingResult.rateLimitInfo) {
          console.error('[Test All API] 🚨 Rate limit details:', packagingResult.rateLimitInfo);
        }
        steps.packaging.processingTime = Date.now() - packagingStart;
        productData.metadata.extraction_steps.packaging = steps.packaging;
        await delay(RATE_LIMIT_DELAY);
      } else {
        let packagingText = packagingResult.text!.trim();
        if (packagingText.includes('```json')) {
          packagingText = packagingText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        }

        const packagingData = JSON.parse(packagingText);
        
        productData.name = packagingData.productName || null;
        productData.brand = packagingData.brand || null;
        productData.size = packagingData.size || null;
        productData.category = packagingData.category || null;
        productData.metadata.packaging_type = packagingData.packagingType || null;

        steps.packaging.status = 'success';
        steps.packaging.data = packagingData;
        steps.packaging.confidence = packagingData.confidence || 0.5;
        console.log('[Test All API] ✅ Packaging extracted');

        steps.packaging.processingTime = Date.now() - packagingStart;
        productData.metadata.extraction_steps.packaging = steps.packaging;

        // Rate limiting delay
        await delay(RATE_LIMIT_DELAY);
      }

    } catch (error) {
      steps.packaging.status = 'failed';
      steps.packaging.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Test All API] ❌ Packaging extraction failed:', error);
      productData.metadata.extraction_steps.packaging = steps.packaging;
    }

    // STEP 3: Ingredients List
    try {
      console.log('[Test All API] 🥫 Step 3: Ingredients list');
      steps.ingredients.status = 'processing';
      const ingredientsStart = Date.now();

      const ingredientsPrompt = `Extract the ingredient list from this product label image.

CRITICAL RULES:
1. IGNORE MARKETING TEXT: Discard promotional phrases
2. BOUNDARY DETECTION: 
   - START at "Ingredients" or "INGREDIENTS:"
   - STOP at "Contains:" or "CONTAINS:" (allergen statement)
   - STOP at any change in font/layout
   - Do NOT include anything after "Contains:"
3. PRESERVE SUB-INGREDIENTS: Keep parenthetical components
4. NO HALLUCINATION: If no clear list, return "NONE"
5. SPLIT ON COMMAS: 
   - Split ingredients by COMMAS, not line breaks
   - Ignore line breaks in the OCR text
   - Each comma-separated item is one ingredient
   - Keep sub-ingredients in parentheses together
6. EXCLUDE ALLERGENS: Do NOT include "Contains:" or "CONTAINS:" statements

Return ONLY a JSON object:
{
  "ingredients": [
    "Ingredient 1",
    "Ingredient 2 (with sub-ingredients)",
    "Ingredient 3",
    ...
  ],
  "confidence": 0.0-1.0,
  "notes": "any notes"
}

IMPORTANT:
- Split ONLY on commas, NOT on line breaks
- Each ingredient must be a SEPARATE array element
- Do NOT include the word "INGREDIENTS:" or "Ingredients:" in any array element
- Remove "INGREDIENTS:" prefix from the first ingredient
- STOP extraction when you see "CONTAINS:" or "Contains:"
- Do NOT include allergen statements
- Preserve capitalization and sub-ingredients in parentheses
- If an ingredient spans multiple lines, join it into one array element

EXAMPLE:
Input: "INGREDIENTS: Water, Sugar, Salt. CONTAINS: SOY"
Output: {
  "ingredients": ["Water", "Sugar", "Salt"],
  "confidence": 0.95,
  "notes": "Clear ingredient list, stopped at allergen statement"
}

EXAMPLE 2:
Input: "INGREDIENTS: Flour (Wheat, Niacin), Oil, Sugar CONTAINS: WHEAT"
Output: {
  "ingredients": ["Flour (Wheat, Niacin)", "Oil", "Sugar"],
  "confidence": 0.9,
  "notes": "Stopped at CONTAINS statement"
}

EXAMPLE 3 (Multi-line OCR):
Input: "INGREDIENTS: Whole Grain Blend (Rolled
Oats, Wheat), Sugar, Salt CONTAINS: WHEAT"
Output: {
  "ingredients": ["Whole Grain Blend (Rolled Oats, Wheat)", "Sugar", "Salt"],
  "confidence": 0.9,
  "notes": "Joined multi-line ingredients, stopped at CONTAINS"
}`;

      const ingredientsResult = await gemini.generateContent({
        prompt: ingredientsPrompt,
        imageData: base64Data,
        imageMimeType: 'image/jpeg',
        maxRetries: 2,
        retryDelayMs: 5000,
      });

      if (!ingredientsResult.success) {
        steps.ingredients.status = 'failed';
        steps.ingredients.error = ingredientsResult.error;
        if (ingredientsResult.rateLimitInfo) {
          console.error('[Test All API] 🚨 Rate limit details:', ingredientsResult.rateLimitInfo);
        }
        steps.ingredients.processingTime = Date.now() - ingredientsStart;
        productData.metadata.extraction_steps.ingredients = steps.ingredients;
        await delay(RATE_LIMIT_DELAY);
      } else {
        let ingredientsText = ingredientsResult.text!.trim();
        if (ingredientsText.includes('```json')) {
          ingredientsText = ingredientsText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        }

        const ingredientsData = JSON.parse(ingredientsText);
        
        // Post-processing: Remove "INGREDIENTS:" prefix from first ingredient if present
        if (ingredientsData.ingredients && ingredientsData.ingredients.length > 0) {
          ingredientsData.ingredients[0] = ingredientsData.ingredients[0]
            .replace(/^INGREDIENTS:\s*/i, '')
            .replace(/^Ingredients:\s*/i, '')
            .trim();
        }
        
        if (ingredientsData.ingredients && ingredientsData.ingredients.length > 0) {
          productData.ingredients = ingredientsData.ingredients;
          steps.ingredients.status = 'success';
          steps.ingredients.data = ingredientsData;
          steps.ingredients.confidence = ingredientsData.confidence || 0.5;
          console.log('[Test All API] ✅ Ingredients extracted:', ingredientsData.ingredients.length);
        } else {
          steps.ingredients.status = 'failed';
          steps.ingredients.error = 'No ingredients found';
          console.log('[Test All API] ⚠️ No ingredients found');
        }

        steps.ingredients.processingTime = Date.now() - ingredientsStart;
        productData.metadata.extraction_steps.ingredients = steps.ingredients;

        // Rate limiting delay
        await delay(RATE_LIMIT_DELAY);
      }

    } catch (error) {
      steps.ingredients.status = 'failed';
      steps.ingredients.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Test All API] ❌ Ingredients extraction failed:', error);
      productData.metadata.extraction_steps.ingredients = steps.ingredients;
    }

    // STEP 4: Nutrition Facts
    try {
      console.log('[Test All API] 📊 Step 4: Nutrition facts');
      steps.nutrition.status = 'processing';
      const nutritionStart = Date.now();

      const nutritionPrompt = `Extract nutrition facts from this Nutrition Facts label.

CRITICAL RULES:
1. TABLE INTEGRITY: Only extract from official Nutrition Facts table
2. DISCARD MARKETING: Ignore promotional callouts
3. UNIT MAPPING: Always include units (g, mg, mcg)
4. DAILY VALUE: Extract %DV when present
5. SERVING SIZE: Always capture serving size and servings per container

Return ONLY a JSON object with this EXACT structure:
{
  "serving_size": "string with units",
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
  "confidence": 0.0-1.0
}

IMPORTANT:
- value must be a NUMBER (not string)
- unit must be separate (g, mg, mcg)
- dv_percent must be a NUMBER (not string with %)
- If not present, use null`;

      const nutritionResult = await gemini.generateContent({
        prompt: nutritionPrompt,
        imageData: base64Data,
        imageMimeType: 'image/jpeg',
        maxRetries: 2,
        retryDelayMs: 5000,
      });

      if (!nutritionResult.success) {
        steps.nutrition.status = 'failed';
        steps.nutrition.error = nutritionResult.error;
        if (nutritionResult.rateLimitInfo) {
          console.error('[Test All API] 🚨 Rate limit details:', nutritionResult.rateLimitInfo);
        }
        steps.nutrition.processingTime = Date.now() - nutritionStart;
        productData.metadata.extraction_steps.nutrition = steps.nutrition;
      } else {
        let nutritionText = nutritionResult.text!.trim();
        if (nutritionText.includes('```json')) {
          nutritionText = nutritionText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        }

        const nutritionData = JSON.parse(nutritionText);
        
        if (nutritionData.serving_size && nutritionData.macros) {
          productData.nutrition_facts = nutritionData;
          steps.nutrition.status = 'success';
          steps.nutrition.data = nutritionData;
          steps.nutrition.confidence = nutritionData.confidence || 0.5;
          console.log('[Test All API] ✅ Nutrition facts extracted');
        } else {
          steps.nutrition.status = 'failed';
          steps.nutrition.error = 'Incomplete nutrition facts';
          console.log('[Test All API] ⚠️ Incomplete nutrition facts');
        }

        steps.nutrition.processingTime = Date.now() - nutritionStart;
        productData.metadata.extraction_steps.nutrition = steps.nutrition;
      }

    } catch (error) {
      steps.nutrition.status = 'failed';
      steps.nutrition.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Test All API] ❌ Nutrition extraction failed:', error);
      productData.metadata.extraction_steps.nutrition = steps.nutrition;
    }

    // Save to database
    let savedToDb = false;
    let productId: string | undefined;

    try {
      const { data, error: dbError } = await supabase
        .from('products_dev')
        .insert(productData)
        .select('id')
        .single();

      if (dbError) {
        console.error('[Test All API] ❌ Database save failed:', dbError);
      } else {
        savedToDb = true;
        productId = data.id;
        console.log('[Test All API] 💾 Saved to products_dev:', productId);
      }
    } catch (dbError) {
      console.error('[Test All API] ❌ Database error:', dbError);
    }

    const totalProcessingTime = Date.now() - startTime;

    const response: AllExtractionResponse = {
      success: true,
      steps,
      productId,
      savedToDb,
      totalProcessingTime,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Test All API] ❌ Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        steps,
        error: error instanceof Error ? error.message : 'Unknown error',
        savedToDb: false,
        totalProcessingTime: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
