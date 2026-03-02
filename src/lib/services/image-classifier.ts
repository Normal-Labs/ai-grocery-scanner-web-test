/**
 * ImageClassifier Service for Nutritional Health Analysis
 * 
 * This service classifies captured images to determine their type for routing
 * to the appropriate analysis pipeline (barcode, product, or nutrition label).
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */

import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { hashImage } from '../imageHash';

/**
 * Image classification result interface
 * 
 * Requirement 1.2: Classify images into exactly one of three categories
 */
export interface ImageClassification {
  type: 'barcode' | 'product_image' | 'nutrition_label' | 'unknown';
  confidence: number; // 0.0 to 1.0
  metadata?: {
    hasNutritionalFacts?: boolean;
    hasIngredientList?: boolean;
    hasBarcodeVisible?: boolean;
  };
}

/**
 * ImageClassifier class
 * 
 * Classifies images using Gemini Vision API to determine if they contain
 * barcodes, product images, or nutritional labels.
 * 
 * Implements caching by image hash to avoid redundant API calls for duplicate images.
 */
export class ImageClassifier {
  private apiKey: string;
  private model: string = 'gemini-2.0-flash'; // Same model as GeminiClient
  private readonly CONFIDENCE_THRESHOLD = 0.6; // Requirement 1.7
  
