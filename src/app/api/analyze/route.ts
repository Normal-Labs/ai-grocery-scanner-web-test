/**
 * Analysis API Route
 * 
 * POST /api/analyze
 * 
 * This API route handles image analysis requests using Gemini 2.0 Flash.
 * It validates the request, calls the Gemini API with the image and prompt,
 * and returns structured analysis results.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { constructPrompt, parseGeminiResponse } from '@/lib/gemini';
import { AnalyzeResponse } from '@/lib/types';

/**
 * Base64 image data validation regex
 * Matches data URI format: data:image/{type};base64,{data}
 */
const BASE64_IMAGE_REGEX = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/;

/**
 * Rate limiting configuration
 * Requirement 9.6: Implement rate limiting to prevent abuse
 */
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per window

/**
 * In-memory store for rate limiting
 * Maps IP address to array of request timestamps
 */
const rateLimitStore = new Map<string, number[]>();

/**
 * Check if request should be rate limited
 * 
 * @param ip - Client IP address
 * @returns true if rate limit exceeded, false otherwise
 */
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitStore.get(ip) || [];
  
  // Remove timestamps outside the current window
  const validTimestamps = timestamps.filter(
    timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS
  );
  
  // Check if limit exceeded
  if (validTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  
  // Add current timestamp and update store
  validTimestamps.push(now);
  rateLimitStore.set(ip, validTimestamps);
  
  return false;
}

/**
 * Extract client IP address from request
 * 
 * @param request - NextRequest object
 * @returns Client IP address or 'unknown'
 */
function getClientIP(request: NextRequest): string {
  // Try to get IP from various headers (Vercel, Cloudflare, etc.)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Fallback to unknown if no IP found
  return 'unknown';
}

/**
 * POST handler for /api/analyze endpoint
 * 
 * Validates request body, calls Gemini API, and returns structured results
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 9.1, 9.2, 9.3, 9.4, 9.5
 */
export async function POST(request: NextRequest) {
  try {
    // Step 0: Check rate limiting
    // Requirement 9.6: Implement rate limiting to prevent abuse
    const clientIP = getClientIP(request);
    
    if (isRateLimited(clientIP)) {
      console.warn('[Rate Limit]', {
        timestamp: new Date().toISOString(),
        endpoint: '/api/analyze',
        ip: clientIP,
        statusCode: 429
      });
      
      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests. Please try again later.'
        } as AnalyzeResponse,
        { 
          status: 429,
          headers: {
            'Retry-After': '60' // Suggest retry after 60 seconds
          }
        }
      );
    }

    // Step 1: Parse request body
    // Requirement 3.1: Receive image data from client
    const body = await request.json();

    // Step 2: Validate request body contains imageData field
    // Requirement 3.2: Validate image data format
    if (!body.imageData || typeof body.imageData !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing or invalid imageData field in request body'
        } as AnalyzeResponse,
        { status: 400 }
      );
    }

    // Step 3: Validate base64 format using regex
    // Requirement 3.2: Validate image data format
    // Requirement 9.5: Validate incoming requests
    if (!BASE64_IMAGE_REGEX.test(body.imageData)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid base64 image format. Expected data:image/{type};base64,{data}'
        } as AnalyzeResponse,
        { status: 400 }
      );
    }

    // Step 4: Retrieve API key from environment
    // Requirement 9.1: Retrieve API key from environment variables
    // Requirement 9.2: Never expose API key to client
    // Requirement 9.3: Execute on server side
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    // Step 5: Return 500 error if API key missing
    // Requirement 9.4: Return error when API key is missing
    if (!apiKey) {
      // Debug: Log available environment variables (without exposing values)
      console.error('[API Error]', {
        timestamp: new Date().toISOString(),
        endpoint: '/api/analyze',
        error: 'Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable',
        availableEnvVars: Object.keys(process.env).filter(key => key.includes('GOOGLE') || key.includes('API')),
        statusCode: 500
      });

      return NextResponse.json(
        {
          success: false,
          error: 'API configuration error. Please contact support.'
        } as AnalyzeResponse,
        { status: 500 }
      );
    }

    // Step 6: Construct Gemini prompt using constructPrompt()
    // Requirement 3.3: Construct system prompt
    const prompt = constructPrompt();

    // Step 7: Initialize Google Generative AI with API key
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Step 8: Get the Gemini model (using gemini-2.0-flash for vision support)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Step 9: Convert base64 image to the format Gemini expects
    // Extract the base64 data without the data URI prefix
    const base64Data = body.imageData.split(',')[1];
    const mimeType = body.imageData.split(';')[0].split(':')[1];

    // Step 10: Call Gemini API with image and prompt
    // Requirement 3.4: Call Gemini service with image and prompt
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      }
    ]);

    const response = result.response;
    const text = response.text();

    // Log the raw response for debugging
    console.log('[Gemini Response]', {
      timestamp: new Date().toISOString(),
      responseLength: text.length,
      responsePreview: text.substring(0, 200)
    });

    // Step 11: Parse response using parseGeminiResponse()
    // Requirement 3.5: Parse response into structured JSON
    const analysisResult = parseGeminiResponse(text);

    // Step 12: Return structured JSON response
    // Requirement 3.6: Return array of ProductResult objects
    return NextResponse.json(
      {
        success: true,
        data: analysisResult
      } as AnalyzeResponse,
      { status: 200 }
    );

  } catch (error) {
    // Requirement 3.7: Return error response with descriptive message
    console.error('[API Error]', {
      timestamp: new Date().toISOString(),
      endpoint: '/api/analyze',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      statusCode: 500
    });

    // Check if it's a parsing error from parseGeminiResponse
    if (error instanceof Error && error.message.includes('Invalid')) {
      console.error('[Parsing Error Details]', {
        errorMessage: error.message,
        errorType: 'JSON parsing failed'
      });
      
      return NextResponse.json(
        {
          success: false,
          error: 'Unable to analyze image. The AI response was not in the expected format. Please try again.'
        } as AnalyzeResponse,
        { status: 500 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred during analysis. Please try again.'
      } as AnalyzeResponse,
      { status: 500 }
    );
  }
}
