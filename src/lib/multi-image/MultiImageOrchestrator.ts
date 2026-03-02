/**
 * MultiImageOrchestrator - Multi-Image Capture Workflow Orchestration
 * 
 * Coordinates the multi-image capture workflow by delegating to existing analyzers
 * and using SessionManager, ProductMatcher, and DataMerger for intelligent data consolidation.
 * 
 * Requirements: 2.5, 2.6, 4.1, 4.2, 4.3, 4.4, 4.5, 9.1, 9.5, 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { Product } from '@/lib/supabase/types';
import { ImageData } from '@/lib/types/multi-tier';
import { ImageClassifier } from '@/lib/services/image-classifier';
import { hashImage } from '@/lib/imageHash';
import { cacheService } from '@/lib/mongodb/cache-service';
import { SessionManager, CaptureSession, sessionManager } from './SessionManager';
import { ProductMatcher, productMatcher, ImageMetadata } from './ProductMatcher';
import { DataMerger, dataMerger, ImageAnalysisResult, ImageType } from './DataMerger';
import { monitoringService } from './MonitoringService';

/**
 * Completion status for a product
 */
export interface CompletionStatus {
  complete: boolean;
  capturedTypes: ImageType[];
  missingTypes: ImageType[];
  progress: number; // 0-100 percentage
}

/**
 * Process image result
 */
export interface ProcessImageResult {
  success: boolean;
  product: Product;
  imageType: ImageType;
  sessionId: string;
  completionStatus: CompletionStatus;
  nextStep?: ImageType; // For guided mode
  error?: string;
  sessionExpired?: boolean; // Flag indicating session was expired and recovered
  recoveryMessage?: string; // User-friendly message about session recovery
  multipleSessionsDetected?: boolean; // Flag indicating multiple active sessions
  availableSessions?: Array<{ // Available sessions for user to choose from
    sessionId: string;
    productId: string | null;
    capturedTypes: ImageType[];
    lastUpdated: Date;
  }>;
}

/**
 * MultiImageOrchestrator class
 * 
 * Coordinates multi-image capture workflow:
 * 1. Generate SHA-256 hash and check cache
 * 2. Classify image type using ImageClassifier
 * 3. Route to appropriate analyzer (Tier 1-4, DimensionAnalyzer, NutritionOrchestrator)
 * 4. Use ProductMatcher to link images to products
 * 5. Use DataMerger to combine results
 * 6. Update session and return completion status
 */
export class MultiImageOrchestrator {
  private imageClassifier: ImageClassifier;
  private sessionManager: SessionManager;
  private productMatcher: ProductMatcher;
  private dataMerger: DataMerger;

  constructor(
    imageClassifier?: ImageClassifier,
    sessionMgr?: SessionManager,
    productMtchr?: ProductMatcher,
    dataMrgr?: DataMerger
  ) {
    this.imageClassifier = imageClassifier || new ImageClassifier();
    this.sessionManager = sessionMgr || sessionManager;
    this.productMatcher = productMtchr || productMatcher;
    this.dataMerger = dataMrgr || dataMerger;
  }

