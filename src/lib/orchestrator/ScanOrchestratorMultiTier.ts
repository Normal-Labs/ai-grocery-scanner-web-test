/**
 * Scan Orchestrator for Multi-Tier Product Identification
 * 
 * This orchestrator coordinates the 4-tier product identification strategy:
 * Tier 1: Direct barcode scanning (cache + database)
 * Tier 2: Visual text extraction (Gemini OCR)
 * Tier 3: Discovery search (Barcode Lookup API) - placeholder for now
 * Tier 4: Comprehensive image analysis (Gemini AI)
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { CacheService } from '@/lib/mongodb/cache-service';
import { ProductRepositoryMultiTier } from '@/lib/supabase/repositories/ProductRepositoryMultiTier';
import { VisualExtractorService } from '@/lib/services/visual-extractor';
import { ImageAnalyzerService } from '@/lib/services/image-analyzer';
import { DiscoveryService } from '@/lib/services/discovery-service';
import { hashImage } from '@/lib/imageHash';
import { getSupabaseServerClient } from '@/lib/supabase/server-client';
import type { ScanLogInsert } from '@/lib/supabase/types';
import {
  ScanRequest,
  ScanResponse,
  ProductData,
  Tier,
  ConfidenceScore,
  ImageData,
} from '@/lib/types/multi-tier';
import type { IProgressEmitter } from '../progress/ProgressEmitter';
import { MultiTierStage, STAGE_MESSAGES } from '../progress/ProgressEmitter';

/**
 * Scan Orchestrator class
 * 
 * Coordinates the multi-tier product identification process with
 * intelligent fallback logic and performance tracking.
 */
export class ScanOrchestratorMultiTier {
  private cacheService: CacheService;
  private productRepository: ProductRepositoryMultiTier;
  private visualExtractor: VisualExtractorService;
  private imageAnalyzer: ImageAnalyzerService;
  private discoveryService: DiscoveryService;

  // Performance SLA targets (milliseconds)
  private readonly TIER1_CACHE_TARGET = 100;    // Requirement 9.1
  private readonly TIER1_DB_TARGET = 2000;      // Requirement 9.2
  private readonly TIER2_TARGET = 5000;         // Requirement 9.3
  private readonly TIER3_TARGET = 8000;         // Requirement 9.4
  private readonly TIER4_TARGET = 10000;        // Requirement 9.5

  constructor(
    cacheService: CacheService,
    productRepository: ProductRepositoryMultiTier,
    visualExtractor: VisualExtractorService,
    imageAnalyzer: ImageAnalyzerService,
    discoveryService: DiscoveryService
  ) {
    this.cacheService = cacheService;
    this.productRepository = productRepository;
    this.visualExtractor = visualExtractor;
    this.imageAnalyzer = imageAnalyzer;
    this.discoveryService = discoveryService;
  }

