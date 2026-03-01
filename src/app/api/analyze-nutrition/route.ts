/**
 * POST /api/analyze-nutrition
 * 
 * Analyzes a nutrition label image and returns health assessment.
 * Supports Server-Sent Events for progress tracking.
 * 
 * Requirements: 2.1-2.10, 3.1-3.8, 4.1-4.12, 5.5, 6.1-6.6, 8.1-8.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { NutritionOrchestrator } from '@/lib/orchestrator/NutritionOrchestrator';
import { NutritionParser } from '@/lib/services/nutrition-parser';
import { IngredientParser } from '@/lib/services/ingredient-parser';
import { HealthScorer } from '@/lib/services/health-scorer';
import { nutritionCacheRepository } from '@/lib/mongodb/nutrition-cache';
import { scanHistoryRepository } from '@/lib/mongodb/scan-history';
import { hashImage } from '@/lib/imageHash';

/**
 * Rate limiting configuration
 * Requirements: 9.6, 9.7
 */
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const FREE_TIER_MAX_REQUESTS = 5; // 5 requests per minute for free tier
const PREMIUM_TIER_MAX_REQUESTS = 20; // 20 requests per minute for premium tier
const rateLimitStore = new Map<string, number[]>();

/**
 * Check if request should be rate limited
 */
function isRateLimited(ip: string, tier: 'free' | 'premium' = 'free'): boolean {
  const now = Date.now();
  const timestamps = rateLimitStore.get(ip) || [];
  
  const validTimestamps = timestamps.filter(
    timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS
  );
  
  const maxRequests = tier === 'premium' ? PREMIUM_TIER_MAX_REQUESTS : FREE_TIER_MAX_REQUESTS;
  if (validTimestamps.length >= maxRequests) {
    return true;
  }
  
  validTimestamps.push(now);
  rateLimitStore.set(ip, validTimestamps);
  
  return false;
}

/**
 * Get client IP address from request
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  return '127.0.0.1';
}

/**
 * Validate request body
 * 
 * Requirements: 8.1, 8.5
 */
function validateRequest(body: any): { valid: boolean; error?: string } {
  // Check required fields
  if (!body.imageData) {
    return { valid: false, error: 'Missing imageData field' };
  }
  
  if (!body.userId) {
    return { valid: false, error: 'Missing userId field' };
  }
  
  if (!body.tier) {
    return { valid: false, error: 'Missing tier field' };
  }
  
  // Validate imageData format
  if (typeof body.imageData !== 'string') {
    return { valid: false, error: 'imageData must be a string' };
  }
  
  if (!body.imageData.startsWith('data:image/')) {
    return { valid: false, error: 'imageData must be a valid data URI (data:image/...)' };
  }
  
  // Validate tier
  if (body.tier !== 'free' && body.tier !== 'premium') {
    return { valid: false, error: 'tier must be "free" or "premium"' };
  }
  
  // Check image size
  const base64Data = body.imageData.split(',')[1] || '';
  const sizeInBytes = (base64Data.length * 3) / 4;
  const sizeInMB = sizeInBytes / (1024 * 1024);
  
  if (sizeInMB > 10) {
    return { valid: false, error: 'Image too large (max 10MB)' };
  }
  
  return { valid: true };
}

