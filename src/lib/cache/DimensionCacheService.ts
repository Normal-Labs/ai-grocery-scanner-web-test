/**
 * Dimension Cache Service
 * 
 * Manages caching of dimension analysis results in MongoDB.
 * Implements 30-day TTL expiration and atomic access tracking.
 * 
 * Requirements: 2.1, 2.3, 2.4, 2.5, 10.1, 10.2, 10.3, 10.7, 13.3, 13.4
 */

import { getMongoClient } from '@/lib/mongodb/client';
import {
  DimensionCacheEntry,
  DimensionCacheLookupResult,
  DimensionAnalysisResult,
} from '@/lib/types/dimension-analysis';

const CACHE_TTL_DAYS = 30; // Requirement 2.7: 30-day expiration

/**
 * Dimension Cache Service class
 * Manages dimension analysis cache in MongoDB
 */
export class DimensionCacheService {
  private collectionName = 'dimension_analysis';

  /**
   * Ensure indexes are created on the collection
   * Requirements: 10.1, 10.2, 10.3
   */
  private async ensureIndexes(): Promise<void> {
    try {
      const db = await getMongoClient();
      const collection = db.collection<DimensionCacheEntry>(this.collectionName);

      // Unique index on productId (Requirement 10.2)
      await collection.createIndex(
        { productId: 1 },
        { unique: true }
      );

      // TTL index on expiresAt (Requirement 10.3)
      await collection.createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0 }
      );

      // Index on lastAccessedAt for access tracking
      await collection.createIndex(
        { lastAccessedAt: 1 }
      );

