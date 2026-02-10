/**
 * ScanOrchestrator
 * 
 * Main orchestration service for the cache-first scan flow.
 * Coordinates operations across MongoDB cache, Supabase repositories,
 * and the Research Agent to process product scans efficiently.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 9.6, 10.4, 10.5
 */

import { ProductRepository } from '../supabase/repositories/ProductRepository';
import { StoreRepository } from '../supabase/repositories/StoreRepository';
import { InventoryRepository } from '../supabase/repositories/InventoryRepository';
import { MongoDBCacheRepository } from '../mongodb/cache';
import { withRetry } from './errors';
import type { 
  ScanRequest, 
  ScanResult, 
  OrchestratorError,
  ErrorSource 
} from './types';
import type { Coordinates } from '../supabase/types';
import type { CachedInsight } from '../mongodb/types';
import type { AnalysisResult } from '@/lib/types';

/**
 * ScanOrchestrator class
 * 
 * Implements the cache-first scan flow with multi-database coordination.
 * Handles cache hits, cache misses, location processing, and error recovery.
 * 
 * Requirements:
 * - 5.1: Check MongoDB for existing AI insights before triggering Research Agent
 * - 5.2: Update last_scanned_at timestamp in Supabase on cache hit
 * - 5.3: Return cached insight without triggering Research Agent on cache hit
 * - 5.4: Trigger Research Agent when cache miss occurs
 * - 5.5: Save insight to MongoDB after Research Agent completes
 * - 5.6: Save or update product metadata in Supabase after Research Agent completes
 * - 5.7: Ensure atomic operations when updating both databases
 * - 9.6: Find or create store near coordinates with 100m threshold
 * - 10.4: Implement retry logic with exponential backoff for transient failures
 * - 10.5: Log all database errors with sufficient context for debugging
 */
export class ScanOrchestrator {
  constructor(
    private productRepo: ProductRepository,
    private storeRepo: StoreRepository,
    private inventoryRepo: InventoryRepository,
    private cacheRepo: MongoDBCacheRepository
  ) {}

