/**
 * MongoDB Cache Service for Multi-Tier Product Identification
 * 
 * This service manages caching of product identification results in MongoDB.
 * Supports caching by barcode and image hash with TTL expiration.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

import { getMongoClient } from './client';
import { CacheEntryDocument, CacheResult, CacheStats } from './types';
import { ProductData, Tier, ConfidenceScore, CacheKeyType } from '@/lib/types/multi-tier';

const CACHE_TTL_DAYS = 90; // Requirement 7.5: 90-day expiration

/**
 * Cache Service class
 * Manages product identification cache in MongoDB
 */
export class CacheService {
  private collectionName = 'cache_entries';

  /**
   * Look up a cached entry by key
   * Requirement 7.1, 7.2: Cache lookup by barcode and image hash
   * Requirement 7.4: Update lastAccessedAt on access
   * Requirement 7.7: Complete within 50ms
   * 
   * @param key - Barcode or image hash
   * @param keyType - Type of key ('barcode' or 'imageHash')
   * @returns Cache result with entry if found
   */
  async lookup(key: string, keyType: CacheKeyType): Promise<CacheResult> {
    const startTime = Date.now();
    
    try {
      const db = await getMongoClient();
      const collection = db.collection<CacheEntryDocument>(this.collectionName);

      // Find entry that hasn't expired
      const entry = await collection.findOne({
        key,
        keyType,
        expiresAt: { $gt: new Date() },
      });

      if (entry) {
        // Update lastAccessedAt and increment accessCount
        // Requirement 7.4: Track access timestamp
        await collection.updateOne(
          { _id: entry._id },
          {
            $set: { lastAccessedAt: new Date() },
            $inc: { accessCount: 1 },
          }
        );

        const duration = Date.now() - startTime;
        console.log(`[Cache Service] ✅ Cache HIT: ${keyType}=${key.substring(0, 16)}... (${duration}ms)`);

        return {
          hit: true,
          entry: {
            ...entry,
            lastAccessedAt: new Date(),
            accessCount: entry.accessCount + 1,
          },
        };
      }

      const duration = Date.now() - startTime;
      console.log(`[Cache Service] ❌ Cache MISS: ${keyType}=${key.substring(0, 16)}... (${duration}ms)`);

      return { hit: false };
    } catch (error) {
      console.error('[Cache Service] Lookup error:', error);
      return { hit: false };
    }
  }

  /**
   * Store a product identification result in cache
   * Requirement 7.1, 7.2: Store by barcode and image hash
   * Requirement 7.3: Include tier, timestamp, and confidence score
   * 
   * @param key - Barcode or image hash
   * @param keyType - Type of key
   * @param productData - Product data to cache
   * @param tier - Tier that produced the result
   * @param confidenceScore - Confidence score of the result
   */
  async store(
    key: string,
    keyType: CacheKeyType,
    productData: ProductData,
    tier: Tier,
    confidenceScore: ConfidenceScore
  ): Promise<void> {
    try {
      const db = await getMongoClient();
      const collection = db.collection<CacheEntryDocument>(this.collectionName);

      const now = new Date();
      const expiresAt = new Date(now.getTime() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);

      const entry: CacheEntryDocument = {
        key,
        keyType,
        productData,
        tier,
        confidenceScore,
        createdAt: now,
        lastAccessedAt: now,
        accessCount: 0,
        expiresAt,
      };

      // Upsert: update if exists, insert if not
      await collection.updateOne(
        { key, keyType },
        { $set: entry },
        { upsert: true }
      );

      console.log(`[Cache Service] 💾 Stored: ${keyType}=${key.substring(0, 16)}..., tier=${tier}, confidence=${confidenceScore.toFixed(2)}`);
    } catch (error) {
      console.error('[Cache Service] Store error:', error);
      throw error;
    }
  }

