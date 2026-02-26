/**
 * Discovery Service
 * 
 * Tier 3: Uses Barcode Lookup API to discover barcodes for products
 * identified through visual text extraction.
 */

import type { ProductMetadata, ProductData } from '../types/multi-tier';
import { barcodeLookupClient, type BarcodeLookupResult } from './barcode-lookup-client';
import { productRepositoryMultiTier } from '../supabase/repositories/ProductRepositoryMultiTier';
import { cacheService } from '../mongodb/cache-service';

/**
 * Supported barcode formats
 */
const VALID_BARCODE_FORMATS = [
  'UPC-A',
  'UPC-E',
  'EAN-8',
  'EAN-13',
  'Code-39',
  'Code-93',
  'Code-128',
  'ITF',
  'QR'
];

/**
 * Discovery result with barcode and confidence
 */
export interface DiscoveryResult {
  barcode: string;
  format: string;
  confidence: number;
  product: ProductData;
  processingTimeMs: number;
}

/**
 * Discovery Service for Tier 3 barcode discovery
 */
export class DiscoveryService {
  /**
   * Discover barcode for a product using metadata
   */
  async discoverBarcode(
    metadata: ProductMetadata,
    imageHash?: string
  ): Promise<DiscoveryResult | null> {
    const startTime = Date.now();

    try {
      console.log('[Discovery Service] 🔍 Starting barcode discovery');

      // Search Barcode Lookup API
      const results = await barcodeLookupClient.searchProducts(metadata);

      if (results.length === 0) {
        console.log('[Discovery Service] ❌ No barcodes found');
        return null;
      }

      // Validate and filter results
      const validResults = results.filter(result => 
        this.isValidBarcode(result.barcode, result.format)
      );

      if (validResults.length === 0) {
        console.log('[Discovery Service] ❌ No valid barcodes found');
        return null;
      }

      // Select highest confidence result
      const bestResult = this.selectBestResult(validResults, metadata);

      console.log(`[Discovery Service] ✅ Found barcode: ${bestResult.barcode} (confidence: ${bestResult.confidence})`);

      // Create product data
      const productData: ProductData = {
        id: '', // Will be set by repository
        barcode: bestResult.barcode,
        name: bestResult.product_name || metadata.productName || 'Unknown Product',
        brand: bestResult.brand || metadata.brandName || 'Unknown Brand',
        size: metadata.size,
        category: bestResult.category || metadata.category || 'Unknown',
        imageUrl: metadata.imageUrl,
        metadata: {
          ...metadata,
          discoveredBarcode: true,
          barcodeFormat: bestResult.format,
        },
      };

      // Save to database
      await this.persistDiscoveredBarcode(productData, imageHash);

      const processingTimeMs = Date.now() - startTime;

      return {
        barcode: bestResult.barcode,
        format: bestResult.format,
        confidence: bestResult.confidence,
        product: productData,
        processingTimeMs,
      };

    } catch (error) {
      console.error('[Discovery Service] ❌ Error:', error);
      throw error;
    }
  }

  /**
   * Validate barcode format
   */
  private isValidBarcode(barcode: string, format: string): boolean {
    if (!barcode || !format) return false;

    // Check format is supported
    if (!VALID_BARCODE_FORMATS.includes(format)) {
      console.log(`[Discovery Service] Invalid format: ${format}`);
      return false;
    }

    // Basic validation by format
    switch (format) {
      case 'UPC-A':
        return /^\d{12}$/.test(barcode);
      case 'UPC-E':
        return /^\d{6,8}$/.test(barcode);
      case 'EAN-8':
        return /^\d{8}$/.test(barcode);
      case 'EAN-13':
        return /^\d{13}$/.test(barcode);
      case 'Code-39':
      case 'Code-93':
      case 'Code-128':
        return /^[A-Z0-9\-\.\$\/\+\%\s]+$/.test(barcode);
      case 'ITF':
        return /^\d+$/.test(barcode) && barcode.length % 2 === 0;
      case 'QR':
        return barcode.length > 0;
      default:
        return false;
    }
  }

  /**
   * Select best result from multiple candidates
   */
  private selectBestResult(
    results: BarcodeLookupResult[],
    metadata: ProductMetadata
  ): BarcodeLookupResult {
    // Calculate match scores for each result
    const scoredResults = results.map(result => {
      let score = result.confidence || 0.5;

      // Boost score if names match
      if (metadata.productName && result.product_name) {
        const nameSimilarity = this.calculateSimilarity(
          metadata.productName.toLowerCase(),
          result.product_name.toLowerCase()
        );
        score += nameSimilarity * 0.3;
      }

      // Boost score if brands match
      if (metadata.brandName && result.brand) {
        const brandSimilarity = this.calculateSimilarity(
          metadata.brandName.toLowerCase(),
          result.brand.toLowerCase()
        );
        score += brandSimilarity * 0.2;
      }

      return { result, score };
    });

    // Sort by score descending
    scoredResults.sort((a, b) => b.score - a.score);

    const best = scoredResults[0];
    console.log(`[Discovery Service] Selected result with score: ${best.score.toFixed(2)}`);

    return {
      ...best.result,
      confidence: Math.min(best.score, 1.0),
    };
  }

  /**
   * Calculate string similarity (simple Jaccard similarity)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * Persist discovered barcode to database and cache
   */
  private async persistDiscoveredBarcode(
    productData: ProductData,
    imageHash?: string
  ): Promise<void> {
    try {
      // Save to database (upsert by barcode)
      const savedProduct = await productRepositoryMultiTier.upsertByBarcode(productData);
      productData.id = savedProduct.id;

      console.log(`[Discovery Service] 💾 Saved product: ${savedProduct.id}`);

      // Update cache with barcode
      await cacheService.store(
        productData.barcode,
        'barcode',
        productData,
        3, // tier 3
        productData.metadata?.confidence || 0.7
      );

      // Also cache by image hash if available
      if (imageHash) {
        await cacheService.store(
          imageHash,
          'imageHash',
          productData,
          3,
          productData.metadata?.confidence || 0.7
        );
      }

      console.log('[Discovery Service] ✅ Cache updated');

    } catch (error) {
      console.error('[Discovery Service] ❌ Failed to persist:', error);
      throw error;
    }
  }
}

// Singleton instance
export const discoveryService = new DiscoveryService();
