/**
 * Gemini API Wrapper with Enhanced Error Tracking - Vertex AI Edition
 * 
 * Uses Vertex AI SDK instead of Generative Language API to access proper tier quotas.
 * 
 * Provides detailed logging for 429 errors including:
 * - Quota metrics (RPM vs TPM)
 * - Quota limits (Free vs Paid tier detection)
 * - Rate limit headers
 * - Retry-after information
 */

import { VertexAI } from '@google-cloud/vertexai';
import { GEMINI_MODEL, VERTEX_AI_CONFIG } from '@/lib/config/gemini';

interface QuotaFailureDetail {
  '@type': string;
  violations?: Array<{
    subject: string;
    description: string;
  }>;
}

interface RateLimitInfo {
  quotaMetric?: string;
  quotaLimit?: string;
  quotaLocation?: string;
  retryAfter?: string;
  remainingQuota?: string;
  tierDetected?: 'Free' | 'Paid' | 'Unknown' | 'Free (assumed)';
  violationDetails?: string[];
}

interface GeminiCallOptions {
  prompt: string;
  imageData?: string;
  imageMimeType?: string;
  temperature?: number;
  maxRetries?: number;
  retryDelayMs?: number;
}

interface GeminiCallResult {
  success: boolean;
  text?: string;
  error?: string;
  rateLimitInfo?: RateLimitInfo;
  retryCount?: number;
  totalDuration?: number;
  tierMismatch?: boolean;
}

interface TierValidationResult {
  remainingQuota?: string;
  quotaLimit?: string;
  tierDetected: 'Free' | 'Paid' | 'Unknown';
}

export class GeminiWrapper {
  private vertexAI: VertexAI;
  private model: any;
  private apiCallCount: number = 0;
  private lastCallTimestamp: number = 0;

  constructor(
    projectId: string = VERTEX_AI_CONFIG.projectId,
    location: string = VERTEX_AI_CONFIG.location,
    modelName: string = GEMINI_MODEL
  ) {
    this.vertexAI = new VertexAI({
      project: projectId,
      location: location,
    });
    
    this.model = this.vertexAI.getGenerativeModel({
      model: modelName,
    });

    console.log('[Gemini Wrapper] 🚀 Initialized with Vertex AI');
    console.log(`[Gemini Wrapper] 📍 Project: ${projectId}`);
    console.log(`[Gemini Wrapper] 🌍 Location: ${location}`);
    console.log(`[Gemini Wrapper] 🤖 Model: ${modelName}`);
  }

