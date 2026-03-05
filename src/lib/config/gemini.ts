/**
 * Gemini API Configuration
 * 
 * Centralized configuration for Gemini model selection.
 * Update this file to change the model used across the entire application.
 */

/**
 * Default Gemini model to use for all API calls
 * 
 * Available models:
 * - gemini-2.0-flash: Stable 2.0 model (current)
 * - gemini-2.0-flash-exp: Latest experimental model (fastest, most capable)
 * - gemini-1.5-flash: Legacy 1.5 model (deprecated, may not be available)
 * - gemini-1.5-pro: Legacy 1.5 pro model (deprecated, may not be available)
 * 
 * Note: Always use gemini-2.0-flash or newer to avoid 404 errors.
 */
export const GEMINI_MODEL = 'gemini-2.0-flash';

/**
 * Vertex AI Configuration
 * 
 * Using Vertex AI instead of Generative Language API to access proper tier quotas.
 */
export const VERTEX_AI_CONFIG = {
  projectId: process.env.VERTEX_AI_PROJECT_ID || 'gen-lang-client-0628770168',
  location: process.env.VERTEX_AI_LOCATION || 'us-central1',
} as const;

/**
 * Gemini API configuration
 */
export const GEMINI_CONFIG = {
  model: GEMINI_MODEL,
  
  // Temperature settings for different use cases
  temperature: {
    extraction: 0.1,      // Low temperature for consistent extraction
    analysis: 0.2,        // Slightly higher for analysis
    creative: 0.7,        // Higher for creative tasks
  },
  
  // Timeout settings (in milliseconds)
  timeout: {
    extraction: 10000,    // 10 seconds for extraction
    analysis: 15000,      // 15 seconds for analysis
    dimension: 20000,     // 20 seconds for dimension analysis
  },
  
  // Retry settings
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,      // Initial backoff delay
    backoffMultiplier: 2, // Exponential backoff
  },
} as const;

/**
 * Get API key from environment
 */
export function getGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Gemini API key not found. Set GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY environment variable.');
  }
  
  return apiKey;
}
