/**
 * ProductMatcher - Product Matching Service
 * 
 * Determines if a newly captured image belongs to an existing product.
 * Uses multiple matching strategies with confidence scoring.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { ProductRepositoryMultiTier, ProductSearchResult } from '@/lib/supabase/repositories/ProductRepositoryMultiTier';
import { Product } from '@/lib/supabase/types';
import { CaptureSession } from './SessionManager';
import { monitoringService } from './MonitoringService';

/**
 * Image metadata for matching
 */
export interface ImageMetadata {
  barcode?: string;
  productName?: string;
  brandName?: string;
  imageHash?: string;
}

/**
 * Match result with confidence and method
 */
export interface MatchResult {
  matched: boolean;
  productId?: string;
  confidence: number; // 0.0 to 1.0
  matchMethod: 'barcode' | 'visual_similarity' | 'product_name' | 'session';
  product?: Product;
}

/**
 * ProductMatcher class
 * 
 * Implements intelligent product matching with multiple strategies:
 * 1. Session context (confidence 1.0)
 * 2. Barcode matching (confidence 1.0)
 * 3. Visual similarity + product name (variable confidence)
 * 
 * Applies 85% confidence threshold for matches.
 */
export class ProductMatcher {
  private repository: ProductRepositoryMultiTier;
  private readonly CONFIDENCE_THRESHOLD = 0.85;

  constructor(repository?: ProductRepositoryMultiTier) {
    this.repository = repository || new ProductRepositoryMultiTier();
  }

  /**
   * Match image to existing product
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   * 
   * Matching priority:
   * 1. Session context (1.0) - if active session has productId
   * 2. Barcode (1.0) - if image contains barcode
   * 3. Visual + name (variable) - similarity search
   * 
   * @param imageType - Type of image (barcode, packaging, nutrition_label)
   * @param metadata - Image metadata extracted from analysis
   * @param activeSession - Optional active capture session
   * @returns Promise resolving to MatchResult
   */
  async matchProduct(
    imageType: 'barcode' | 'packaging' | 'nutrition_label',
    metadata: ImageMetadata,
    activeSession?: CaptureSession
  ): Promise<MatchResult> {
    console.log('[ProductMatcher] 🔍 Matching product:', {
      imageType,
      metadata,
      hasSession: !!activeSession,
      sessionProductId: activeSession?.productId,
    });

    // Strategy 1: Session context matching (highest priority)
    // Requirement 5.1: Check if image belongs to existing session product
    if (activeSession?.productId) {
      console.log('[ProductMatcher] ✅ Session context match');
      const product = await this.repository.findById(activeSession.productId);
      
      if (product) {
        return {
          matched: true,
          productId: product.id,
          confidence: 1.0,
          matchMethod: 'session',
          product,
        };
      }
    }

    // Strategy 2: Barcode matching (primary key)
    // Requirement 5.2, 12.3: Use barcode as primary matching key with error handling
    if (metadata.barcode) {
      try {
        const barcodeMatch = await this.matchByBarcode(metadata.barcode);
        if (barcodeMatch.matched) {
          return barcodeMatch;
        }
      } catch (error) {
        console.error('[ProductMatcher] ⚠️  Barcode matching failed, continuing with fallback:', error);
        // Don't throw - continue to visual matching fallback
      }
    }

    // Strategy 3: Visual similarity + product name matching (fallback)
    // Requirement 5.3, 12.3: Use visual similarity and product name for non-barcode images
    if (metadata.imageHash && metadata.productName) {
      try {
        const visualMatch = await this.matchByVisualAndName(
          metadata.imageHash,
          metadata.productName,
          metadata.brandName
        );
        
        // Requirement 5.4: Return match only if confidence >= 85%
        if (visualMatch.matched && visualMatch.confidence >= this.CONFIDENCE_THRESHOLD) {
          return visualMatch;
        }
        
        // Requirement 12.3: Handle ambiguous match (confidence close to threshold)
        if (visualMatch.confidence >= 0.80 && visualMatch.confidence < this.CONFIDENCE_THRESHOLD) {
          console.warn('[ProductMatcher] ⚠️  Ambiguous match near threshold:', {
            confidence: visualMatch.confidence,
            threshold: this.CONFIDENCE_THRESHOLD,
          });
        }
      } catch (error) {
        console.error('[ProductMatcher] ⚠️  Visual matching failed:', error);
        // Don't throw - return no match instead
      }
    }

    // Requirement 5.5, 12.3: No match found, return unmatched result (will create new product)
    console.log('[ProductMatcher] ❌ No match found above threshold');
    return {
      matched: false,
      confidence: 0.0,
      matchMethod: 'visual_similarity',
    };
  }

