/**
 * MongoDB Cache Repository
 * 
 * This file implements the cache repository for storing and retrieving
 * AI-generated product insights with TTL-based expiration.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import type { Collection } from 'mongodb';
import { getMongoClient } from './client';
import { CachedInsight } from './types';
import { ProductInsights } from '@/lib/types';

/**
 * MongoDB Cache Repository
 * 
 * Provides methods for caching AI-generated product insights with automatic
 * expiration using MongoDB TTL indexes. Implements cache-first architecture
 * to optimize performance and reduce API costs.
 * 
 * Requirements:
 * - 5.1: Query MongoDB AI_Cache for existing insights
 * - 5.2: Update last_scanned_at timestamp when cache hit
 * - 5.3: Return cached insight without triggering Research_Agent
 * - 5.4: Trigger Research_Agent when cache miss
 * - 5.5: Save insight to MongoDB AI_Cache after Research_Agent completes
 */
export class MongoDBCacheRepository {
  private collectionName = 'insights';

  /**
   * Get the insights collection
   * Ensures indexes are created on first access
   */
  private async getCollection(): Promise<Collection<CachedInsight>> {
    const db = await getMongoClient();
    const collection = db.collection<CachedInsight>(this.collectionName);
    
    // Ensure indexes exist (idempotent operation)
    await this.ensureIndexes(collection);
    
    return collection;
  }

  /**
   * Ensure required indexes exist on the insights collection
   * 
   * Creates the following indexes:
   * - barcode: unique index for fast lookups
   * - expiresAt: TTL index for automatic document expiration
   * - createdAt: index for sorting by creation time
   * 
   * This method is idempotent and safe to call multiple times.
   * 
   * Requirements: 5.1, 5.5
   */
  private async ensureIndexes(collection: Collection<CachedInsight>): Promise<void> {
    try {
      // Create unique index on barcode for fast lookups
      await collection.createIndex(
        { barcode: 1 },
        { unique: true, name: 'barcode_unique' }
      );

      // Create TTL index on expiresAt for automatic expiration
      // Documents will be automatically deleted when expiresAt is reached
      await collection.createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0, name: 'expiresAt_ttl' }
      );

