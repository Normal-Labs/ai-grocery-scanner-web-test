/**
 * NutritionOrchestrator
 * 
 * Orchestration service for the cache-first nutrition analysis flow.
 * Coordinates operations across MongoDB cache, nutrition parsing services,
 * and health scoring to process nutrition label scans efficiently.
 * 
 * Requirements: 2.1-2.10, 3.1-3.8, 4.1-4.12, 5.5, 6.1-6.6, 8.1-8.5
 */

import { NutritionParser, NutritionalFacts } from '../services/nutrition-parser';
import { IngredientParser, IngredientList } from '../services/ingredient-parser';
import { HealthScorer, HealthScore } from '../services/health-scorer';
import { withRetry } from './errors';
import { hashImage } from '../imageHash';
import type { IProgressEmitter } from '../progress/ProgressEmitter';

/**
 * Nutrition scan request interface
 * 
 * Contains all information needed to process a nutrition label scan
 */
export interface NutritionScanRequest {
  /** Base64-encoded image data with data URI prefix */
  imageData: string;
  
  /** Authenticated user ID from Supabase Auth */
  userId: string;
  
  /** User's subscription tier (free or premium) */
  tier: 'free' | 'premium';
  
  /** Optional image hash (will be generated if not provided) */
  imageHash?: string;
}

/**
 * Nutrition scan result interface
 * 
 * Contains the complete analysis results with cache status
 */
export interface NutritionScanResult {
  /** Whether the result came from MongoDB cache (true) or fresh analysis (false) */
  fromCache: boolean;
  
  /** Extracted nutritional facts with confidence scores */
  nutritionalFacts: NutritionalFacts;
  
  /** Parsed ingredient list with flagged items */
  ingredients: IngredientList;
  
  /** Calculated health score with breakdown and explanation */
  healthScore: HealthScore;
  
  /** Optional product name extracted from label */
  productName?: string;
  
  /** Timestamp of the scan */
  timestamp: Date;
}

/**
 * Cached nutrition data interface
 * 
 * Structure for storing nutrition analysis in MongoDB cache
 */
interface CachedNutritionData {
  imageHash: string;
  productName?: string;
  nutritionalFacts: NutritionalFacts;
  ingredients: IngredientList;
  healthScore: HealthScore;
  tier: 'free' | 'premium';
  createdAt: Date;
  lastAccessedAt: Date;
  accessCount: number;
  expiresAt: Date;
}

/**
 * Nutrition scan stages for progress tracking
 */
export enum NutritionScanStage {
  CLASSIFICATION = 'classification',
  CACHE_CHECK = 'cache_check',
  OCR_PROCESSING = 'ocr_processing',
  NUTRITION_PARSING = 'nutrition_parsing',
  INGREDIENT_PARSING = 'ingredient_parsing',
  HEALTH_SCORING = 'health_scoring',
  COMPLETE = 'complete',
}

/**
 * Stage messages for user-friendly progress updates
 */
export const NUTRITION_STAGE_MESSAGES: Record<NutritionScanStage, string> = {
  [NutritionScanStage.CLASSIFICATION]: 'Classifying image type...',
  [NutritionScanStage.CACHE_CHECK]: 'Checking for cached nutrition data...',
  [NutritionScanStage.OCR_PROCESSING]: 'Extracting text from label...',
  [NutritionScanStage.NUTRITION_PARSING]: 'Parsing nutritional facts...',
  [NutritionScanStage.INGREDIENT_PARSING]: 'Analyzing ingredients...',
  [NutritionScanStage.HEALTH_SCORING]: 'Calculating health score...',
  [NutritionScanStage.COMPLETE]: 'Analysis complete!',
};

