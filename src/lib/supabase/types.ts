/**
 * Supabase Type Definitions
 * 
 * This file contains TypeScript type definitions for the Supabase database schema.
 * It includes types for all tables (products, error_reports, scan_logs) and their
 * Insert/Update variants.
 * 
 * Requirements: 1.5, 2.5, 5.2, 6.6, 14.1
 */

// ============================================================================
// DATABASE SCHEMA TYPE
// ============================================================================

/**
 * Main database schema type that maps to Supabase tables
 * This follows the Supabase convention for type-safe database access
 */
export interface Database {
  public: {
    Tables: {
      products: {
        Row: Product;
        Insert: ProductInsert;
        Update: ProductUpdate;
      };
      error_reports: {
        Row: ErrorReport;
        Insert: ErrorReportInsert;
        Update: ErrorReportUpdate;
      };
      scan_logs: {
        Row: ScanLog;
        Insert: ScanLogInsert;
        Update: ScanLogUpdate;
      };
    };
  };
}

// ============================================================================
// PRODUCT TYPES
// ============================================================================

/**
 * Product table row type
 * Represents a product in the canonical product registry
 * 
 * Requirement 1.5: Products table with extended fields for multi-tier system
 */
export interface Product {
  /** Unique identifier (UUID) */
  id: string;
  /** Product barcode (nullable for products without barcodes) */
  barcode: string | null;
  /** Product name */
  name: string;
  /** Product brand */
  brand: string;
  /** Product size (e.g., "12 oz", "500g") */
  size: string | null;
  /** Product category */
  category: string | null;
  /** Product image URL */
  image_url: string | null;
  /** Additional metadata as JSON */
  metadata: Record<string, any> | null;
  /** Flag for manual review */
  flagged_for_review: boolean;
  /** Timestamp of creation */
  created_at: string;
  /** Timestamp of last update */
  updated_at: string;
}

/**
 * Product insert type
 * Used when creating new products
 */
export interface ProductInsert {
  /** Product barcode (optional, nullable) */
  barcode?: string | null;
  /** Product name (required) */
  name: string;
  /** Product brand (required) */
  brand: string;
  /** Product size (optional) */
  size?: string | null;
  /** Product category (optional) */
  category?: string | null;
  /** Product image URL (optional) */
  image_url?: string | null;
  /** Additional metadata (optional) */
  metadata?: Record<string, any> | null;
  /** Flag for manual review (optional, defaults to false) */
  flagged_for_review?: boolean;
}

/**
 * Product update type
 * Used when updating existing products
 */
export interface ProductUpdate {
  /** Product barcode (optional) */
  barcode?: string | null;
  /** Product name (optional) */
  name?: string;
  /** Product brand (optional) */
  brand?: string;
  /** Product size (optional) */
  size?: string | null;
  /** Product category (optional) */
  category?: string | null;
  /** Product image URL (optional) */
  image_url?: string | null;
  /** Additional metadata (optional) */
  metadata?: Record<string, any> | null;
  /** Flag for manual review (optional) */
  flagged_for_review?: boolean;
  /** Timestamp of last update (optional, auto-updated by trigger) */
  updated_at?: string;
}

// ============================================================================
// ERROR REPORT TYPES
// ============================================================================

/**
 * Error report table row type
 * Represents a user-reported incorrect product identification
 * 
 * Requirement 5.2: Error reports with scan context
 */
export interface ErrorReport {
  /** Unique identifier (UUID) */
  id: string;
  /** Scan ID reference */
  scan_id: string | null;
  /** User ID who reported the error */
  user_id: string;
  /** Foreign key to incorrect product */
  incorrect_product_id: string | null;
  /** Actual product name provided by user */
  actual_product_name: string | null;
  /** Actual product brand provided by user */
  actual_product_brand: string | null;
  /** Actual product barcode provided by user */
  actual_product_barcode: string | null;
  /** Image URL of the scanned product */
  image_url: string;
  /** Tier that produced the incorrect result */
  tier: number;
  /** Confidence score of the incorrect result */
  confidence_score: number | null;
  /** User feedback text */
  user_feedback: string | null;
  /** Status of the error report */
  status: string;
  /** Timestamp of creation */
  created_at: string;
  /** Timestamp when resolved */
  resolved_at: string | null;
}

/**
 * Error report insert type
 */
