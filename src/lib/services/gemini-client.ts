/**
 * Gemini API Client for Multi-Tier Product Identification
 * 
 * This client provides methods for interacting with Google's Gemini API
 * for OCR text extraction and comprehensive image analysis.
 * 
 * Requirements: 2.2, 4.2, 8.3
 */

import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { ImageData, ProductMetadata, VisualCharacteristics } from '@/lib/types/multi-tier';

/**
 * Gemini API Client class
 * 
 * Provides methods for OCR text extraction and comprehensive image analysis
 * using Google's Gemini 2.0 Flash model via Vercel AI SDK.
 */
export class GeminiClient {
  private apiKey: string;
  private model: string = 'gemini-2.0-flash'; // Same model as working /api/analyze endpoint

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('Gemini API key is required');
    }
    
    // Set API key for @ai-sdk/google
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = this.apiKey;
  }

  /**
   * Extract text from an image using Gemini OCR
   * Requirement 2.2: Extract text using Gemini OCR capabilities
   * 
   * @param image - Image data to extract text from
   * @returns Promise resolving to extracted text
   */
  async extractText(image: ImageData): Promise<string> {
    const startTime = Date.now();
    
    try {
      console.log('[Gemini Client] 📝 Extracting text from image...');

      const imageDataUrl = `data:${image.mimeType};base64,${image.base64}`;

      const result = await generateText({
        model: google(this.model),
        temperature: 0.1, // Low temperature for factual extraction
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract all visible text from this product packaging image. List the text you see, focusing on:
- Product name
- Brand name  
- Size/quantity (e.g., "12 oz", "500g")
- Any other visible text

Format your response as:
Product Name: [name]
Brand: [brand]
Size: [size]
Other text: [any other visible text]

Be concise and accurate.`
              },
              {
                type: 'image',
                image: imageDataUrl,
              },
            ],
          },
        ],
      });

      const extractedText = result.text;
      const duration = Date.now() - startTime;

      console.log(`[Gemini Client] ✅ Text extracted (${duration}ms)`);
      console.log(`[Gemini Client] Extracted text preview: ${extractedText.substring(0, 100)}...`);

      return extractedText;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[Gemini Client] ❌ Text extraction failed (${duration}ms):`, error);
      throw error;
    }
  }

  /**
   * Analyze product image comprehensively
   * Requirement 4.2: Analyze image using Gemini AI
   * 
   * @param image - Image data to analyze
   * @returns Promise resolving to product metadata and visual characteristics
   */
  async analyzeProduct(image: ImageData): Promise<{
    metadata: ProductMetadata;
    visualCharacteristics: VisualCharacteristics;
    confidence: number;
  }> {
    const startTime = Date.now();
    
    try {
      console.log('[Gemini Client] 🔍 Analyzing product image...');

      const imageDataUrl = `data:${image.mimeType};base64,${image.base64}`;

      const result = await generateText({
        model: google(this.model),
        temperature: 0.2,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this product image and provide detailed information in JSON format:

{
  "productName": "Full product name",
  "brandName": "Brand name",
  "size": "Size or quantity (e.g., '12 oz', '500g')",
  "category": "Product category (e.g., 'Beverages', 'Snacks', 'Dairy')",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "visualCharacteristics": {
    "colors": ["primary color", "secondary color"],
    "packaging": "Type of packaging (e.g., 'bottle', 'box', 'can')",
    "shape": "Overall shape description"
  },
  "confidence": 0.85
}

Be as accurate as possible. Set confidence between 0.0 and 1.0 based on image clarity and your certainty.
Return ONLY the JSON object, no additional text.`
              },
              {
                type: 'image',
                image: imageDataUrl,
              },
            ],
          },
        ],
      });

      const responseText = result.text;
      
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                       responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('Failed to parse JSON from Gemini response');
      }

      const jsonText = jsonMatch[1] || jsonMatch[0];
      const parsedResult = JSON.parse(jsonText);

      const duration = Date.now() - startTime;
      console.log(`[Gemini Client] ✅ Product analyzed (${duration}ms)`);
      console.log(`[Gemini Client] Product: ${parsedResult.productName}, Confidence: ${parsedResult.confidence}`);

      return {
        metadata: {
          productName: parsedResult.productName,
          brandName: parsedResult.brandName,
          size: parsedResult.size,
          category: parsedResult.category,
          keywords: parsedResult.keywords || [],
        },
        visualCharacteristics: parsedResult.visualCharacteristics,
        confidence: parsedResult.confidence,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[Gemini Client] ❌ Product analysis failed (${duration}ms):`, error);
      throw error;
    }
  }

  /**
   * Handle API rate limits with exponential backoff
   * Requirement 8.3: Handle API rate limits
   * 
   * @param operation - Async operation to execute with retry
   * @param maxRetries - Maximum number of retries
   * @returns Promise resolving to operation result
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Check if it's a rate limit error (429)
        const isRateLimit = error instanceof Error && 
                           error.message.includes('429');
        
        if (isRateLimit && attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s, ...
          const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
          console.log(`[Gemini Client] ⚠️  Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
        } else if (attempt < maxRetries) {
          // For other errors, shorter delay
          const delay = 500;
          console.log(`[Gemini Client] ⚠️  Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.error(`[Gemini Client] ❌ Operation failed after ${maxRetries + 1} attempts`);
    throw lastError || new Error('Operation failed');
  }
}

// Export singleton instance
export const geminiClient = new GeminiClient();