      console.log('[Dimension Cache] ✅ Indexes ensured');
    } catch (error) {
      // Indexes may already exist, log but don't throw
      console.log('[Dimension Cache] Indexes already exist or error:', error);
    }
  }

  /**
   * Look up a cached dimension analysis by product ID
   * Requirements: 2.1, 2.2, 2.5
   * 
   * @param productId - Product ID to look up
   * @returns Cache lookup result with entry if found
   */
  async lookup(productId: string): Promise<DimensionCacheLookupResult> {
    const startTime = Date.now();

    try {
      await this.ensureIndexes();

      const db = await getMongoClient();
      const collection = db.collection<DimensionCacheEntry>(this.collectionName);

      const entry = await collection.findOne({ productId });

      if (!entry) {
        const duration = Date.now() - startTime;
        console.log(`[Dimension Cache] ❌ Cache MISS: productId=${productId.substring(0, 16)}... (${duration}ms)`);
        return { found: false, expired: false };
      }

      // Check if entry is expired (> 30 days old)
      const now = new Date();
      const expired = entry.expiresAt < now;

      if (expired) {
        const duration = Date.now() - startTime;
        console.log(`[Dimension Cache] ⏰ Cache EXPIRED: productId=${productId.substring(0, 16)}... (${duration}ms)`);
        return { found: true, entry, expired: true };
      }

      const duration = Date.now() - startTime;
      console.log(`[Dimension Cache] ✅ Cache HIT: productId=${productId.substring(0, 16)}... (${duration}ms)`);

      return { found: true, entry, expired: false };
    } catch (error) {
      console.error('[Dimension Cache] Lookup error:', error);
      return { found: false, expired: false };
    }
  }

  /**
   * Store a dimension analysis result in cache
   * Requirements: 2.3, 2.4, 10.4, 10.5, 10.6
   * 
   * @param entry - Dimension cache entry to store
   */
  async store(entry: Omit<DimensionCacheEntry, '_id'>): Promise<void> {
    try {
      await this.ensureIndexes();

      const db = await getMongoClient();
      const collection = db.collection<DimensionCacheEntry>(this.collectionName);

      // Upsert: update if exists, insert if not
      await collection.updateOne(
        { productId: entry.productId },
        { $set: entry },
        { upsert: true }
      );

      console.log(`[Dimension Cache] 💾 Stored: productId=${entry.productId.substring(0, 16)}..., confidence=${entry.overallConfidence.toFixed(2)}`);
    } catch (error) {
      console.error('[Dimension Cache] Store error:', error);
      throw error;
    }
  }

  /**
   * Update access timestamp and increment access count
   * Requirement 2.4, 10.7: Atomic access tracking
   * 
   * @param productId - Product ID to update
   */
  async updateAccess(productId: string): Promise<void> {
    try {
      const db = await getMongoClient();
      const collection = db.collection<DimensionCacheEntry>(this.collectionName);

      // Atomic update (Requirement 10.7)
      await collection.updateOne(
        { productId },
        {
          $set: { lastAccessedAt: new Date() },
          $inc: { accessCount: 1 },
        }
      );

      console.log(`[Dimension Cache] 🔄 Updated access: productId=${productId.substring(0, 16)}...`);
    } catch (error) {
      console.error('[Dimension Cache] Update access error:', error);
      // Don't throw - access tracking is best-effort
    }
  }

  /**
   * Invalidate a cache entry by product ID
   * Requirement 13.3: Manual cache invalidation
   * 
   * @param productId - Product ID to invalidate
   */
  async invalidate(productId: string): Promise<void> {
    try {
      const db = await getMongoClient();
      const collection = db.collection<DimensionCacheEntry>(this.collectionName);

      const result = await collection.deleteOne({ productId });

      if (result.deletedCount > 0) {
        console.log(`[Dimension Cache] 🗑️  Invalidated: productId=${productId.substring(0, 16)}...`);
      } else {
        console.log(`[Dimension Cache] ⚠️  No entry to invalidate: productId=${productId.substring(0, 16)}...`);
      }
    } catch (error) {
      console.error('[Dimension Cache] Invalidate error:', error);
      // Don't throw - invalidation is best-effort
    }
  }

  /**
   * Bulk invalidate cache entries
   * Requirement 13.4: Bulk cache invalidation
   * 
   * @param filter - Filter for bulk invalidation
   * @returns Number of entries deleted
   */
  async bulkInvalidate(filter: {
    category?: string;
    productIds?: string[];
  }): Promise<number> {
    try {
      const db = await getMongoClient();
      const collection = db.collection<DimensionCacheEntry>(this.collectionName);

      let query: any = {};

      if (filter.productIds && filter.productIds.length > 0) {
        query.productId = { $in: filter.productIds };
      }

      // For category-based invalidation, we would need to join with products
      // This is a simplified version - actual implementation may require
      // querying the product repository first to get product IDs
      if (filter.category) {
        console.log(`[Dimension Cache] ⚠️  Category-based invalidation not fully implemented`);
        // TODO: Query product repo for product IDs in category, then delete
      }

      const result = await collection.deleteMany(query);

      console.log(`[Dimension Cache] 🗑️  Bulk invalidated ${result.deletedCount} entries`);
      return result.deletedCount;
    } catch (error) {
      console.error('[Dimension Cache] Bulk invalidate error:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   * Useful for monitoring and optimization
   */
  async getStats(): Promise<{
    totalEntries: number;
    avgAccessCount: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  }> {
    try {
      const db = await getMongoClient();
      const collection = db.collection<DimensionCacheEntry>(this.collectionName);

      const [totalEntries, avgAccessCount, oldestEntry, newestEntry] = await Promise.all([
        collection.countDocuments(),
        collection
          .aggregate([{ $group: { _id: null, avg: { $avg: '$accessCount' } } }])
          .toArray()
          .then((result) => result[0]?.avg || 0),
        collection.findOne({}, { sort: { createdAt: 1 } }),
        collection.findOne({}, { sort: { createdAt: -1 } }),
      ]);

      return {
        totalEntries,
        avgAccessCount,
        oldestEntry: oldestEntry?.createdAt || null,
        newestEntry: newestEntry?.createdAt || null,
      };
    } catch (error) {
      console.error('[Dimension Cache] Get stats error:', error);
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
      const collection = db.collection<DimensionCacheEntry>(this.collectionName);

      const result = await collection.deleteMany({
        expiresAt: { $lte: new Date() },
      });

      console.log(`[Dimension Cache] 🗑️  Cleared ${result.deletedCount} expired entries`);
      return result.deletedCount;
    } catch (error) {
      console.error('[Dimension Cache] Clear expired error:', error);
      throw error;
    }
  }

  /**
   * Convert DimensionAnalysisResult to DimensionCacheEntry
   * Helper method for storing analysis results
   * 
   * @param analysis - Dimension analysis result
   * @returns Cache entry ready for storage
   */
  toCacheEntry(analysis: DimensionAnalysisResult): Omit<DimensionCacheEntry, '_id'> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);

    return {
      productId: analysis.productId,
      dimensions: analysis.dimensions,
      overallConfidence: analysis.overallConfidence,
      createdAt: analysis.analyzedAt,
      lastAccessedAt: now,
      expiresAt,
      accessCount: 0,
    };
  }

  /**
   * Convert DimensionCacheEntry to DimensionAnalysisResult
   * Helper method for returning cached results
   * 
   * @param entry - Cache entry
   * @returns Dimension analysis result
   */
  toAnalysisResult(entry: DimensionCacheEntry): DimensionAnalysisResult {
    return {
      productId: entry.productId,
      dimensions: entry.dimensions,
      overallConfidence: entry.overallConfidence,
      analyzedAt: entry.createdAt,
      cached: true,
    };
  }
}

// Export singleton instance
export const dimensionCacheService = new DimensionCacheService();
