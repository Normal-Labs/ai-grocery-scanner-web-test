/**
 * POST /api/classify-image
 * 
 * Classifies an image to determine its type for routing.
 * Returns classification result with confidence score.
 * 
 * Requirements: 1.1-1.7, 8.1, 8.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { ImageClassifier } from '@/lib/services/image-classifier';

/**
 * Rate limiting configuration
 * Requirements: 9.6, 9.7
 */
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const FREE_TIER_MAX_REQUESTS = 10; // 10 requests per minute for free tier
const PREMIUM_TIER_MAX_REQUESTS = 30; // 30 requests per minute for premium tier
const rateLimitStore = new Map<string, number[]>();

/**
 * Check if request should be rate limited
 * 
 * @param ip - Client IP address
 * @param tier - User tier (free or premium)
 * @returns true if rate limited, false otherwise
 */
function isRateLimited(ip: string, tier: 'free' | 'premium' = 'free'): boolean {
  const now = Date.now();
  const timestamps = rateLimitStore.get(ip) || [];
  
  // Filter out timestamps outside the rate limit window
  const validTimestamps = timestamps.filter(
    timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS
  );
  
  // Check if limit exceeded
  const maxRequests = tier === 'premium' ? PREMIUM_TIER_MAX_REQUESTS : FREE_TIER_MAX_REQUESTS;
  if (validTimestamps.length >= maxRequests) {
    return true;
  }
  
  // Record this request
  validTimestamps.push(now);
  rateLimitStore.set(ip, validTimestamps);
  
  return false;
}

/**
 * Get client IP address from request
 * 
 * @param request - Next.js request object
 * @returns Client IP address
 */
function getClientIP(request: NextRequest): string {
  // Try to get IP from various headers (for proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Fallback to a default IP for development
  return '127.0.0.1';
}

/**
 * Validate image data
 * 
 * Requirements: 8.1, 8.5
 * 
 * @param imageData - Base64 encoded image data
 * @returns Validation result
 */
function validateImageData(imageData: unknown): { valid: boolean; error?: string } {
  // Check if imageData is present
  if (!imageData) {
    return { valid: false, error: 'Missing imageData field' };
  }
  
  // Check if imageData is a string
  if (typeof imageData !== 'string') {
    return { valid: false, error: 'imageData must be a string' };
  }
  
  // Check if imageData is a valid data URI
  if (!imageData.startsWith('data:image/')) {
    return { valid: false, error: 'imageData must be a valid data URI (data:image/...)' };
  }
  
  // Check image size (approximate, base64 is ~33% larger than binary)
  const base64Data = imageData.split(',')[1] || '';
  const sizeInBytes = (base64Data.length * 3) / 4;
  const sizeInMB = sizeInBytes / (1024 * 1024);
  
  if (sizeInMB > 10) {
    return { valid: false, error: 'Image too large (max 10MB)' };
  }
  
  return { valid: true };
}

/**
 * POST /api/classify-image
 * 
 * Classifies an image to determine its type for routing.
 * 
 * Request body:
 * {
 *   imageData: string; // base64 encoded image with data URI prefix
 *   tier?: 'free' | 'premium'; // optional, defaults to 'free'
 * }
 * 
 * Response:
 * {
 *   success: boolean;
 *   data?: {
 *     type: 'barcode' | 'product_image' | 'nutrition_label' | 'unknown';
 *     confidence: number;
 *     metadata?: {
 *       hasNutritionalFacts?: boolean;
 *       hasIngredientList?: boolean;
 *       hasBarcodeVisible?: boolean;
 *     };
 *   };
 *   error?: string;
 * }
 * 
 * Status codes:
 * - 200: Success
 * - 400: Invalid request (missing imageData, invalid format)
 * - 413: Image too large (> 10MB)
 * - 429: Rate limit exceeded
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  console.log('[Classify Image API] 📸 Received classification request');
  
  try {
    // Step 1: Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      console.error('[Classify Image API] ❌ Invalid JSON:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body'
        },
        { status: 400 }
      );
    }
    
    const { imageData, tier = 'free' } = body;
    
    // Step 2: Rate limiting
    const clientIP = getClientIP(request);
    
    if (isRateLimited(clientIP, tier)) {
      console.warn('[Classify Image API] ⚠️  Rate limit exceeded:', {
        ip: clientIP,
        tier,
        timestamp: new Date().toISOString(),
      });
      
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.'
        },
        { status: 429 }
      );
    }
    
    // Step 3: Validate image data
    const validation = validateImageData(imageData);
    if (!validation.valid) {
      console.error('[Classify Image API] ❌ Validation failed:', validation.error);
      
      // Return 413 for size errors, 400 for other validation errors
      const statusCode = validation.error?.includes('too large') ? 413 : 400;
      
      return NextResponse.json(
        {
          success: false,
          error: validation.error
        },
        { status: statusCode }
      );
    }
    
    // Step 4: Classify image
    console.log('[Classify Image API] 🔍 Classifying image...');
    
    // Check if API key is available
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      console.error('[Classify Image API] ❌ Missing Gemini API key');
      console.error('[Classify Image API] Available env vars:', Object.keys(process.env).filter(k => k.includes('GEMINI') || k.includes('GOOGLE')));
      return NextResponse.json(
        {
          success: false,
          error: 'Image classification service is not configured. Please contact support.'
        },
        { status: 500 }
      );
    }
    
    const classifier = new ImageClassifier(apiKey);
    const classification = await classifier.classify(imageData);
    
    const duration = Date.now() - startTime;
    
    console.log('[Classify Image API] ✅ Classification complete:', {
      type: classification.type,
      confidence: classification.confidence,
      duration,
      timestamp: new Date().toISOString(),
    });
    
    // Step 5: Return result
    return NextResponse.json(
      {
        success: true,
        data: classification
      },
      { status: 200 }
    );
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error('[Classify Image API] ❌ Classification failed:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration,
      timestamp: new Date().toISOString(),
    });
    
    // Log more details for debugging
    if (error instanceof Error) {
      console.error('[Classify Image API] Error name:', error.name);
      console.error('[Classify Image API] Error message:', error.message);
      if (error.stack) {
        console.error('[Classify Image API] Stack trace:', error.stack.split('\n').slice(0, 5).join('\n'));
      }
    }
    
    // Return user-friendly error message
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to classify image. Please try again.'
      },
      { status: 500 }
    );
  }
}