  /**
   * Make a Gemini API call with enhanced error tracking
   */
  async generateContent(options: GeminiCallOptions): Promise<GeminiCallResult> {
    const startTime = Date.now();
    const {
      prompt,
      imageData,
      imageMimeType = 'image/jpeg',
      temperature,
      maxRetries = 0,
      retryDelayMs = 5000,
    } = options;

    let retryCount = 0;
    let lastError: any = null;

    // Track API call
    this.apiCallCount++;
    const timeSinceLastCall = this.lastCallTimestamp 
      ? Date.now() - this.lastCallTimestamp 
      : 0;
    this.lastCallTimestamp = Date.now();

    console.log(`[Gemini Wrapper] 📞 API Call #${this.apiCallCount} (Vertex AI)`);
    console.log(`[Gemini Wrapper] ⏱️  Time since last call: ${timeSinceLastCall}ms`);

    while (retryCount <= maxRetries) {
      try {
        // Prepare content parts for Vertex AI
        const parts: any[] = [{ text: prompt }];
        
        if (imageData) {
          parts.push({
            inlineData: {
              data: imageData,
              mimeType: imageMimeType,
            },
          });
        }

        // Make API call using Vertex AI
        const request = {
          contents: [{ role: 'user', parts }],
        };

        const result = await this.model.generateContent(request);
        const response = result.response;
        const text = response.candidates[0].content.parts[0].text;

        const duration = Date.now() - startTime;
        console.log(`[Gemini Wrapper] ✅ Success in ${duration}ms (Vertex AI)`);

        // Validate tier from successful response
        this.validateTier(result);

        return {
          success: true,
          text,
          retryCount,
          totalDuration: duration,
        };

      } catch (error: any) {
        lastError = error;
        
        // Log raw error structure for debugging
        console.log('[Gemini Wrapper] 🔍 Raw error object:', JSON.stringify({
          message: error.message,
          status: error.status,
          statusText: error.statusText,
          code: error.code,
          errorDetails: error.errorDetails,
          details: error.details,
          response: error.response ? {
            status: error.response.status,
            statusText: error.response.statusText,
            headers: error.response.headers,
          } : undefined,
        }, null, 2));
        
        // Check for tier mismatch on 429 errors
        const is429 = error.message?.includes('429') || 
                      error.status === 429 ||
                      error.code === 429 ||
                      error.message?.includes('Resource exhausted') ||
                      error.message?.includes('RESOURCE_EXHAUSTED');
        
        if (is429) {
          const tierMismatch = this.detectTierMismatch(error);
          if (tierMismatch) {
            const duration = Date.now() - startTime;
            return {
              success: false,
              error: 'BACKEND_TIER_MISMATCH_DETECTED: API is using Free Tier despite Paid Tier project configuration. Switched to Vertex AI but still seeing free tier limits. Check project billing and quota settings.',
              tierMismatch: true,
              retryCount,
              totalDuration: duration,
            };
          }
        }
        
        const rateLimitInfo = this.extractRateLimitInfo(error);

        // Log detailed error information
        this.logDetailedError(error, rateLimitInfo, retryCount);

        if (is429 && retryCount < maxRetries) {
          retryCount++;
          const delay = rateLimitInfo.retryAfter 
            ? parseInt(rateLimitInfo.retryAfter) * 1000 
            : retryDelayMs * Math.pow(2, retryCount - 1); // Exponential backoff

          console.log(`[Gemini Wrapper] 🔄 Retry ${retryCount}/${maxRetries} after ${delay}ms`);
          await this.delay(delay);
          continue;
        }

        // Return error result
        const duration = Date.now() - startTime;
        return {
          success: false,
          error: error.message || 'Unknown error',
          rateLimitInfo: is429 ? rateLimitInfo : undefined,
          retryCount,
          totalDuration: duration,
        };
      }
    }

    // Max retries exceeded
    const duration = Date.now() - startTime;
    return {
      success: false,
      error: lastError?.message || 'Max retries exceeded',
      rateLimitInfo: this.extractRateLimitInfo(lastError),
      retryCount,
      totalDuration: duration,
    };
  }

  /**
   * Validate tier from successful API response
   */
  private validateTier(result: any): TierValidationResult {
    const validation: TierValidationResult = {
      tierDetected: 'Unknown',
    };

    try {
      // Try multiple ways to access response headers
      // The GoogleGenerativeAI SDK may not expose these directly
      
      // Method 1: Check result.response.headers
      if (result.response?.headers) {
        const headers = result.response.headers;
        
        if (headers['x-goog-ratelimit-remaining']) {
          validation.remainingQuota = headers['x-goog-ratelimit-remaining'];
        }
        
        if (headers['x-goog-ratelimit-limit']) {
          validation.quotaLimit = headers['x-goog-ratelimit-limit'];
          
          const limit = parseInt(validation.quotaLimit || '0', 10);
          if (limit === 15) {
            validation.tierDetected = 'Free';
          } else if (limit >= 360) {
            validation.tierDetected = 'Paid';
          }
        }
      }

      // Method 2: Check result._response (internal property)
      if (!validation.quotaLimit && result._response?.headers) {
        const headers = result._response.headers;
        
        if (headers['x-goog-ratelimit-remaining']) {
          validation.remainingQuota = headers['x-goog-ratelimit-remaining'];
        }
        
        if (headers['x-goog-ratelimit-limit']) {
          validation.quotaLimit = headers['x-goog-ratelimit-limit'];
          
          const limit = parseInt(validation.quotaLimit || '0', 10);
          if (limit === 15) {
            validation.tierDetected = 'Free';
          } else if (limit >= 360) {
            validation.tierDetected = 'Paid';
          }
        }
      }

      // Method 3: Check for any headers property in the result object
      if (!validation.quotaLimit) {
        const checkHeaders = (obj: any, depth: number = 0): void => {
          if (depth > 3 || !obj || typeof obj !== 'object') return;
          
          if (obj.headers && typeof obj.headers === 'object') {
            if (obj.headers['x-goog-ratelimit-remaining']) {
              validation.remainingQuota = obj.headers['x-goog-ratelimit-remaining'];
            }
            if (obj.headers['x-goog-ratelimit-limit']) {
              validation.quotaLimit = obj.headers['x-goog-ratelimit-limit'];
              
              const limit = parseInt(validation.quotaLimit || '0', 10);
              if (limit === 15) {
                validation.tierDetected = 'Free';
              } else if (limit >= 360) {
                validation.tierDetected = 'Paid';
              }
            }
          }
          
          // Recursively check nested objects
          for (const key in obj) {
            if (obj.hasOwnProperty(key) && typeof obj[key] === 'object') {
              checkHeaders(obj[key], depth + 1);
            }
          }
        };
        
        checkHeaders(result);
      }

      // Log validation results
      console.log('[Gemini Wrapper] 📊 Tier Validation:', {
        tierDetected: validation.tierDetected,
        remainingQuota: validation.remainingQuota || 'Not available',
        quotaLimit: validation.quotaLimit || 'Not available',
      });

      if (validation.tierDetected === 'Free') {
        console.warn('[Gemini Wrapper] ⚠️  WARNING: Free tier detected! Expected Paid tier.');
      } else if (validation.tierDetected === 'Paid') {
        console.log('[Gemini Wrapper] ✅ Paid tier confirmed');
      } else {
        console.log('[Gemini Wrapper] ℹ️  Note: SDK does not expose rate limit headers. Tier cannot be validated from successful responses.');
      }

    } catch (error) {
      console.error('[Gemini Wrapper] ❌ Error validating tier:', error);
    }

    return validation;
  }