/**
 * POST /api/analyze-nutrition
 * 
 * Analyzes a nutrition label image and returns health assessment.
 * 
 * Request body:
 * {
 *   imageData: string; // base64 encoded image with data URI prefix
 *   userId: string; // authenticated user ID
 *   tier: 'free' | 'premium'; // user subscription tier
 * }
 * 
 * Response:
 * {
 *   success: boolean;
 *   data?: NutritionScanResult;
 *   error?: {
 *     code: string;
 *     category: string;
 *     message: string;
 *     recoverable: boolean;
 *     suggestedAction?: string;
 *   };
 * }
 * 
 * Status codes:
 * - 200: Success
 * - 400: Invalid request
 * - 413: Image too large
 * - 429: Rate limit exceeded
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  console.log('[Analyze Nutrition API] 🥗 Received nutrition analysis request');
  
  try {
    // Step 1: Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      console.error('[Analyze Nutrition API] ❌ Invalid JSON:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_JSON',
            category: 'validation',
            message: 'Invalid JSON in request body',
            recoverable: false
          }
        },
        { status: 400 }
      );
    }
    
    const { imageData, userId, tier } = body;
    
    // Step 2: Rate limiting
    const clientIP = getClientIP(request);
    
    if (isRateLimited(clientIP, tier)) {
      console.warn('[Analyze Nutrition API] ⚠️  Rate limit exceeded:', {
        ip: clientIP,
        userId,
        tier,
        timestamp: new Date().toISOString(),
      });
      
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            category: 'system',
            message: 'Rate limit exceeded. Please try again later.',
            recoverable: true,
            suggestedAction: 'Wait a moment and try again'
          }
        },
        { status: 429 }
      );
    }
    
    // Step 3: Validate request
    const validation = validateRequest(body);
    if (!validation.valid) {
      console.error('[Analyze Nutrition API] ❌ Validation failed:', validation.error);
      
      const statusCode = validation.error?.includes('too large') ? 413 : 400;
      
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            category: 'validation',
            message: validation.error,
            recoverable: false
          }
        },
        { status: statusCode }
      );
    }
    
    // Step 4: Process nutrition scan
    console.log('[Analyze Nutrition API] 🔍 Processing nutrition scan:', {
      userId,
      tier,
      timestamp: new Date().toISOString(),
    });
    
    // Initialize services
    const nutritionParser = new NutritionParser();
    const ingredientParser = new IngredientParser();
    const healthScorer = new HealthScorer();
    
    // Initialize orchestrator with cache repository
    const orchestrator = new NutritionOrchestrator(
      nutritionParser,
      ingredientParser,
      healthScorer,
      nutritionCacheRepository
    );
    
    // Process scan (no progress emitter for now, will add SSE support later)
    const result = await orchestrator.processScan({
      imageData,
      userId,
      tier
    });
    
    const duration = Date.now() - startTime;
    
    console.log('[Analyze Nutrition API] ✅ Analysis complete:', {
      userId,
      fromCache: result.fromCache,
      healthScore: result.healthScore.overall,
      duration,
      timestamp: new Date().toISOString(),
    });
    
    // Step 5: Store/update product in Supabase with nutrition data
    try {
      const { getSupabaseServerClient } = await import('@/lib/supabase/server-client');
      const supabase = getSupabaseServerClient();
      
      // Try to find existing product by name (fuzzy match)
      // or create a new one
      const productName = result.productName || 'Unknown Product';
      
      // Prepare nutrition data for Supabase
      const nutritionData = {
        servingSize: {
          amount: result.nutritionalFacts.servingSize.amount,
          unit: result.nutritionalFacts.servingSize.unit,
        },
        calories: result.nutritionalFacts.calories.value,
        macros: {
          fat: result.nutritionalFacts.totalFat.value,
          saturatedFat: result.nutritionalFacts.saturatedFat.value,
          transFat: result.nutritionalFacts.transFat.value,
          carbs: result.nutritionalFacts.totalCarbohydrates.value,
          fiber: result.nutritionalFacts.dietaryFiber.value,
          sugars: result.nutritionalFacts.totalSugars.value,
          protein: result.nutritionalFacts.protein.value,
        },
        sodium: result.nutritionalFacts.sodium.value,
        lastUpdated: new Date().toISOString(),
      };
      
      // Deduplicate allergen types
      const allergenTypes = Array.from(new Set(
        result.ingredients.allergens.map((a: any) => 
          a.allergenType?.replace('_', ' ') || 'unknown'
        )
      ));
      
      // Check if product exists
      const { data: existingProducts } = await (supabase
        .from('products') as any)
        .select('id, name')
        .ilike('name', `%${productName}%`)
        .limit(1);
      
      if (existingProducts && existingProducts.length > 0) {
        // Update existing product
        const productId = existingProducts[0].id;
        
        await (supabase.from('products') as any)
          .update({
            nutrition_data: nutritionData,
            health_score: result.healthScore.overall,
            has_allergens: allergenTypes.length > 0,
            allergen_types: allergenTypes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', productId);
        
        console.log('[Analyze Nutrition API] ✅ Updated existing product in Supabase:', productId);
      } else {
        // Create new product
        const { data: newProduct } = await (supabase.from('products') as any)
          .insert({
            name: productName,
            brand: 'Unknown', // We don't extract brand from nutrition labels
            category: 'Food', // Default category
            nutrition_data: nutritionData,
            health_score: result.healthScore.overall,
            has_allergens: allergenTypes.length > 0,
            allergen_types: allergenTypes,
          })
          .select('id')
          .single();
        
        console.log('[Analyze Nutrition API] ✅ Created new product in Supabase:', newProduct?.id);
      }
    } catch (supabaseError) {
      // Don't fail the request if Supabase update fails
      console.error('[Analyze Nutrition API] ⚠️  Failed to update Supabase:', supabaseError);
    }
    
    // Step 6: Store scan in history
    try {
      const imageHash = await hashImage(imageData);
      
      await scanHistoryRepository.addScan({
        userId,
        sessionId: body.sessionId || `session-${Date.now()}`,
        scanType: 'nutrition',
        timestamp: new Date(),
        productName: result.productName,
        imageHash,
        nutritionData: {
          healthScore: result.healthScore.overall,
          category: result.healthScore.category,
          hasAllergens: result.ingredients.allergens.length > 0,
          allergenTypes: result.ingredients.allergens.map((a: any) => a.allergenType || 'unknown'),
        },
        tier,
        cached: result.fromCache,
        processingTimeMs: duration,
      });
      
      console.log('[Analyze Nutrition API] ✅ Scan stored in history');
    } catch (historyError) {
      // Don't fail the request if history storage fails
      console.error('[Analyze Nutrition API] ⚠️  Failed to store scan history:', historyError);
    }
    
    // Step 7: Return result
    return NextResponse.json(
      {
        success: true,
        data: result
      },
      { status: 200 }
    );
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error('[Analyze Nutrition API] ❌ Analysis failed:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration,
      timestamp: new Date().toISOString(),
    });
    
    // Parse error details if available
    const errorCode = (error as any).code || 'UNKNOWN_ERROR';
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze nutrition label. Please try again.';
    
    // Determine error category and suggested action
    let category = 'system';
    let suggestedAction = 'Try again';
    let recoverable = true;
    
    if (errorCode === 'OCR_FAILED') {
      category = 'ocr';
      suggestedAction = 'Please ensure the label is clearly visible and well-lit, then try again';
    } else if (errorCode === 'IMAGE_HASH_FAILED') {
      category = 'image_quality';
      suggestedAction = 'Please ensure the image is valid and try again';
    } else if (errorCode === 'SCORING_FAILED') {
      category = 'system';
      suggestedAction = 'Please try again';
    }
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: errorCode,
          category,
          message: errorMessage,
          recoverable,
          suggestedAction
        }
      },
      { status: 500 }
    );
  }
}