  /**
   * Invalidate a cache entry
   * Requirement 7.6: Invalidate on product updates or error reports
   * 
   * @param key - Barcode or image hash
   * @param keyType - Type of key
   */
  async invalidate(key: string, keyType: CacheKeyType): Promise<void> {
    try {
      const db = await getMongoClient();
      const collection = db.collection<CacheEntryDocument>(this.collectionName);

      const result = await collection.deleteOne({ key, keyType });

      if (result.deletedCount > 0) {
        console.log(`[Cache Service] 🗑️  Invalidated: ${keyType}=${key.substring(0, 16)}...`);
      } else {
        console.log(`[Cache Service] ⚠️  No entry to invalidate: ${keyType}=${key.substring(0, 16)}...`);
      }
    } catch (error) {
      console.error('[Cache Service] Invalidate error:', error);
      throw error;
    }
  }

  /**
   * Invalidate all cache entries for a product
   * Used when product data is updated
   * Requirement 7.6: Invalidate related entries on product update
   * 
   * @param productId - Product ID to invalidate
   */
  async invalidateByProductId(productId: string): Promise<void> {
    try {
      const db = await getMongoClient();
      const collection = db.collection<CacheEntryDocument>(this.collectionName);

      const result = await collection.deleteMany({
        'productData.id': productId,
      });

      console.log(`[Cache Service] 🗑️  Invalidated ${result.deletedCount} entries for product ${productId}`);
    } catch (error) {
      console.error('[Cache Service] Invalidate by product ID error:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   * Useful for monitoring and optimization
   * 
   * @returns Cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      const db = await getMongoClient();
      const collection = db.collection<CacheEntryDocument>(this.collectionName);

      const [totalEntries, barcodeEntries, imageHashEntries, avgAccessCount, oldestEntry, newestEntry] = await Promise.all([
        collection.countDocuments(),
        collection.countDocuments({ keyType: 'barcode' }),
        collection.countDocuments({ keyType: 'imageHash' }),
        collection.aggregate([
          { $group: { _id: null, avg: { $avg: '$accessCount' } } }
        ]).toArray().then(result => result[0]?.avg || 0),
        collection.findOne({}, { sort: { createdAt: 1 } }),
        collection.findOne({}, { sort: { createdAt: -1 } }),
      ]);

      return {
        totalEntries,
        barcodeEntries,
        imageHashEntries,
        avgAccessCount,
        oldestEntry: oldestEntry?.createdAt || null,
        newestEntry: newestEntry?.createdAt || null,
      };
    } catch (error) {
      console.error('[Cache Service] Get stats error:', error);
      throw error;
    }
  }

  /**
   * Clear all expired entries manually
   * TTL index handles this automatically, but this can be used for testing
   */
  async clearExpired(): Promise<number> {
    try {
      const db = await getMongoClient();
      const collection = db.collection<CacheEntryDocument>(this.collectionName);

      const result = await collection.deleteMany({
        expiresAt: { $lte: new Date() },
      });

      console.log(`[Cache Service] 🗑️  Cleared ${result.deletedCount} expired entries`);
      return result.deletedCount;
    } catch (error) {
      console.error('[Cache Service] Clear expired error:', error);
      throw error;
    }
  }

  /**
   * Get a snapshot of a cache entry for rollback purposes
   * Requirement 12.5: Support rollback operations
   * 
   * @param key - Barcode or image hash
   * @param keyType - Type of key
   * @returns Cache entry snapshot or null if not found
   */
  async getSnapshot(key: string, keyType: CacheKeyType): Promise<CacheEntryDocument | null> {
    try {
      const db = await getMongoClient();
      const collection = db.collection<CacheEntryDocument>(this.collectionName);

      const entry = await collection.findOne({
        key,
        keyType,
      });

      return entry;
    } catch (error) {
      console.error('[Cache Service] Get snapshot error:', error);
      return null;
    }
  }

  /**
   * Restore a cache entry from a snapshot
   * Requirement 12.5: Support rollback operations
   * 
   * @param snapshot - Cache entry snapshot to restore
   */
  async restoreSnapshot(snapshot: CacheEntryDocument): Promise<void> {
    try {
      const db = await getMongoClient();
      const collection = db.collection<CacheEntryDocument>(this.collectionName);

      await collection.updateOne(
        { key: snapshot.key, keyType: snapshot.keyType },
        { $set: snapshot },
        { upsert: true }
      );

      console.log(`[Cache Service] 🔄 Restored snapshot: ${snapshot.keyType}=${snapshot.key.substring(0, 16)}...`);
    } catch (error) {
      console.error('[Cache Service] Restore snapshot error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();
