/**
 * Multi-Tier Product Identification System Types
 * 
 * This file contains TypeScript interfaces and types for the multi-tier system.
 * Requirements: 1.2, 2.4, 4.3
 */

// ============================================================================
// CORE DATA TYPES
// ============================================================================

/**
 * Image data type for processing
 */
export interface ImageData {
  base64: string;
  mimeType: string;
  size?: number;
}

/**
 * Product metadata extracted from images or text
 * Requirement 2.4: Structured metadata output
 */
export interface ProductMetadata {
  productName?: string;
  brandName?: string;
  size?: string;
  category?: string;
  keywords: string[];
}

/**
 * Complete product data
 */
export interface ProductData {
  id: string;
  barcode?: string;
  name: string;
  brand: string;
  size?: string;
  category: string;
  imageUrl?: string;
  metadata: Record<string, any>;
}

/**
 * Barcode format enumeration
 */
export enum BarcodeFormat {
  UPC_A = 'UPC_A',
  UPC_E = 'UPC_E',
  EAN_8 = 'EAN_8',
  EAN_13 = 'EAN_13',
  CODE_39 = 'CODE_39',
  CODE_93 = 'CODE_93',
  CODE_128 = 'CODE_128',
  ITF = 'ITF',
  QR_CODE = 'QR_CODE',
}

/**
 * Tier enumeration
 */
export type Tier = 1 | 2 | 3 | 4;

/**
 * Confidence score (0.0 to 1.0)
 */
export type ConfidenceScore = number;

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Scan request from frontend
 * Requirement 1.2: Barcode pass-through
 */
export interface ScanRequest {
  barcode?: string;
  image?: ImageData;
  imageHash?: string;
  userId: string;
  sessionId: string;
}

/**
 * Error details for failed operations
 */
export interface ErrorDetails {
  code: string;
  message: string;
  tier: number;
  retryable: boolean;
}

/**
 * Scan response to frontend
 */
export interface ScanResponse {
  success: boolean;
  product?: ProductData;
  tier: Tier;
  confidenceScore: ConfidenceScore;
  processingTimeMs: number;
  cached: boolean;
  error?: ErrorDetails;
  warning?: string; // Requirement 13.5: Low confidence warning
}

// ============================================================================
// SERVICE REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Visual Extractor request
 */
export interface ExtractTextRequest {
  image: ImageData;
  imageHash: string;
}

/**
 * Visual Extractor response
 */
export interface ExtractTextResponse {
  success: boolean;
  metadata: ProductMetadata;
  rawText: string;
  processingTimeMs: number;
  error?: ErrorDetails;
}

/**
 * Discovery Service request
 */
export interface DiscoverBarcodeRequest {
  productMetadata: ProductMetadata;
  productId: string;
}

/**
 * Discovery Service response
 */
export interface DiscoverBarcodeResponse {
  success: boolean;
  barcode?: string;
  barcodeFormat?: BarcodeFormat;
  confidence: number;
  source: 'barcode_lookup_api';
  processingTimeMs: number;
  error?: ErrorDetails;
}

/**
 * Image Analyzer request
 */
export interface AnalyzeImageRequest {
  image: ImageData;
  imageHash: string;
}

/**
 * Visual characteristics from image analysis
 */
export interface VisualCharacteristics {
  colors: string[];
  packaging: string;
  shape: string;
}

/**
 * Image Analyzer response
 */
export interface AnalyzeImageResponse {
  success: boolean;
  metadata: ProductMetadata;
  confidence: ConfidenceScore;
  visualCharacteristics: VisualCharacteristics;
  processingTimeMs: number;
  error?: ErrorDetails;
}

// ============================================================================
// CACHE TYPES
// ============================================================================

/**
 * Cache entry key type
 */
export type CacheKeyType = 'barcode' | 'imageHash';

/**
 * Cache entry document (MongoDB)
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */
export interface CacheEntry {
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
 * Cache lookup request
 */
export interface CacheLookupRequest {
  key: string;
  keyType: CacheKeyType;
}

/**
 * Cache lookup response
 */
export interface CacheLookupResponse {
  found: boolean;
  entry?: CacheEntry;
}

// ============================================================================
// ERROR REPORTING TYPES
// ============================================================================

/**
 * Error report from user
 * Requirements: 5.2, 5.3
 */
export interface ErrorReport {
  scanId: string;
  userId: string;
  incorrectProduct: ProductData;
  actualProduct?: {
    name: string;
    brand: string;
    barcode?: string;
  };
  image: ImageData;
  tier: Tier;
  confidenceScore: ConfidenceScore;
  userFeedback: string;
  timestamp: Date;
}

/**
 * Error report response
 */
export interface ErrorReportResponse {
  success: boolean;
  reportId: string;
  alternativeProduct?: ProductData;
}

// ============================================================================
// MONITORING TYPES
// ============================================================================

/**
 * Scan metrics for a single scan
 */
export interface ScanMetrics {
  timestamp: Date;
  tier: Tier;
  success: boolean;
  processingTimeMs: number;
  cached: boolean;
  confidenceScore?: ConfidenceScore;
  errorCode?: string;
  apiCost?: number;
}

/**
 * Tier statistics
 */
export interface TierStats {
  tier: Tier;
  totalScans: number;
  successfulScans: number;
  successRate: number;
  avgProcessingTime: number;
  cacheHitRate: number;
  totalApiCost: number;
}

/**
 * Aggregated metrics
 */
export interface AggregatedMetrics {
  period: 'hour' | 'day' | 'week';
  startTime: Date;
  endTime: Date;
  tierStats: TierStats[];
  totalScans: number;
  totalApiCost: number;
  cacheHitRate: number;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for ProductMetadata
 */
export function isProductMetadata(value: unknown): value is ProductMetadata {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    (obj.productName === undefined || typeof obj.productName === 'string') &&
    (obj.brandName === undefined || typeof obj.brandName === 'string') &&
    (obj.size === undefined || typeof obj.size === 'string') &&
    (obj.category === undefined || typeof obj.category === 'string') &&
    Array.isArray(obj.keywords) &&
    obj.keywords.every((k) => typeof k === 'string')
  );
}

/**
 * Type guard for ProductData
 */
export function isProductData(value: unknown): value is ProductData {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    (obj.barcode === undefined || typeof obj.barcode === 'string') &&
    typeof obj.name === 'string' &&
    typeof obj.brand === 'string' &&
    (obj.size === undefined || typeof obj.size === 'string') &&
    typeof obj.category === 'string' &&
    (obj.imageUrl === undefined || typeof obj.imageUrl === 'string') &&
    typeof obj.metadata === 'object'
  );
}

/**
 * Type guard for Tier
 */
export function isTier(value: unknown): value is Tier {
  return typeof value === 'number' && [1, 2, 3, 4].includes(value);
}

/**
 * Type guard for ConfidenceScore
 */
export function isConfidenceScore(value: unknown): value is ConfidenceScore {
  return typeof value === 'number' && value >= 0 && value <= 1;
}