  // In-memory cache for classification results
  // Key: SHA-256 hash of image, Value: classification result
  private classificationCache: Map<string, ImageClassification> = new Map();

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('Gemini API key is required for ImageClassifier');
    }
    
    // Set API key for @ai-sdk/google
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = this.apiKey;
  }

  /**
   * Classifies an image to determine its type
   * 
   * Requirements:
   * - 1.1: Analyze image to determine type
   * - 1.2: Classify into exactly one category
   * - 1.3: Return "barcode" when barcode detected
   * - 1.4: Return "product_image" for product packaging without nutrition facts
   * - 1.5: Return "nutrition_label" for nutritional facts or ingredient lists
   * - 1.6: Complete classification within 2 seconds for images under 5MB (cache improves performance)
   * - 1.7: Return "unknown" if confidence below 60%
   * 
   * Implements caching by image hash to avoid redundant API calls.
   * 
   * @param imageData - Base64 encoded image (with or without data URI prefix)
   * @returns Classification result with confidence score
   */
  async classify(imageData: string): Promise<ImageClassification> {
    const startTime = Date.now();
    
    try {
      // Generate image hash for cache lookup
      let imageHash: string;
      try {
        imageHash = await hashImage(imageData);
        console.log('[ImageClassifier] 🔑 Generated image hash');
      } catch (error) {
        console.error('[ImageClassifier] ⚠️  Failed to generate image hash, skipping cache:', error);
        // Continue without caching if hash generation fails
        return await this.classifyWithoutCache(imageData);
      }
      
      // Check cache first
      const cachedResult = this.classificationCache.get(imageHash);
      if (cachedResult) {
        const duration = Date.now() - startTime;
        console.log(`[ImageClassifier] ✅ Cache hit (${duration}ms)`);
        console.log(`[ImageClassifier] Type: ${cachedResult.type}, Confidence: ${cachedResult.confidence}`);
        return cachedResult;
      }
      
      console.log('[ImageClassifier] 🔍 Cache miss, classifying image...');
      
      // Perform classification
      const classification = await this.classifyWithoutCache(imageData);
      
      // Store in cache
      this.classificationCache.set(imageHash, classification);
      console.log('[ImageClassifier] 💾 Cached classification result');
      
      const duration = Date.now() - startTime;
      console.log(`[ImageClassifier] ✅ Classification complete (${duration}ms)`);
      
      return classification;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[ImageClassifier] ❌ Classification failed (${duration}ms):`, errorMessage);
      throw error;
    }
  }
  
  /**
   * Performs classification without cache lookup
   * 
   * @param imageData - Base64 encoded image
   * @returns Classification result
   */
  private async classifyWithoutCache(imageData: string): Promise<ImageClassification> {
    console.log('[ImageClassifier] 🔍 Classifying image...');

    try {
      // Ensure imageData has proper data URI format
      const imageDataUrl = imageData.startsWith('data:') 
        ? imageData 
        : `data:image/jpeg;base64,${imageData}`;

      // Construct classification prompt
      const prompt = this.buildClassificationPrompt();

      console.log('[ImageClassifier] 📤 Calling Gemini Vision API...');
      console.log('[ImageClassifier] Model:', this.model);
      console.log('[ImageClassifier] Image data length:', imageDataUrl.length);

      // Call Gemini Vision API with error handling
      let result;
      try {
        result = await generateText({
          model: google(this.model),
          temperature: 0.1, // Low temperature for consistent classification
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt,
                },
                {
                  type: 'image',
                  image: imageDataUrl,
                },
              ],
            },
          ],
        });
      } catch (apiError) {
        const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
        console.error('[ImageClassifier] ❌ Gemini API call failed:', errorMessage);
        if (apiError instanceof Error) {
          console.error('[ImageClassifier] Error name:', apiError.name);
          console.error('[ImageClassifier] Error message:', apiError.message);
          if ('cause' in apiError) {
            console.error('[ImageClassifier] Error cause:', apiError.cause);
          }
        }
        throw new Error(`Gemini API call failed: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
      }

      console.log('[ImageClassifier] ✅ Received response from Gemini');
      const responseText = result.text;
      console.log('[ImageClassifier] Response length:', responseText.length);
      
      // Parse JSON response
      const classification = this.parseClassificationResponse(responseText);

      console.log(`[ImageClassifier] Type: ${classification.type}, Confidence: ${classification.confidence}`);

      // Requirement 1.7: Return "unknown" if confidence below threshold
      if (classification.confidence < this.CONFIDENCE_THRESHOLD) {
        console.log(`[ImageClassifier] ⚠️  Confidence ${classification.confidence} below threshold ${this.CONFIDENCE_THRESHOLD}, returning "unknown"`);
        return {
          type: 'unknown',
          confidence: classification.confidence,
          metadata: classification.metadata,
        };
      }

      return classification;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[ImageClassifier] ❌ Classification failed in classifyWithoutCache:', errorMessage);
      throw error;
    }
  }

  /**
   * Builds the classification prompt for Gemini Vision
   * 
   * Requirement 1.2: Classify into exactly one of three categories
   */
  private buildClassificationPrompt(): string {
    return `Analyze this image and classify it into ONE of these categories:

1. **barcode** - Image shows a barcode (UPC, EAN, QR code) as the primary focus
2. **product_image** - Image shows product packaging without visible nutrition label
3. **nutrition_label** - Image shows nutritional facts panel or ingredient list
4. **unknown** - Cannot determine image type with confidence

CLASSIFICATION RULES:
- Choose ONLY ONE category (mutually exclusive)
- "nutrition_label" takes priority if nutritional facts or ingredient list is visible
- "barcode" only if barcode is the primary focus (not just visible in background)
- "product_image" for general product packaging without nutrition details visible
- Consider image clarity and completeness in confidence score

METADATA TO DETECT:
- hasNutritionalFacts: Is a nutrition facts panel visible?
- hasIngredientList: Is an ingredient list visible?
- hasBarcodeVisible: Is a barcode visible anywhere in the image?

Return ONLY valid JSON in this exact format (no markdown, no explanations):
{
  "type": "barcode" | "product_image" | "nutrition_label" | "unknown",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of classification decision",
  "metadata": {
    "hasNutritionalFacts": true/false,
    "hasIngredientList": true/false,
    "hasBarcodeVisible": true/false
  }
}`;
  }

  /**
   * Parses and validates the classification response from Gemini
   * 
   * @param responseText - Raw response from Gemini API
   * @returns Validated ImageClassification object
   * @throws Error if response is invalid
   */
  private parseClassificationResponse(responseText: string): ImageClassification {
    try {
      // Strip markdown code blocks if present
      let cleanedResponse = responseText.trim();
      const codeBlockMatch = cleanedResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        cleanedResponse = codeBlockMatch[1].trim();
      }

      // Parse JSON
      const parsed = JSON.parse(cleanedResponse);

      // Validate required fields
      if (!parsed.type || !['barcode', 'product_image', 'nutrition_label', 'unknown'].includes(parsed.type)) {
        throw new Error(`Invalid type: ${parsed.type}`);
      }

      if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
        throw new Error(`Invalid confidence: ${parsed.confidence}`);
      }

      // Return validated classification
      return {
        type: parsed.type,
        confidence: parsed.confidence,
        metadata: parsed.metadata || {},
      };
    } catch (error) {
      console.error('[ImageClassifier] Failed to parse response:', responseText);
      throw new Error(`Failed to parse classification response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle API rate limits with exponential backoff
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
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
          console.log(`[ImageClassifier] ⚠️  Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
        } else if (attempt < maxRetries) {
          // For other errors, shorter delay
          const delay = 500;
          console.log(`[ImageClassifier] ⚠️  Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.error(`[ImageClassifier] ❌ Operation failed after ${maxRetries + 1} attempts`);
    throw lastError || new Error('Classification operation failed');
  }
  
  /**
   * Clears the classification cache
   * 
   * Useful for testing or when cache needs to be invalidated.
   */
  clearCache(): void {
    const size = this.classificationCache.size;
    this.classificationCache.clear();
    console.log(`[ImageClassifier] 🗑️  Cleared cache (${size} entries removed)`);
  }
  
  /**
   * Gets cache statistics
   * 
   * @returns Object with cache size and other statistics
   */
  getCacheStats(): { size: number; entries: number } {
    return {
      size: this.classificationCache.size,
      entries: this.classificationCache.size,
    };
  }
}

// Note: Create instances as needed rather than using a singleton
// to avoid initialization issues in test environments
