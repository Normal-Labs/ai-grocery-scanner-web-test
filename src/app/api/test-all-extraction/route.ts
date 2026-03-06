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
 * Saves complete product to production products table.
 * Caches to MongoDB only if extraction is complete (all 4 steps successful).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getGeminiWrapper } from '@/lib/gemini-wrapper';
import { combineExtractionPrompts } from '@/lib/prompts/extraction-prompts';
import { getDimensionPrompt } from '@/lib/prompts/dimension-prompts';
import { cacheService } from '@/lib/mongodb/cache-service';
import type { ProductData } from '@/lib/types/multi-tier';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Calculate completeness score for a product entry
 * Returns a score from 0-4 based on successful extraction steps
 */
function calculateCompletenessScore(data: any): number {
  let score = 0;
  
  // Check extraction steps in metadata
  const steps = data.metadata?.extraction_steps;
  if (!steps) return 0;
  
  if (steps.barcode?.status === 'success') score++;
  if (steps.packaging?.status === 'success') score++;
  if (steps.ingredients?.status === 'success') score++;
  if (steps.nutrition?.status === 'success') score++;
  
  return score;
}

/**
 * Determine if new data should replace existing data
 * Returns true if new data is equal or better quality
 */
function shouldUpdateProduct(existingData: any, newData: any): boolean {
  const existingScore = calculateCompletenessScore(existingData);
  const newScore = calculateCompletenessScore(newData);
  
  console.log('[Test All API] 📊 Completeness comparison:', {
    existing: existingScore,
    new: newScore,
    shouldUpdate: newScore >= existingScore,
  });
  
  return newScore >= existingScore;
}