  /**
   * Main scan orchestration method
   * 
   * Implements cache-first logic with multi-database coordination:
   * 1. Check MongoDB cache for existing insight
   * 2. If cache hit: update Supabase, return cached insight
   * 3. If cache miss: call Research Agent, save to both databases
   * 4. If location provided: find/create store, record inventory
   * 
   * Requirements:
   * - 5.1: Cache-first architecture
   * - 5.2, 5.3: Cache hit behavior
   * - 5.4, 5.5, 5.6: Cache miss behavior
   * - 9.6: Location processing
   * - 10.4, 10.5: Error handling and retry logic
   * 
   * @param request - Scan request with barcode, image, user, location, tier
   * @returns Promise resolving to scan result with analysis and metadata
   * 
   * @example
   * ```typescript
   * const orchestrator = new ScanOrchestrator(
   *   productRepo,
   *   storeRepo,
   *   inventoryRepo,
   *   cacheRepo
   * );
   * 
   * const result = await orchestrator.processScan({
   *   barcode: '012345678901',
   *   imageData: 'data:image/jpeg;base64,...',
   *   userId: 'user-123',
   *   location: { latitude: 37.7749, longitude: -122.4194 },
   *   tier: 'premium'
   * });
   * 
   * console.log('From cache:', result.fromCache);
   * console.log('Product:', result.product.name);
   * ```
   */
  async processScan(request: ScanRequest): Promise<ScanResult> {
    const startTime = Date.now();
    
    console.log('[ScanOrchestrator] Processing scan:', {
      barcode: request.barcode,
      userId: request.userId,
      hasLocation: !!request.location,
      tier: request.tier,
      dimension: request.dimension,
      timestamp: new Date().toISOString(),
    });

    try {
      // Step 1: Check MongoDB cache for existing insight
      // Requirement 5.1: Query MongoDB AI_Cache for existing insights
      let cachedInsight: CachedInsight | null = null;
      
      try {
        cachedInsight = await withRetry(
          async () => await this.cacheRepo.get(request.barcode),
          3,
          1000
        );
      } catch (error) {
        // Log cache error but continue with cache miss flow
        // Requirement 10.5: Log all database errors with context
        console.error('[ScanOrchestrator] MongoDB cache error (continuing as cache miss):', {
          barcode: request.barcode,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
      }

      // Step 2: Handle cache hit or cache miss
      let result: ScanResult;
      
      if (cachedInsight) {
        console.log('[ScanOrchestrator] Cache hit:', {
          barcode: request.barcode,
          productName: cachedInsight.productName,
          scanCount: cachedInsight.scanCount,
          cacheAge: Date.now() - cachedInsight.createdAt.getTime(),
        });
        
        // Requirement 5.2, 5.3: Handle cache hit
        result = await this.handleCacheHit(request.barcode, cachedInsight, request);
      } else {
        console.log('[ScanOrchestrator] Cache miss:', {
          barcode: request.barcode,
        });
        
        // Requirement 5.4, 5.5, 5.6: Handle cache miss
        result = await this.handleCacheMiss(request);
      }

      // Step 3: Process location if provided
      // Requirement 9.6: Find or create store, record inventory
      if (request.location && result.product.id) {
        try {
          const storeId = await this.processLocation(
            result.product.id,
            request.location
          );
          result.storeId = storeId;
        } catch (error) {
          // Log location processing error but don't fail the scan
          // Requirement 10.5: Log all database errors with context
          console.error('[ScanOrchestrator] Location processing error (continuing without location):', {
            barcode: request.barcode,
            productId: result.product.id,
            location: request.location,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          });
        }
      }

      const duration = Date.now() - startTime;
      console.log('[ScanOrchestrator] Scan complete:', {
        barcode: request.barcode,
        fromCache: result.fromCache,
        hasStore: !!result.storeId,
        duration,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      // Requirement 10.5: Log all errors with context
      console.error('[ScanOrchestrator] Scan failed:', {
        barcode: request.barcode,
        userId: request.userId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });

      // Re-throw OrchestratorError as-is, wrap other errors
      if (this.isOrchestratorError(error)) {
        throw error;
      }

      throw this.createError(
        'SCAN_FAILED',
        `Failed to process scan: ${error instanceof Error ? error.message : String(error)}`,
        'mongodb', // Default to mongodb as source
        false,
        {
          barcode: request.barcode,
          userId: request.userId,
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Handle cache hit scenario
   * 
   * When a cached insight exists:
   * 1. Update last_scanned_at timestamp in Supabase
   * 2. Increment scan count in MongoDB
   * 3. Return cached insight without calling Research Agent
   * 
   * Requirements:
   * - 5.2: Update last_scanned_at timestamp in Supabase on cache hit
   * - 5.3: Return cached insight without triggering Research Agent
   * - 10.4: Use retry logic for database operations
   * 
   * @param barcode - Product barcode
   * @param cachedInsight - Cached insight from MongoDB
   * @param request - Original scan request
   * @returns Promise resolving to scan result with cached data
   */
  private async handleCacheHit(
    barcode: string,
    cachedInsight: CachedInsight,
    request: ScanRequest
  ): Promise<ScanResult> {
    console.log('[ScanOrchestrator] Handling cache hit:', {
      barcode,
      productName: cachedInsight.productName,
    });

    // Step 1: Update last_scanned_at in Supabase
    // Requirement 5.2: Update last_scanned_at timestamp on cache hit
    try {
      await withRetry(
        async () => await this.productRepo.updateLastScanned(barcode),
        3,
        1000
      );
    } catch (error) {
      // Log error but continue - cache hit is still valid
      // Requirement 10.5: Log all database errors with context
      console.error('[ScanOrchestrator] Failed to update last_scanned_at (continuing):', {
        barcode,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }

    // Step 2: Increment scan count in MongoDB
    try {
      await this.cacheRepo.incrementScanCount(barcode);
    } catch (error) {
      // Log error but continue - non-critical operation
      console.error('[ScanOrchestrator] Failed to increment scan count (continuing):', {
        barcode,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }

    // Step 3: Get product from Supabase for metadata
    let product;
    try {
      product = await withRetry(
        async () => await this.productRepo.findByBarcode(barcode),
        3,
        1000
      );
    } catch (error) {
      // If we can't get product from Supabase, create a minimal product object
      console.error('[ScanOrchestrator] Failed to get product from Supabase (using cached data):', {
        barcode,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      
      // Create minimal product object from cached data
      product = {
        id: '', // Will be empty but scan can continue
        barcode,
        name: cachedInsight.productName,
        brand: null,
        last_scanned_at: new Date().toISOString(),
        created_at: cachedInsight.createdAt.toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    // If product doesn't exist in Supabase, create it
    if (!product) {
      try {
        product = await withRetry(
          async () => await this.productRepo.upsert({
            barcode,
            name: cachedInsight.productName,
          }),
          3,
          1000
        );
      } catch (error) {
        // If we can't create product, use minimal object
        console.error('[ScanOrchestrator] Failed to create product in Supabase (using cached data):', {
          barcode,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
        
        product = {
          id: '',
          barcode,
          name: cachedInsight.productName,
          brand: null,
          last_scanned_at: new Date().toISOString(),
          created_at: cachedInsight.createdAt.toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
    }

    // Step 4: Return cached insight
    // Requirement 5.3: Return cached insight without triggering Research Agent
    const analysisResult: AnalysisResult = {
      products: [{
        productName: cachedInsight.productName,
        insights: cachedInsight.insights,
      }],
    };

    return {
      fromCache: true,
      analysis: analysisResult,
      product,
    };
  }

  /**
   * Handle cache miss scenario
   * 
   * When no cached insight exists:
   * 1. Call Research Agent via /api/analyze endpoint
   * 2. Save insight to MongoDB cache
   * 3. Upsert product to Supabase
   * 4. Return new insight
   * 
   * Requirements:
   * - 5.4: Trigger Research Agent when cache miss occurs
   * - 5.5: Save insight to MongoDB after Research Agent completes
   * - 5.6: Save or update product metadata in Supabase
   * - 10.4: Use retry logic for database operations
   * 
   * @param request - Original scan request
   * @returns Promise resolving to scan result with new analysis
   */
  private async handleCacheMiss(request: ScanRequest): Promise<ScanResult> {
    console.log('[ScanOrchestrator] Handling cache miss:', {
      barcode: request.barcode,
      tier: request.tier,
      dimension: request.dimension,
    });

    // Step 1: Call Research Agent via /api/analyze endpoint
    // Requirement 5.4: Trigger Research Agent when cache miss occurs
    let analysisResult: AnalysisResult;
    
    try {
      // Make internal API call to /api/analyze
      const analyzeResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: request.imageData,
          tier: request.tier,
          dimension: request.dimension,
        }),
      });

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json().catch(() => ({}));
        throw new Error(
          `Research Agent failed: ${analyzeResponse.status} ${analyzeResponse.statusText} - ${errorData.error || 'Unknown error'}`
        );
      }

      const analyzeData = await analyzeResponse.json();
      
      if (!analyzeData.success || !analyzeData.data) {
        throw new Error('Research Agent returned invalid response');
      }

      analysisResult = analyzeData.data;
      
      console.log('[ScanOrchestrator] Research Agent completed:', {
        barcode: request.barcode,
        productCount: analysisResult.products.length,
        productName: analysisResult.products[0]?.productName,
      });
    } catch (error) {
      // Requirement 10.5: Log all errors with context
      console.error('[ScanOrchestrator] Research Agent failed:', {
        barcode: request.barcode,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });

      throw this.createError(
        'RESEARCH_AGENT_FAILED',
        `Research Agent failed: ${error instanceof Error ? error.message : String(error)}`,
        'research-agent',
        false,
        {
          barcode: request.barcode,
          tier: request.tier,
          dimension: request.dimension,
        }
      );
    }

    // Step 2: Save insight to MongoDB cache
    // Requirement 5.5: Save insight to MongoDB after Research Agent completes
    // Note: We save the first product from the analysis result
    const firstProduct = analysisResult.products[0];
    if (!firstProduct) {
      throw this.createError(
        'NO_PRODUCTS_FOUND',
        'Research Agent returned no products',
        'research-agent',
        false,
        { barcode: request.barcode }
      );
    }

    try {
      await withRetry(
        async () => await this.cacheRepo.set(
          request.barcode,
          firstProduct.productName,
          firstProduct.insights,
          30 // 30 days TTL
        ),
        3,
        1000
      );
      
      console.log('[ScanOrchestrator] Saved insight to MongoDB cache:', {
        barcode: request.barcode,
        productName: firstProduct.productName,
      });
    } catch (error) {
      // Log error but continue - cache save failure shouldn't fail the scan
      // Requirement 10.5: Log all database errors with context
      console.error('[ScanOrchestrator] Failed to save insight to cache (continuing):', {
        barcode: request.barcode,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }

    // Step 3: Upsert product to Supabase
    // Requirement 5.6: Save or update product metadata in Supabase
    let product;
    try {
      product = await withRetry(
        async () => await this.productRepo.upsert({
          barcode: request.barcode,
          name: firstProduct.productName,
          // Extract brand from product name if possible (simple heuristic)
          brand: this.extractBrand(firstProduct.productName),
        }),
        3,
        1000
      );
      
      console.log('[ScanOrchestrator] Saved product to Supabase:', {
        barcode: request.barcode,
        productId: product.id,
        productName: product.name,
      });
    } catch (error) {
      // Requirement 10.5: Log all database errors with context
      console.error('[ScanOrchestrator] Failed to save product to Supabase:', {
        barcode: request.barcode,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });

      throw this.createError(
        'PRODUCT_SAVE_FAILED',
        `Failed to save product to Supabase: ${error instanceof Error ? error.message : String(error)}`,
        'supabase',
        true,
        {
          barcode: request.barcode,
          productName: firstProduct.productName,
        }
      );
    }

    // Step 4: Return new insight
    return {
      fromCache: false,
      analysis: analysisResult,
      product,
    };
  }

  /**
   * Process location and update inventory
   * 
   * When location is provided:
   * 1. Find or create store near coordinates (100m threshold)
   * 2. Record product sighting at store
   * 3. Return store ID
   * 
   * Requirement 9.6: Find or create store near coordinates with 100m threshold
   * 
   * @param productId - UUID of the product
   * @param location - User's coordinates
   * @returns Promise resolving to store ID
   */
  private async processLocation(
    productId: string,
    location: Coordinates
  ): Promise<string | undefined> {
    console.log('[ScanOrchestrator] Processing location:', {
      productId,
      latitude: location.latitude,
      longitude: location.longitude,
    });

    try {
      // Step 1: Find or create store near coordinates
      // Requirement 9.6: Find or create store with 100m threshold
      const store = await withRetry(
        async () => await this.storeRepo.findOrCreateNearby(
          location.latitude,
          location.longitude,
          'Unknown Store', // Default name - could be enhanced with reverse geocoding
          `${location.latitude}, ${location.longitude}` // Default address
        ),
        3,
        1000
      );

      console.log('[ScanOrchestrator] Found/created store:', {
        storeId: store.id,
        storeName: store.name,
      });

      // Step 2: Record product sighting at store
      await withRetry(
        async () => await this.inventoryRepo.recordSighting(productId, store.id),
        3,
        1000
      );

      console.log('[ScanOrchestrator] Recorded inventory sighting:', {
        productId,
        storeId: store.id,
      });

      return store.id;
    } catch (error) {
      // Requirement 10.5: Log all database errors with context
      console.error('[ScanOrchestrator] Location processing failed:', {
        productId,
        location,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });

      // Re-throw to be caught by caller
      throw error;
    }
  }

  /**
   * Extract brand from product name
   * 
   * Simple heuristic to extract brand from product name.
   * This is a basic implementation that could be enhanced with
   * more sophisticated NLP or a brand database.
   * 
   * @param productName - Full product name
   * @returns Extracted brand or null
   */
  private extractBrand(productName: string): string | null {
    // Simple heuristic: first word is often the brand
    // This could be enhanced with a brand database or NLP
    const words = productName.trim().split(/\s+/);
    if (words.length > 0) {
      return words[0];
    }
    return null;
  }

  /**
   * Create a consistent error object
   * 
   * Helper method to create OrchestratorError objects with consistent structure.
   * 
   * Requirement 7.5: Handle errors consistently
   * 
   * @param code - Error code for identification
   * @param message - Human-readable error message
   * @param source - Source system where error occurred
   * @param recoverable - Whether the error is recoverable (transient)
   * @param context - Additional context for debugging
   * @returns OrchestratorError object
   */
  private createError(
    code: string,
    message: string,
    source: ErrorSource,
    recoverable: boolean,
    context?: Record<string, unknown>
  ): OrchestratorError {
    return {
      code,
      message,
      source,
      recoverable,
      context,
    };
  }

  /**
   * Type guard to check if an error is an OrchestratorError
   * 
   * @param error - Error to check
   * @returns True if error is an OrchestratorError
   */
  private isOrchestratorError(error: unknown): error is OrchestratorError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'message' in error &&
      'source' in error &&
      'recoverable' in error
    );
  }
}

/**
 * Create a singleton instance of ScanOrchestrator
 * 
 * This provides a convenient way to access the orchestrator without
 * creating new instances everywhere.
 * 
 * @example
 * ```typescript
 * import { scanOrchestrator } from '@/lib/orchestrator/ScanOrchestrator';
 * 
 * const result = await scanOrchestrator.processScan({
 *   barcode: '012345678901',
 *   imageData: 'data:image/jpeg;base64,...',
 *   userId: 'user-123',
 *   tier: 'premium'
 * });
 * ```
 */
export const scanOrchestrator = new ScanOrchestrator(
  // Import singleton instances from repositories
  require('../supabase/repositories/ProductRepository').productRepository,
  require('../supabase/repositories/StoreRepository').storeRepository,
  require('../supabase/repositories/InventoryRepository').inventoryRepository,
  require('../mongodb/cache').cacheRepository
);

// Export class for testing
export default ScanOrchestrator;