  /**
   * Match by barcode (primary key)
   * Requirement 5.2: Use barcode value as primary matching key
   * 
   * @param barcode - Barcode value to search for
   * @returns Promise resolving to MatchResult
   */
  async matchByBarcode(barcode: string): Promise<MatchResult> {
    try {
      console.log('[ProductMatcher] 🔍 Matching by barcode:', barcode);
      
      const product = await this.repository.findByBarcode(barcode);
      
      if (product) {
        console.log('[ProductMatcher] ✅ Barcode match found:', product.name);
        return {
          matched: true,
          productId: product.id,
          confidence: 1.0,
          matchMethod: 'barcode',
          product,
        };
      }
      
      console.log('[ProductMatcher] ❌ No barcode match found');
      return {
        matched: false,
        confidence: 0.0,
        matchMethod: 'barcode',
      };
    } catch (error) {
      console.error('[ProductMatcher] Error matching by barcode:', error);
      return {
        matched: false,
        confidence: 0.0,
        matchMethod: 'barcode',
      };
    }
  }

  /**
   * Match by visual similarity + product name
   * Requirement 5.3: Use visual similarity and product name matching for fallback
   * 
   * @param imageHash - SHA-256 hash of image
   * @param productName - Product name from image analysis
   * @param brand - Optional brand name
   * @returns Promise resolving to MatchResult
   */
  async matchByVisualAndName(
    imageHash: string,
    productName: string,
    brand?: string
  ): Promise<MatchResult> {
    try {
      console.log('[ProductMatcher] 🔍 Matching by visual + name:', {
        productName,
        brand,
        imageHash: imageHash.substring(0, 16) + '...',
      });
      
      // Use existing searchByMetadata for similarity search
      const results = await this.repository.searchByMetadata({
        productName,
        brandName: brand,
        keywords: [], // Empty keywords array as it's not used for this search
      });
      
      if (results.length === 0) {
        console.log('[ProductMatcher] ❌ No visual + name matches found');
        return {
          matched: false,
          confidence: 0.0,
          matchMethod: 'visual_similarity',
        };
      }
      
      // Get best match (highest similarity score)
      const bestMatch = results[0];
      const confidence = bestMatch.similarity_score;
      
      console.log('[ProductMatcher] 📊 Best match:', {
        product: bestMatch.name,
        confidence,
        threshold: this.CONFIDENCE_THRESHOLD,
      });
      
      // Requirement 5.4: Return match only if confidence >= 85%
      if (confidence >= this.CONFIDENCE_THRESHOLD) {
        console.log('[ProductMatcher] ✅ Visual + name match found');
        return {
          matched: true,
          productId: bestMatch.id,
          confidence,
          matchMethod: 'visual_similarity',
          product: bestMatch,
        };
      }
      
      console.log('[ProductMatcher] ❌ Match confidence below threshold');
      return {
        matched: false,
        confidence,
        matchMethod: 'visual_similarity',
      };
    } catch (error) {
      console.error('[ProductMatcher] Error matching by visual + name:', error);
      return {
        matched: false,
        confidence: 0.0,
        matchMethod: 'visual_similarity',
      };
    }
  }
}

/**
 * Singleton instance
 */
export const productMatcher = new ProductMatcher();