/**
 * NutritionOrchestrator class
 * 
 * Implements the cache-first nutrition analysis flow with parallel parsing.
 * Handles cache hits, cache misses, progress tracking, and error recovery.
 * 
 * Requirements:
 * - 6.1: Check MongoDB for cached nutrition data before triggering OCR
 * - 6.2: Update last_accessed_at timestamp in MongoDB on cache hit
 * - 6.6: Return cached data without triggering OCR on cache hit
 * - 2.1-2.10: Parse nutritional facts from labels
 * - 3.1-3.8: Parse ingredient lists with allergen detection
 * - 4.1-4.12: Calculate health scores
 * - 6.1-6.4: Store complete result in MongoDB cache with 30-day TTL
 * - 5.5: Emit progress events for real-time UI updates
 * - 8.1-8.5: Handle errors with user-friendly messages and retry logic
 */
export class NutritionOrchestrator {
  private readonly CACHE_TTL_DAYS = 30; // Requirement 6.6
  private readonly MAX_RETRIES = 3; // Requirement 8.1
  private readonly RETRY_DELAY_MS = 1000; // Requirement 8.1

  constructor(
    private nutritionParser: NutritionParser,
    private ingredientParser: IngredientParser,
    private healthScorer: HealthScorer,
    private cacheRepo?: NutritionCacheRepository
  ) {}