  /**
   * Detect if a 429 error is due to tier mismatch (Free tier when Paid expected)
   */
  private detectTierMismatch(error: any): boolean {
    try {
      // Check error message for free tier indicators
      const errorMessage = error.message || '';
      const errorString = JSON.stringify(error);
      
      // Look for "free_tier_requests" in error details
      if (errorString.includes('free_tier_requests') || 
          errorString.includes('free-tier-requests') ||
          errorString.includes('FreeTierRequests')) {
        console.error('[Gemini Wrapper] 🚨 TIER MISMATCH DETECTED: free_tier_requests found in error');
        return true;
      }

      // Check error.details array
      if (error.details && Array.isArray(error.details)) {
        for (const detail of error.details) {
          const detailString = JSON.stringify(detail);
          if (detailString.includes('free_tier_requests') ||
              detailString.includes('free-tier-requests') ||
              detailString.includes('FreeTierRequests')) {
            console.error('[Gemini Wrapper] 🚨 TIER MISMATCH DETECTED: free_tier_requests found in error.details');
            return true;
          }
        }
      }

      // Check error.errorDetails array
      if (error.errorDetails && Array.isArray(error.errorDetails)) {
        for (const detail of error.errorDetails) {
          const detailString = JSON.stringify(detail);
          if (detailString.includes('free_tier_requests') ||
              detailString.includes('free-tier-requests') ||
              detailString.includes('FreeTierRequests')) {
            console.error('[Gemini Wrapper] 🚨 TIER MISMATCH DETECTED: free_tier_requests found in error.errorDetails');
            return true;
          }
        }
      }

      // Check for 15 RPM limit in error message (free tier indicator)
      if (errorMessage.includes('15') && 
          (errorMessage.includes('requests per minute') || errorMessage.includes('RPM'))) {
        console.error('[Gemini Wrapper] 🚨 TIER MISMATCH DETECTED: 15 RPM limit found in error message');
        return true;
      }

    } catch (parseError) {
      console.error('[Gemini Wrapper] ❌ Error detecting tier mismatch:', parseError);
    }

    return false;
  }

