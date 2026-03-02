/**
 * DataMerger - Multi-Image Data Merging Service
 * 
 * Combines data from multiple images (barcode, packaging, nutrition) into single Product_Record.
 * Applies field priority rules and conflict resolution.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 9.2, 9.3, 13.1, 13.2, 13.3, 13.4, 15.1, 15.2, 15.3, 15.4, 15.5
 */

import { Product, ProductInsert, ProductUpdate, ProductNutritionData } from '@/lib/supabase/types';
import { ProductRepositoryMultiTier } from '@/lib/supabase/repositories/ProductRepositoryMultiTier';
import { cacheService } from '@/lib/mongodb/cache-service';
import { monitoringService } from './MonitoringService';

/**
 * Image type enumeration
 */
export type ImageType = 'barcode' | 'packaging' | 'nutrition_label';

/**
 * Image analysis result from analyzers
 */
export interface ImageAnalysisResult {
  // Common fields
  imageHash: string;
  timestamp: Date;
  
  // Product identification (from barcode or packaging)
  barcode?: string;
  productName?: string;
  brandName?: string;
  
  // Product metadata (from packaging)
  size?: string;
  category?: string;
  dimensions?: {
    width?: number;
    height?: number;
    depth?: number;
    unit?: string;
  };
  imageUrl?: string;
  
  // Nutritional data (from nutrition label)
  nutritionData?: ProductNutritionData;
  healthScore?: number;
  hasAllergens?: boolean;
  allergenTypes?: string[];
  ingredients?: string[];
  
  // Additional metadata
  metadata?: Record<string, any>;
}

/**
 * Conflict information
 */
export interface ConflictInfo {
  field: string;
  values: Array<{
    value: any;
    source: ImageType;
    timestamp: Date;
  }>;
}

/**
 * Consistency validation result
 */
export interface ConsistencyResult {
  consistent: boolean;
  confidence: number;
  warning?: string;
}

/**
 * Merge result
 */
export interface MergeResult {
  product: Product;
  conflicts: ConflictInfo[];
  confidenceScore: number;
}

/**
 * DataMerger class
 * 
 * Implements intelligent data merging with field priority rules:
 * - Product identification: Barcode > Packaging > Nutrition
 * - Product metadata: Packaging > Barcode
 * - Nutritional data: Nutrition only
 * 
 * Conflict resolution: Most recent data wins
 */
export class DataMerger {
  private repository: ProductRepositoryMultiTier;

  constructor(repository?: ProductRepositoryMultiTier) {
    this.repository = repository || new ProductRepositoryMultiTier();
  }

