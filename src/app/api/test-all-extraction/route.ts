/**
 * Test All Extraction API Endpoint
 * 
 * POST /api/test-all-extraction
 * 
 * Extracts all product information in a SINGLE API call using combined prompts:
 * 1. Barcode detection
 * 2. Packaging information
 * 3. Ingredients list
 * 4. Nutrition facts
 * 
 * Uses Vertex AI with automatic retry logic.
 * Saves complete product to products_dev table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getGeminiWrapper } from '@/lib/gemini-wrapper';
import { combineExtractionPrompts } from '@/lib/prompts/extraction-prompts';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    console.log('[Test All API] 📥 Starting complete extraction (single API call)');

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
        extraction_type: 'combined_single_call',
        extraction_steps: {},
      },
    };

    // COMBINED EXTRACTION: All data in a single API call
    try {
      console.log('[Test All API] 🔍 Extracting all data with combined prompt');
      const extractionStart = Date.now();

      // Combine all extraction prompts into one
      const combinedPrompt = combineExtractionPrompts([
        'barcode',
        'packaging',
        'ingredients',
        'nutrition',
      ]);

      const result = await gemini.generateContent({
        prompt: combinedPrompt,
        imageData: base64Data,
        imageMimeType: 'image/jpeg',
        maxRetries: 2,
        retryDelayMs: 5000,
      });

      if (!result.success) {
        console.error('[Test All API] ❌ Combined extraction failed:', result.error);
        if (result.rateLimitInfo) {
          console.error('[Test All API] 🚨 Rate limit details:', result.rateLimitInfo);
        }

        // Mark all steps as failed
        steps.barcode.status = 'failed';
        steps.barcode.error = result.error;
        steps.packaging.status = 'failed';
        steps.packaging.error = result.error;
        steps.ingredients.status = 'failed';
        steps.ingredients.error = result.error;
        steps.nutrition.status = 'failed';
        steps.nutrition.error = result.error;

        const totalProcessingTime = Date.now() - startTime;
        return NextResponse.json(
          {
            success: false,
            steps,
            error: result.error,
            savedToDb: false,
            totalProcessingTime,
          },
          { status: 500 }
        );
      }

      // Parse combined response
      let responseText = result.text!.trim();
      if (responseText.includes('```json')) {
        responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      }

      const extractedData = JSON.parse(responseText);
      const extractionTime = Date.now() - extractionStart;

      console.log('[Test All API] ✅ Combined extraction completed in', extractionTime, 'ms');

      // Process barcode
      if (extractedData.barcode) {
        const barcodeMatch = extractedData.barcode.match(/\b\d{8,14}\b/);
        if (barcodeMatch) {
          productData.barcode = barcodeMatch[0];
          steps.barcode.status = 'success';
          steps.barcode.data = { barcode: barcodeMatch[0] };
          steps.barcode.confidence = 0.9;
          console.log('[Test All API] ✅ Barcode found:', barcodeMatch[0]);
        } else {
          steps.barcode.status = 'failed';
          steps.barcode.error = 'No valid barcode detected';
        }
      } else {
        steps.barcode.status = 'failed';
        steps.barcode.error = 'No barcode in response';
      }
      steps.barcode.processingTime = extractionTime;
      productData.metadata.extraction_steps.barcode = steps.barcode;

      // Process packaging
      if (extractedData.packaging) {
        productData.name = extractedData.packaging.productName || null;
        productData.brand = extractedData.packaging.brand || null;
        productData.size = extractedData.packaging.size || null;
        productData.category = extractedData.packaging.category || null;
        productData.metadata.packaging_type = extractedData.packaging.packagingType || null;

        steps.packaging.status = 'success';
        steps.packaging.data = extractedData.packaging;
        steps.packaging.confidence = extractedData.packaging.confidence || 0.5;
        console.log('[Test All API] ✅ Packaging extracted');
      } else {
        steps.packaging.status = 'failed';
        steps.packaging.error = 'No packaging data in response';
      }
      steps.packaging.processingTime = extractionTime;
      productData.metadata.extraction_steps.packaging = steps.packaging;

      // Process ingredients
      if (extractedData.ingredients?.ingredients && extractedData.ingredients.ingredients.length > 0) {
        // Post-processing: Remove "INGREDIENTS:" prefix from first ingredient if present
        const ingredients = [...extractedData.ingredients.ingredients];
        if (ingredients[0]) {
          ingredients[0] = ingredients[0]
            .replace(/^INGREDIENTS:\s*/i, '')
            .replace(/^Ingredients:\s*/i, '')
            .trim();
        }

        productData.ingredients = ingredients;
        steps.ingredients.status = 'success';
        steps.ingredients.data = extractedData.ingredients;
        steps.ingredients.confidence = extractedData.ingredients.confidence || 0.5;
        console.log('[Test All API] ✅ Ingredients extracted:', ingredients.length);
      } else {
        steps.ingredients.status = 'failed';
        steps.ingredients.error = 'No ingredients found';
        console.log('[Test All API] ⚠️ No ingredients found');
      }
      steps.ingredients.processingTime = extractionTime;
      productData.metadata.extraction_steps.ingredients = steps.ingredients;

      // Process nutrition facts
      if (extractedData.nutrition_facts?.serving_size && extractedData.nutrition_facts.macros) {
        productData.nutrition_facts = extractedData.nutrition_facts;
        steps.nutrition.status = 'success';
        steps.nutrition.data = extractedData.nutrition_facts;
        steps.nutrition.confidence = extractedData.nutrition_facts.confidence || 0.5;
        console.log('[Test All API] ✅ Nutrition facts extracted');
      } else {
        steps.nutrition.status = 'failed';
        steps.nutrition.error = 'Incomplete nutrition facts';
        console.log('[Test All API] ⚠️ Incomplete nutrition facts');
      }
      steps.nutrition.processingTime = extractionTime;
      productData.metadata.extraction_steps.nutrition = steps.nutrition;

      // Store overall confidence
      if (extractedData.overall_confidence) {
        productData.metadata.overall_confidence = extractedData.overall_confidence;
      }

    } catch (error) {
      console.error('[Test All API] ❌ Combined extraction error:', error);
      
      // Mark all steps as failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      steps.barcode.status = 'failed';
      steps.barcode.error = errorMessage;
      steps.packaging.status = 'failed';
      steps.packaging.error = errorMessage;
      steps.ingredients.status = 'failed';
      steps.ingredients.error = errorMessage;
      steps.nutrition.status = 'failed';
      steps.nutrition.error = errorMessage;

      productData.metadata.extraction_steps = {
        barcode: steps.barcode,
        packaging: steps.packaging,
        ingredients: steps.ingredients,
        nutrition: steps.nutrition,
      };
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