  /**
   * Extract detailed rate limit information from error
   */
  private extractRateLimitInfo(error: any): RateLimitInfo {
    const info: RateLimitInfo = {
      tierDetected: 'Unknown',
      violationDetails: [],
    };

    try {
      // Extract from error message
      const errorMessage = error.message || '';
      
      // Check for quota metric in message
      if (errorMessage.includes('RPM')) {
        info.quotaMetric = 'Requests Per Minute (RPM)';
      } else if (errorMessage.includes('TPM')) {
        info.quotaMetric = 'Tokens Per Minute (TPM)';
      } else if (errorMessage.includes('RPD')) {
        info.quotaMetric = 'Requests Per Day (RPD)';
      } else if (errorMessage.includes('Resource exhausted')) {
        // Generic message - likely RPM on free tier
        info.quotaMetric = 'Requests Per Minute (RPM) - likely';
      }

      // Try to extract from errorDetails property (GoogleGenerativeAI SDK format)
      if (error.errorDetails && Array.isArray(error.errorDetails)) {
        for (const detail of error.errorDetails) {
          if (detail['@type']?.includes('QuotaFailure')) {
            if (detail.violations && Array.isArray(detail.violations)) {
              for (const violation of detail.violations) {
                info.violationDetails?.push(
                  `${violation.subject}: ${violation.description}`
                );

                if (violation.subject) {
                  info.quotaMetric = violation.subject;
                }
                if (violation.description) {
                  info.quotaLimit = violation.description;
                  
                  if (violation.description.includes('15') || 
                      violation.description.includes('1500')) {
                    info.tierDetected = 'Free';
                  } else if (violation.description.includes('360') || 
                             violation.description.includes('10000')) {
                    info.tierDetected = 'Paid';
                  }
                }
              }
            }
          }

          if (detail['@type']?.includes('ErrorInfo')) {
            if (detail.reason) {
              info.quotaMetric = detail.reason;
            }
            if (detail.metadata) {
              info.quotaLocation = detail.metadata.service || detail.metadata.consumer;
            }
          }
        }
      }

      // Also try error.details (alternative format)
      if (error.details && Array.isArray(error.details)) {
        for (const detail of error.details) {
          if (detail['@type']?.includes('QuotaFailure')) {
            if (detail.violations && Array.isArray(detail.violations)) {
              for (const violation of detail.violations) {
                info.violationDetails?.push(
                  `${violation.subject}: ${violation.description}`
                );

                if (violation.subject) {
                  info.quotaMetric = violation.subject;
                }
                if (violation.description) {
                  info.quotaLimit = violation.description;
                  
                  if (violation.description.includes('15') || 
                      violation.description.includes('1500')) {
                    info.tierDetected = 'Free';
                  } else if (violation.description.includes('360') || 
                             violation.description.includes('10000')) {
                    info.tierDetected = 'Paid';
                  }
                }
              }
            }
          }

          if (detail['@type']?.includes('ErrorInfo')) {
            if (detail.reason) {
              info.quotaMetric = detail.reason;
            }
            if (detail.metadata) {
              info.quotaLocation = detail.metadata.service || detail.metadata.consumer;
            }
          }
        }
      }

      // Extract from response headers (if available)
      if (error.response?.headers) {
        const headers = error.response.headers;
        
        if (headers['x-goog-ratelimit-remaining']) {
          info.remainingQuota = headers['x-goog-ratelimit-remaining'];
        }
        
        if (headers['x-goog-retry-after']) {
          info.retryAfter = headers['x-goog-retry-after'];
        }
        
        if (headers['retry-after']) {
          info.retryAfter = headers['retry-after'];
        }
      }

      // Parse error message for additional clues
      const rpmMatch = errorMessage.match(/(\d+)\s*(?:requests?|RPM)/i);
      if (rpmMatch) {
        const limit = parseInt(rpmMatch[1]);
        if (limit === 15) {
          info.tierDetected = 'Free';
          info.quotaLimit = '15 RPM (Free Tier)';
        } else if (limit === 360) {
          info.tierDetected = 'Paid';
          info.quotaLimit = '360 RPM (Paid Tier)';
        }
      }
      
      // If still unknown but we have "Resource exhausted", make educated guess
      if (info.tierDetected === 'Unknown' && errorMessage.includes('Resource exhausted')) {
        // Most common case for free tier
        info.tierDetected = 'Free (assumed)';
        info.quotaLimit = '15 RPM (Free Tier - assumed)';
        info.violationDetails?.push('Generic "Resource exhausted" error - likely hitting free tier RPM limit');
      }

    } catch (parseError) {
      console.error('[Gemini Wrapper] ❌ Error parsing rate limit info:', parseError);
    }

    return info;
  }

