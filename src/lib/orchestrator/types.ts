/**
 * Orchestration Type Definitions
 * 
 * This file contains TypeScript type definitions for the scan orchestration layer.
 * The orchestrator coordinates cache-first scan flows across MongoDB and Supabase,
 * managing multi-database transactions and error recovery.
 * 
 * Requirements: 5.1, 5.7, 7.5
 */

import { AnalysisResult, InsightCategory, TierType } from '@/lib/types';
import { Product } from '@/lib/supabase/types';

// ============================================================================
// SCAN REQUEST TYPE
// ============================================================================

/**
 * Request for scanning a product
 * Contains all information needed to process a scan through the cache-first flow
 * 
 * Requirement 5.1: Cache-first architecture with barcode lookup
 */
export interface ScanRequest {
  /** Product barcode for cache lookup and product registry */
  barcode: string;
  
  /** Base64-encoded image data with data URI prefix */
  imageData: string;
  
  /** Authenticated user ID from Supabase Auth */
  userId: string;
  
  /** Optional user location for inventory tracking
   * If provided, the system will find/create nearby store and record inventory
   */
  location?: {
    /** Latitude in decimal degrees (-90 to 90) */
    latitude: number;
    /** Longitude in decimal degrees (-180 to 180) */
    longitude: number;
  };
  
  /** User's subscription tier (free or premium) */
  tier: TierType;
  
  /** Optional insight dimension for free tier single-dimension analysis */
  dimension?: InsightCategory;
}

// ============================================================================
// SCAN RESULT TYPE
// ============================================================================

/**
 * Result of a scan operation
 * Contains the analysis results, product metadata, and cache status
 * 
 * Requirement 5.1: Return cached insights or trigger Research Agent
 */
export interface ScanResult {
  /** Whether the result came from MongoDB cache (true) or Research Agent (false) */
  fromCache: boolean;
  
  /** Complete analysis result with product insights */
  analysis: AnalysisResult;
  
  /** Product metadata from Supabase product registry */
  product: Product;
  
  /** Optional store ID if location was provided and store was found/created */
  storeId?: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Error source types for orchestration failures
 */
export type ErrorSource = 'mongodb' | 'supabase' | 'research-agent' | 'geolocation';

/**
 * Orchestration error with context and recovery information
 * Provides consistent error format across all orchestration operations
 * 
 * Requirement 7.5: Consistent error handling across repository methods
 */
export interface OrchestratorError {
  /** Error code for programmatic error handling (e.g., 'CACHE_UNAVAILABLE', 'DB_CONNECTION_FAILED') */
  code: string;
  
  /** Human-readable error message */
  message: string;
  
  /** Source system where the error occurred */
  source: ErrorSource;
  
  /** Whether the error is transient and the operation can be retried */
  recoverable: boolean;
  
  /** Optional additional context for debugging (e.g., barcode, userId, coordinates) */
  context?: Record<string, unknown>;
}

// ============================================================================
// OPERATION RESULT TYPE
// ============================================================================

/**
 * Generic result type for operations that may fail
 * Used internally by orchestrator for consistent error handling
 * 
 * Requirement 7.5: Consistent error handling
 */
export interface OperationResult<T> {
  /** Whether the operation succeeded */
  success: boolean;
  
  /** Result data if operation succeeded */
  data?: T;
  
  /** Error information if operation failed */
  error?: OrchestratorError;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if a value is a valid ScanRequest
 */
export function isScanRequest(value: unknown): value is ScanRequest {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  
  // Check required fields
  if (
    typeof obj.barcode !== 'string' ||
    typeof obj.imageData !== 'string' ||
    typeof obj.userId !== 'string' ||
    (obj.tier !== 'free' && obj.tier !== 'premium')
  ) {
    return false;
  }
  
  // Check optional location field
  if (obj.location !== undefined) {
    if (typeof obj.location !== 'object' || obj.location === null) return false;
    const loc = obj.location as Record<string, unknown>;
    if (
      typeof loc.latitude !== 'number' ||
      typeof loc.longitude !== 'number' ||
      loc.latitude < -90 ||
      loc.latitude > 90 ||
      loc.longitude < -180 ||
      loc.longitude > 180
    ) {
      return false;
    }
  }
  
  // Check optional dimension field
  if (obj.dimension !== undefined) {
    const validDimensions = ['health', 'preservatives', 'allergies', 'sustainability', 'carbon'];
    if (!validDimensions.includes(obj.dimension as string)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Type guard to check if a value is a valid OrchestratorError
 */
export function isOrchestratorError(value: unknown): value is OrchestratorError {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  
  const validSources: ErrorSource[] = ['mongodb', 'supabase', 'research-agent', 'geolocation'];
  
  return (
    typeof obj.code === 'string' &&
    typeof obj.message === 'string' &&
    validSources.includes(obj.source as ErrorSource) &&
    typeof obj.recoverable === 'boolean'
  );
}

/**
 * Type guard to check if a value is a valid ScanResult
 */
export function isScanResult(value: unknown): value is ScanResult {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj.fromCache === 'boolean' &&
    typeof obj.analysis === 'object' &&
    obj.analysis !== null &&
    typeof obj.product === 'object' &&
    obj.product !== null &&
    (obj.storeId === undefined || typeof obj.storeId === 'string')
  );
}

// ============================================================================
// ERROR FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a MongoDB error
 */
export function createMongoDBError(
  code: string,
  message: string,
  recoverable: boolean = true,
  context?: Record<string, unknown>
): OrchestratorError {
  return {
    code,
    message,
    source: 'mongodb',
    recoverable,
    context,
  };
}

/**
 * Create a Supabase error
 */
export function createSupabaseError(
  code: string,
  message: string,
  recoverable: boolean = true,
  context?: Record<string, unknown>
): OrchestratorError {
  return {
    code,
    message,
    source: 'supabase',
    recoverable,
    context,
  };
}

/**
 * Create a Research Agent error
 */
export function createResearchAgentError(
  code: string,
  message: string,
  recoverable: boolean = false,
  context?: Record<string, unknown>
): OrchestratorError {
  return {
    code,
    message,
    source: 'research-agent',
    recoverable,
    context,
  };
}

/**
 * Create a Geolocation error
 */
export function createGeolocationError(
  code: string,
  message: string,
  recoverable: boolean = false,
  context?: Record<string, unknown>
): OrchestratorError {
  return {
    code,
    message,
    source: 'geolocation',
    recoverable,
    context,
  };
}
