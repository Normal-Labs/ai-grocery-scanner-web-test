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
import {
  ScanRequest,
  ScanResponse,
  ProductData,
  Tier,
  ConfidenceScore,
  ImageData,
} from '@/lib/types/multi-tier';

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
   * @returns Promise resolving to scan response
   */
  async scan(request: ScanRequest): Promise<ScanResponse> {
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
        const tier1Result = await this.attemptTier1(request.barcode);
        if (tier1Result) {
          const processingTimeMs = Date.now() - startTime;
          console.log(`[Scan Orchestrator] ✅ Tier 1 success (${processingTimeMs}ms)`);
          
          return {
            success: true,
            product: tier1Result.product,
            tier: 1,
            confidenceScore: 1.0, // Requirement 13.2: Tier 1 = 1.0 confidence
            processingTimeMs,
            cached: tier1Result.cached,
          };
        }
      }

      // Tier 2: Visual text extraction
      // Requirement 6.2: Fallback to Tier 2 if Tier 1 fails
      let tier2Metadata = null;
      if (request.image) {
        const tier2Result = await this.attemptTier2(request.image, request.imageHash);
        if (tier2Result && 'product' in tier2Result) {
          const processingTimeMs = Date.now() - startTime;
          console.log(`[Scan Orchestrator] ✅ Tier 2 success (${processingTimeMs}ms)`);
          
          // Requirement 13.5: Add warning for low confidence
          const warning = tier2Result.confidence < 0.8 
            ? 'Low confidence match. Please verify the product details.'
            : undefined;
          
          return {
            success: true,
            product: tier2Result.product,
            tier: 2,
            confidenceScore: tier2Result.confidence,
            processingTimeMs,
            cached: false,
            warning,
          };
        }
        // Preserve metadata for Tier 3 even if Tier 2 didn't find a match
        if (tier2Result && 'metadata' in tier2Result) {
          tier2Metadata = tier2Result.metadata;
        }
      }

      // Tier 3: Discovery search
      // Requirement 6.3: Fallback to Tier 3 if Tier 2 fails
      // Use metadata from Tier 2 to discover barcode via API
      if (request.image && tier2Metadata) {
        const tier3Result = await this.attemptTier3(tier2Metadata, request.imageHash);
        if (tier3Result) {
          const processingTimeMs = Date.now() - startTime;
          console.log(`[Scan Orchestrator] ✅ Tier 3 success (${processingTimeMs}ms)`);
          
          // Requirement 13.5: Add warning for low confidence
          const warning = tier3Result.confidence < 0.8 
            ? 'Product identified via barcode discovery. Please verify the details.'
            : undefined;
          
          return {
            success: true,
            product: tier3Result.product,
            tier: 3,
            confidenceScore: tier3Result.confidence,
            processingTimeMs,
            cached: false,
            warning,
          };
        }
      }

      // Tier 4: Comprehensive image analysis
      // Requirement 6.4: Fallback to Tier 4 if all else fails
      if (request.image) {
        // Add a delay to avoid hitting rate limits if we just called Gemini in Tier 2
        // Note: Even paid Tier 1 accounts have a known bug where they're throttled at free-tier limits (15 RPM)
        // This 10-second delay helps work around the bug by spacing out requests
        if (tier2Metadata) {
          console.log('[Scan Orchestrator] ⏳ Waiting 10s before Tier 4 to avoid rate limits...');
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
        
        const tier4Result = await this.attemptTier4(request.image, request.imageHash);
        if (tier4Result) {
          const processingTimeMs = Date.now() - startTime;
          console.log(`[Scan Orchestrator] ✅ Tier 4 success (${processingTimeMs}ms)`);
          
          // Requirement 13.5: Add warning for low confidence
          const warning = tier4Result.confidence < 0.8 
            ? 'AI-based identification with low confidence. Please verify the product details.'
            : tier4Result.confidence < 0.9
            ? 'AI-based identification. Please verify the product details.'
            : undefined;
          
          return {
            success: true,
            product: tier4Result.product,
            tier: 4,
            confidenceScore: tier4Result.confidence,
            processingTimeMs,
            cached: false,
            warning,
          };
        }
      }

      // All tiers failed
      const processingTimeMs = Date.now() - startTime;
      console.log(`[Scan Orchestrator] ❌ All tiers failed (${processingTimeMs}ms)`);
      
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
    console.log('[Scan Orchestrator] 🔍 Tier 1: Cache miss, querying database...');
    const product = await this.productRepository.findByBarcode(barcode);
    
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

      // Cache the result for future lookups
      await this.cacheService.store(barcode, 'barcode', productData, 1, 1.0);
      
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
    console.log('[Scan Orchestrator] 🔍 Tier 2: Querying database by metadata...');
    const searchResults = await this.productRepository.searchByMetadata(extractResult.metadata);
    
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

    // Cache the result by image hash
    await this.cacheService.store(hash, 'imageHash', productData, 2, confidence);

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
   * @returns Product data and confidence, or null if confidence too low
   */
  private async attemptTier4(
    image: ImageData,
    imageHash?: string
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
    const searchResults = await this.productRepository.searchByMetadata(analysisResult.metadata);
    
    if (searchResults.length > 0) {
      // Use existing product
      const existingProduct = searchResults[0];
      productData.id = existingProduct.id;
      productData.barcode = existingProduct.barcode || undefined;
      productData.imageUrl = existingProduct.image_url || undefined;
      
      console.log('[Scan Orchestrator] ✅ Tier 4: Matched to existing product');
    } else {
      // Create new product
      const newProduct = await this.productRepository.create({
        barcode: request.barcode || null, // Associate the scanned barcode
        name: productData.name,
        brand: productData.brand,
        size: productData.size || null,
        category: productData.category || null,
        metadata: productData.metadata,
      });
      
      productData.id = newProduct.id;
      productData.barcode = newProduct.barcode || undefined;
      console.log('[Scan Orchestrator] ✅ Tier 4: Created new product');
    }

    // Cache the result by image hash (Requirement 4.6)
    await this.cacheService.store(hash, 'imageHash', productData, 4, analysisResult.confidence);

    // Also cache by barcode if we have one
    if (request.barcode) {
      await this.cacheService.store(request.barcode, 'barcode', productData, 4, analysisResult.confidence);
    }

    return { product: productData, confidence: analysisResult.confidence };
  }

  /**
   * Log tier usage for monitoring
   * Requirement 6.6, 6.7: Track tier usage and success rates
   * 
   * @param tier - Tier used
   * @param success - Whether the tier succeeded
   * @param processingTimeMs - Processing time in milliseconds
   */
  private logTierUsage(tier: Tier, success: boolean, processingTimeMs: number): void {
    console.log('[Scan Orchestrator] 📊 Tier usage:', {
      tier,
      success,
      processingTimeMs,
      timestamp: new Date().toISOString(),
    });
    
    // TODO: Save to scan_logs table for analytics
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