interface AllExtractionRequest {
  image: string; // base64 image data
  productId?: string; // Optional: ID of product to update (for completing incomplete scans)
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
  cached?: boolean;
  cacheAge?: number;
  skippedUpdate?: boolean;
  reason?: string;
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
    const { image, productId } = body;

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
    if (productId) {
      console.log('[Test All API] 🔄 Completing scan for existing product:', productId);
    }

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
      let extractedBarcode: string | null = null;
      if (extractedData.barcode) {
        const barcodeMatch = extractedData.barcode.match(/\b\d{8,14}\b/);
        if (barcodeMatch) {
          extractedBarcode = barcodeMatch[0];
          productData.barcode = extractedBarcode;
          steps.barcode.status = 'success';
          steps.barcode.data = { barcode: extractedBarcode };
          steps.barcode.confidence = 0.9;
          console.log('[Test All API] ✅ Barcode found:', extractedBarcode);

          // CHECK CACHE: Look for existing product with this barcode
          try {
            const { data: cachedProduct, error: cacheError } = await supabase
              .from('products')
              .select('*')
              .eq('barcode', extractedBarcode)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (!cacheError && cachedProduct) {
              const cacheAge = Date.now() - new Date(cachedProduct.created_at).getTime();
              const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
              
              // Check if cached data is complete (score 4)
              const cachedScore = calculateCompletenessScore(cachedProduct);
              const isComplete = cachedScore === 4;

              if (cacheAge < thirtyDaysMs && isComplete) {
                console.log('[Test All API] 💾 Cache hit! Using cached product:', cachedProduct.id);
                console.log('[Test All API] 📅 Cache age:', Math.floor(cacheAge / (24 * 60 * 60 * 1000)), 'days');
                console.log('[Test All API] 📊 Cached completeness score:', cachedScore);

                // Return cached data
                const totalProcessingTime = Date.now() - startTime;
                return NextResponse.json({
                  success: true,
                  cached: true,
                  cacheAge: Math.floor(cacheAge / (24 * 60 * 60 * 1000)),
                  steps: cachedProduct.metadata?.extraction_steps || steps,
                  healthDimension: cachedProduct.metadata?.health_dimension,
                  processingDimension: cachedProduct.metadata?.processing_dimension,
                  allergensDimension: cachedProduct.metadata?.allergens_dimension,
                  productId: cachedProduct.id,
                  savedToDb: true,
                  totalProcessingTime,
                });
              } else if (cacheAge >= thirtyDaysMs) {
                console.log('[Test All API] ⏰ Cache expired (age:', Math.floor(cacheAge / (24 * 60 * 60 * 1000)), 'days), running fresh analysis');
              } else {
                console.log('[Test All API] ⚠️ Cached data incomplete (score:', cachedScore, '), running fresh analysis');
              }
            }
          } catch (cacheError) {
            console.log('[Test All API] ⚠️ Cache lookup failed, continuing with fresh extraction:', cacheError);
          }
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
        productData.name = extractedData.packaging.productName || 'Unknown Product';
        productData.brand = extractedData.packaging.brand || 'Unknown Brand';
        productData.size = extractedData.packaging.size || null;
        productData.category = extractedData.packaging.category || 'Uncategorized';
        productData.metadata.packaging_type = extractedData.packaging.packagingType || null;

        steps.packaging.status = 'success';
        steps.packaging.data = extractedData.packaging;
        steps.packaging.confidence = extractedData.packaging.confidence || 0.5;
        console.log('[Test All API] ✅ Packaging extracted');
      } else {
        steps.packaging.status = 'failed';
        steps.packaging.error = 'No packaging data in response';
        // Set defaults for required fields
        productData.name = 'Unknown Product';
        productData.brand = 'Unknown Brand';
        productData.category = 'Uncategorized';
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

    // Save to database (upsert based on barcode or productId)
    let savedToDb = false;
    let finalProductId: string | undefined;

    try {
      // If productId is provided, we're completing an incomplete scan
      if (productId) {
        console.log('[Test All API] 🔄 Updating existing product:', productId);
        
        // Fetch existing product
        const { data: existingProduct, error: fetchError } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();

        if (fetchError || !existingProduct) {
          console.error('[Test All API] ❌ Failed to fetch existing product:', fetchError);
          console.log('[Test All API] ⚠️ Product not found, will create new entry instead');
          // Fall through to normal insert logic (don't use productId anymore)
        } else {
          // Merge new data with existing data (keep existing data where new data is null)
          // For extraction_steps, only update if new step is successful
          const mergedExtractionSteps = { ...existingProduct.metadata?.extraction_steps };
          
          // Only update extraction steps if the new step is successful
          if (productData.metadata.extraction_steps.barcode?.status === 'success') {
            mergedExtractionSteps.barcode = productData.metadata.extraction_steps.barcode;
          }
          if (productData.metadata.extraction_steps.packaging?.status === 'success') {
            mergedExtractionSteps.packaging = productData.metadata.extraction_steps.packaging;
          }
          if (productData.metadata.extraction_steps.ingredients?.status === 'success') {
            mergedExtractionSteps.ingredients = productData.metadata.extraction_steps.ingredients;
          }
          if (productData.metadata.extraction_steps.nutrition?.status === 'success') {
            mergedExtractionSteps.nutrition = productData.metadata.extraction_steps.nutrition;
          }
          
          const mergedData = {
            barcode: productData.barcode || existingProduct.barcode,
            name: productData.name || existingProduct.name,
            brand: productData.brand || existingProduct.brand,
            size: productData.size || existingProduct.size,
            category: productData.category || existingProduct.category,
            ingredients: productData.ingredients || existingProduct.ingredients,
            nutrition_facts: productData.nutrition_facts || existingProduct.nutrition_facts,
            metadata: {
              ...existingProduct.metadata,
              extraction_type: productData.metadata.extraction_type,
              extraction_steps: mergedExtractionSteps,
              // Keep existing dimensions if new ones aren't available
              health_dimension: productData.metadata.health_dimension || existingProduct.metadata?.health_dimension,
              processing_dimension: productData.metadata.processing_dimension || existingProduct.metadata?.processing_dimension,
              allergens_dimension: productData.metadata.allergens_dimension || existingProduct.metadata?.allergens_dimension,
              // Keep other metadata fields from existing product
              packaging_type: productData.metadata.packaging_type || existingProduct.metadata?.packaging_type,
              overall_confidence: productData.metadata.overall_confidence || existingProduct.metadata?.overall_confidence,
            },
          };

          const { data, error: updateError } = await supabase
            .from('products')
            .update({
              ...mergedData,
              updated_at: new Date().toISOString(),
              metadata: {
                ...mergedData.metadata,
                previous_completeness_score: calculateCompletenessScore(existingProduct),
                current_completeness_score: calculateCompletenessScore({ metadata: mergedData.metadata }),
                last_update_reason: 'multi_scan_completion',
              },
            })
            .eq('id', productId)
            .select('*')
            .single();

          if (updateError) {
            console.error('[Test All API] ❌ Database update failed:', updateError);
          } else {
            savedToDb = true;
            finalProductId = data.id;
            console.log('[Test All API] 💾 Updated product via multi-scan:', finalProductId);
            console.log('[Test All API] 📊 Merged extraction steps:', JSON.stringify(data.metadata?.extraction_steps, null, 2));
            console.log('[Test All API] 🏥 Health dimension:', data.metadata?.health_dimension ? 'Present' : 'Missing');
            console.log('[Test All API] 🔬 Processing dimension:', data.metadata?.processing_dimension ? 'Present' : 'Missing');
            console.log('[Test All API] 🥜 Allergens dimension:', data.metadata?.allergens_dimension ? 'Present' : 'Missing');
            
            // Check if the merged product is now complete and cache it
            const mergedSteps = data.metadata?.extraction_steps;
            const isCompleteExtraction = 
              data.barcode &&
              mergedSteps?.barcode?.status === 'success' &&
              mergedSteps?.packaging?.status === 'success' &&
              mergedSteps?.ingredients?.status === 'success' &&
              mergedSteps?.nutrition?.status === 'success';

            if (isCompleteExtraction) {
              try {
                console.log('[Test All API] 💾 Storing complete merged product in MongoDB cache...');
                
                // Convert to ProductData format for cache
                const cacheProductData: ProductData = {
                  id: data.id,
                  barcode: data.barcode!,
                  name: data.name || 'Unknown Product',
                  brand: data.brand || 'Unknown Brand',
                  size: data.size || undefined,
                  category: data.category || 'Uncategorized',
                  imageUrl: data.image_url || undefined,
                  metadata: {
                    ...data.metadata,
                    ingredients: data.ingredients,
                    nutrition_facts: data.nutrition_facts,
                    extraction_source: 'test-all-page-multi-scan',
                  },
                };

                // Store by barcode with tier 1 (test extraction) and high confidence
                await cacheService.store(
                  data.barcode!,
                  'barcode',
                  cacheProductData,
                  1, // Tier 1 (direct extraction)
                  0.9 // High confidence for test extractions
                );

                console.log('[Test All API] ✅ Stored complete merged product in MongoDB cache');
              } catch (cacheError) {
                console.error('[Test All API] ⚠️ MongoDB cache storage failed:', cacheError);
                // Don't fail the request if cache storage fails
              }
            } else {
              console.log('[Test All API] ⏭️ Skipping MongoDB cache (merged product still incomplete)');
              console.log('[Test All API] 📊 Merged extraction status:', {
                barcode: mergedSteps?.barcode?.status,
                packaging: mergedSteps?.packaging?.status,
                ingredients: mergedSteps?.ingredients?.status,
                nutrition: mergedSteps?.nutrition?.status,
              });
            }
            
            // Return the complete merged data to the view
            const totalProcessingTime = Date.now() - startTime;
            return NextResponse.json({
              success: true,
              cached: false,
              steps: data.metadata?.extraction_steps || steps,
              healthDimension: data.metadata?.health_dimension,
              processingDimension: data.metadata?.processing_dimension,
              allergensDimension: data.metadata?.allergens_dimension,
              productId: data.id,
              savedToDb: true,
              totalProcessingTime,
            });
          }
        }
      }
      
      // Normal flow: check for barcode or insert new
      if (productData.barcode) {
        // Check if product with this barcode already exists
        const { data: existingProduct, error: lookupError } = await supabase
          .from('products')
          .select('*')
          .eq('barcode', productData.barcode)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!lookupError && existingProduct) {
          // Product exists - check if we should update it
          console.log('[Test All API] 🔍 Found existing product:', existingProduct.id);
          
          if (shouldUpdateProduct(existingProduct, { metadata: productData.metadata })) {
            // New data is equal or better - update
            console.log('[Test All API] 🔄 Updating product (new data is equal or better quality)');
            
            const { data, error: updateError } = await supabase
              .from('products')
              .update({
                ...productData,
                updated_at: new Date().toISOString(),
                metadata: {
                  ...productData.metadata,
                  previous_completeness_score: calculateCompletenessScore(existingProduct),
                  current_completeness_score: calculateCompletenessScore({ metadata: productData.metadata }),
                  last_update_reason: 'improved_or_equal_quality',
                },
              })
              .eq('id', existingProduct.id)
              .select('id')
              .single();

            if (updateError) {
              console.error('[Test All API] ❌ Database update failed:', updateError);
            } else {
              savedToDb = true;
              finalProductId = data.id;
              console.log('[Test All API] 💾 Updated products:', finalProductId);
            }
          } else {
            // Existing data is better - skip update
            console.log('[Test All API] ⏭️ Skipping update (existing data is better quality)');
            console.log('[Test All API] 📊 Keeping existing product:', existingProduct.id);
            
            savedToDb = true;
            finalProductId = existingProduct.id;
            
            // Return existing data as if it was just scanned
            const totalProcessingTime = Date.now() - startTime;
            return NextResponse.json({
              success: true,
              cached: false,
              skippedUpdate: true,
              reason: 'existing_data_better_quality',
              steps: existingProduct.metadata?.extraction_steps || steps,
              healthDimension: existingProduct.metadata?.health_dimension,
              processingDimension: existingProduct.metadata?.processing_dimension,
              allergensDimension: existingProduct.metadata?.allergens_dimension,
              productId: existingProduct.id,
              savedToDb: true,
              totalProcessingTime,
            });
          }
        } else {
          // Insert new entry
          console.log('[Test All API] ➕ Creating new product entry');
          
          const { data, error: insertError } = await supabase
            .from('products')
            .insert({
              ...productData,
              metadata: {
                ...productData.metadata,
                initial_completeness_score: calculateCompletenessScore({ metadata: productData.metadata }),
              },
            })
            .select('id')
            .single();

          if (insertError) {
            console.error('[Test All API] ❌ Database insert failed:', insertError);
          } else {
            savedToDb = true;
            finalProductId = data.id;
            console.log('[Test All API] 💾 Inserted to products:', finalProductId);
          }
        }
      } else {
        // No barcode - always insert new entry
        console.log('[Test All API] ➕ Creating new product entry (no barcode)');
        
        const { data, error: insertError } = await supabase
          .from('products')
          .insert({
            ...productData,
            metadata: {
              ...productData.metadata,
              initial_completeness_score: calculateCompletenessScore({ metadata: productData.metadata }),
            },
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('[Test All API] ❌ Database insert failed:', insertError);
          console.error('[Test All API] 📋 Failed data:', { name: productData.name, brand: productData.brand, barcode: productData.barcode });
          // Don't set finalProductId - save failed
        } else {
          savedToDb = true;
          finalProductId = data.id;
          console.log('[Test All API] 💾 Inserted to products:', finalProductId);
        }
      }
    } catch (dbError) {
      console.error('[Test All API] ❌ Database error:', dbError);
    }

    // Save to MongoDB cache (only if extraction is COMPLETE)
    // This prevents incomplete data from polluting the cache
    const isCompleteExtraction = 
      productData.barcode &&
      steps.barcode.status === 'success' &&
      steps.packaging.status === 'success' &&
      steps.ingredients.status === 'success' &&
      steps.nutrition.status === 'success';

    if (savedToDb && finalProductId && isCompleteExtraction) {
      try {
        console.log('[Test All API] 💾 Storing in MongoDB cache (complete extraction)...');
        
        // Convert productData to ProductData format for cache
        const cacheProductData: ProductData = {
          id: finalProductId,
          barcode: productData.barcode!,
          name: productData.name || 'Unknown Product',
          brand: productData.brand || 'Unknown Brand',
          size: productData.size || undefined,
          category: productData.category || 'Uncategorized',
          imageUrl: productData.image_url || undefined,
          metadata: {
            ...productData.metadata,
            ingredients: productData.ingredients,
            nutrition_facts: productData.nutrition_facts,
            extraction_source: 'test-all-page',
          },
        };

        // Store by barcode with tier 1 (test extraction) and high confidence
        await cacheService.store(
          productData.barcode!,
          'barcode',
          cacheProductData,
          1, // Tier 1 (direct extraction)
          0.9 // High confidence for test extractions
        );

        console.log('[Test All API] ✅ Stored in MongoDB cache');
      } catch (cacheError) {
        console.error('[Test All API] ⚠️ MongoDB cache storage failed:', cacheError);
        // Don't fail the request if cache storage fails
      }
    } else if (savedToDb && finalProductId && productData.barcode) {
      console.log('[Test All API] ⏭️ Skipping MongoDB cache (incomplete extraction)');
      console.log('[Test All API] 📊 Extraction status:', {
        barcode: steps.barcode.status,
        packaging: steps.packaging.status,
        ingredients: steps.ingredients.status,
        nutrition: steps.nutrition.status,
      });
    }

    const totalProcessingTime = Date.now() - startTime;

    const response: AllExtractionResponse = {
      success: true,
      steps,
      healthDimension,
      processingDimension,
      allergensDimension,
      productId: finalProductId,
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
