/**
 * Scan API Route - Cache-First Product Scanning
 * 
 * POST /api/scan
 * 
 * This API route handles product scan requests using a cache-first architecture.
 * It checks MongoDB for cached insights before triggering the Research Agent,
 * manages product registry in Supabase, and tracks inventory at store locations.
 * 
 * Requirements: 1.2, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 10.1, 10.2, 10.3, 10.6
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/client';
import { scanOrchestrator } from '@/lib/orchestrator/ScanOrchestrator';
import { isScanRequest, isOrchestratorError } from '@/lib/orchestrator/types';
import type { ScanRequest, ScanResult, OrchestratorError } from '@/lib/orchestrator/types';
import type { TierType, InsightCategory } from '@/lib/types';

/**
 * Base64 image data validation regex
 */
const BASE64_IMAGE_REGEX = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/;

/**
 * Barcode validation regex (8-13 digits)
 */
const BARCODE_REGEX = /^\d{8,13}$/;

/**
 * Rate limiting configuration
 */
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per window
const rateLimitStore = new Map<string, number[]>();

/**
 * Response interface for scan endpoint
 */
interface ScanResponse {
  success: boolean;
  data?: ScanResult;
  error?: string;
}

/**
 * Check if request should be rate limited
 * 
 * Requirement 10.3: Implement rate limiting to prevent abuse
 */
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitStore.get(ip) || [];
  
  const validTimestamps = timestamps.filter(
    timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS
  );
  
  if (validTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  
  validTimestamps.push(now);
  rateLimitStore.set(ip, validTimestamps);
  
  return false;
}

/**
 * Extract client IP address from request
 */
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

/**
 * Verify user authentication
 * 
 * Requirement 1.2: Associate scans with authenticated user_id
 * Requirement 1.5: Prompt for authentication before allowing scans
 * 
 * @param request - Next.js request object
 * @returns User ID if authenticated, null otherwise
 */
async function verifyAuthentication(request: NextRequest): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    
    // Get session from request headers (Authorization header)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify the token and get user
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('[Scan API] Authentication verification failed:', error?.message);
      return null;
    }
    
    return user.id;
  } catch (error) {
    console.error('[Scan API] Authentication error:', error);
    return null;
  }
}