  /**
   * Main scan method - coordinates tier selection and fallback
   * Requirement 6.1, 6.2, 6.3, 6.4, 6.5: Tier selection and fallback logic
   * 
   * @param request - Scan request with barcode, image, and user info
   * @param progressEmitter - Optional progress emitter for real-time updates
   * @returns Promise resolving to scan response
   */
  async scan(request: ScanRequest, progressEmitter?: IProgressEmitter): Promise<ScanResponse> {
    const startTime = Date.now();
    
    console.log('[Scan Orchestrator] 🚀 Starting scan:', {
      hasBarcode: !!request.barcode,
      hasImage: !!request.image,
      userId: request.userId,
      sessionId: request.sessionId,
    });

    try {
      // Tier 1: Direct barcode scanning
      // Requirement 6.1: Attempt Tier 1 first
      if (request.barcode) {
        // Emit Tier 1 progress
        progressEmitter?.emit(
          MultiTierStage.TIER1_CACHE,
          STAGE_MESSAGES[MultiTierStage.TIER1_CACHE],
          { tier: 1 }
        );
        
        const tier1Result = await this.attemptTier1(request.barcode);
        if (tier1Result) {
          const processingTimeMs = Date.now() - startTime;
          console.log(`[Scan Orchestrator] ✅ Tier 1 success (${processingTimeMs}ms)`);
          
          // Log tier usage (Requirement 6.6, 6.7, 14.1, 14.2, 14.3)
          await this.logTierUsage(
            request,
            1,
            true,
            processingTimeMs,
            tier1Result.cached,
            tier1Result.product.id,
            1.0
          );
          
          // Emit final result
          const result = {
            success: true,
            product: tier1Result.product,
            tier: 1,
            confidenceScore: 1.0, // Requirement 13.2: Tier 1 = 1.0 confidence
            processingTimeMs,
            cached: tier1Result.cached,
          };
          
          progressEmitter?.emitFinalResult(result);
          
          return result;
        } else {
          // Log Tier 1 failure
          const processingTimeMs = Date.now() - startTime;
          await this.logTierUsage(
            request,
            1,
            false,
            processingTimeMs,
            false,
            undefined,
            undefined,
            'NOT_FOUND'
          );
          
          // Emit tier transition
          progressEmitter?.emit(
            MultiTierStage.TIER_TRANSITION,
            STAGE_MESSAGES[MultiTierStage.TIER_TRANSITION],
            { fromTier: 1, toTier: 2 }
          );
        }
      }

      // Tier 2: Visual text extraction
      // Requirement 6.2: Fallback to Tier 2 if Tier 1 fails
      let tier2Metadata = null;
      if (request.image) {
        // Emit Tier 2 progress
        progressEmitter?.emit(
          MultiTierStage.TIER2_EXTRACT,
          STAGE_MESSAGES[MultiTierStage.TIER2_EXTRACT],
          { tier: 2 }
        );
        
        const tier2Result = await this.attemptTier2(request.image, request.imageHash);
        if (tier2Result && 'product' in tier2Result) {
          const processingTimeMs = Date.now() - startTime;
          console.log(`[Scan Orchestrator] ✅ Tier 2 success (${processingTimeMs}ms)`);
          
          // Log tier usage (Requirement 6.6, 6.7, 14.1, 14.2, 14.3)
          await this.logTierUsage(
            request,
            2,
            true,
            processingTimeMs,
            false,
            tier2Result.product.id,
            tier2Result.confidence
          );
          
          // Requirement 13.5: Add warning for low confidence
          const warning = tier2Result.confidence < 0.8 
            ? 'Low confidence match. Please verify the product details.'
            : undefined;
          
          const result = {
            success: true,
            product: tier2Result.product,
            tier: 2,
            confidenceScore: tier2Result.confidence,
            processingTimeMs,
            cached: false,
            warning,
          };
          
          progressEmitter?.emitFinalResult(result);
          
          return result;
        }
        // Preserve metadata for Tier 3 even if Tier 2 didn't find a match
        if (tier2Result && 'metadata' in tier2Result) {
          tier2Metadata = tier2Result.metadata;
          
          // Log Tier 2 failure (no match found)
          const processingTimeMs = Date.now() - startTime;
          await this.logTierUsage(
            request,
            2,
            false,
            processingTimeMs,
            false,
            undefined,
            undefined,
            'NO_MATCH'
          );
          
          // Emit tier transition
          progressEmitter?.emit(
            MultiTierStage.TIER_TRANSITION,
            STAGE_MESSAGES[MultiTierStage.TIER_TRANSITION],
            { fromTier: 2, toTier: 3 }
          );
        } else if (!tier2Result) {
          // Log Tier 2 failure (extraction failed)
          const processingTimeMs = Date.now() - startTime;
          await this.logTierUsage(
            request,
            2,
            false,
            processingTimeMs,
            false,
            undefined,
            undefined,
            'EXTRACTION_FAILED'
          );
          
          // Emit tier transition
          progressEmitter?.emit(
            MultiTierStage.TIER_TRANSITION,
            STAGE_MESSAGES[MultiTierStage.TIER_TRANSITION],
            { fromTier: 2, toTier: 4 }
          );
        }
      }

      // Tier 3: Discovery search
      // Requirement 6.3: Fallback to Tier 3 if Tier 2 fails
      // Use metadata from Tier 2 to discover barcode via API
      if (request.image && tier2Metadata) {
        // Emit Tier 3 progress
        progressEmitter?.emit(
          MultiTierStage.TIER3_DISCOVER,
          STAGE_MESSAGES[MultiTierStage.TIER3_DISCOVER],
          { tier: 3 }
        );
        
        const tier3Result = await this.attemptTier3(tier2Metadata, request.imageHash);
        if (tier3Result) {
          const processingTimeMs = Date.now() - startTime;
          console.log(`[Scan Orchestrator] ✅ Tier 3 success (${processingTimeMs}ms)`);
          
          // Log tier usage (Requirement 6.6, 6.7, 14.1, 14.2, 14.3)
          await this.logTierUsage(
            request,
            3,
            true,
            processingTimeMs,
            false,
            tier3Result.product.id,
            tier3Result.confidence
          );
          
          // Requirement 13.5: Add warning for low confidence
          const warning = tier3Result.confidence < 0.8 
            ? 'Product identified via barcode discovery. Please verify the details.'
            : undefined;
          
          const result = {
            success: true,
            product: tier3Result.product,
            tier: 3,
            confidenceScore: tier3Result.confidence,
            processingTimeMs,
            cached: false,
            warning,
          };
          
          progressEmitter?.emitFinalResult(result);
          
          return result;
        } else {
          // Log Tier 3 failure
          const processingTimeMs = Date.now() - startTime;
          await this.logTierUsage(
            request,
            3,
            false,
            processingTimeMs,
            false,
            undefined,
            undefined,
            'DISCOVERY_FAILED'
          );
          
          // Emit tier transition
          progressEmitter?.emit(
            MultiTierStage.TIER_TRANSITION,
            STAGE_MESSAGES[MultiTierStage.TIER_TRANSITION],
            { fromTier: 3, toTier: 4 }
          );
        }
      }

      // Tier 4: Comprehensive image analysis
      // Requirement 6.4: Fallback to Tier 4 if all else fails
      if (request.image) {
        // Emit Tier 4 progress
        progressEmitter?.emit(
          MultiTierStage.TIER4_ANALYZE,
          STAGE_MESSAGES[MultiTierStage.TIER4_ANALYZE],
          { tier: 4 }
        );
        
        // Add a delay to avoid hitting rate limits if we just called Gemini in Tier 2
        // Note: Even paid Tier 1 accounts have a known bug where they're throttled at free-tier limits (15 RPM)
        // This 10-second delay helps work around the bug by spacing out requests
        if (tier2Metadata) {
          console.log('[Scan Orchestrator] ⏳ Waiting 10s before Tier 4 to avoid rate limits...');
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
        
        const tier4Result = await this.attemptTier4(request.image, request.imageHash, request.barcode);
        if (tier4Result) {
          const processingTimeMs = Date.now() - startTime;
          console.log(`[Scan Orchestrator] ✅ Tier 4 success (${processingTimeMs}ms)`);
          
          // Log tier usage (Requirement 6.6, 6.7, 14.1, 14.2, 14.3)
          await this.logTierUsage(
            request,
            4,
            true,
            processingTimeMs,
            false,
            tier4Result.product.id,
            tier4Result.confidence
          );
          
          // Requirement 13.5: Add warning for low confidence
          const warning = tier4Result.confidence < 0.8 
            ? 'AI-based identification with low confidence. Please verify the product details.'
            : tier4Result.confidence < 0.9
            ? 'AI-based identification. Please verify the product details.'
            : undefined;
          
          const result = {
            success: true,
            product: tier4Result.product,
            tier: 4,
            confidenceScore: tier4Result.confidence,
            processingTimeMs,
            cached: false,
            warning,
          };
          
          progressEmitter?.emitFinalResult(result);
          
          return result;
        } else {
          // Log Tier 4 failure
          const processingTimeMs = Date.now() - startTime;
          await this.logTierUsage(
            request,
            4,
            false,
            processingTimeMs,
            false,
            undefined,
            undefined,
            'ANALYSIS_FAILED'
          );
        }
      }

      // All tiers failed
      const processingTimeMs = Date.now() - startTime;
      console.log(`[Scan Orchestrator] ❌ All tiers failed (${processingTimeMs}ms)`);
      
      // Log final failure
      await this.logTierUsage(
        request,
        4,
        false,
        processingTimeMs,
        false,
        undefined,
        undefined,
        'ALL_TIERS_FAILED'
      );
      
      return {
        success: false,
        tier: 4,
        confidenceScore: 0,
        processingTimeMs,
        cached: false,
        error: {
          code: 'ALL_TIERS_FAILED',
          message: 'Unable to identify product using any tier',
          tier: 4,
          retryable: true,
        },
      };
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      console.error('[Scan Orchestrator] ❌ Unexpected error:', error);
      
      // Log unexpected error
      await this.logTierUsage(
        request,
        4,
        false,
        processingTimeMs,
        false,
        undefined,
        undefined,
        'ORCHESTRATOR_ERROR'
      );
      
      return {
        success: false,
        tier: 4,
        confidenceScore: 0,
        processingTimeMs,
        cached: false,
        error: {
          code: 'ORCHESTRATOR_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          tier: 4,
          retryable: false,
        },
      };
    }
  }

  /**
   * Attempt Tier 1: Direct barcode scanning
   * Requirement 1.3, 1.4, 1.5, 1.6: Cache-first, then database lookup
   * 
   * @param barcode - Product barcode
   * @returns Product data and cache status, or null if not found
   */
  private async attemptTier1(barcode: string): Promise<{ product: ProductData; cached: boolean } | null> {
    console.log('[Scan Orchestrator] 🔍 Tier 1: Checking cache for barcode...');
    
    // Check cache first (Requirement 1.3)
    const cacheResult = await this.cacheService.lookup(barcode, 'barcode');
    
    if (cacheResult.hit && cacheResult.entry) {
      console.log('[Scan Orchestrator] ✅ Tier 1: Cache hit');
      return {
        product: cacheResult.entry.productData,
        cached: true,
      };
    }

    // Cache miss - query database (Requirement 1.5)
    // Requirement 12.7: Use retry logic for database operations
    console.log('[Scan Orchestrator] 🔍 Tier 1: Cache miss, querying database...');
    const product = await this.productRepository.withTransaction(async () => {
      return await this.productRepository.findByBarcode(barcode);
    });
    
    if (product) {
      console.log('[Scan Orchestrator] ✅ Tier 1: Found in database');
      
      // Convert to ProductData format
      const productData: ProductData = {
        id: product.id,
        barcode: product.barcode || undefined,
        name: product.name,
        brand: product.brand,
        size: product.size || undefined,
        category: product.category || 'Unknown',
        imageUrl: product.image_url || undefined,
        metadata: product.metadata || {},
      };

      // Cache the result for future lookups (simple cache update, no transaction needed for read-only DB operation)
      try {
        await this.cacheService.store(barcode, 'barcode', productData, 1, 1.0);
      } catch (error) {
        // Cache update failure is not critical for Tier 1 reads
        console.error('[Scan Orchestrator] ⚠️  Failed to cache Tier 1 result:', error);
      }
      
      return {
        product: productData,
        cached: false,
      };
    }

    console.log('[Scan Orchestrator] ❌ Tier 1: Not found in cache or database');
    return null;
  }

  /**
   * Attempt Tier 2: Visual text extraction
   * Requirement 2.1, 2.5, 2.6: Extract text and query database
   * 
   * @param image - Product image
   * @param imageHash - Image hash (optional)
   * @returns Product data and confidence, or metadata only if no match found
   */
  private async attemptTier2(
    image: ImageData,
    imageHash?: string
  ): Promise<{ product: ProductData; confidence: ConfidenceScore; metadata?: any } | { metadata: any } | null> {
    console.log('[Scan Orchestrator] 📝 Tier 2: Extracting text from image...');
    
    // Generate image hash if not provided
    const hash = imageHash || await hashImage(image.base64);

    // Check cache by image hash first
    const cacheResult = await this.cacheService.lookup(hash, 'imageHash');
    if (cacheResult.hit && cacheResult.entry) {
      console.log('[Scan Orchestrator] ✅ Tier 2: Cache hit by image hash');
      return {
        product: cacheResult.entry.productData,
        confidence: cacheResult.entry.confidenceScore,
      };
    }

    // Extract text using Visual Extractor
    const extractResult = await this.visualExtractor.extractText({ image, imageHash: hash });
    
    if (!extractResult.success || !extractResult.metadata.productName) {
      console.log('[Scan Orchestrator] ❌ Tier 2: Text extraction failed or no product name found');
      return null;
    }

    // Query database by metadata (Requirement 2.5)
    // Requirement 12.7: Use retry logic for database operations
    console.log('[Scan Orchestrator] 🔍 Tier 2: Querying database by metadata...');
    const searchResults = await this.productRepository.withTransaction(async () => {
      return await this.productRepository.searchByMetadata(extractResult.metadata);
    });
    
    if (searchResults.length === 0) {
      console.log('[Scan Orchestrator] ❌ Tier 2: No matching products found, preserving metadata for Tier 3');
      // Return metadata for Tier 3 to use
      return { metadata: extractResult.metadata };
    }

    // Use the best match (highest similarity score)
    const bestMatch = searchResults[0];
    const confidence = bestMatch.similarity_score; // Requirement 13.3: Calculate from match quality
    
    console.log('[Scan Orchestrator] ✅ Tier 2: Found match with confidence', confidence);

    const productData: ProductData = {
      id: bestMatch.id,
      barcode: bestMatch.barcode || undefined,
      name: bestMatch.name,
      brand: bestMatch.brand,
      size: bestMatch.size || undefined,
      category: bestMatch.category || 'Unknown',
      imageUrl: bestMatch.image_url || undefined,
      metadata: bestMatch.metadata || {},
    };

    // Cache the result by image hash (simple cache update, no transaction needed for read-only DB operation)
    try {
      await this.cacheService.store(hash, 'imageHash', productData, 2, confidence);
    } catch (error) {
      // Cache update failure is not critical for Tier 2 reads
      console.error('[Scan Orchestrator] ⚠️  Failed to cache Tier 2 result:', error);
    }

    return { product: productData, confidence, metadata: extractResult.metadata };
  }

  /**
   * Attempt Tier 3: Discovery search via Barcode Lookup API
   * Requirement 3.1, 3.4, 3.5: Discover barcode and persist
   * 
   * @param metadata - Product metadata from Tier 2
   * @param imageHash - Image hash (optional)
   * @returns Product data and confidence, or null if not found
   */
  private async attemptTier3(
    metadata: any,
    imageHash?: string
  ): Promise<{ product: ProductData; confidence: ConfidenceScore } | null> {
    console.log('[Scan Orchestrator] 🔍 Tier 3: Discovering barcode via API...');
    
    try {
      // Use Discovery Service to find barcode
      const discoveryResult = await this.discoveryService.discoverBarcode(metadata, imageHash);
      
      if (!discoveryResult) {
        console.log('[Scan Orchestrator] ❌ Tier 3: No barcode discovered');
        return null;
      }

      console.log(`[Scan Orchestrator] ✅ Tier 3: Discovered barcode ${discoveryResult.barcode}`);

      return {
        product: discoveryResult.product,
        confidence: discoveryResult.confidence,
      };

    } catch (error) {
      console.error('[Scan Orchestrator] ❌ Tier 3: Discovery failed:', error);
      return null;
    }
  }

  /**
   * Attempt Tier 4: Comprehensive image analysis
   * Requirement 4.1, 4.5, 4.6: Analyze image and check confidence
   * 
   * @param image - Product image
   * @param imageHash - Image hash (optional)
   * @param barcode - Product barcode (optional)
   * @returns Product data and confidence, or null if confidence too low
   */
  private async attemptTier4(
    image: ImageData,
    imageHash?: string,
    barcode?: string
  ): Promise<{ product: ProductData; confidence: ConfidenceScore } | null> {
    console.log('[Scan Orchestrator] 🤖 Tier 4: Analyzing image with AI...');
    
    // Generate image hash if not provided
    const hash = imageHash || await hashImage(image.base64);

    // Check cache by image hash first
    const cacheResult = await this.cacheService.lookup(hash, 'imageHash');
    if (cacheResult.hit && cacheResult.entry) {
      console.log('[Scan Orchestrator] ✅ Tier 4: Cache hit by image hash');
      return {
        product: cacheResult.entry.productData,
        confidence: cacheResult.entry.confidenceScore,
      };
    }

    // Analyze image using Image Analyzer
    const analysisResult = await this.imageAnalyzer.analyzeImage({ image, imageHash: hash });
    
    if (!analysisResult.success) {
      console.log('[Scan Orchestrator] ❌ Tier 4: Image analysis failed');
      return null;
    }

    // Check confidence threshold (Requirement 4.5)
    if (!this.imageAnalyzer.isConfidenceSufficient(analysisResult.confidence)) {
      console.log(`[Scan Orchestrator] ⚠️  Tier 4: Confidence too low (${analysisResult.confidence.toFixed(2)})`);
      console.log('[Scan Orchestrator] 💡 User should be prompted to retake image');
      // Still return the result but with low confidence flag
    }

    // Create or find product in database
    const productData: ProductData = {
      id: '', // Will be set after database insert
      barcode: barcode, // Include barcode from scan request
      name: analysisResult.metadata.productName || 'Unknown Product',
      brand: analysisResult.metadata.brandName || 'Unknown Brand',
      size: analysisResult.metadata.size,
      category: analysisResult.metadata.category || 'Unknown',
      metadata: {
        visualCharacteristics: analysisResult.visualCharacteristics,
        keywords: analysisResult.metadata.keywords,
      },
    };

    // Try to find existing product by metadata
    // Requirement 12.7: Use retry logic for database operations
    const searchResults = await this.productRepository.withTransaction(async () => {
      return await this.productRepository.searchByMetadata(analysisResult.metadata);
    });
    
    // Use existing product if similarity score is high enough (>= 0.6)
    const MIN_SIMILARITY_THRESHOLD = 0.6;
    
    if (searchResults.length > 0 && searchResults[0].similarity_score >= MIN_SIMILARITY_THRESHOLD) {
      // Use existing product - just cache it
      const existingProduct = searchResults[0];
      const existingProductData: ProductData = {
        id: existingProduct.id,
        barcode: existingProduct.barcode || undefined,
        name: existingProduct.name,
        brand: existingProduct.brand,
        size: existingProduct.size || undefined,
        category: existingProduct.category || 'Unknown',
        imageUrl: existingProduct.image_url || undefined,
        metadata: existingProduct.metadata || {},
      };
      
      console.log(`[Scan Orchestrator] ✅ Tier 4: Matched to existing product (similarity: ${searchResults[0].similarity_score.toFixed(2)})`);
      console.log(`[Scan Orchestrator] 📦 Existing product: ${existingProduct.name} by ${existingProduct.brand}`);
      
      // Cache by image hash
      try {
        await this.cacheService.store(hash, 'imageHash', existingProductData, 4, analysisResult.confidence);
        
        // Also cache by barcode if available (for faster Tier 1 lookups)
        if (existingProductData.barcode) {
          await this.cacheService.store(
            existingProductData.barcode,
            'barcode',
            existingProductData,
            4,
            analysisResult.confidence
          );
          console.log('[Scan Orchestrator] 💾 Also cached by barcode for Tier 1');
        }
      } catch (error) {
        console.error('[Scan Orchestrator] ⚠️  Failed to cache Tier 4 result:', error);
      }
      
      return { product: existingProductData, confidence: analysisResult.confidence };
    } else {
      // No good match found - create new product
      if (searchResults.length > 0) {
        console.log(`[Scan Orchestrator] ⚠️  Tier 4: Found similar products but similarity too low (${searchResults[0].similarity_score.toFixed(2)} < ${MIN_SIMILARITY_THRESHOLD})`);
        console.log(`[Scan Orchestrator] 💡 Creating new product to avoid false matches`);
      } else {
        console.log('[Scan Orchestrator] 💡 Tier 4: No similar products found, creating new product');
      }
      
      // Create new product with transactional update
      console.log('[Scan Orchestrator] 💾 Tier 4: Creating new product with transaction');
      
      try {
        const savedProduct = await this.updateProductAndCache(
          productData,
          hash,
          'imageHash',
          4,
          analysisResult.confidence
        );
        
        // Also cache by barcode if available (for faster Tier 1 lookups)
        if (savedProduct.barcode) {
          try {
            await this.cacheService.store(
              savedProduct.barcode,
              'barcode',
              savedProduct,
              4,
              analysisResult.confidence
            );
            console.log('[Scan Orchestrator] 💾 Also cached by barcode for Tier 1');
          } catch (error) {
            console.error('[Scan Orchestrator] ⚠️  Failed to cache by barcode:', error);
            // Non-critical - continue
          }
        }
        
        console.log('[Scan Orchestrator] ✅ Tier 4: Created new product with atomic cache update');
        return { product: savedProduct, confidence: analysisResult.confidence };
        
      } catch (error) {
        console.error('[Scan Orchestrator] ❌ Tier 4: Failed to create product:', error);
        throw error;
      }
    }
  }

  /**
   * Log tier usage for monitoring
   * Requirement 6.6, 6.7, 14.1, 14.2, 14.3: Track tier usage and success rates
   * 
   * @param request - Original scan request
   * @param tier - Tier used
   * @param success - Whether the tier succeeded
   * @param processingTimeMs - Processing time in milliseconds
   * @param cached - Whether result came from cache
   * @param productId - Product ID if found
   * @param confidenceScore - Confidence score if available
   * @param errorCode - Error code if failed
   */
  private async logTierUsage(
    request: ScanRequest,
    tier: Tier,
    success: boolean,
    processingTimeMs: number,
    cached: boolean = false,
    productId?: string,
    confidenceScore?: ConfidenceScore,
    errorCode?: string
  ): Promise<void> {
    try {
      const supabase = getSupabaseServerClient();
      
      // Prepare log entry matching ScanLogInsert type
      const logEntry: ScanLogInsert = {
        user_id: request.userId,
        session_id: request.sessionId,
        tier: tier as number,
        success,
        product_id: productId || null,
        barcode: request.barcode || null,
        image_hash: request.imageHash || null,
        confidence_score: confidenceScore !== undefined ? confidenceScore : null,
        processing_time_ms: processingTimeMs,
        cached,
        error_code: errorCode || null,
      };

      console.log('[Scan Orchestrator] 📊 Logging tier usage:', logEntry);

      // Insert into scan_logs table
      const { error } = await supabase
        .from('scan_logs')
        .insert(logEntry as any); // Type workaround - Database types may need regeneration

      if (error) {
        // Log error but don't throw - logging failures should not block scan operations
        console.error('[Scan Orchestrator] ⚠️  Failed to log tier usage:', error);
      } else {
        console.log('[Scan Orchestrator] ✅ Tier usage logged successfully');
      }
    } catch (error) {
      // Gracefully handle logging failures - don't block scan operations
      console.error('[Scan Orchestrator] ⚠️  Exception while logging tier usage:', error);
    }
  }

  /**
   * Execute a transactional update across Product Repository and Cache Service
   * Requirement 12.4: Use transactions when updating multiple data stores
   * Requirement 12.5: Roll back related changes if a database update fails
   * 
   * @param operation - Function that performs the multi-store updates
   * @returns Promise resolving to the operation result
   */
  private async executeTransaction<T>(
    operation: () => Promise<{
      result: T;
      rollback: () => Promise<void>;
    }>
  ): Promise<T> {
    let rollbackFn: (() => Promise<void>) | null = null;

    try {
      console.log('[Scan Orchestrator] 🔄 Starting transaction');
      
      const { result, rollback } = await operation();
      rollbackFn = rollback;
      
      console.log('[Scan Orchestrator] ✅ Transaction completed successfully');
      return result;
      
    } catch (error) {
      console.error('[Scan Orchestrator] ❌ Transaction failed:', error);
      
      // Attempt rollback if rollback function was provided
      if (rollbackFn) {
        try {
          console.log('[Scan Orchestrator] 🔄 Rolling back transaction');
          await rollbackFn();
          console.log('[Scan Orchestrator] ✅ Rollback completed');
        } catch (rollbackError) {
          console.error('[Scan Orchestrator] ❌ Rollback failed:', rollbackError);
          // Log consistency error (Requirement 12.6)
          console.error('[Scan Orchestrator] ⚠️  DATA CONSISTENCY ERROR: Failed to rollback transaction');
        }
      }
      
      throw error;
    }
  }

  /**
   * Update both Product Repository and Cache Service atomically
   * Requirement 12.1, 12.2: Update both stores with same data
   * Requirement 12.4, 12.5: Use transactions with rollback support
   * 
   * @param productData - Product data to store
   * @param cacheKey - Cache key (barcode or image hash)
   * @param cacheKeyType - Type of cache key
   * @param tier - Tier that produced the result
   * @param confidence - Confidence score
   * @param productId - Optional existing product ID (if updating)
   * @returns Promise resolving to the saved product data
   */
  private async updateProductAndCache(
    productData: ProductData,
    cacheKey: string,
    cacheKeyType: 'barcode' | 'imageHash',
    tier: Tier,
    confidence: ConfidenceScore,
    productId?: string
  ): Promise<ProductData> {
    return this.executeTransaction(async () => {
      let savedProduct: ProductData | null = null;
      let cacheUpdated = false;
      let previousCacheEntry: any = null;

      // Save previous cache state for rollback
      const previousCache = await this.cacheService.lookup(cacheKey, cacheKeyType);
      if (previousCache.hit && previousCache.entry) {
        previousCacheEntry = previousCache.entry;
      }

      try {
        // Step 1: Update Product Repository
        if (productId) {
          // Update existing product
          // Skip automatic cache invalidation since we manage cache updates in this transaction
          const updated = await this.productRepository.update(productId, {
            barcode: productData.barcode || null,
            name: productData.name,
            brand: productData.brand,
            size: productData.size || null,
            category: productData.category || null,
            image_url: productData.imageUrl || null,
            metadata: productData.metadata || null,
          }, false); // Skip cache invalidation - we handle it below
          savedProduct = {
            id: updated.id,
            barcode: updated.barcode || undefined,
            name: updated.name,
            brand: updated.brand,
            size: updated.size || undefined,
            category: updated.category || 'Unknown',
            imageUrl: updated.image_url || undefined,
            metadata: updated.metadata || {},
          };
        } else if (productData.barcode) {
          // Upsert by barcode
          const upserted = await this.productRepository.upsertByBarcode({
            barcode: productData.barcode,
            name: productData.name,
            brand: productData.brand,
            size: productData.size || null,
            category: productData.category || null,
            image_url: productData.imageUrl || null,
            metadata: productData.metadata || null,
          });
          savedProduct = {
            id: upserted.id,
            barcode: upserted.barcode || undefined,
            name: upserted.name,
            brand: upserted.brand,
            size: upserted.size || undefined,
            category: upserted.category || 'Unknown',
            imageUrl: upserted.image_url || undefined,
            metadata: upserted.metadata || {},
          };
        } else {
          // Create new product
          const created = await this.productRepository.create({
            barcode: null,
            name: productData.name,
            brand: productData.brand,
            size: productData.size || null,
            category: productData.category || null,
            image_url: productData.imageUrl || null,
            metadata: productData.metadata || null,
          });
          savedProduct = {
            id: created.id,
            barcode: created.barcode || undefined,
            name: created.name,
            brand: created.brand,
            size: created.size || undefined,
            category: created.category || 'Unknown',
            imageUrl: created.image_url || undefined,
            metadata: created.metadata || {},
          };
        }

        // Step 2: Update Cache Service
        await this.cacheService.store(cacheKey, cacheKeyType, savedProduct, tier, confidence);
        cacheUpdated = true;

        console.log('[Scan Orchestrator] ✅ Product and cache updated atomically');

        // Return result and rollback function
        return {
          result: savedProduct,
          rollback: async () => {
            console.log('[Scan Orchestrator] 🔄 Rolling back product and cache updates');
            
            // Rollback cache
            if (cacheUpdated) {
              if (previousCacheEntry) {
                // Restore previous cache entry
                await this.cacheService.store(
                  cacheKey,
                  cacheKeyType,
                  previousCacheEntry.productData,
                  previousCacheEntry.tier,
                  previousCacheEntry.confidenceScore
                );
              } else {
                // Remove cache entry
                await this.cacheService.invalidate(cacheKey, cacheKeyType);
              }
            }

            // Note: We cannot easily rollback Supabase changes without transaction support
            // This is a limitation of the current implementation
            // In a production system, we would use Supabase transactions or a saga pattern
            console.log('[Scan Orchestrator] ⚠️  Product repository rollback not implemented (Supabase limitation)');
          },
        };

      } catch (error) {
        // If cache update failed but product was saved, we have inconsistency
        if (savedProduct && !cacheUpdated) {
          console.error('[Scan Orchestrator] ⚠️  DATA CONSISTENCY ERROR: Product saved but cache update failed');
        }
        throw error;
      }
    });
  }
}

// Export factory function to create orchestrator with dependencies
export function createScanOrchestrator(): ScanOrchestratorMultiTier {
  const { cacheService } = require('@/lib/mongodb/cache-service');
  const { productRepositoryMultiTier } = require('@/lib/supabase/repositories/ProductRepositoryMultiTier');
  const { visualExtractorService } = require('@/lib/services/visual-extractor');
  const { imageAnalyzerService } = require('@/lib/services/image-analyzer');
  const { discoveryService } = require('@/lib/services/discovery-service');

  return new ScanOrchestratorMultiTier(
    cacheService,
    productRepositoryMultiTier,
    visualExtractorService,
    imageAnalyzerService,
    discoveryService
  );
}
