/**
 * Dimension Analysis Types
 * 
 * Type definitions for the integrated product scan and dimension analysis system.
 * This extends the multi-tier product identification with AI-powered dimension analysis.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */

import { ObjectId } from 'mongodb';

// ============================================================================
// DIMENSION ANALYSIS TYPES
// ============================================================================

/**
 * User tier for access control
 */
export type UserTier = 'free' | 'premium';

/**
 * Dimension analysis status
 */
export type DimensionStatus = 'completed' | 'processing' | 'failed' | 'skipped';

/**
 * Individual dimension score with metadata
 * Requirement 4.2: Dimension score structure
 */
export interface DimensionScore {
  score: number;              // 0-100
  explanation: string;        // Max 100 words
  keyFactors: string[];       // 2-4 key points
  available: boolean;         // Based on user tier
  locked: boolean;            // For free tier users
}

/**
 * Complete dimension analysis result
 * Requirements: 4.1, 4.3, 4.4, 4.5, 4.6
 */
export interface DimensionAnalysisResult {
  productId: string;
  dimensions: {
    health: DimensionScore;
    processing: DimensionScore;
    allergens: DimensionScore;
    responsiblyProduced: DimensionScore;
    environmentalImpact: DimensionScore;
  };
  overallConfidence: number;  // 0.0 to 1.0
  analyzedAt: Date;
  cached: boolean;
}

/**
 * Dimension cache entry stored in MongoDB
 * Requirements: 10.1, 10.2, 10.4, 10.5, 10.6
 */
export interface DimensionCacheEntry {
  _id?: ObjectId;
  productId: string;
  dimensions: {
    health: DimensionScore;
    processing: DimensionScore;
    allergens: DimensionScore;
    responsiblyProduced: DimensionScore;
    environmentalImpact: DimensionScore;
  };
  overallConfidence: number;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
  accessCount: number;
}

/**
 * Cache lookup result
 */
export interface DimensionCacheLookupResult {
  found: boolean;
  entry?: DimensionCacheEntry;
  expired: boolean;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Request to analyze dimensions
 */
export interface AnalyzeDimensionsRequest {
  productId: string;
  productData: any; // ProductData from multi-tier types
  image: any;       // ImageData from multi-tier types
  userTier: UserTier;
}

/**
 * Response from dimension analysis
 */
export interface AnalyzeDimensionsResponse {
  success: boolean;
  analysis?: DimensionAnalysisResult;
  cached: boolean;
  processingTimeMs: number;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

/**
 * Extended scan response with dimension analysis
 * Requirements: 8.2, 8.6
 */
export interface ExtendedScanResponse {
  // Existing fields from multi-tier spec
  success: boolean;
  product?: any;
  tier: number;
  confidenceScore: number;
  processingTimeMs: number;
  cached: boolean;
  
  // New dimension analysis fields
  dimensionAnalysis?: DimensionAnalysisResult;
  dimensionStatus: DimensionStatus;
  dimensionCached?: boolean;
  userTier: UserTier;
  availableDimensions: string[];
  upgradePrompt?: string;
  
  error?: {
    code: string;
    message: string;
    tier: number;
    retryable: boolean;
  };
}

// ============================================================================
// AI RESPONSE TYPES
// ============================================================================

/**
 * Raw AI response structure (before validation)
 */
export interface RawAIResponse {
  dimensions: {
    health: { score: number; explanation: string; keyFactors: string[] };
    processing: { score: number; explanation: string; keyFactors: string[] };
    allergens: { score: number; explanation: string; keyFactors: string[] };
    responsiblyProduced: { score: number; explanation: string; keyFactors: string[] };
    environmentalImpact: { score: number; explanation: string; keyFactors: string[] };
  };
  overallConfidence: number;
}

// ============================================================================
// METRICS TYPES
// ============================================================================

/**
 * Dimension analysis metrics for a single operation
 */
export interface DimensionAnalysisMetrics {
  timestamp: Date;
  productId: string;
  userTier: UserTier;
  cached: boolean;
  processingTimeMs: number;
  success: boolean;
  errorCode?: string;
  apiCost?: number;
}

/**
 * Aggregated dimension metrics
 */
export interface AggregatedDimensionMetrics {
  period: 'hour' | 'day' | 'week';
  startTime: Date;
  endTime: Date;
  totalAnalyses: number;
  cacheHitRate: number;
  avgProcessingTime: number;
  totalApiCost: number;
  byTier: {
    free: { count: number; cacheHitRate: number };
    premium: { count: number; cacheHitRate: number };
  };
  dimensionViews: {
    health: number;
    processing: number;
    allergens: number;
    responsiblyProduced: number;
    environmentalImpact: number;
  };
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for DimensionScore
 */
export function isDimensionScore(value: unknown): value is DimensionScore {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.score === 'number' &&
    obj.score >= 0 &&
    obj.score <= 100 &&
    typeof obj.explanation === 'string' &&
    Array.isArray(obj.keyFactors) &&
    obj.keyFactors.every((k) => typeof k === 'string') &&
    typeof obj.available === 'boolean' &&
    typeof obj.locked === 'boolean'
  );
}

/**
 * Type guard for DimensionAnalysisResult
 */
export function isDimensionAnalysisResult(value: unknown): value is DimensionAnalysisResult {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  
  if (typeof obj.productId !== 'string') return false;
  if (typeof obj.overallConfidence !== 'number') return false;
  if (obj.overallConfidence < 0 || obj.overallConfidence > 1) return false;
  if (!(obj.analyzedAt instanceof Date)) return false;
  if (typeof obj.cached !== 'boolean') return false;
  
  const dims = obj.dimensions as Record<string, unknown>;
  if (typeof dims !== 'object' || dims === null) return false;
  
  const requiredDimensions = ['health', 'processing', 'allergens', 'responsiblyProduced', 'environmentalImpact'];
  for (const dim of requiredDimensions) {
    if (!isDimensionScore(dims[dim])) return false;
  }
  
  return true;
}

/**
 * Type guard for UserTier
 */
export function isUserTier(value: unknown): value is UserTier {
  return value === 'free' || value === 'premium';
}