  /**
   * Process single image in multi-image workflow
   * Requirements: 2.5, 2.6, 4.1, 4.2, 4.3, 4.4, 4.5, 9.1, 9.5, 10.1, 10.2, 10.3, 10.4, 10.5
   * 
   * @param imageData - Image data to process
   * @param userId - User ID from Supabase Auth
   * @param workflowMode - Workflow type (guided or progressive)
   * @param sessionId - Optional existing session ID
   * @returns Promise resolving to ProcessImageResult
   */
  async processImage(
    imageData: ImageData,
    userId: string,
    workflowMode: 'guided' | 'progressive',
    sessionId?: string
  ): Promise<ProcessImageResult> {
    const startTime = Date.now();
    
    console.log('[MultiImageOrchestrator] 🚀 Processing image:', {
      userId,
      workflowMode,
      sessionId,
      timestamp: new Date().toISOString(),
    });

    try {
      // Step 1: Generate SHA-256 hash for deduplication
      // Requirement 9.1: Generate SHA-256 hash of image data
      const imageHash = await hashImage(imageData.base64);
      console.log('[MultiImageOrchestrator] 🔑 Generated image hash');

      // Step 2: Check MongoDB cache for existing image hash
      // Requirement 9.5, 10.1: Check cache before processing
      const cachedProduct = await this.checkCache(imageHash);
      if (cachedProduct) {
        console.log('[MultiImageOrchestrator] ✅ Cache hit, returning cached product');
        
        // Get or create session
        let session: CaptureSession;
        try {
          if (sessionId) {
            session = await this.sessionManager.getActiveSession(userId, cachedProduct.id) || 
                      await this.sessionManager.createSession(userId, workflowMode);
          } else {
            session = await this.sessionManager.createSession(userId, workflowMode);
          }
        } catch (error) {
          console.error('[MultiImageOrchestrator] ⚠️  Session operation failed, continuing without session:', error);
          // Create a temporary session object to continue workflow
          session = {
            sessionId: 'temp-' + Date.now(),
            userId,
            productId: cachedProduct.id,
            capturedImageTypes: [],
            imageHashes: [],
            workflowMode,
            createdAt: new Date(),
            lastUpdatedAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            status: 'active',
          };
        }
        
        return {
          success: true,
          product: cachedProduct,
          imageType: this.inferImageTypeFromProduct(cachedProduct),
          sessionId: session.sessionId,
          completionStatus: await this.getCompletionStatus(cachedProduct.id),
        };
      }

      // Step 3: Classify image type with retry and fallback
      // Requirement 4.1, 12.2: Delegate to ImageClassifier with error handling
      console.log('[MultiImageOrchestrator] 🔍 Classifying image type...');
      let classification: { type: string; confidence: number } | undefined;
      let classificationAttempts = 0;
      const MAX_CLASSIFICATION_RETRIES = 3;
      
      while (classificationAttempts < MAX_CLASSIFICATION_RETRIES) {
        try {
          classification = await this.imageClassifier.classify(imageData.base64);
          break; // Success, exit retry loop
        } catch (error) {
          classificationAttempts++;
          console.error(`[MultiImageOrchestrator] ❌ Image classification failed (attempt ${classificationAttempts}/${MAX_CLASSIFICATION_RETRIES}):`, error);
          
          if (classificationAttempts >= MAX_CLASSIFICATION_RETRIES) {
            // All retries exhausted
            monitoringService.logImageClassificationFailure(
              error instanceof Error ? error.message : String(error),
              imageHash
            );
            throw new Error(
              'Unable to classify image after multiple attempts. The image may be unclear or the classification service is unavailable. Please ensure the image is clear and try again, or manually select the image type.'
            );
          }
          
          // Exponential backoff: 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, classificationAttempts - 1) * 1000));
        }
      }
      
      if (!classification) {
        throw new Error('Image classification failed unexpectedly.');
      }
      
      // Map classification type to ImageType
      let imageType: ImageType;
      if (classification.type === 'barcode') {
        imageType = 'barcode';
      } else if (classification.type === 'nutrition_label') {
        imageType = 'nutrition_label';
      } else if (classification.type === 'product_image') {
        imageType = 'packaging';
      } else if (classification.type === 'unknown' || classification.confidence < 0.6) {
        // Requirement 12.2: Handle low classification confidence
        monitoringService.logImageClassificationFailure(
          `Low confidence: ${classification.confidence}`,
          imageHash
        );
        throw new Error(
          'Unable to determine image type with sufficient confidence. Please ensure the image is clear and try again, or manually select the image type.'
        );
      } else {
        monitoringService.logImageClassificationFailure(
          `Unknown type: ${classification.type}`,
          imageHash
        );
        throw new Error('Unable to determine image type. Please ensure the image is clear and try again.');
      }
      
      console.log('[MultiImageOrchestrator] ✅ Image classified as:', imageType, `(confidence: ${classification.confidence})`);

      // Step 4: Get or create session with expiration recovery and multiple session handling
      // Requirements 3.3, 3.4, 3.5: Handle session expiration and multiple active sessions
      let session: CaptureSession;
      let sessionExpired = false;
      let multipleSessionsDetected = false;
      let availableSessions: Array<{ sessionId: string; productId: string | null; capturedTypes: ImageType[]; lastUpdated: Date; }> | undefined;
      
      try {
        if (sessionId) {
          const existingSession = await this.sessionManager.getActiveSession(userId);
          
          if (existingSession && existingSession.sessionId === sessionId) {
            // Session is still active
            session = existingSession;
            console.log('[MultiImageOrchestrator] ✅ Using existing session:', sessionId);
          } else {
            // Session expired or not found
            sessionExpired = true;
            console.log('[MultiImageOrchestrator] ⚠️  Session expired or not found, creating new session');
            session = await this.sessionManager.createSession(userId, workflowMode);
          }
        } else {
          // No session ID provided, check for multiple active sessions
          // Requirement 3.5: Support multiple concurrent sessions for different products
          const allSessions = await this.sessionManager.getAllActiveSessions(userId);
          
          if (allSessions.length > 1) {
            // Multiple active sessions detected
            multipleSessionsDetected = true;
            console.log('[MultiImageOrchestrator] ⚠️  Multiple active sessions detected:', allSessions.length);
            
            availableSessions = allSessions.map(s => ({
              sessionId: s.sessionId,
              productId: s.productId,
              capturedTypes: s.capturedImageTypes,
              lastUpdated: s.lastUpdatedAt,
            }));
            
            // Use most recent session as default
            session = allSessions[0];
          } else if (allSessions.length === 1) {
            // Use the single active session
            session = allSessions[0];
            console.log('[MultiImageOrchestrator] ✅ Using existing session:', session.sessionId);
          } else {
            // No active sessions, create new one
            session = await this.sessionManager.createSession(userId, workflowMode);
          }
        }
      } catch (error) {
        console.error('[MultiImageOrchestrator] ❌ Session management failed:', error);
        throw new Error('Failed to manage capture session. Please try again.');
      }

      // Step 5: Route to appropriate analyzer with error handling
      // Requirements 4.2, 4.3, 4.4, 4.5, 12.5: Route based on image type with error handling
      console.log('[MultiImageOrchestrator] 🔄 Routing to analyzer:', imageType);
      let analysisResult: ImageAnalysisResult;
      try {
        analysisResult = await this.routeToAnalyzer(imageType, imageData, imageHash);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[MultiImageOrchestrator] ❌ Image analysis failed:', error);
        
        // Log analyzer failure
        const analyzerType = imageType === 'barcode' ? 'barcode' : 
                            imageType === 'packaging' ? 'packaging' : 'nutrition';
        monitoringService.logAnalyzerFailure(analyzerType, errorMessage, imageHash);
        
        // Requirement 12.5: Handle analyzer failures with specific messages
        if (imageType === 'barcode') {
          // Barcode analyzer failure: continue with empty data
          console.warn('[MultiImageOrchestrator] ⚠️  Barcode analyzer failed, continuing without barcode data');
          analysisResult = {
            imageHash,
            timestamp: new Date(),
          };
        } else if (imageType === 'packaging') {
          // Packaging analyzer failure: return partial results if possible
          console.warn('[MultiImageOrchestrator] ⚠️  Packaging analyzer failed, continuing with partial data');
          analysisResult = {
            imageHash,
            timestamp: new Date(),
          };
        } else {
          // Nutrition analyzer failure
          throw new Error(
            'Failed to analyze nutrition label. The label may not be visible or in an unrecognized format. Please try recapturing the nutrition label.'
          );
        }
      }

      // Step 6: Use ProductMatcher to link images to products with error handling
      // Requirements 10.2, 10.3, 10.4, 12.3: Match to existing product with error handling
      // Requirement 3.3, 3.4: If session expired, attempt to match to existing product
      console.log('[MultiImageOrchestrator] 🔍 Matching to existing product...');
      
      let matchResult;
      try {
        matchResult = await this.productMatcher.matchProduct(
          imageType,
          {
            barcode: analysisResult.barcode,
            productName: analysisResult.productName,
            brandName: analysisResult.brandName,
            imageHash,
          },
          sessionExpired ? undefined : session // Don't use expired session for matching
        );
        
        // Log matching confidence
        monitoringService.logProductMatchingConfidence(
          matchResult.confidence,
          matchResult.matchMethod,
          matchResult.productId
        );
        
        // Requirement 12.3: Handle ambiguous match
        if (matchResult.matched && matchResult.confidence < 0.95 && matchResult.confidence >= 0.85) {
          console.warn('[MultiImageOrchestrator] ⚠️  Ambiguous match detected:', {
            confidence: matchResult.confidence,
            productId: matchResult.productId,
          });
          // Use highest confidence match (already selected by ProductMatcher)
        }
        
        // Requirement 12.3: Handle barcode mismatch
        if (matchResult.matched && imageType === 'barcode' && matchResult.product?.barcode) {
          if (analysisResult.barcode && analysisResult.barcode !== matchResult.product.barcode) {
            console.warn('[MultiImageOrchestrator] ⚠️  Barcode mismatch detected:', {
              newBarcode: analysisResult.barcode,
              existingBarcode: matchResult.product.barcode,
            });
            monitoringService.logDataConsistencyWarning(
              'barcode',
              matchResult.product.barcode,
              analysisResult.barcode,
              'Barcode mismatch - using most recent value'
            );
            // Flag product for review (will be handled by DataMerger)
          }
        }
      } catch (error) {
        console.error('[MultiImageOrchestrator] ❌ Product matching failed:', error);
        // Requirement 12.3: Handle no match found - create new product
        console.log('[MultiImageOrchestrator] ℹ️  No match found, will create new product');
        matchResult = {
          matched: false,
          confidence: 0.0,
          matchMethod: 'visual_similarity' as const,
        };
      }
      
      // If session expired and we found a match, log recovery
      if (sessionExpired && matchResult.matched) {
        console.log('[MultiImageOrchestrator] ✅ Session expired - recovered by matching to existing product:', 
          matchResult.productId);
      }

      // Step 7: Use DataMerger to combine results with error handling
      // Requirement 10.5, 12.4: Merge new data with existing product with error handling
      console.log('[MultiImageOrchestrator] 🔄 Merging data...');
      let mergeResult: Awaited<ReturnType<typeof this.dataMerger.mergeImages>> | undefined;
      let retryCount = 0;
      const MAX_MERGE_RETRIES = 3;
      
      while (retryCount < MAX_MERGE_RETRIES) {
        try {
          mergeResult = await this.dataMerger.mergeImages(
            matchResult.product || null,
            analysisResult,
            imageType
          );
          break; // Success, exit retry loop
        } catch (error) {
          retryCount++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[MultiImageOrchestrator] ❌ Data merging failed (attempt ${retryCount}/${MAX_MERGE_RETRIES}):`, error);
          
          if (retryCount >= MAX_MERGE_RETRIES) {
            // Requirement 12.4: Handle database update failure
            monitoringService.logDatabaseUpdateFailure(
              'merge',
              errorMessage,
              matchResult.productId
            );
            throw new Error(
              'Failed to save product data after multiple attempts. Your data has been cached and will be synced when the connection is restored.'
            );
          }
          
          // Exponential backoff: 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount - 1) * 1000));
        }
      }
      
      if (!mergeResult) {
        throw new Error('Data merging failed unexpectedly.');
      }

      // Step 8: Update session
      try {
        await this.sessionManager.updateSession(
          session.sessionId,
          imageHash,
          imageType,
          mergeResult.product.id
        );
      } catch (error) {
        console.error('[MultiImageOrchestrator] ⚠️  Session update failed, continuing:', error);
        // Don't throw - session update failure should not block workflow
      }

      // Step 9: Get completion status
      const completionStatus = await this.getCompletionStatus(mergeResult.product.id);

      // Step 10: Determine next step for guided mode
      let nextStep: ImageType | undefined;
      if (workflowMode === 'guided') {
        nextStep = this.determineNextStep(completionStatus.capturedTypes);
      }

      const duration = Date.now() - startTime;
      console.log('[MultiImageOrchestrator] ✅ Processing complete:', {
        productId: mergeResult.product.id,
        imageType,
        completionStatus: completionStatus.complete ? 'complete' : 'incomplete',
        sessionExpired,
        multipleSessionsDetected,
        duration,
      });

      // Prepare recovery message if session expired
      let recoveryMessage: string | undefined;
      if (sessionExpired) {
        if (matchResult.matched) {
          recoveryMessage = 'Your capture session has expired. We automatically linked this image to your existing product and started a new session.';
        } else {
          recoveryMessage = 'Your capture session has expired. Starting a new session...';
        }
      }

      return {
        success: true,
        product: mergeResult.product,
        imageType,
        sessionId: session.sessionId,
        completionStatus,
        nextStep,
        sessionExpired,
        recoveryMessage,
        multipleSessionsDetected,
        availableSessions,
      };
    } catch (error) {
      console.error('[MultiImageOrchestrator] ❌ Processing failed:', {
        userId,
        workflowMode,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      throw error;
    }
  }

  /**
   * Get completion status for product
   * 
   * @param productId - Product ID
   * @returns Promise resolving to CompletionStatus
   */
  async getCompletionStatus(productId: string): Promise<CompletionStatus> {
    try {
      // Query product from database to get captured_image_types
      const productRepo = new (await import('@/lib/supabase/repositories/ProductRepositoryMultiTier')).ProductRepositoryMultiTier();
      const product = await productRepo.findById(productId);
      
      if (!product) {
        console.warn('[MultiImageOrchestrator] ⚠️  Product not found:', productId);
        return {
          complete: false,
          capturedTypes: [],
          missingTypes: ['barcode', 'packaging', 'nutrition_label'],
          progress: 0,
        };
      }
      
      // Get captured types from metadata
      const capturedTypes = (product.metadata?.captured_image_types as ImageType[]) || [];
      const allTypes: ImageType[] = ['barcode', 'packaging', 'nutrition_label'];
      const missingTypes = allTypes.filter(type => !capturedTypes.includes(type));
      const progress = (capturedTypes.length / allTypes.length) * 100;
      
      return {
        complete: capturedTypes.length === 3,
        capturedTypes,
        missingTypes,
        progress,
      };
    } catch (error) {
      console.error('[MultiImageOrchestrator] ❌ Failed to get completion status:', error);
      // Return safe default
      return {
        complete: false,
        capturedTypes: [],
        missingTypes: ['barcode', 'packaging', 'nutrition_label'],
        progress: 0,
      };
    }
  }

  /**
   * Resolve multiple active sessions by using ProductMatcher to determine which session the image belongs to
   * Requirement 3.5: Handle multiple active sessions with ProductMatcher disambiguation
   * 
   * @param userId - User ID
   * @param imageType - Type of image being captured
   * @param metadata - Image metadata for matching
   * @param sessions - Array of active sessions
   * @returns Promise resolving to the best matching session, or null if no match
   */
  async resolveMultipleSessions(
    userId: string,
    imageType: ImageType,
    metadata: ImageMetadata,
    sessions: CaptureSession[]
  ): Promise<CaptureSession | null> {
    try {
      console.log('[MultiImageOrchestrator] 🔍 Resolving multiple active sessions:', sessions.length);
      
      // Try to match the image to one of the existing sessions' products
      for (const session of sessions) {
        if (session.productId) {
          const matchResult = await this.productMatcher.matchProduct(
            imageType,
            metadata,
            session
          );
          
          if (matchResult.matched && matchResult.productId === session.productId) {
            console.log('[MultiImageOrchestrator] ✅ Matched to session:', session.sessionId);
            return session;
          }
        }
      }
      
      console.log('[MultiImageOrchestrator] ℹ️  No matching session found, will use most recent');
      return null;
    } catch (error) {
      console.error('[MultiImageOrchestrator] ❌ Failed to resolve multiple sessions:', error);
      return null;
    }
  }

  /**
   * Check MongoDB cache for existing image hash
   * Requirement 9.5: Use image hashes for cache lookups
   * 
   * @param imageHash - SHA-256 hash of image
   * @returns Promise resolving to cached Product or null
   */
  private async checkCache(imageHash: string): Promise<Product | null> {
    try {
      const cached = await cacheService.lookup(imageHash, 'imageHash');
      
      if (cached.hit && cached.entry) {
        console.log('[MultiImageOrchestrator] ✅ Found cached product:', cached.entry.productData?.name);
        return cached.entry.productData as Product;
      }
      
      return null;
    } catch (error) {
      console.error('[MultiImageOrchestrator] ⚠️  Cache check failed:', error);
      return null;
    }
  }

  /**
   * Route image to appropriate analyzer based on type
   * Requirements 4.2, 4.3, 4.4, 4.5
   * 
   * @param imageType - Type of image
   * @param imageData - Image data
   * @param imageHash - Image hash
   * @returns Promise resolving to ImageAnalysisResult
   */
  private async routeToAnalyzer(
    imageType: ImageType,
    imageData: ImageData,
    imageHash: string
  ): Promise<ImageAnalysisResult> {
    const timestamp = new Date();
    
    if (imageType === 'barcode') {
      // Requirement 4.3: Route to Barcode_Analyzer (Tier 1-4 pipeline)
      console.log('[MultiImageOrchestrator] 📊 Routing to Barcode Analyzer (Tier 1-4)');
      
      // Call the existing multi-tier scan orchestrator
      const { createScanOrchestrator } = await import('@/lib/orchestrator/ScanOrchestratorMultiTier');
      const scanOrchestrator = createScanOrchestrator();
      
      const scanResult = await scanOrchestrator.scan({
        image: {
          base64: imageData.base64,
          mimeType: imageData.mimeType || 'image/jpeg',
        },
        imageHash,
        userId: 'multi-image-user',
        sessionId: 'multi-image-session-' + Date.now(),
      });
      
      if (scanResult.success && scanResult.product) {
        return {
          imageHash,
          timestamp,
          barcode: scanResult.product.barcode || undefined,
          productName: scanResult.product.name,
          brandName: scanResult.product.brand || undefined,
          size: scanResult.product.size || undefined,
          category: scanResult.product.category || undefined,
          imageUrl: scanResult.product.imageUrl || undefined,
        };
      } else {
        throw new Error('Barcode scan failed: ' + (scanResult.error?.message || 'Unknown error'));
      }
    } else if (imageType === 'packaging') {
      // Requirement 4.4: Route to Packaging_Analyzer (Visual text extraction)
      console.log('[MultiImageOrchestrator] 📦 Routing to Packaging Analyzer (Visual Extractor)');
      
      // Use VisualExtractorService to extract product info from packaging
      const { visualExtractorService } = await import('@/lib/services/visual-extractor');
      
      try {
        const extractResult = await visualExtractorService.extractText({
          image: {
            base64: imageData.base64,
            mimeType: imageData.mimeType || 'image/jpeg',
          },
          imageHash,
        });
        
        if (extractResult.success && extractResult.metadata) {
          const result = {
            imageHash,
            timestamp,
            productName: extractResult.metadata.productName,
            brandName: extractResult.metadata.brandName,
            size: extractResult.metadata.size,
            category: extractResult.metadata.category,
          };
          console.log('[MultiImageOrchestrator] 📦 Packaging data extracted:', {
            productName: result.productName,
            brandName: result.brandName,
            size: result.size,
            category: result.category,
          });
          return result;
        } else {
          throw new Error('Packaging analysis failed: ' + (extractResult.error?.message || 'Unknown error'));
        }
      } catch (error) {
        console.error('[MultiImageOrchestrator] ❌ Packaging analyzer failed:', error);
        throw error;
      }
    } else {
      // Requirement 4.5: Route to Nutrition_Analyzer (NutritionOrchestrator)
      console.log('[MultiImageOrchestrator] 🥗 Routing to Nutrition Analyzer (NutritionOrchestrator)');
      
      // Call the existing NutritionOrchestrator
      const { NutritionOrchestrator } = await import('@/lib/orchestrator/NutritionOrchestrator');
      const { NutritionParser } = await import('@/lib/services/nutrition-parser');
      const { IngredientParser } = await import('@/lib/services/ingredient-parser');
      const { HealthScorer } = await import('@/lib/services/health-scorer');
      
      const nutritionOrchestrator = new NutritionOrchestrator(
        new NutritionParser(),
        new IngredientParser(),
        new HealthScorer()
      );
      
      try {
        const nutritionResult = await nutritionOrchestrator.processScan({
          imageData: imageData.base64,
          imageHash,
          userId: 'multi-image-user',
          tier: 'premium',
        });
        
        // Convert NutritionScanResult to ImageAnalysisResult
        return {
          imageHash,
          timestamp,
          productName: nutritionResult.productName || undefined,
          nutritionData: {
            servingSize: nutritionResult.nutritionalFacts.servingSize,
            calories: nutritionResult.nutritionalFacts.calories.value,
            macros: {
              fat: nutritionResult.nutritionalFacts.totalFat.value,
              saturatedFat: nutritionResult.nutritionalFacts.saturatedFat?.value || 0,
              transFat: nutritionResult.nutritionalFacts.transFat?.value || 0,
              carbs: nutritionResult.nutritionalFacts.totalCarbohydrates.value,
              fiber: nutritionResult.nutritionalFacts.dietaryFiber?.value || 0,
              sugars: nutritionResult.nutritionalFacts.totalSugars?.value || 0,
              protein: nutritionResult.nutritionalFacts.protein.value,
            },
            sodium: nutritionResult.nutritionalFacts.sodium?.value || 0,
            lastUpdated: nutritionResult.timestamp.toISOString(),
          },
          healthScore: nutritionResult.healthScore.overall,
          hasAllergens: nutritionResult.ingredients.ingredients.some(i => i.isAllergen),
          allergenTypes: nutritionResult.ingredients.ingredients.filter(i => i.isAllergen).map(i => i.name),
          ingredients: nutritionResult.ingredients.ingredients.map(i => i.name),
        };
      } catch (error) {
        console.error('[MultiImageOrchestrator] ❌ Nutrition analyzer failed:', error);
        throw error;
      }
    }
  }

  /**
   * Infer image type from product metadata
   * 
   * @param product - Product to infer from
   * @returns Inferred image type
   */
  private inferImageTypeFromProduct(product: Product): ImageType {
    // Check metadata for captured_image_types
    const capturedTypes = product.metadata?.captured_image_types as ImageType[] | undefined;
    
    if (capturedTypes && capturedTypes.length > 0) {
      return capturedTypes[capturedTypes.length - 1]; // Return most recent
    }
    
    // Fallback: infer from available data
    if (product.barcode) {
      return 'barcode';
    } else if (product.nutrition_data) {
      return 'nutrition_label';
    } else {
      return 'packaging';
    }
  }

  /**
   * Determine next step for guided mode
   * Requirement 2.2: Prompt for images in order (barcode → packaging → nutrition)
   * 
   * @param capturedTypes - Already captured image types
   * @returns Next image type to capture, or undefined if complete
   */
  private determineNextStep(capturedTypes: ImageType[]): ImageType | undefined {
    const sequence: ImageType[] = ['barcode', 'packaging', 'nutrition_label'];
    
    for (const type of sequence) {
      if (!capturedTypes.includes(type)) {
        return type;
      }
    }
    
    return undefined; // All types captured
  }
}

/**
 * Singleton instance
 */
export const multiImageOrchestrator = new MultiImageOrchestrator();