  /**
   * Log detailed error information
   */
  private logDetailedError(error: any, rateLimitInfo: RateLimitInfo, retryCount: number) {
    console.error('\n' + '='.repeat(80));
    console.error('[Gemini Wrapper] 🚨 API ERROR DETAILS');
    console.error('='.repeat(80));
    
    // Basic error info
    console.error(`Retry Attempt: ${retryCount}`);
    console.error(`Error Message: ${error.message || 'Unknown'}`);
    console.error(`Error Status: ${error.status || 'N/A'}`);
    console.error(`Error Status Text: ${error.statusText || 'N/A'}`);
    
    // Error code if available
    if (error.code) {
      console.error(`Error Code: ${error.code}`);
    }
    
    // Rate limit info
    console.error('\n📊 RATE LIMIT INFORMATION:');
    console.error(`  Tier Detected: ${rateLimitInfo.tierDetected}`);
    console.error(`  Quota Metric: ${rateLimitInfo.quotaMetric || 'Unknown'}`);
    console.error(`  Quota Limit: ${rateLimitInfo.quotaLimit || 'Unknown'}`);
    console.error(`  Remaining Quota: ${rateLimitInfo.remainingQuota || 'Unknown'}`);
    console.error(`  Retry After: ${rateLimitInfo.retryAfter || 'Unknown'} seconds`);
    
    if (rateLimitInfo.quotaLocation) {
      console.error(`  Quota Location: ${rateLimitInfo.quotaLocation}`);
    }
    
    // Violation details
    if (rateLimitInfo.violationDetails && rateLimitInfo.violationDetails.length > 0) {
      console.error('\n⚠️  QUOTA VIOLATIONS:');
      rateLimitInfo.violationDetails.forEach((violation, idx) => {
        console.error(`  ${idx + 1}. ${violation}`);
      });
    }
    
    // Raw error details
    if (error.details) {
      console.error('\n🔍 RAW ERROR DETAILS (error.details):');
      console.error(JSON.stringify(error.details, null, 2));
    }
    
    if (error.errorDetails) {
      console.error('\n🔍 RAW ERROR DETAILS (error.errorDetails):');
      console.error(JSON.stringify(error.errorDetails, null, 2));
    }
    
    // Response headers
    if (error.response?.headers) {
      console.error('\n📋 RESPONSE HEADERS:');
      const relevantHeaders = [
        'x-goog-ratelimit-remaining',
        'x-goog-retry-after',
        'retry-after',
        'x-goog-ratelimit-limit',
        'x-goog-ratelimit-reset',
      ];
      
      relevantHeaders.forEach(header => {
        const value = error.response.headers[header];
        if (value) {
          console.error(`  ${header}: ${value}`);
        }
      });
    }
    
    // Full error object for debugging
    console.error('\n🔬 FULL ERROR OBJECT:');
    console.error(JSON.stringify({
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      code: error.code,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'), // First 3 lines of stack
    }, null, 2));
    
    // Recommendations
    console.error('\n💡 RECOMMENDATIONS:');
    if (rateLimitInfo.tierDetected === 'Free' || rateLimitInfo.tierDetected?.includes('Free')) {
      console.error('  • You are on the FREE tier (15 RPM, 1,500 RPD)');
      console.error('  • If you have a Paid project, this is a TIER MISMATCH!');
      console.error('  • Solutions:');
      console.error('    1. Verify API key is from correct project');
      console.error('    2. Check project billing is enabled in Google Cloud Console');
      console.error('    3. Ensure API key has Paid tier permissions');
      console.error('    4. Check if quota increase request was approved');
      console.error('  • Otherwise, upgrade to Paid tier (2,000 RPM, 10,000 RPD)');
    } else if (rateLimitInfo.tierDetected === 'Paid') {
      console.error('  • You are on the PAID tier but still hitting limits');
      console.error('  • Consider batching requests or implementing request queuing');
    } else {
      console.error('  • Unable to detect tier from error');
      console.error('  • Check your Google Cloud Console for quota details');
      console.error('  • Verify billing is enabled and quota increase was approved');
    }
    
    if (rateLimitInfo.quotaMetric?.includes('RPM')) {
      console.error('  • Issue: Too many requests per minute');
      console.error('  • Solution: Increase delay between calls');
    } else if (rateLimitInfo.quotaMetric?.includes('TPM')) {
      console.error('  • Issue: Too many tokens per minute');
      console.error('  • Solution: Reduce prompt size or image resolution');
    } else if (rateLimitInfo.quotaMetric?.includes('RPD')) {
      console.error('  • Issue: Daily quota exceeded');
      console.error('  • Solution: Wait until quota resets or upgrade tier');
    }
    
    console.error('='.repeat(80) + '\n');
  }

  /**
   * Helper to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get API call statistics
   */
  getStats() {
    return {
      totalCalls: this.apiCallCount,
      lastCallTimestamp: this.lastCallTimestamp,
      timeSinceLastCall: this.lastCallTimestamp 
        ? Date.now() - this.lastCallTimestamp 
        : null,
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.apiCallCount = 0;
    this.lastCallTimestamp = 0;
  }
}

/**
 * Create a singleton instance for the application
 */
let geminiWrapperInstance: GeminiWrapper | null = null;

export function getGeminiWrapper(): GeminiWrapper {
  if (!geminiWrapperInstance) {
    // Vertex AI uses Application Default Credentials or service account
    // No API key needed - uses project ID instead
    geminiWrapperInstance = new GeminiWrapper(
      VERTEX_AI_CONFIG.projectId,
      VERTEX_AI_CONFIG.location,
      GEMINI_MODEL
    );
  }
  return geminiWrapperInstance;
}
