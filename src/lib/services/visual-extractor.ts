/**
 * Visual Extractor Service for Multi-Tier Product Identification
 * 
 * This service extracts product information from images using Gemini OCR.
 * It parses extracted text into structured ProductMetadata for database queries.
 * 
 * Requirements: 2.2, 2.3, 2.4, 2.7
 */

import { geminiClient, GeminiClient } from './gemini-client';
import { ImageData, ProductMetadata, ExtractTextRequest, ExtractTextResponse } from '@/lib/types/multi-tier';

/**
 * Visual Extractor Service class
 * 
 * Extracts text from product images and parses it into structured metadata
 * for product identification.
 */
export class VisualExtractorService {
  private geminiClient: GeminiClient;

  constructor(geminiClient?: GeminiClient) {
    this.geminiClient = geminiClient || new GeminiClient();
  }

  /**
   * Extract text and parse into product metadata
   * Requirement 2.2, 2.3, 2.4: Extract text and return structured metadata
   * Requirement 2.7: Complete within 3 seconds
   * 
   * @param request - Extract text request with image and hash
   * @returns Promise resolving to extract text response
   */
  async extractText(request: ExtractTextRequest): Promise<ExtractTextResponse> {
    const startTime = Date.now();
    
    try {
      console.log('[Visual Extractor] 📝 Starting text extraction...');

      // Extract text using Gemini OCR
      const rawText = await this.geminiClient.extractText(request.image);

      // Parse the extracted text into structured metadata
      const metadata = this.parseTextToMetadata(rawText);

      const processingTimeMs = Date.now() - startTime;

      console.log('[Visual Extractor] ✅ Text extraction complete');
      console.log('[Visual Extractor] Metadata:', {
        productName: metadata.productName,
        brandName: metadata.brandName,
        size: metadata.size,
        category: metadata.category,
        keywordCount: metadata.keywords.length,
      });

      return {
        success: true,
        metadata,
        rawText,
        processingTimeMs,
      };
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      
      console.error('[Visual Extractor] ❌ Text extraction failed:', error);

      return {
        success: false,
        metadata: {
          keywords: [],
        },
        rawText: '',
        processingTimeMs,
        error: {
          code: 'TEXT_EXTRACTION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          tier: 2,
          retryable: true,
        },
      };
    }
  }