export interface ErrorReportInsert {
  /** Scan ID reference (optional) */
  scan_id?: string | null;
  /** User ID who reported the error (required) */
  user_id: string;
  /** Foreign key to incorrect product (optional) */
  incorrect_product_id?: string | null;
  /** Actual product name (optional) */
  actual_product_name?: string | null;
  /** Actual product brand (optional) */
  actual_product_brand?: string | null;
  /** Actual product barcode (optional) */
  actual_product_barcode?: string | null;
  /** Image URL (required) */
  image_url: string;
  /** Tier (required) */
  tier: number;
  /** Confidence score (optional) */
  confidence_score?: number | null;
  /** User feedback (optional) */
  user_feedback?: string | null;
  /** Status (optional, defaults to 'pending') */
  status?: string;
}

/**
 * Error report update type
 */
export interface ErrorReportUpdate {
  /** Status (optional) */
  status?: string;
  /** Timestamp when resolved (optional) */
  resolved_at?: string | null;
}

// ============================================================================
// SCAN LOG TYPES
// ============================================================================

/**
 * Scan log table row type
 * Represents a scan attempt for monitoring and analytics
 * 
 * Requirement 6.6, 14.1: Scan logging for performance tracking
 */
export interface ScanLog {
  /** Unique identifier (UUID) */
  id: string;
  /** User ID who performed the scan */
  user_id: string;
  /** Session ID for grouping scans */
  session_id: string;
  /** Tier used for identification */
  tier: number;
  /** Whether the scan was successful */
  success: boolean;
  /** Foreign key to identified product */
  product_id: string | null;
  /** Barcode scanned (if any) */
  barcode: string | null;
  /** Image hash (if any) */
  image_hash: string | null;
  /** Confidence score of the result */
  confidence_score: number | null;
  /** Processing time in milliseconds */
  processing_time_ms: number | null;
  /** Whether result came from cache */
  cached: boolean;
  /** Error code if failed */
  error_code: string | null;
  /** Timestamp of creation */
  created_at: string;
}

/**
 * Scan log insert type
 */
export interface ScanLogInsert {
  /** User ID (required) */
  user_id: string;
  /** Session ID (required) */
  session_id: string;
  /** Tier (required) */
  tier: number;
  /** Success status (required) */
  success: boolean;
  /** Product ID (optional) */
  product_id?: string | null;
  /** Barcode (optional) */
  barcode?: string | null;
  /** Image hash (optional) */
  image_hash?: string | null;
  /** Confidence score (optional) */
  confidence_score?: number | null;
  /** Processing time (optional) */
  processing_time_ms?: number | null;
  /** Cached flag (optional, defaults to false) */
  cached?: boolean;
  /** Error code (optional) */
  error_code?: string | null;
}

/**
 * Scan log update type (typically not used, logs are immutable)
 */
export interface ScanLogUpdate {
  // Scan logs are typically immutable, but included for completeness
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if a value is a valid Product
 */
export function isProduct(value: unknown): value is Product {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    (typeof obj.barcode === 'string' || obj.barcode === null) &&
    typeof obj.name === 'string' &&
    typeof obj.brand === 'string' &&
    (typeof obj.size === 'string' || obj.size === null) &&
    (typeof obj.category === 'string' || obj.category === null) &&
    (typeof obj.image_url === 'string' || obj.image_url === null) &&
    (typeof obj.metadata === 'object' || obj.metadata === null) &&
    typeof obj.flagged_for_review === 'boolean' &&
    typeof obj.created_at === 'string' &&
    typeof obj.updated_at === 'string'
  );
}

/**
 * Type guard to check if a value is a valid ErrorReport
 */
export function isErrorReport(value: unknown): value is ErrorReport {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    (typeof obj.scan_id === 'string' || obj.scan_id === null) &&
    typeof obj.user_id === 'string' &&
    (typeof obj.incorrect_product_id === 'string' || obj.incorrect_product_id === null) &&
    typeof obj.image_url === 'string' &&
    typeof obj.tier === 'number' &&
    typeof obj.status === 'string' &&
    typeof obj.created_at === 'string'
  );
}

/**
 * Type guard to check if a value is a valid ScanLog
 */
export function isScanLog(value: unknown): value is ScanLog {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.user_id === 'string' &&
    typeof obj.session_id === 'string' &&
    typeof obj.tier === 'number' &&
    typeof obj.success === 'boolean' &&
    typeof obj.cached === 'boolean' &&
    typeof obj.created_at === 'string'
  );
}