/**
 * POST handler for /api/scan endpoint
 * 
 * Processes product scans using cache-first architecture with Supabase authentication.
 * 
 * Requirements:
 * - 1.2: Associate scans with authenticated user_id
 * - 1.5: Require authentication before allowing scans
 * - 5.1: Check MongoDB cache before triggering Research Agent
 * - 5.2: Update last_scanned_at timestamp on cache hit
 * - 5.3: Return cached insight without triggering Research Agent on cache hit
 * - 5.4: Trigger Research Agent on cache miss
 * - 5.5: Save insight to MongoDB after Research Agent completes
 * - 5.6: Save or update product metadata in Supabase
 * - 10.1: Handle database unavailability gracefully
 * - 10.2: Provide user-friendly error messages
 * - 10.3: Implement rate limiting
 * - 10.6: Provide clear error messages for authentication failures
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Step 1: Rate limiting
    // Requirement 10.3: Implement rate limiting
    const clientIP = getClientIP(request);
    
    if (isRateLimited(clientIP)) {
      console.warn('[Scan API] Rate limit exceeded:', {
        timestamp: new Date().toISOString(),
        endpoint: '/api/scan',
        ip: clientIP,
        statusCode: 429
      });
      
      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests. Please try again later.'
        } as ScanResponse,
        { 
          status: 429,
          headers: { 'Retry-After': '60' }
        }
      );
    }

    // Step 2: Verify user authentication
    // Requirement 1.2, 1.5: Verify authentication and get user_id
    const userId = await verifyAuthentication(request);
    
    if (!userId) {
      console.warn('[Scan API] Unauthenticated request:', {
        timestamp: new Date().toISOString(),
        endpoint: '/api/scan',
        ip: clientIP,
        statusCode: 401
      });
      
      // Requirement 10.6: Provide clear error messages for authentication failures
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required. Please sign in to scan products.'
        } as ScanResponse,
        { status: 401 }
      );
    }

    // Step 3: Parse and validate request body
    const body = await request.json();

    // Validate barcode
    if (!body.barcode || typeof body.barcode !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing or invalid barcode field in request body'
        } as ScanResponse,
        { status: 400 }
      );
    }

    if (!BARCODE_REGEX.test(body.barcode)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid barcode format. Expected 8-13 digits.'
        } as ScanResponse,
        { status: 400 }
      );
    }

    // Validate imageData
    if (!body.imageData || typeof body.imageData !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing or invalid imageData field in request body'
        } as ScanResponse,
        { status: 400 }
      );
    }

    if (!BASE64_IMAGE_REGEX.test(body.imageData)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid base64 image format. Expected data:image/{type};base64,{data}'
        } as ScanResponse,
        { status: 400 }
      );
    }

    // Validate tier
    const tier: TierType = body.tier || 'free';
    if (tier !== 'free' && tier !== 'premium') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid tier. Must be "free" or "premium"'
        } as ScanResponse,
        { status: 400 }
      );
    }

    // Validate dimension for free tier
    const dimension: InsightCategory | undefined = body.dimension;
    if (tier === 'free' && !dimension) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dimension is required for free tier'
        } as ScanResponse,
        { status: 400 }
      );
    }

    // Validate location if provided
    let location: { latitude: number; longitude: number } | undefined;
    if (body.location) {
      if (
        typeof body.location !== 'object' ||
        typeof body.location.latitude !== 'number' ||
        typeof body.location.longitude !== 'number'
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid location format. Expected { latitude: number, longitude: number }'
          } as ScanResponse,
          { status: 400 }
        );
      }

      const { latitude, longitude } = body.location;
      
      if (latitude < -90 || latitude > 90) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid latitude. Must be between -90 and 90.'
          } as ScanResponse,
          { status: 400 }
        );
      }

      if (longitude < -180 || longitude > 180) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid longitude. Must be between -180 and 180.'
          } as ScanResponse,
          { status: 400 }
        );
      }

      location = { latitude, longitude };
    }

    // Step 4: Construct scan request
    const scanRequest: ScanRequest = {
      barcode: body.barcode,
      imageData: body.imageData,
      userId,
      location,
      tier,
      dimension,
    };

    // Validate scan request using type guard
    if (!isScanRequest(scanRequest)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid scan request format'
        } as ScanResponse,
        { status: 400 }
      );
    }

    console.log('[Scan API] Processing scan request:', {
      timestamp: new Date().toISOString(),
      barcode: scanRequest.barcode,
      userId,
      hasLocation: !!location,
      tier,
      dimension: dimension || 'all',
    });

    // Step 5: Process scan using orchestrator
    // Requirements 5.1-5.6: Cache-first scan flow
    const result = await scanOrchestrator.processScan(scanRequest);

    const duration = Date.now() - startTime;
    
    console.log('[Scan API] Scan completed successfully:', {
      timestamp: new Date().toISOString(),
      barcode: scanRequest.barcode,
      userId,
      fromCache: result.fromCache,
      hasStore: !!result.storeId,
      duration,
    });

    // Step 6: Return successful response
    return NextResponse.json(
      {
        success: true,
        data: result,
      } as ScanResponse,
      { status: 200 }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Handle OrchestratorError with specific error codes
    if (isOrchestratorError(error)) {
      const orchestratorError = error as OrchestratorError;
      
      console.error('[Scan API] Orchestrator error:', {
        timestamp: new Date().toISOString(),
        endpoint: '/api/scan',
        code: orchestratorError.code,
        message: orchestratorError.message,
        source: orchestratorError.source,
        recoverable: orchestratorError.recoverable,
        context: orchestratorError.context,
        duration,
        statusCode: orchestratorError.recoverable ? 503 : 500
      });

      // Requirement 10.1: Handle database unavailability gracefully
      // Requirement 10.2: Provide user-friendly error messages
      let userMessage: string;
      let statusCode: number;

      switch (orchestratorError.source) {
        case 'mongodb':
          userMessage = orchestratorError.recoverable
            ? 'Cache service temporarily unavailable. Please try again in a moment.'
            : 'Unable to access cache service. Please contact support.';
          statusCode = orchestratorError.recoverable ? 503 : 500;
          break;
        
        case 'supabase':
          userMessage = orchestratorError.recoverable
            ? 'Database temporarily unavailable. Please try again in a moment.'
            : 'Unable to access database. Please contact support.';
          statusCode = orchestratorError.recoverable ? 503 : 500;
          break;
        
        case 'research-agent':
          userMessage = 'Unable to analyze product. Please try again or contact support.';
          statusCode = 500;
          break;
        
        case 'geolocation':
          userMessage = 'Unable to process location. Scan will continue without location data.';
          statusCode = 500;
          break;
        
        default:
          userMessage = 'An error occurred while processing your scan. Please try again.';
          statusCode = 500;
      }

      return NextResponse.json(
        {
          success: false,
          error: userMessage,
        } as ScanResponse,
        { 
          status: statusCode,
          headers: orchestratorError.recoverable ? { 'Retry-After': '5' } : {}
        }
      );
    }

    // Handle generic errors
    console.error('[Scan API] Unexpected error:', {
      timestamp: new Date().toISOString(),
      endpoint: '/api/scan',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration,
      statusCode: 500
    });

    // Requirement 10.2: Provide user-friendly error messages
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred while processing your scan. Please try again.'
      } as ScanResponse,
      { status: 500 }
    );
  }
}