      // Create index on createdAt for sorting and queries
      await collection.createIndex(
        { createdAt: -1 },
        { name: 'createdAt_desc' }
      );
    } catch (error) {
      // Ignore errors if indexes already exist
      // MongoDB will throw an error if we try to create an index with different options
      if (error instanceof Error && !error.message.includes('already exists')) {
        console.error('Error creating indexes:', error);
      }
    }
  }

  /**
   * Get cached insight by barcode
   * 
   * Queries MongoDB for an existing insight by barcode. Returns null if:
   * - No insight exists for the barcode
   * - The insight has expired (expiresAt < now)
   * 
   * Requirements:
   * - 5.1: Query MongoDB AI_Cache for existing insights
   * - 5.3: Return cached insight without triggering Research_Agent
   * 
   * @param barcode - Product barcode to look up
   * @returns Cached insight or null if not found/expired
   * 
   * @example
   * ```typescript
   * const repo = new MongoDBCacheRepository();
   * const insight = await repo.get('123456789');
   * if (insight) {
   *   console.log('Cache hit:', insight.productName);
   * } else {
   *   console.log('Cache miss - need to generate new insight');
   * }
   * ```
   */
  async get(barcode: string): Promise<CachedInsight | null> {
    try {
      const collection = await this.getCollection();
      
      // Query for insight by barcode, ensuring it hasn't expired
      const insight = await collection.findOne({
        barcode,
        expiresAt: { $gt: new Date() } // Only return if not expired
      });

      return insight;
    } catch (error) {
      console.error('Error getting cached insight:', error);
      // Return null on error to trigger cache miss behavior
      return null;
    }
  }

  /**
   * Save insight to cache with TTL
   * 
   * Saves or updates an AI-generated insight in MongoDB with automatic
   * expiration. Uses upsert to handle both new and existing insights.
   * 
   * Requirements:
   * - 5.5: Save insight to MongoDB AI_Cache after Research_Agent completes
   * 
   * @param barcode - Product barcode
   * @param productName - Product name
   * @param insights - AI-generated product insights
   * @param ttlDays - Time to live in days (default: 30)
   * 
   * @example
   * ```typescript
   * const repo = new MongoDBCacheRepository();
   * await repo.set(
   *   '123456789',
   *   'Organic Milk',
   *   { health: {...}, preservatives: {...}, ... },
   *   30 // Cache for 30 days
   * );
   * ```
   */
  async set(
    barcode: string,
    productName: string,
    insights: ProductInsights,
    ttlDays: number = 30
  ): Promise<void> {
    try {
      const collection = await this.getCollection();
      
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000);

      // Upsert the insight (insert if new, update if exists)
      await collection.updateOne(
        { barcode },
        {
          $set: {
            barcode,
            productName,
            insights,
            expiresAt
          },
          $setOnInsert: {
            createdAt: now,
            scanCount: 0
          }
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('Error setting cached insight:', error);
      // Don't throw - cache failures shouldn't break the application
      // The system will continue without caching
    }
  }

  /**
   * Increment scan count for cached insight
   * 
   * Increments the scanCount field to track how many times a cached
   * insight has been accessed. This helps identify popular products.
   * 
   * Requirements:
   * - 5.2: Update metadata when cache hit occurs
   * 
   * @param barcode - Product barcode
   * 
   * @example
   * ```typescript
   * const repo = new MongoDBCacheRepository();
   * await repo.incrementScanCount('123456789');
   * ```
   */
  async incrementScanCount(barcode: string): Promise<void> {
    try {
      const collection = await this.getCollection();
      
      // Increment scanCount by 1
      await collection.updateOne(
        { barcode },
        { $inc: { scanCount: 1 } }
      );
    } catch (error) {
      console.error('Error incrementing scan count:', error);
      // Don't throw - this is a non-critical operation
    }
  }

  /**
   * Invalidate cache entry
   * 
   * Removes a cached insight from MongoDB. This can be used to force
   * regeneration of insights for a specific product.
   * 
   * Requirements:
   * - 5.1: Manage cache lifecycle
   * 
   * @param barcode - Product barcode to invalidate
   * 
   * @example
   * ```typescript
   * const repo = new MongoDBCacheRepository();
   * await repo.invalidate('123456789');
   * // Next scan will trigger Research_Agent
   * ```
   */
  async invalidate(barcode: string): Promise<void> {
    try {
      const collection = await this.getCollection();
      
      // Delete the cached insight
      await collection.deleteOne({ barcode });
    } catch (error) {
      console.error('Error invalidating cached insight:', error);
      // Don't throw - cache failures shouldn't break the application
    }
  }

  /**
   * Get cache statistics
   * 
   * Returns statistics about the cache including total entries,
   * most scanned products, and cache size.
   * 
   * @returns Cache statistics
   * 
   * @example
   * ```typescript
   * const repo = new MongoDBCacheRepository();
   * const stats = await repo.getStats();
   * console.log(`Cache contains ${stats.totalEntries} insights`);
   * ```
   */
  async getStats(): Promise<{
    totalEntries: number;
    mostScanned: Array<{ barcode: string; productName: string; scanCount: number }>;
  }> {
    try {
      const collection = await this.getCollection();
      
      // Count total entries
      const totalEntries = await collection.countDocuments({
        expiresAt: { $gt: new Date() } // Only count non-expired entries
      });

      // Get top 10 most scanned products
      const mostScanned = await collection
        .find({ expiresAt: { $gt: new Date() } })
        .sort({ scanCount: -1 })
        .limit(10)
        .project({ barcode: 1, productName: 1, scanCount: 1, _id: 0 })
        .toArray();

      return {
        totalEntries,
        mostScanned: mostScanned as Array<{ barcode: string; productName: string; scanCount: number }>
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalEntries: 0,
        mostScanned: []
      };
    }
  }
}

// Export singleton instance
export const cacheRepository = new MongoDBCacheRepository();

// Export class for testing
export default MongoDBCacheRepository;