  /**
   * Merge data from multiple images
   * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
   * 
   * @param existingProduct - Existing product or null for new product
   * @param newImageData - New image analysis result
   * @param imageType - Type of image (barcode, packaging, nutrition_label)
   * @returns Promise resolving to MergeResult
   */
  async mergeImages(
    existingProduct: Product | null,
    newImageData: ImageAnalysisResult,
    imageType: ImageType
  ): Promise<MergeResult> {
    console.log('[DataMerger] 🔄 Merging image data:', {
      imageType,
      hasExisting: !!existingProduct,
      existingId: existingProduct?.id,
      newData: {
        productName: newImageData.productName,
        brandName: newImageData.brandName,
        barcode: newImageData.barcode,
        size: newImageData.size,
        category: newImageData.category,
      },
    });

    const conflicts: ConflictInfo[] = [];
    let mergedData: ProductUpdate | ProductInsert;

    if (existingProduct) {
      // Update existing product
      mergedData = await this.mergeWithExisting(
        existingProduct,
        newImageData,
        imageType,
        conflicts
      );
    } else {
      // Create new product
      mergedData = this.createFromImage(newImageData, imageType);
    }

    // Update captured_images array
    // Requirement 6.6, 9.2: Preserve all image references
    const capturedImages = [
      ...(existingProduct?.metadata?.captured_images || []),
      {
        imageHash: newImageData.imageHash,
        imageType,
        timestamp: newImageData.timestamp.toISOString(),
      },
    ];

    // Update captured_image_types array (unique values)
    // Requirements 13.1, 13.2, 13.3
    const capturedImageTypes = Array.from(
      new Set([
        ...(existingProduct?.metadata?.captured_image_types || []),
        imageType,
      ])
    );

    // Determine completeness status
    // Requirement 13.4: Mark complete when all three types captured
    const completenessStatus = capturedImageTypes.length === 3 ? 'complete' : 'incomplete';

    // Update metadata with multi-image fields
    mergedData.metadata = {
      ...(mergedData.metadata || {}),
      captured_images: capturedImages,
      captured_image_types: capturedImageTypes,
      completeness_status: completenessStatus,
    };

    // Validate consistency and calculate confidence score
    // Requirements 15.1, 15.5
    const confidenceScore = this.calculateConfidenceScore(conflicts);

    // Flag for review if consistency is low
    // Requirement 15.3
    if (confidenceScore < 0.7) {
      mergedData.flagged_for_review = true;
      console.log('[DataMerger] ⚠️  Low confidence, flagging for review');
    }

    // Save to database with retry logic
    // Requirement 12.4: Handle database update failure with retry and backoff
    let product: Product;
    let dbRetryCount = 0;
    const MAX_DB_RETRIES = 3;
    
    while (dbRetryCount < MAX_DB_RETRIES) {
      try {
        if (existingProduct) {
          product = await this.repository.update(existingProduct.id, mergedData);
          console.log('[DataMerger] ✅ Updated product:', product.id);
        } else {
          product = await this.repository.create(mergedData as ProductInsert);
          console.log('[DataMerger] ✅ Created product:', product.id);
        }
        break; // Success, exit retry loop
      } catch (error) {
        dbRetryCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[DataMerger] ❌ Database operation failed (attempt ${dbRetryCount}/${MAX_DB_RETRIES}):`, error);
        
        if (dbRetryCount >= MAX_DB_RETRIES) {
          // Requirement 12.4: Store in cache as pending if database update fails
          monitoringService.logDatabaseUpdateFailure(
            existingProduct ? 'update' : 'create',
            errorMessage,
            existingProduct?.id
          );
          
          // Store in cache as pending
          try {
            await cacheService.store(
              newImageData.imageHash,
              'imageHash',
              { ...mergedData, id: existingProduct?.id || 'pending-' + Date.now() } as any,
              1,
              confidenceScore
            );
            console.log('[DataMerger] ✅ Stored in cache as pending');
          } catch (cacheError) {
            console.error('[DataMerger] ❌ Failed to store in cache:', cacheError);
          }
          
          throw new Error('Failed to save product to database. Data cached for later sync.');
        }
        
        // Exponential backoff: 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, dbRetryCount - 1) * 1000));
      }
    }

    // Update cache
    // Requirement 12.4: Handle cache update failure (log error, continue with Supabase only)
    try {
      await this.updateCache(product!, newImageData.imageHash);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      monitoringService.logCacheUpdateFailure(errorMessage, newImageData.imageHash);
      console.error('[DataMerger] ⚠️  Cache update failed, continuing with Supabase only:', error);
      // Don't throw - cache failure should not block workflow
    }

    return {
      product: product!,
      conflicts,
      confidenceScore,
    };
  }

  /**
   * Merge new image data with existing product
   * Requirements: 6.2, 6.3, 6.4, 6.5
   * 
   * @param existing - Existing product
   * @param newData - New image data
   * @param imageType - Image type
   * @param conflicts - Array to collect conflicts
   * @returns ProductUpdate object
   */
  private async mergeWithExisting(
    existing: Product,
    newData: ImageAnalysisResult,
    imageType: ImageType,
    conflicts: ConflictInfo[]
  ): Promise<ProductUpdate> {
    const update: ProductUpdate = {};

    // Field priority rules:
    // - Product identification: Barcode > Packaging > Nutrition
    // - Product metadata: Packaging > Barcode
    // - Nutritional data: Nutrition only

    // Product identification fields
    // Requirement 6.2: Populate from Barcode_Analyzer results
    if (imageType === 'barcode') {
      if (newData.barcode && newData.barcode !== existing.barcode) {
        this.handleConflict(
          conflicts,
          'barcode',
          existing.barcode,
          newData.barcode,
          'existing',
          imageType,
          existing.updated_at,
          newData.timestamp
        );
        update.barcode = newData.barcode; // Most recent wins
      }
      
      if (newData.productName) {
        // Update if different OR if existing is placeholder
        if (newData.productName !== existing.name || existing.name === 'Unknown Product') {
          this.handleConflict(
            conflicts,
            'name',
            existing.name,
            newData.productName,
            'existing',
            imageType,
            existing.updated_at,
            newData.timestamp
          );
        }
        update.name = newData.productName;
      }
      
      if (newData.brandName) {
        // Update if different OR if existing is placeholder
        if (newData.brandName !== existing.brand || existing.brand === 'Unknown Brand') {
          this.handleConflict(
            conflicts,
            'brand',
            existing.brand,
            newData.brandName,
            'existing',
            imageType,
            existing.updated_at,
            newData.timestamp
          );
        }
        update.brand = newData.brandName;
      }
    }

    // Product metadata fields
    // Requirement 6.3: Populate from Packaging_Analyzer results
    if (imageType === 'packaging') {
      console.log('[DataMerger] 📦 Processing packaging data:', {
        newProductName: newData.productName,
        existingName: existing.name,
        newBrandName: newData.brandName,
        existingBrand: existing.brand,
      });
      
      // Packaging has priority for metadata
      if (newData.productName) {
        // Update if different OR if existing is placeholder
        if (newData.productName !== existing.name || existing.name === 'Unknown Product') {
          this.handleConflict(
            conflicts,
            'name',
            existing.name,
            newData.productName,
            'existing',
            imageType,
            existing.updated_at,
            newData.timestamp
          );
        }
        update.name = newData.productName;
        console.log('[DataMerger] ✅ Updating name to:', newData.productName);
      }
      
      if (newData.brandName) {
        // Update if different OR if existing is placeholder
        if (newData.brandName !== existing.brand || existing.brand === 'Unknown Brand') {
          this.handleConflict(
            conflicts,
            'brand',
            existing.brand,
            newData.brandName,
            'existing',
            imageType,
            existing.updated_at,
            newData.timestamp
          );
        }
        update.brand = newData.brandName;
        console.log('[DataMerger] ✅ Updating brand to:', newData.brandName);
      }
      
      if (newData.size) {
        update.size = newData.size;
      }
      
      if (newData.category) {
        update.category = newData.category;
      }
      
      if (newData.imageUrl) {
        update.image_url = newData.imageUrl;
      }
      
      // Merge dimensions into metadata
      if (newData.dimensions) {
        update.metadata = {
          ...(existing.metadata || {}),
          dimensions: newData.dimensions,
        };
      }
    }

    // Nutritional data fields
    // Requirement 6.4: Populate from Nutrition_Analyzer results
    if (imageType === 'nutrition_label') {
      if (newData.nutritionData) {
        update.nutrition_data = newData.nutritionData;
      }
      
      if (newData.healthScore !== undefined) {
        update.health_score = newData.healthScore;
      }
      
      if (newData.hasAllergens !== undefined) {
        update.has_allergens = newData.hasAllergens;
      }
      
      if (newData.allergenTypes) {
        update.allergen_types = newData.allergenTypes;
      }
    }

    // Merge additional metadata
    if (newData.metadata) {
      update.metadata = {
        ...(existing.metadata || {}),
        ...(update.metadata || {}),
        ...newData.metadata,
      };
    }

    return update;
  }

  /**
   * Create new product from image data
   * 
   * @param data - Image analysis result
   * @param imageType - Image type
   * @returns ProductInsert object
   */
  private createFromImage(
    data: ImageAnalysisResult,
    imageType: ImageType
  ): ProductInsert {
    const product: ProductInsert = {
      name: data.productName || 'Unknown Product',
      brand: data.brandName || 'Unknown Brand',
      barcode: data.barcode,
      size: data.size,
      category: data.category,
      image_url: data.imageUrl,
      metadata: data.metadata || {},
    };

    // Add nutritional data if from nutrition label
    if (imageType === 'nutrition_label') {
      product.nutrition_data = data.nutritionData;
      product.health_score = data.healthScore;
      product.has_allergens = data.hasAllergens || false;
      product.allergen_types = data.allergenTypes || [];
    }

    return product;
  }

  /**
   * Handle field conflict
   * Requirements: 6.5, 15.4
   * 
   * @param conflicts - Array to collect conflicts
   * @param field - Field name
   * @param existingValue - Existing value
   * @param newValue - New value
   * @param existingSource - Source of existing value
   * @param newSource - Source of new value
   * @param existingTimestamp - Timestamp of existing value
   * @param newTimestamp - Timestamp of new value
   */
  private handleConflict(
    conflicts: ConflictInfo[],
    field: string,
    existingValue: any,
    newValue: any,
    existingSource: string,
    newSource: ImageType,
    existingTimestamp: string | Date,
    newTimestamp: Date
  ): void {
    // Requirement 15.1: Validate consistency
    const consistency = this.validateConsistency(
      field,
      existingValue,
      newValue,
      existingSource,
      newSource
    );

    if (!consistency.consistent) {
      // Requirement 15.2: Log consistency warning
      console.warn('[DataMerger] ⚠️  Consistency warning:', {
        field,
        existingValue,
        newValue,
        warning: consistency.warning,
      });
      
      // Log to monitoring service
      monitoringService.logDataConsistencyWarning(
        field,
        existingValue,
        newValue,
        consistency.warning || 'Data inconsistency detected'
      );

      // Requirement 15.4: Store conflicting values with sources
      conflicts.push({
        field,
        values: [
          {
            value: existingValue,
            source: existingSource as ImageType,
            timestamp: new Date(existingTimestamp),
          },
          {
            value: newValue,
            source: newSource,
            timestamp: newTimestamp,
          },
        ],
      });
    }
  }

  /**
   * Validate consistency between overlapping fields
   * Requirements: 15.1, 15.2, 15.3
   * 
   * @param field - Field name
   * @param existingValue - Existing value
   * @param newValue - New value
   * @param existingSource - Source of existing value
   * @param newSource - Source of new value
   * @returns ConsistencyResult
   */
  validateConsistency(
    field: string,
    existingValue: any,
    newValue: any,
    existingSource: string,
    newSource: ImageType
  ): ConsistencyResult {
    // If values are identical, consistent
    if (existingValue === newValue) {
      return {
        consistent: true,
        confidence: 1.0,
      };
    }

    // Product name consistency check
    // Requirement 15.2: Log warning for product name conflicts
    if (field === 'name') {
      const similarity = this.calculateStringSimilarity(
        String(existingValue).toLowerCase(),
        String(newValue).toLowerCase()
      );
      
      if (similarity < 0.7) {
        // Requirement 12.4: Handle conflicting product names
        console.warn('[DataMerger] ⚠️  Product name conflict detected:', {
          existingValue,
          newValue,
          similarity,
        });
        
        return {
          consistent: false,
          confidence: similarity,
          warning: `Product name mismatch: "${existingValue}" vs "${newValue}" - using barcode database name`,
        };
      }
      
      return {
        consistent: true,
        confidence: similarity,
      };
    }

    // Barcode consistency check
    if (field === 'barcode') {
      return {
        consistent: false,
        confidence: 0.0,
        warning: `Barcode mismatch: "${existingValue}" vs "${newValue}"`,
      };
    }

    // Default: values differ but not critical
    return {
      consistent: false,
      confidence: 0.5,
      warning: `Field "${field}" differs: "${existingValue}" vs "${newValue}"`,
    };
  }

  /**
   * Calculate string similarity (simple Levenshtein-based)
   * 
   * @param str1 - First string
   * @param str2 - Second string
   * @returns Similarity score (0.0 to 1.0)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) {
      return 1.0;
    }
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * 
   * @param str1 - First string
   * @param str2 - Second string
   * @returns Edit distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate confidence score based on conflicts
   * Requirement 15.5: Apply confidence score based on consistency
   * 
   * @param conflicts - Array of conflicts
   * @returns Confidence score (0.0 to 1.0)
   */
  private calculateConfidenceScore(conflicts: ConflictInfo[]): number {
    if (conflicts.length === 0) {
      return 1.0;
    }
    
    // Reduce confidence by 0.15 for each conflict, minimum 0.4
    const reduction = conflicts.length * 0.15;
    return Math.max(0.4, 1.0 - reduction);
  }

  /**
   * Update MongoDB cache with new image hash
   * Requirement 9.3: Maintain image hash associations
   * 
   * @param product - Product to cache
   * @param imageHash - Image hash to associate
   */
  private async updateCache(product: Product, imageHash: string): Promise<void> {
    try {
      // Convert Product to ProductData format (null -> undefined for optional fields)
      const productData = {
        ...product,
        barcode: product.barcode ?? undefined,
        size: product.size ?? undefined,
        category: product.category ?? undefined,
        image_url: product.image_url ?? undefined,
        metadata: product.metadata ?? undefined,
        nutrition_data: product.nutrition_data ?? undefined,
        health_score: product.health_score ?? undefined,
      };
      
      await cacheService.store(
        imageHash,
        'imageHash',
        productData as any, // Type assertion needed due to Product vs ProductData differences
        1, // tier (not used for multi-image)
        1.0 // confidence
      );
      console.log('[DataMerger] ✅ Updated cache for image hash');
    } catch (error) {
      // Cache update failure is not critical
      console.error('[DataMerger] ⚠️  Cache update failed:', error);
    }
  }
}

/**
 * Singleton instance
 */
export const dataMerger = new DataMerger();
