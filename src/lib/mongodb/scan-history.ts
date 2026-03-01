/**
 * Scan History Repository
 * 
 * MongoDB repository for storing and retrieving user scan history.
 * Supports multiple scan types: barcode, product, and nutrition.
 * 
 * Requirements: 5.6, 6.7
 */

import { getMongoClient } from './client';
import {
  ScanHistoryDocument,
  ScanHistoryQueryOptions,
  ScanHistoryResult,
} from './types';

/**
 * Scan History Repository
 * 
 * Provides methods for storing and querying user scan history.
 */
export class ScanHistoryRepository {
  private readonly collectionName = 'scan_history';

  /**
   * Store a scan in history
   * 
   * @param scan - Scan history document to store
   * @returns The inserted document ID
   */
  async addScan(scan: Omit<ScanHistoryDocument, '_id' | 'createdAt'>): Promise<string> {
    try {
      const db = await getMongoClient();
      const collection = db.collection<ScanHistoryDocument>(this.collectionName);

      const document: ScanHistoryDocument = {
        ...scan,
        createdAt: new Date(),
      };

      const result = await collection.insertOne(document as any);

      console.log('[ScanHistoryRepository] ✅ Scan stored in history:', {
        scanId: result.insertedId.toString(),
        userId: scan.userId,
        scanType: scan.scanType,
        timestamp: scan.timestamp,
      });

      return result.insertedId.toString();
    } catch (error) {
      console.error('[ScanHistoryRepository] ❌ Failed to store scan:', error);
      throw new Error('Failed to store scan in history');
    }
  }

  /**
   * Query scan history for a user
   * 
   * @param options - Query options (userId, filters, pagination, sorting)
   * @returns Scan history results with pagination info
   */
  async queryScanHistory(options: ScanHistoryQueryOptions): Promise<ScanHistoryResult> {
    try {
      const db = await getMongoClient();
      const collection = db.collection<ScanHistoryDocument>(this.collectionName);

      // Build query filter
      const filter: any = { userId: options.userId };
      
      if (options.scanType) {
        filter.scanType = options.scanType;
      }

      // Pagination
      const limit = Math.min(options.limit || 20, 100); // Max 100 results
      const offset = options.offset || 0;

      // Sorting
      const sortField = options.sortBy || 'timestamp';
      const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
      const sort: any = { [sortField]: sortOrder };

      // Execute query
      const [scans, total] = await Promise.all([
        collection
          .find(filter)
          .sort(sort)
          .skip(offset)
          .limit(limit)
          .toArray(),
        collection.countDocuments(filter),
      ]);

      console.log('[ScanHistoryRepository] ✅ Query complete:', {
        userId: options.userId,
        scanType: options.scanType,
        total,
        returned: scans.length,
      });

      return {
        scans,
        total,
        limit,
        offset,
      };
    } catch (error) {
      console.error('[ScanHistoryRepository] ❌ Failed to query scan history:', error);
      throw new Error('Failed to query scan history');
    }
  }

  /**
   * Get scan statistics for a user
   * 
   * @param userId - User ID
   * @returns Scan statistics
   */
  async getScanStats(userId: string): Promise<{
    totalScans: number;
    barcodeScans: number;
    productScans: number;
    nutritionScans: number;
    lastScanDate: Date | null;
  }> {
    try {
      const db = await getMongoClient();
      const collection = db.collection<ScanHistoryDocument>(this.collectionName);

      const [total, barcode, product, nutrition, lastScan] = await Promise.all([
        collection.countDocuments({ userId }),
        collection.countDocuments({ userId, scanType: 'barcode' }),
        collection.countDocuments({ userId, scanType: 'product' }),
        collection.countDocuments({ userId, scanType: 'nutrition' }),
        collection
          .find({ userId })
          .sort({ timestamp: -1 })
          .limit(1)
          .toArray(),
      ]);

      return {
        totalScans: total,
        barcodeScans: barcode,
        productScans: product,
        nutritionScans: nutrition,
        lastScanDate: lastScan.length > 0 ? lastScan[0].timestamp : null,
      };
    } catch (error) {
      console.error('[ScanHistoryRepository] ❌ Failed to get scan stats:', error);
      throw new Error('Failed to get scan statistics');
    }
  }

  /**
   * Delete scan history for a user
   * 
   * @param userId - User ID
   * @param olderThan - Optional date to delete scans older than
   * @returns Number of scans deleted
   */
  async deleteScanHistory(userId: string, olderThan?: Date): Promise<number> {
    try {
      const db = await getMongoClient();
      const collection = db.collection<ScanHistoryDocument>(this.collectionName);

      const filter: any = { userId };
      
      if (olderThan) {
        filter.timestamp = { $lt: olderThan };
      }

      const result = await collection.deleteMany(filter);

      console.log('[ScanHistoryRepository] ✅ Scan history deleted:', {
        userId,
        olderThan,
        deletedCount: result.deletedCount,
      });

      return result.deletedCount;
    } catch (error) {
      console.error('[ScanHistoryRepository] ❌ Failed to delete scan history:', error);
      throw new Error('Failed to delete scan history');
    }
  }

  /**
   * Ensure indexes are created for the scan_history collection
   * 
   * Indexes:
   * - userId (for user queries)
   * - timestamp (for sorting)
   * - scanType (for filtering)
   * - compound index on userId + timestamp (for efficient user history queries)
   */
  async ensureIndexes(): Promise<void> {
    try {
      const db = await getMongoClient();
      const collection = db.collection<ScanHistoryDocument>(this.collectionName);

      await Promise.all([
        collection.createIndex({ userId: 1 }),
        collection.createIndex({ timestamp: -1 }),
        collection.createIndex({ scanType: 1 }),
        collection.createIndex({ userId: 1, timestamp: -1 }),
      ]);

      console.log('[ScanHistoryRepository] ✅ Indexes created');
    } catch (error) {
      console.error('[ScanHistoryRepository] ❌ Failed to create indexes:', error);
      // Don't throw - indexes are optional for functionality
    }
  }
}

// Export singleton instance
export const scanHistoryRepository = new ScanHistoryRepository();

