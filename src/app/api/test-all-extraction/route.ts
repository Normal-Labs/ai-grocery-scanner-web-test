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
import { getDimensionPrompt } from '@/lib/prompts/dimension-prompts';

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

interface HealthDimensionResult {
  score: number;
  explanation: string;
  key_factors: string[];
  confidence: number;
}

interface ProcessingDimensionResult {
  score: number;
  explanation: string;
  key_factors: string[];
  additives_detected: {
    preservatives: string[];
    artificial_sweeteners: string[];
    artificial_colors: string[];
    other_additives: string[];
  };
  confidence: number;
}

interface AllergensDimensionResult {
  score: number;
  explanation: string;
  key_factors: string[];
  allergens_detected: {
    major_allergens: string[];
    other_allergens: string[];
    cross_contamination_warnings: string[];
    allergen_free_claims: string[];
  };
  confidence: number;
}

interface AllExtractionResponse {
  success: boolean;
  steps: {
    barcode: ExtractionStep;
    packaging: ExtractionStep;
    ingredients: ExtractionStep;
    nutrition: ExtractionStep;
  };
  healthDimension?: HealthDimensionResult;
  processingDimension?: ProcessingDimensionResult;
  allergensDimension?: AllergensDimensionResult;
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

    // HEALTH DIMENSION ANALYSIS: Run if both ingredients and nutrition were found
    let healthDimension: HealthDimensionResult | undefined;
    
    if (steps.ingredients.status === 'success' && steps.nutrition.status === 'success') {
      try {
        console.log('[Test All API] 🏥 Running health dimension analysis');
        const healthStart = Date.now();

        const healthPrompt = getDimensionPrompt('health');
        
        const healthResult = await gemini.generateContent({
          prompt: healthPrompt,
          imageData: base64Data,
          imageMimeType: 'image/jpeg',
          maxRetries: 2,
          retryDelayMs: 5000,
        });

        if (healthResult.success && healthResult.text) {
          let healthResponseText = healthResult.text.trim();
          
          // Remove markdown code blocks
          if (healthResponseText.includes('```json')) {
            healthResponseText = healthResponseText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
          }
          
          // Extract JSON from text that might have conversational prefix/suffix
          // Look for JSON object pattern: starts with { and ends with }
          const jsonMatch = healthResponseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            healthResponseText = jsonMatch[0];
          }

          const healthData = JSON.parse(healthResponseText);
          healthDimension = {
            score: healthData.score,
            explanation: healthData.explanation,
            key_factors: healthData.key_factors,
            confidence: healthData.confidence,
          };

          const healthTime = Date.now() - healthStart;
          console.log('[Test All API] ✅ Health dimension analysis completed in', healthTime, 'ms');
          console.log('[Test All API] 🏥 Health score:', healthDimension.score);

          // Store in product metadata
          productData.metadata.health_dimension = healthDimension;
        } else {
          console.error('[Test All API] ❌ Health dimension analysis failed:', healthResult.error);
        }
      } catch (healthError) {
        console.error('[Test All API] ❌ Health dimension error:', healthError);
        // Don't fail the entire request if health dimension fails
      }
    } else {
      console.log('[Test All API] ⏭️ Skipping health dimension (missing ingredients or nutrition)');
    }

    // PROCESSING DIMENSION ANALYSIS: Run if ingredients were found
    let processingDimension: ProcessingDimensionResult | undefined;
    
    if (steps.ingredients.status === 'success') {
      try {
        console.log('[Test All API] 🔬 Running processing dimension analysis');
        const processingStart = Date.now();

        const processingPrompt = getDimensionPrompt('processing');
        
        const processingResult = await gemini.generateContent({
          prompt: processingPrompt,
          imageData: base64Data,
          imageMimeType: 'image/jpeg',
          maxRetries: 2,
          retryDelayMs: 5000,
        });

        if (processingResult.success && processingResult.text) {
          let processingResponseText = processingResult.text.trim();
          
          // Remove markdown code blocks
          if (processingResponseText.includes('```json')) {
            processingResponseText = processingResponseText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
          }
          
          // Extract JSON from text that might have conversational prefix/suffix
          const jsonMatch = processingResponseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            processingResponseText = jsonMatch[0];
          }

          const processingData = JSON.parse(processingResponseText);
          processingDimension = {
            score: processingData.score,
            explanation: processingData.explanation,
            key_factors: processingData.key_factors,
            additives_detected: processingData.additives_detected || {
              preservatives: [],
              artificial_sweeteners: [],
              artificial_colors: [],
              other_additives: [],
            },
            confidence: processingData.confidence,
          };

          const processingTime = Date.now() - processingStart;
          console.log('[Test All API] ✅ Processing dimension analysis completed in', processingTime, 'ms');
          console.log('[Test All API] 🔬 Processing score:', processingDimension.score);

          // Store in product metadata
          productData.metadata.processing_dimension = processingDimension;
        } else {
          console.error('[Test All API] ❌ Processing dimension analysis failed:', processingResult.error);
        }
      } catch (processingError) {
        console.error('[Test All API] ❌ Processing dimension error:', processingError);
        // Don't fail the entire request if processing dimension fails
      }
    } else {
      console.log('[Test All API] ⏭️ Skipping processing dimension (missing ingredients)');
    }

    // ALLERGENS DIMENSION ANALYSIS: Run if ingredients were found
    let allergensDimension: AllergensDimensionResult | undefined;
    
    if (steps.ingredients.status === 'success') {
      try {
        console.log('[Test All API] 🥜 Running allergens dimension analysis');
        const allergensStart = Date.now();

        const allergensPrompt = getDimensionPrompt('allergens');
        
        const allergensResult = await gemini.generateContent({
          prompt: allergensPrompt,
          imageData: base64Data,
          imageMimeType: 'image/jpeg',
          maxRetries: 2,
          retryDelayMs: 5000,
        });

        if (allergensResult.success && allergensResult.text) {
          let allergensResponseText = allergensResult.text.trim();
          
          // Remove markdown code blocks
          if (allergensResponseText.includes('```json')) {
            allergensResponseText = allergensResponseText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
          }
          
          // Extract JSON from text that might have conversational prefix/suffix
          const jsonMatch = allergensResponseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            allergensResponseText = jsonMatch[0];
          }

          const allergensData = JSON.parse(allergensResponseText);
          allergensDimension = {
            score: allergensData.score,
            explanation: allergensData.explanation,
            key_factors: allergensData.key_factors,
            allergens_detected: allergensData.allergens_detected || {
              major_allergens: [],
              other_allergens: [],
              cross_contamination_warnings: [],
              allergen_free_claims: [],
            },
            confidence: allergensData.confidence,
          };

          const allergensTime = Date.now() - allergensStart;
          console.log('[Test All API] ✅ Allergens dimension analysis completed in', allergensTime, 'ms');
          console.log('[Test All API] 🥜 Allergens score:', allergensDimension.score);

          // Store in product metadata
          productData.metadata.allergens_dimension = allergensDimension;
        } else {
          console.error('[Test All API] ❌ Allergens dimension analysis failed:', allergensResult.error);
        }
      } catch (allergensError) {
        console.error('[Test All API] ❌ Allergens dimension error:', allergensError);
        // Don't fail the entire request if allergens dimension fails
      }
    } else {
      console.log('[Test All API] ⏭️ Skipping allergens dimension (missing ingredients)');
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
      healthDimension,
      processingDimension,
      allergensDimension,
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