  /**
   * Parse extracted text into structured ProductMetadata
   * Requirement 2.3, 2.4: Identify product names, brands, and size information
   * 
   * @param text - Raw extracted text
   * @returns Structured ProductMetadata
   */
  private parseTextToMetadata(text: string): ProductMetadata {
    // Remove common preamble phrases from Gemini
    const cleanedText = text
      .replace(/^Here'?s? the extracted text from the image:?\s*/i, '')
      .replace(/^Extracted text:?\s*/i, '')
      .replace(/^Text from image:?\s*/i, '');
    
    const lines = cleanedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const metadata: ProductMetadata = {
      keywords: [],
    };

    // Extract keywords from all text
    const words = cleanedText.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !this.isCommonWord(word));
    
    metadata.keywords = [...new Set(words)].slice(0, 10); // Top 10 unique keywords

    // Try to identify product name (usually the most prominent text)
    // Look for lines with multiple words that aren't just numbers
    // Skip lines that are markdown bullets or formatting
    const potentialNames = lines.filter(line => {
      const wordCount = line.split(/\s+/).length;
      const hasLetters = /[a-zA-Z]/.test(line);
      const isMarkdown = /^[\*\-\+]\s+/.test(line);
      const isLabel = /^(Product Name|Brand|Size|Quantity):/i.test(line);
      return wordCount >= 2 && wordCount <= 8 && hasLetters && !isMarkdown && !isLabel;
    });

    // If we have markdown-style bullets, extract the product name from them
    const productNameMatch = cleanedText.match(/\*\*Product Name:?\*\*\s*(.+?)(?:\n|$)/i) ||
                            cleanedText.match(/Product Name:?\s*(.+?)(?:\n|$)/i);
    
    if (productNameMatch) {
      metadata.productName = productNameMatch[1].trim();
    } else if (potentialNames.length > 0) {
      metadata.productName = potentialNames[0];
    }

    // Try to identify brand (often appears near the top or as a single prominent word)
    const brandMatch = cleanedText.match(/\*\*Brand:?\*\*\s*(.+?)(?:\n|$)/i) ||
                      cleanedText.match(/Brand Name:?\s*(.+?)(?:\n|$)/i);
    
    if (brandMatch) {
      metadata.brandName = brandMatch[1].trim();
    } else {
      const potentialBrands = lines.filter(line => {
        const wordCount = line.split(/\s+/).length;
        const isCapitalized = /^[A-Z]/.test(line);
        const isMarkdown = /^[\*\-\+]\s+/.test(line);
        return wordCount <= 3 && isCapitalized && !isMarkdown;
      });

      if (potentialBrands.length > 0 && potentialBrands[0] !== metadata.productName) {
        metadata.brandName = potentialBrands[0];
      }
    }

    // Try to identify size/quantity
    const sizeMatch = cleanedText.match(/\*\*Size:?\*\*\s*(.+?)(?:\n|$)/i) ||
                     cleanedText.match(/Size:?\s*(.+?)(?:\n|$)/i) ||
                     cleanedText.match(/Quantity:?\s*(.+?)(?:\n|$)/i);
    
    if (sizeMatch) {
      metadata.size = sizeMatch[1].trim();
    } else {
      const sizePatterns = [
        /(\d+\.?\d*)\s*(oz|ounce|ounces|fl oz|fluid ounce)/i,
        /(\d+\.?\d*)\s*(g|gram|grams|kg|kilogram|kilograms)/i,
        /(\d+\.?\d*)\s*(ml|milliliter|milliliters|l|liter|liters)/i,
        /(\d+\.?\d*)\s*(lb|lbs|pound|pounds)/i,
        /(\d+)\s*(count|ct|pack|pk)/i,
      ];

      for (const pattern of sizePatterns) {
        const match = cleanedText.match(pattern);
        if (match) {
          metadata.size = match[0];
          break;
        }
      }
    }

    // Try to identify category based on keywords
    metadata.category = this.inferCategory(cleanedText.toLowerCase());

    return metadata;
  }

  /**
   * Check if a word is a common word that should be filtered out
   * 
   * @param word - Word to check
   * @returns True if word is common
   */
  private isCommonWord(word: string): boolean {
    const commonWords = new Set([
      'the', 'and', 'for', 'with', 'from', 'this', 'that', 'are', 'was', 'were',
      'been', 'have', 'has', 'had', 'will', 'would', 'could', 'should', 'may',
      'can', 'not', 'but', 'all', 'you', 'your', 'our', 'their', 'its',
    ]);
    
    return commonWords.has(word);
  }

  /**
   * Infer product category from text content
   * 
   * @param text - Lowercase text to analyze
   * @returns Inferred category or undefined
   */
  private inferCategory(text: string): string | undefined {
    const categoryKeywords: Record<string, string[]> = {
      'Beverages': ['drink', 'beverage', 'juice', 'soda', 'water', 'coffee', 'tea', 'milk'],
      'Snacks': ['chips', 'crackers', 'cookies', 'snack', 'popcorn', 'pretzels'],
      'Dairy': ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'dairy'],
      'Bakery': ['bread', 'bagel', 'muffin', 'cake', 'pastry', 'bakery'],
      'Frozen': ['frozen', 'ice cream', 'popsicle'],
      'Canned': ['canned', 'can', 'soup'],
      'Cereal': ['cereal', 'oatmeal', 'granola', 'breakfast'],
      'Condiments': ['sauce', 'ketchup', 'mustard', 'mayo', 'dressing', 'condiment'],
      'Meat': ['meat', 'beef', 'chicken', 'pork', 'turkey', 'sausage'],
      'Produce': ['fruit', 'vegetable', 'produce', 'fresh'],
      'Household': ['cleaner', 'detergent', 'soap', 'paper', 'towel'],
      'Personal Care': ['shampoo', 'soap', 'lotion', 'deodorant', 'toothpaste'],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          return category;
        }
      }
    }

    return undefined;
  }
}

// Export singleton instance
export const visualExtractorService = new VisualExtractorService();
