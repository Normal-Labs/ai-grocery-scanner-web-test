/**
 * Analysis API Route - Research Agent with Tool-Calling
 * 
 * POST /api/analyze
 * 
 * This API route handles image analysis requests using Gemini 2.0 Flash
 * with agentic tool-calling capabilities (Tavily Search + Jina Reader).
 * Supports tiered access control (Free/Premium) and progress tracking.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 9.1-9.7, 10.1-10.8, 11.2, 11.4, 11.7, 13.7, 13.8, 17.1-17.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { constructPrompt, parseGeminiResponse } from '@/lib/gemini';
import { getToolsForTier } from '@/lib/tools';
import type { EnhancedAnalyzeResponse, TierType, InsightCategory, ProgressStep } from '@/lib/types';

/**
 * Base64 image data validation regex
 */
const BASE64_IMAGE_REGEX = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/;

/**
 * Rate limiting configuration
 */
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per window
const rateLimitStore = new Map<string, number[]>();

/**
 * Check if request should be rate limited
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
 * POST handler for /api/analyze endpoint
 * 
 * Supports tier-based analysis with Research Agent capabilities
 */
export async function POST(request: NextRequest) {
  const progressSteps: ProgressStep[] = [];
  
  try {
    // Step 0: Rate limiting
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
        } as EnhancedAnalyzeResponse,
        { 
          status: 429,
          headers: { 'Retry-After': '60' }
        }
      );
    }

    // Step 1: Parse and validate request body
    const body = await request.json();

    // Validate imageData
    if (!body.imageData || typeof body.imageData !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing or invalid imageData field in request body'
        } as EnhancedAnalyzeResponse,
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
        } as EnhancedAnalyzeResponse,
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
        } as EnhancedAnalyzeResponse,
        { status: 400 }
      );
    }

    // Validate base64 format
    if (!BASE64_IMAGE_REGEX.test(body.imageData)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid base64 image format. Expected data:image/{type};base64,{data}'
        } as EnhancedAnalyzeResponse,
        { status: 400 }
      );
    }

    // Step 2: Retrieve API keys from environment
    const geminiApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!geminiApiKey) {
      console.error('[API Error]', {
        timestamp: new Date().toISOString(),
        endpoint: '/api/analyze',
        error: 'Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable',
        statusCode: 500
      });

      return NextResponse.json(
        {
          success: false,
          error: 'API configuration error. Please contact support.'
        } as EnhancedAnalyzeResponse,
        { status: 500 }
      );
    }

    // Step 3: Configure tools based on tier
    const tools = getToolsForTier(tier);
    const maxSteps = tier === 'premium' ? 5 : 1;

    console.log('[Analysis Request]', {
      timestamp: new Date().toISOString(),
      tier,
      dimension: dimension || 'all',
      toolsEnabled: Object.keys(tools).length > 0,
      maxSteps
    });

    // Step 4: Construct tier-aware prompt
    const prompt = constructPrompt(tier, dimension);

    // Step 5: Convert base64 image to format for Vercel AI SDK
    const base64Data = body.imageData.split(',')[1];
    const mimeType = body.imageData.split(';')[0].split(':')[1];

    // Step 6: Call Gemini with Research Agent capabilities
    const result = await generateText({
      model: google('gemini-2.0-flash-exp'),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image',
              image: body.imageData,
            },
          ],
        },
      ],
      tools,
      maxRetries: tier === 'premium' ? 5 : 0, // Allow retries for tool-calling
      onStepFinish: (step) => {
        // Track progress for Premium tier
        if (tier === 'premium') {
          const toolCalls = step.toolCalls || [];
          
          for (const toolCall of toolCalls) {
            if (toolCall.toolName === 'tavilySearch') {
              progressSteps.push({
                type: 'search',
                message: 'Searching for product data...',
                timestamp: Date.now(),
              });
            } else if (toolCall.toolName === 'scrape_url') {
              progressSteps.push({
                type: 'scrape',
                message: 'Reading manufacturer reports...',
                timestamp: Date.now(),
              });
            }
          }
          
          if (step.finishReason === 'stop') {
            progressSteps.push({
              type: 'synthesis',
              message: 'Generating insights...',
              timestamp: Date.now(),
            });
          }
        }
      },
    });

    const responseText = result.text;

    console.log('[Gemini Response]', {
      timestamp: new Date().toISOString(),
      responseLength: responseText.length,
      stepsUsed: result.steps?.length || 1,
      toolCallsUsed: progressSteps.length,
      responsePreview: responseText.substring(0, 200)
    });

    // Step 7: Parse and validate response
    const analysisResult = parseGeminiResponse(responseText, tier, dimension);

    // Add completion step
    if (tier === 'premium') {
      progressSteps.push({
        type: 'complete',
        message: 'Analysis complete',
        timestamp: Date.now(),
      });
    }

    // Step 8: Return structured JSON response with progress steps
    return NextResponse.json(
      {
        success: true,
        data: analysisResult,
        steps: progressSteps.length > 0 ? progressSteps : undefined,
      } as EnhancedAnalyzeResponse,
      { status: 200 }
    );

  } catch (error) {
    console.error('[API Error]', {
      timestamp: new Date().toISOString(),
      endpoint: '/api/analyze',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      statusCode: 500
    });

    // Check if it's a parsing error
    if (error instanceof Error && error.message.includes('Invalid')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unable to analyze image. The AI response was not in the expected format. Please try again.'
        } as EnhancedAnalyzeResponse,
        { status: 500 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred during analysis. Please try again.'
      } as EnhancedAnalyzeResponse,
      { status: 500 }
    );
  }
}
