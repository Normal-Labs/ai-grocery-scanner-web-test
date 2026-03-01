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

/**
 * Nutrition cache document stored in MongoDB
 * Represents cached nutritional analysis results with TTL expiration
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */
export interface NutritionCacheDocument {
  _id?: ObjectId;
  imageHash: string; // SHA-256 hash of nutrition label image
  productName?: string; // Extracted from label if available
  nutritionalFacts: any; // NutritionalFacts interface from nutrition-parser
  ingredients: any; // IngredientList interface from ingredient-parser
  healthScore: any; // HealthScore interface from health-scorer
  tier: 'free' | 'premium'; // Tier used for analysis
  createdAt: Date;
  lastAccessedAt: Date;
  accessCount: number;
  expiresAt: Date; // TTL index (30 days)
}

/**
 * Scan history document stored in MongoDB
 * Represents a user's scan history with support for multiple scan types
 * 
 * Requirements: 5.6, 6.7
 */
export interface ScanHistoryDocument {
  _id?: ObjectId;
  userId: string; // User ID from Supabase Auth
  sessionId: string; // Session identifier for grouping scans
  scanType: 'barcode' | 'product' | 'nutrition'; // Type of scan performed
  timestamp: Date;
  
  // Common fields for all scan types
  productId?: string; // Product ID from Supabase (if identified)
  productName?: string;
  productBrand?: string;
  imageHash?: string; // Hash of the scanned image
  barcode?: string; // Barcode if scanned
  
  // Nutrition-specific fields (only present for nutrition scans)
  nutritionData?: {
    healthScore: number; // 0-100
    category: 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor';
    hasAllergens: boolean;
    allergenTypes: string[]; // Array of allergen types
  };
  
  // Metadata
  tier: 'free' | 'premium'; // User tier at time of scan
  cached: boolean; // Whether result came from cache
  processingTimeMs?: number; // Processing time in milliseconds
  
  createdAt: Date;
}

/**
 * Scan history query options
 */
export interface ScanHistoryQueryOptions {
  userId: string;
  scanType?: 'barcode' | 'product' | 'nutrition'; // Filter by scan type
  limit?: number; // Number of results (default: 20, max: 100)
  offset?: number; // Pagination offset (default: 0)
  sortBy?: 'timestamp' | 'productName'; // Sort field (default: timestamp)
  sortOrder?: 'asc' | 'desc'; // Sort order (default: desc)
}

/**
 * Scan history query result
 */
export interface ScanHistoryResult {
  scans: ScanHistoryDocument[];
  total: number;
  limit: number;
  offset: number;
}
