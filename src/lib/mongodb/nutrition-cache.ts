/**
 * MongoDB Nutrition Cache Repository
 * 
 * This file implements the cache repository for storing and retrieving
 * nutritional analysis results with TTL-based expiration.
 * 
 * Requirements: 6.1, 6.2, 6.5, 6.6
 */

import type { Collection } from 'mongodb';
import { getMongoClient } from './client';
import { NutritionCacheDocument } from './types';

/**
 * MongoDB Nutrition Cache Repository
 * 
 * Provides methods for caching nutritional analysis results with automatic
 * expiration using MongoDB TTL indexes. Implements cache-first architecture
 * to optimize performance and reduce OCR processing costs.
 * 
 * Requirements:
 * - 6.1: Query MongoDB for existing nutrition data by image hash
 * - 6.2: Update last_accessed_at timestamp when cache hit
 * - 6.5: Store complete nutrition analysis with TTL
 * - 6.6: Return cached data without triggering OCR on cache hit
 */
export class NutritionCacheRepository {
  private collectionName = 'nutrition_cache';

  /**
   * Get the nutrition_cache collection
   * Ensures indexes are created on first access
   */
  private async getCollection(): Promise<Collection<NutritionCacheDocument>> {
    const db = await getMongoClient();
    const collection = db.collection<NutritionCacheDocument>(this.collectionName);
    
    // Ensure indexes exist (idempotent operation)
    await this.ensureIndexes(collection);
    
    return collection;
  }

  /**
   * Ensure required indexes exist on the nutrition_cache collection
   * 
   * Creates the following indexes:
   * - imageHash: unique index for fast lookups
   * - expiresAt: TTL index for automatic document expiration (30 days)
   * - productName: text index for search functionality
   * - createdAt: index for sorting by creation time
   * 
   * This method is idempotent and safe to call multiple times.
   * 
   * Requirements: 6.1, 6.5
   */
  private async ensureIndexes(collection: Collection<NutritionCacheDocument>): Promise<void> {
    try {
      // Create unique index on imageHash for fast lookups
      await collection.createIndex(
        { imageHash: 1 },
        { unique: true, name: 'imageHash_unique' }
      );

      // Create TTL index on expiresAt for automatic expiration
      // Documents will be automatically deleted when expiresAt is reached
      await collection.createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0, name: 'expiresAt_ttl' }
      );

      // Create text index on productName for search
      await collection.createIndex(
        { productName: 'text' },
        { name: 'productName_text' }
      );

