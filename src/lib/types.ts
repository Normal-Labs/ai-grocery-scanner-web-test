/**
 * Core type definitions for AI Grocery Scanner
 * 
 * This file contains all TypeScript interfaces and types used throughout
 * the application for type safety and consistency.
 * 
 * Requirements: 3.6, 5.1, 5.2, 5.3
 */

/**
 * Insight categories for product analysis
 */
export type InsightCategory = 
  | 'health'
  | 'sustainability'
  | 'carbon'
  | 'preservatives'
  | 'allergies';

/**
 * Individual insight with rating and explanation
 */
export interface Insight {
  rating: string;      // e.g., "Good", "Low", "None", "Yes"
  explanation: string; // Brief description (1-2 sentences)
}

/**
 * Complete set of insights for a product
 * Contains all five required insight categories
 */
export interface ProductInsights {
  health: Insight;
  sustainability: Insight;
  carbon: Insight;
  preservatives: Insight;
  allergies: Insight;
}

/**
 * Analysis result for a single product
 */
export interface ProductResult {
  productName: string;
  insights: ProductInsights;
}

/**
 * Complete analysis result containing all detected products
 */
export interface AnalysisResult {
  products: ProductResult[];
}

/**
 * Saved scan data for localStorage persistence
 */
export interface SavedScan {
  timestamp: string;    // ISO 8601 format
  imageData: string;    // base64 image
  results: AnalysisResult;
}

/**
 * API request body for analysis endpoint
 */
export interface AnalyzeRequest {
  imageData: string; // base64-encoded image with data URI prefix
}

/**
 * API response from analysis endpoint
 */
export interface AnalyzeResponse {
  success: boolean;
  data?: AnalysisResult;
  error?: string;
}

/**
 * Application state for the scanner
 */
export interface ScannerState {
  capturedImage: string | null;
  analysisResults: AnalysisResult | null;
  isAnalyzing: boolean;
  error: string | null;
}

/**
 * Tier types for access control
 */
export type TierType = 'free' | 'premium';

/**
 * Progress step types for Research Agent
 */
export type ProgressStepType = 'search' | 'scrape' | 'synthesis' | 'complete';

/**
 * Progress step for live thought stream
 */
export interface ProgressStep {
  type: ProgressStepType;
  message: string;
  timestamp: number;
}

/**
 * Enhanced API request with tier support
 */
export interface EnhancedAnalyzeRequest {
  imageData: string;
  tier: TierType;
  dimension?: InsightCategory; // Required for free tier
}

/**
 * Enhanced API response with progress steps
 */
export interface EnhancedAnalyzeResponse {
  success: boolean;
  data?: AnalysisResult;
  error?: string;
  steps?: ProgressStep[];
}
