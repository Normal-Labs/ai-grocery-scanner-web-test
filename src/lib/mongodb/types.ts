/**
 * MongoDB type definitions for Multi-Tier Cache
 * 
 * This file contains TypeScript interfaces for MongoDB collections
 * used to cache product identification results.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { ObjectId } from 'mongodb';
import { ProductData, Tier, ConfidenceScore, CacheKeyType } from '@/lib/types/multi-tier';

/**
 * Cache entry document stored in MongoDB
 * Represents a cached product identification result with TTL expiration
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */
export interface CacheEntryDocument {
  _id?: ObjectId;
  key: string;
  keyType: CacheKeyType;
  productData: ProductData;
  tier: Tier;
  confidenceScore: ConfidenceScore;
  createdAt: Date;
  lastAccessedAt: Date;
  accessCount: number;
  expiresAt: Date;
}

/**
 * Result of a cache lookup operation
 * Indicates whether the cache hit or missed
 */
export interface CacheResult {
  hit: boolean;
  entry?: CacheEntryDocument;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  totalEntries: number;
  barcodeEntries: number;
  imageHashEntries: number;
  avgAccessCount: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}

/**
 * Cached insight (legacy type for backward compatibility)
 * Used by the old scan orchestrator
 */
export interface CachedInsight {
  _id?: ObjectId;
  barcode: string;
  productName: string;
  insights: any;
  lastScannedAt: Date;
  scanCount: number;
  createdAt: Date;
}