      // Create index on createdAt for sorting and queries
      await collection.createIndex(
        { createdAt: -1 },
        { name: 'createdAt_desc' }
      );
    } catch (error) {
      // Ignore errors if indexes already exist
      if (error instanceof Error && !error.message.includes('already exists')) {
        console.error('[NutritionCache] Error creating indexes:', error);
      }
    }
  }

  /**
   * Get cached nutrition data by image hash
   * 
   * Queries MongoDB for existing nutrition analysis by image hash. Returns null if:
   * - No data exists for the image hash
   * - The data has expired (expiresAt < now)
   * 
   * Requirements:
   * - 6.1: Query MongoDB for existing nutrition data
   * - 6.6: Return cached data without triggering OCR
   * 
   * @param imageHash - SHA-256 hash of the nutrition label image
   * @returns Cached nutrition data or null if not found/expired
   * 
   * @example
   * ```typescript
   * const repo = new NutritionCacheRepository();
   * const data = await repo.getNutritionData('abc123...');
   * if (data) {
   *   console.log('Cache hit:', data.productName);
   * } else {
   *   console.log('Cache miss - need to perform OCR');
   * }
   * ```
   */
  async getNutritionData(imageHash: string): Promise<NutritionCacheDocument | null> {
    try {
      console.log('[NutritionCache] 🔍 Cache lookup attempt:', {
        imageHash: imageHash.substring(0, 16) + '...',
      });
      
      const collection = await this.getCollection();
      
      // Query for nutrition data, ensuring it hasn't expired
      const data = await collection.findOne({
        imageHash,
        expiresAt: { $gt: new Date() } // Only return if not expired
      });

      if (data) {
        console.log('[NutritionCache] ✅ Cache HIT:', {
          productName: data.productName,
          accessCount: data.accessCount,
          createdAt: data.createdAt,
          tier: data.tier,
        });
      } else {
        console.log('[NutritionCache] ❌ Cache MISS - no matching document found');
      }

      return data;
    } catch (error) {
      console.error('[NutritionCache] ❌ Error getting cached nutrition data:', error);
      console.error('[NutritionCache] Error details:', {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      // Return null on error to trigger cache miss behavior
      return null;
    }
  }

  /**
   * Save nutrition data to cache with TTL
   * 
   * Saves or updates nutritional analysis in MongoDB with automatic
   * expiration. Uses upsert to handle both new and existing data.
   * 
   * Requirements:
   * - 6.5: Store complete nutrition analysis after OCR completes
   * 
   * @param imageHash - SHA-256 hash of the nutrition label image
   * @param data - Complete nutrition analysis data
   * @param ttlDays - Time to live in days (default: 30)
   * 
   * @example
   * ```typescript
   * const repo = new NutritionCacheRepository();
   * await repo.setNutritionData(
   *   'abc123...',
   *   {
   *     imageHash: 'abc123...',
   *     productName: 'Organic Milk',
   *     nutritionalFacts: {...},
   *     ingredients: {...},
   *     healthScore: {...},
   *     tier: 'free',
   *     createdAt: new Date(),
   *     lastAccessedAt: new Date(),
   *     accessCount: 0,
   *     expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
   *   },
   *   30 // Cache for 30 days
   * );
   * ```
   */
  async setNutritionData(
    imageHash: string,
    data: Omit<NutritionCacheDocument, '_id'>,
    ttlDays: number = 30
  ): Promise<void> {
    try {
      console.log('[NutritionCache] 💾 Saving to cache:', {
        imageHash: imageHash.substring(0, 16) + '...',
        productName: data.productName,
        tier: data.tier,
        ttlDays,
      });
      
      const collection = await this.getCollection();
      
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000);

      // Upsert the nutrition data (insert if new, update if exists)
      const result = await collection.updateOne(
        { imageHash },
        {
          $set: {
            ...data,
            expiresAt
          },
          $setOnInsert: {
            createdAt: now,
            accessCount: 0
          }
        },
        { upsert: true }
      );
      
      console.log('[NutritionCache] ✅ Cache save successful:', {
        matched: result.matchedCount,
        modified: result.modifiedCount,
        upserted: result.upsertedCount,
        upsertedId: result.upsertedId,
      });
    } catch (error) {
      console.error('[NutritionCache] ❌ Error setting cached nutrition data:', error);
      console.error('[NutritionCache] Error details:', {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      // Don't throw - cache failures shouldn't break the application
    }
  }

  /**
   * Update access timestamp for cached nutrition data
   * 
   * Updates the lastAccessedAt timestamp and increments the accessCount
   * to track how many times cached data has been accessed.
   * 
   * Requirements:
   * - 6.2: Update last_accessed_at timestamp when cache hit occurs
   * 
   * @param imageHash - SHA-256 hash of the nutrition label image
   * 
   * @example
   * ```typescript
   * const repo = new NutritionCacheRepository();
   * await repo.updateAccessTimestamp('abc123...');
   * ```
   */
  async updateAccessTimestamp(imageHash: string): Promise<void> {
    try {
      console.log('[NutritionCache] 🔄 Updating access timestamp:', {
        imageHash: imageHash.substring(0, 16) + '...',
      });
      
      const collection = await this.getCollection();
      
      // Update lastAccessedAt and increment accessCount
      const result = await collection.updateOne(
        { imageHash },
        {
          $set: { lastAccessedAt: new Date() },
          $inc: { accessCount: 1 }
        }
      );
      
      if (result.matchedCount > 0) {
        console.log('[NutritionCache] ✅ Access timestamp updated');
      } else {
        console.warn('[NutritionCache] ⚠️  No document found to update');
      }
    } catch (error) {
      console.error('[NutritionCache] ❌ Error updating access timestamp:', error);
      // Don't throw - this is a non-critical operation
    }
  }

  /**
   * Invalidate cache entry
   * 
   * Removes cached nutrition data from MongoDB. This can be used to force
   * regeneration of analysis for a specific image.
   * 
   * Requirements:
   * - 6.1: Manage cache lifecycle
   * 
   * @param imageHash - SHA-256 hash of the nutrition label image
   * 
   * @example
   * ```typescript
   * const repo = new NutritionCacheRepository();
   * await repo.invalidate('abc123...');
   * // Next scan will trigger fresh OCR analysis
   * ```
   */
  async invalidate(imageHash: string): Promise<void> {
    try {
      console.log('[NutritionCache] 🗑️  Invalidating cache entry:', {
        imageHash: imageHash.substring(0, 16) + '...',
      });
      
      const collection = await this.getCollection();
      
      // Delete the cached nutrition data
      const result = await collection.deleteOne({ imageHash });
      
      if (result.deletedCount > 0) {
        console.log('[NutritionCache] ✅ Cache entry deleted');
      } else {
        console.warn('[NutritionCache] ⚠️  No cache entry found to delete');
      }
    } catch (error) {
      console.error('[NutritionCache] ❌ Error invalidating cache entry:', error);
      // Don't throw - cache failures shouldn't break the application
    }
  }

  /**
   * Get cache statistics
   * 
   * Returns statistics about the nutrition cache including total entries,
   * most accessed products, and cache size.
   * 
   * @returns Cache statistics
   * 
   * @example
   * ```typescript
   * const repo = new NutritionCacheRepository();
   * const stats = await repo.getStats();
   * console.log(`Cache contains ${stats.totalEntries} nutrition analyses`);
   * ```
   */
  async getStats(): Promise<{
    totalEntries: number;
    mostAccessed: Array<{ imageHash: string; productName?: string; accessCount: number }>;
  }> {
    try {
      const collection = await this.getCollection();
      
      // Count total entries
      const totalEntries = await collection.countDocuments({
        expiresAt: { $gt: new Date() } // Only count non-expired entries
      });

      // Get top 10 most accessed nutrition data
      const mostAccessed = await collection
        .find({ expiresAt: { $gt: new Date() } })
        .sort({ accessCount: -1 })
        .limit(10)
        .project({ imageHash: 1, productName: 1, accessCount: 1, _id: 0 })
        .toArray();

      return {
        totalEntries,
        mostAccessed: mostAccessed as Array<{ imageHash: string; productName?: string; accessCount: number }>
      };
    } catch (error) {
      console.error('[NutritionCache] ❌ Error getting cache stats:', error);
      return {
        totalEntries: 0,
        mostAccessed: []
      };
    }
  }
}

// Export singleton instance
export const nutritionCacheRepository = new NutritionCacheRepository();

// Export class for testing
export default NutritionCacheRepository;
