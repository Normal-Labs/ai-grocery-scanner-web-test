/**
 * MongoDB type definitions for AI Cache
 * 
 * This file contains TypeScript interfaces for MongoDB collections
 * used to cache AI-generated product insights.
 * 
 * Requirements: 5.1
 */

import { ProductInsights } from '@/lib/types';

/**
 * Cached insight document stored in MongoDB
 * Represents an AI-generated product analysis with TTL expiration
 */
export interface CachedInsight {
  _id?: string;
  barcode: string;
  productName: string;
  insights: ProductInsights;
  createdAt: Date;
  expiresAt: Date;
  scanCount: number;
}

/**
 * Result of a cache lookup operation
 * Indicates whether the cache hit or missed
 */
export interface CacheResult {
  hit: boolean;
  insight?: CachedInsight;
}