  /**
   * Main nutrition scan orchestration method
   * 
   * Implements cache-first logic with parallel parsing:
   * 1. Generate image hash for cache lookup
   * 2. Check MongoDB cache for existing nutrition data
   * 3. If cache hit: return cached data, update access timestamp
   * 4. If cache miss: parse nutrition + ingredients in parallel, calculate score, cache result
   * 5. Emit progress events throughout the process
   * 
   * Requirements:
   * - 6.1, 6.2, 6.6: Cache-first architecture
   * - 2.1-2.10, 3.1-3.8, 4.1-4.12: Parallel parsing and scoring
   * - 6.1-6.4: Cache storage with TTL
   * - 5.5: Progress event emission
   * - 8.1-8.5: Error handling and retry logic
   * 
   * @param request - Nutrition scan request with image and user info
   * @param progressEmitter - Optional progress emitter for real-time updates
   * @returns Promise resolving to nutrition scan result
   */
  async processScan(
    request: NutritionScanRequest,
    progressEmitter?: IProgressEmitter
  ): Promise<NutritionScanResult> {
    const startTime = Date.now();
    
    console.log('[NutritionOrchestrator] Processing nutrition scan:', {
      userId: request.userId,
      tier: request.tier,
      timestamp: new Date().toISOString(),
    });

    try {
      // Step 1: Generate image hash for cache lookup
      // Requirement 6.1: Generate image hash for cache lookup
      progressEmitter?.emit(
        NutritionScanStage.CACHE_CHECK,
        NUTRITION_STAGE_MESSAGES[NutritionScanStage.CACHE_CHECK]
      );
      
      let imageHash: string;
      try {
        imageHash = request.imageHash || await hashImage(request.imageData);
        console.log('[NutritionOrchestrator] ✅ Generated image hash:', imageHash.substring(0, 16) + '...');
      } catch (error) {
        // Requirement 8.1: Handle image hash generation errors
        console.error('[NutritionOrchestrator] ❌ Failed to generate image hash:', error);
        throw this.createError(
          'IMAGE_HASH_FAILED',
          'Failed to process image. Please ensure the image is valid.',
          error
        );
      }

      // Step 2: Check MongoDB cache for existing nutrition data
      // Requirement 6.1: Check MongoDB for cached nutrition data
      let cachedData: CachedNutritionData | null = null;
      
      if (this.cacheRepo) {
        try {
          cachedData = await withRetry(
            async () => await this.cacheRepo!.getNutritionData(imageHash),
            this.MAX_RETRIES,
            this.RETRY_DELAY_MS
          );
          
          if (cachedData) {
            console.log('[NutritionOrchestrator] ✅ Cache hit:', {
              imageHash: imageHash.substring(0, 16) + '...',
              productName: cachedData.productName,
              accessCount: cachedData.accessCount,
              cacheAge: Date.now() - cachedData.createdAt.getTime(),
            });
          } else {
            console.log('[NutritionOrchestrator] ❌ Cache miss');
          }
        } catch (error) {
          // Log cache error but continue with cache miss flow
          // Requirement 8.5: Log all errors with context
          console.error('[NutritionOrchestrator] ❌ MongoDB cache error (continuing as cache miss):', {
            imageHash: imageHash.substring(0, 16) + '...',
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Step 3: Handle cache hit or cache miss
      let result: NutritionScanResult;
      
      if (cachedData) {
        // Requirement 6.2, 6.6: Handle cache hit
        result = await this.handleCacheHit(imageHash, cachedData, progressEmitter);
      } else {
        // Requirements 2.1-2.10, 3.1-3.8, 4.1-4.12, 6.1-6.4: Handle cache miss
        result = await this.handleCacheMiss(request, imageHash, progressEmitter);
      }

      const duration = Date.now() - startTime;
      console.log('[NutritionOrchestrator] Scan complete:', {
        fromCache: result.fromCache,
        healthScore: result.healthScore.overall,
        duration,
        timestamp: new Date().toISOString(),
      });
      
      // Emit final result
      // Requirement 5.5: Emit progress events
      progressEmitter?.emit(
        NutritionScanStage.COMPLETE,
        NUTRITION_STAGE_MESSAGES[NutritionScanStage.COMPLETE]
      );
      progressEmitter?.emitFinalResult(result);
      
      // Summary log
      console.log('═══════════════════════════════════════════════════');
      console.log('📋 NUTRITION SCAN SUMMARY');
      console.log('═══════════════════════════════════════════════════');
      console.log(`Product: ${result.productName || 'Unknown'}`);
      console.log(`Health Score: ${result.healthScore.overall}/100 (${result.healthScore.category})`);
      console.log(`Data Source: ${result.fromCache ? '⚡ MongoDB Cache (Instant)' : '🤖 Fresh OCR Analysis (Gemini Vision)'}`);
      console.log(`Tier: ${request.tier}`);
      console.log(`Duration: ${duration}ms`);
      if (result.fromCache) {
        console.log('💡 This result was retrieved instantly from cache');
      } else {
        console.log('💡 This result was freshly generated and saved to cache');
      }
      console.log('═══════════════════════════════════════════════════');

      return result;
    } catch (error) {
      // Requirement 8.5: Log all errors with context
      console.error('[NutritionOrchestrator] Scan failed:', {
        userId: request.userId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });

      // Emit error event
      if (error instanceof Error) {
        progressEmitter?.emitError(error);
      }

      // Re-throw error with user-friendly message
      throw error;
    }
  }

  /**
   * Handle cache hit scenario
   * 
   * When cached nutrition data exists:
   * 1. Update last_accessed_at timestamp in MongoDB
   * 2. Increment access count in MongoDB
   * 3. Return cached data without triggering OCR
   * 
   * Requirements:
   * - 6.2: Update last_accessed_at timestamp on cache hit
   * - 6.6: Return cached data without triggering OCR
   * 
   * @param imageHash - Image hash for cache lookup
   * @param cachedData - Cached nutrition data from MongoDB
   * @param progressEmitter - Optional progress emitter
   * @returns Promise resolving to nutrition scan result with cached data
   */
  private async handleCacheHit(
    imageHash: string,
    cachedData: CachedNutritionData,
    progressEmitter?: IProgressEmitter
  ): Promise<NutritionScanResult> {
    console.log('[NutritionOrchestrator] Handling cache hit:', {
      imageHash: imageHash.substring(0, 16) + '...',
      productName: cachedData.productName,
    });

    // Step 1: Update last_accessed_at and increment access count in MongoDB
    // Requirement 6.2: Update last_accessed_at timestamp on cache hit
    if (this.cacheRepo) {
      try {
        await this.cacheRepo.updateAccessTimestamp(imageHash);
      } catch (error) {
        // Log error but continue - cache update failure shouldn't fail the scan
        console.error('[NutritionOrchestrator] Failed to update access timestamp (continuing):', {
          imageHash: imageHash.substring(0, 16) + '...',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Step 2: Return cached data
    // Requirement 6.6: Return cached data without triggering OCR
    return {
      fromCache: true,
      nutritionalFacts: cachedData.nutritionalFacts,
      ingredients: cachedData.ingredients,
      healthScore: cachedData.healthScore,
      productName: cachedData.productName,
      timestamp: new Date(),
    };
  }

  /**
   * Handle cache miss scenario
   * 
   * When no cached nutrition data exists:
   * 1. Parse nutritional facts and ingredients in parallel
   * 2. Calculate health score
   * 3. Store complete result in MongoDB cache with 30-day TTL
   * 4. Return new analysis
   * 
   * Requirements:
   * - 2.1-2.10: Parse nutritional facts
   * - 3.1-3.8: Parse ingredient list
   * - 4.1-4.12: Calculate health score
   * - 6.1-6.4: Store in MongoDB cache with TTL
   * - 8.1-8.5: Error handling and retry logic
   * 
   * @param request - Original scan request
   * @param imageHash - Hash of the image for caching
   * @param progressEmitter - Optional progress emitter
   * @returns Promise resolving to nutrition scan result with new analysis
   */
  private async handleCacheMiss(
    request: NutritionScanRequest,
    imageHash: string,
    progressEmitter?: IProgressEmitter
  ): Promise<NutritionScanResult> {
    console.log('[NutritionOrchestrator] Handling cache miss:', {
      imageHash: imageHash.substring(0, 16) + '...',
      tier: request.tier,
    });

    // Step 1: Parse nutritional facts and ingredients in parallel
    // Requirements 2.1-2.10, 3.1-3.8: Parallel parsing
    progressEmitter?.emit(
      NutritionScanStage.OCR_PROCESSING,
      NUTRITION_STAGE_MESSAGES[NutritionScanStage.OCR_PROCESSING]
    );

    let nutritionalFacts: NutritionalFacts;
    let ingredients: IngredientList;

    try {
      // Emit nutrition parsing progress
      progressEmitter?.emit(
        NutritionScanStage.NUTRITION_PARSING,
        NUTRITION_STAGE_MESSAGES[NutritionScanStage.NUTRITION_PARSING]
      );

      // Emit ingredient parsing progress
      progressEmitter?.emit(
        NutritionScanStage.INGREDIENT_PARSING,
        NUTRITION_STAGE_MESSAGES[NutritionScanStage.INGREDIENT_PARSING]
      );

      // Parse nutrition and ingredients in parallel with retry logic
      // Requirement 8.1: Retry logic with exponential backoff for API failures
      [nutritionalFacts, ingredients] = await Promise.all([
        withRetry(
          async () => await this.nutritionParser.parse(request.imageData),
          this.MAX_RETRIES,
          this.RETRY_DELAY_MS
        ),
        withRetry(
          async () => await this.ingredientParser.parse(request.imageData),
          this.MAX_RETRIES,
          this.RETRY_DELAY_MS
        ),
      ]);

      console.log('[NutritionOrchestrator] ✅ Parallel parsing complete:', {
        nutritionStatus: nutritionalFacts.validationStatus,
        ingredientCount: ingredients.ingredients.length,
        allergenCount: ingredients.allergens.length,
      });
    } catch (error) {
      // Requirement 8.2: Handle OCR errors with user-friendly messages
      console.error('[NutritionOrchestrator] ❌ OCR parsing failed:', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });

      throw this.createError(
        'OCR_FAILED',
        'Unable to read the nutrition label. Please ensure the label is clearly visible and well-lit, then try again.',
        error
      );
    }

    // Step 2: Calculate health score
    // Requirements 4.1-4.12: Calculate health score
    progressEmitter?.emit(
      NutritionScanStage.HEALTH_SCORING,
      NUTRITION_STAGE_MESSAGES[NutritionScanStage.HEALTH_SCORING]
    );

    let healthScore: HealthScore;
    try {
      healthScore = this.healthScorer.calculateScore(nutritionalFacts, ingredients);
      
      console.log('[NutritionOrchestrator] ✅ Health score calculated:', {
        overall: healthScore.overall,
        category: healthScore.category,
        factorCount: healthScore.factors.length,
      });
    } catch (error) {
      // Requirement 8.5: Log all errors with context
      console.error('[NutritionOrchestrator] ❌ Health scoring failed:', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });

      throw this.createError(
        'SCORING_FAILED',
        'Unable to calculate health score. Please try again.',
        error
      );
    }

    // Step 3: Validate data consistency
    // Requirement 8.3: Handle validation errors with prompts to verify data
    if (nutritionalFacts.validationStatus === 'invalid') {
      console.warn('[NutritionOrchestrator] ⚠️  Validation failed:', {
        errors: nutritionalFacts.validationErrors,
      });

      // Still return the result but with validation warnings
      // User can review and correct if needed
    }

    // Step 4: Store complete result in MongoDB cache with 30-day TTL
    // Requirements 6.1-6.4: Store in MongoDB cache
    if (this.cacheRepo) {
      try {
        const cachedData: CachedNutritionData = {
          imageHash,
          productName: this.extractProductName(ingredients),
          nutritionalFacts,
          ingredients,
          healthScore,
          tier: request.tier,
          createdAt: new Date(),
          lastAccessedAt: new Date(),
          accessCount: 0,
          expiresAt: new Date(Date.now() + this.CACHE_TTL_DAYS * 24 * 60 * 60 * 1000),
        };

        await withRetry(
          async () => await this.cacheRepo!.setNutritionData(imageHash, cachedData, this.CACHE_TTL_DAYS),
          this.MAX_RETRIES,
          this.RETRY_DELAY_MS
        );

        console.log('[NutritionOrchestrator] ✅ Saved to MongoDB cache:', {
          imageHash: imageHash.substring(0, 16) + '...',
          productName: cachedData.productName,
          ttlDays: this.CACHE_TTL_DAYS,
        });
        console.log('💾 [DATABASE] Saved to MongoDB cache for future instant retrieval');
      } catch (error) {
        // Log error but continue - cache save failure shouldn't fail the scan
        // Requirement 8.5: Log all errors with context
        console.error('[NutritionOrchestrator] ❌ Failed to save to cache (continuing):', {
          imageHash: imageHash.substring(0, 16) + '...',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Step 5: Return new analysis
    return {
      fromCache: false,
      nutritionalFacts,
      ingredients,
      healthScore,
      productName: this.extractProductName(ingredients),
      timestamp: new Date(),
    };
  }

  /**
   * Extract product name from ingredient list
   * 
   * Attempts to extract a product name from the first ingredient or returns undefined.
   * This is a simple heuristic that could be enhanced with more sophisticated NLP.
   * 
   * @param ingredients - Parsed ingredient list
   * @returns Extracted product name or undefined
   */
  private extractProductName(ingredients: IngredientList): string | undefined {
    // Simple heuristic: use first ingredient as product name hint
    // This could be enhanced with actual product name OCR from the label
    if (ingredients.ingredients.length > 0) {
      const firstIngredient = ingredients.ingredients[0].name;
      // Capitalize first letter
      return firstIngredient.charAt(0).toUpperCase() + firstIngredient.slice(1);
    }
    return undefined;
  }

  /**
   * Create a user-friendly error with context
   * 
   * Helper method to create Error objects with consistent structure.
   * 
   * Requirement 8.5: Handle errors consistently
   * 
   * @param code - Error code for identification
   * @param message - User-friendly error message
   * @param originalError - Original error that caused this error
   * @returns Error object with context
   */
  private createError(code: string, message: string, originalError?: unknown): Error {
    const error = new Error(message);
    (error as any).code = code;
    (error as any).originalError = originalError;
    return error;
  }
}

/**
 * Nutrition Cache Repository Interface
 * 
 * Defines the interface for caching nutrition data in MongoDB.
 * This will be implemented in Phase 3.
 */
export interface NutritionCacheRepository {
  /**
   * Get cached nutrition data by image hash
   */
  getNutritionData(imageHash: string): Promise<CachedNutritionData | null>;
  
  /**
   * Set nutrition data in cache with TTL
   */
  setNutritionData(imageHash: string, data: CachedNutritionData, ttlDays: number): Promise<void>;
  
  /**
   * Update access timestamp for cached data
   */
  updateAccessTimestamp(imageHash: string): Promise<void>;
}

// Export class for testing and usage
export default NutritionOrchestrator;
