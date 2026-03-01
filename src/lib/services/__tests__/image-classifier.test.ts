/**
 * Unit tests for ImageClassifier service
 * 
 * Tests the image classification functionality for nutritional health analysis.
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */

import { ImageClassifier, ImageClassification } from '../image-classifier';
import { generateText } from 'ai';
import { hashImage } from '../../imageHash';

// Mock the AI SDK
jest.mock('ai', () => ({
  generateText: jest.fn(),
}));

// Mock the Google AI SDK
jest.mock('@ai-sdk/google', () => ({
  google: jest.fn((model: string) => ({ model })),
}));

// Mock the imageHash utility
jest.mock('../../imageHash', () => ({
  hashImage: jest.fn(),
}));

describe('ImageClassifier', () => {
  let classifier: ImageClassifier;
  const mockGenerateText = generateText as jest.MockedFunction<typeof generateText>;
  const mockHashImage = hashImage as jest.MockedFunction<typeof hashImage>;

  beforeEach(() => {
    // Set up environment variable for API key
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-api-key';
    classifier = new ImageClassifier('test-api-key');
    jest.clearAllMocks();
    
    // Default mock for hashImage
    mockHashImage.mockResolvedValue('abc123def456789');
  });

  afterEach(() => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  });

  describe('constructor', () => {
    it('should throw error if no API key is provided', () => {
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      
      expect(() => new ImageClassifier()).toThrow('Gemini API key is required for ImageClassifier');
    });

    it('should use provided API key', () => {
      const customClassifier = new ImageClassifier('custom-key');
      expect(customClassifier).toBeDefined();
    });

    it('should use environment variable if no key provided', () => {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'env-key';
      const envClassifier = new ImageClassifier();
      expect(envClassifier).toBeDefined();
    });
  });

  describe('classify', () => {
    it('should classify barcode image correctly', async () => {
      // Requirement 1.3: Return "barcode" when barcode detected
      const mockResponse = {
        text: JSON.stringify({
          type: 'barcode',
          confidence: 0.95,
          reasoning: 'Clear barcode visible',
          metadata: {
            hasNutritionalFacts: false,
            hasIngredientList: false,
            hasBarcodeVisible: true,
          },
        }),
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      const result = await classifier.classify('data:image/jpeg;base64,test-image');

      expect(result.type).toBe('barcode');
      expect(result.confidence).toBe(0.95);
      expect(result.metadata?.hasBarcodeVisible).toBe(true);
    });

    it('should classify product image correctly', async () => {
      // Requirement 1.4: Return "product_image" for product packaging without nutrition facts
      const mockResponse = {
        text: JSON.stringify({
          type: 'product_image',
          confidence: 0.88,
          reasoning: 'Product packaging visible, no nutrition label',
          metadata: {
            hasNutritionalFacts: false,
            hasIngredientList: false,
            hasBarcodeVisible: false,
          },
        }),
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      const result = await classifier.classify('data:image/jpeg;base64,test-image');

      expect(result.type).toBe('product_image');
      expect(result.confidence).toBe(0.88);
      expect(result.metadata?.hasNutritionalFacts).toBe(false);
    });

    it('should classify nutrition label correctly', async () => {
      // Requirement 1.5: Return "nutrition_label" for nutritional facts or ingredient lists
      const mockResponse = {
        text: JSON.stringify({
          type: 'nutrition_label',
          confidence: 0.92,
          reasoning: 'Nutrition facts panel clearly visible',
          metadata: {
            hasNutritionalFacts: true,
            hasIngredientList: true,
            hasBarcodeVisible: false,
          },
        }),
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      const result = await classifier.classify('data:image/jpeg;base64,test-image');

      expect(result.type).toBe('nutrition_label');
      expect(result.confidence).toBe(0.92);
      expect(result.metadata?.hasNutritionalFacts).toBe(true);
      expect(result.metadata?.hasIngredientList).toBe(true);
    });

    it('should return unknown for low confidence classification', async () => {
      // Requirement 1.7: Return "unknown" if confidence below 60%
      const mockResponse = {
        text: JSON.stringify({
          type: 'product_image',
          confidence: 0.45,
          reasoning: 'Image is blurry and unclear',
          metadata: {
            hasNutritionalFacts: false,
            hasIngredientList: false,
            hasBarcodeVisible: false,
          },
        }),
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      const result = await classifier.classify('data:image/jpeg;base64,test-image');

      expect(result.type).toBe('unknown');
      expect(result.confidence).toBe(0.45);
    });

    it('should handle image data without data URI prefix', async () => {
      const mockResponse = {
        text: JSON.stringify({
          type: 'barcode',
          confidence: 0.90,
          reasoning: 'Barcode detected',
          metadata: {
            hasNutritionalFacts: false,
            hasIngredientList: false,
            hasBarcodeVisible: true,
          },
        }),
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      const result = await classifier.classify('base64-encoded-image-data');

      expect(result.type).toBe('barcode');
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.arrayContaining([
                expect.objectContaining({
                  type: 'image',
                  image: expect.stringContaining('data:image/jpeg;base64,'),
                }),
              ]),
            }),
          ]),
        })
      );
    });

    it('should parse response with markdown code blocks', async () => {
      const mockResponse = {
        text: '```json\n' + JSON.stringify({
          type: 'nutrition_label',
          confidence: 0.85,
          reasoning: 'Nutrition facts visible',
          metadata: {
            hasNutritionalFacts: true,
            hasIngredientList: false,
            hasBarcodeVisible: false,
          },
        }) + '\n```',
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      const result = await classifier.classify('data:image/jpeg;base64,test-image');

      expect(result.type).toBe('nutrition_label');
      expect(result.confidence).toBe(0.85);
    });

    it('should throw error for invalid response format', async () => {
      const mockResponse = {
        text: 'This is not valid JSON',
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      await expect(classifier.classify('data:image/jpeg;base64,test-image'))
        .rejects.toThrow('Failed to parse classification response');
    });

    it('should throw error for invalid type in response', async () => {
      const mockResponse = {
        text: JSON.stringify({
          type: 'invalid_type',
          confidence: 0.90,
          reasoning: 'Test',
          metadata: {},
        }),
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      await expect(classifier.classify('data:image/jpeg;base64,test-image'))
        .rejects.toThrow('Failed to parse classification response');
    });

    it('should throw error for invalid confidence value', async () => {
      const mockResponse = {
        text: JSON.stringify({
          type: 'barcode',
          confidence: 1.5, // Invalid: > 1.0
          reasoning: 'Test',
          metadata: {},
        }),
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      await expect(classifier.classify('data:image/jpeg;base64,test-image'))
        .rejects.toThrow('Failed to parse classification response');
    });

    it('should use low temperature for consistent classification', async () => {
      const mockResponse = {
        text: JSON.stringify({
          type: 'barcode',
          confidence: 0.90,
          reasoning: 'Barcode detected',
          metadata: {},
        }),
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      await classifier.classify('data:image/jpeg;base64,test-image');

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.1,
        })
      );
    });

    it('should classify into exactly one category', async () => {
      // Requirement 1.2: Classify into exactly one category
      const mockResponse = {
        text: JSON.stringify({
          type: 'nutrition_label',
          confidence: 0.92,
          reasoning: 'Nutrition facts panel visible',
          metadata: {
            hasNutritionalFacts: true,
            hasIngredientList: true,
            hasBarcodeVisible: true, // Barcode also visible but not primary
          },
        }),
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      const result = await classifier.classify('data:image/jpeg;base64,test-image');

      // Should return nutrition_label (takes priority) not barcode
      expect(result.type).toBe('nutrition_label');
      expect(['barcode', 'product_image', 'nutrition_label', 'unknown']).toContain(result.type);
    });
  });

  describe('withRetry', () => {
    it('should retry on rate limit errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('429 Rate limit exceeded'))
        .mockResolvedValueOnce('success');

      const result = await classifier.withRetry(operation, 2);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry on general errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');

      const result = await classifier.withRetry(operation, 2);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries', async () => {
      const operation = jest.fn()
        .mockRejectedValue(new Error('Persistent error'));

      await expect(classifier.withRetry(operation, 2))
        .rejects.toThrow('Persistent error');

      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should succeed on first attempt if no error', async () => {
      const operation = jest.fn().mockResolvedValueOnce('success');

      const result = await classifier.withRetry(operation, 2);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('caching', () => {
    it('should cache classification results by image hash', async () => {
      // Requirement 1.6: Cache classification results to avoid redundant API calls
      const mockResponse = {
        text: JSON.stringify({
          type: 'nutrition_label',
          confidence: 0.92,
          reasoning: 'Nutrition facts panel visible',
          metadata: {
            hasNutritionalFacts: true,
            hasIngredientList: true,
            hasBarcodeVisible: false,
          },
        }),
      };

      mockHashImage.mockResolvedValue('test-hash-123');
      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      // First call - should hit API
      const result1 = await classifier.classify('data:image/jpeg;base64,test-image');
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(result1.type).toBe('nutrition_label');

      // Second call with same image - should use cache
      const result2 = await classifier.classify('data:image/jpeg;base64,test-image');
      expect(mockGenerateText).toHaveBeenCalledTimes(1); // Still 1, not called again
      expect(result2.type).toBe('nutrition_label');
      expect(result2).toEqual(result1);
    });

    it('should not cache if different images have different hashes', async () => {
      const mockResponse1 = {
        text: JSON.stringify({
          type: 'barcode',
          confidence: 0.95,
          reasoning: 'Barcode visible',
          metadata: { hasBarcodeVisible: true },
        }),
      };

      const mockResponse2 = {
        text: JSON.stringify({
          type: 'nutrition_label',
          confidence: 0.90,
          reasoning: 'Nutrition label visible',
          metadata: { hasNutritionalFacts: true },
        }),
      };

      // First image
      mockHashImage.mockResolvedValueOnce('hash-image-1');
      mockGenerateText.mockResolvedValueOnce(mockResponse1 as any);
      const result1 = await classifier.classify('data:image/jpeg;base64,image1');
      expect(result1.type).toBe('barcode');

      // Second image (different hash)
      mockHashImage.mockResolvedValueOnce('hash-image-2');
      mockGenerateText.mockResolvedValueOnce(mockResponse2 as any);
      const result2 = await classifier.classify('data:image/jpeg;base64,image2');
      expect(result2.type).toBe('nutrition_label');

      // Both API calls should have been made
      expect(mockGenerateText).toHaveBeenCalledTimes(2);
    });

    it('should continue without cache if hash generation fails', async () => {
      const mockResponse = {
        text: JSON.stringify({
          type: 'barcode',
          confidence: 0.95,
          reasoning: 'Barcode visible',
          metadata: { hasBarcodeVisible: true },
        }),
      };

      mockHashImage.mockRejectedValueOnce(new Error('Hash generation failed'));
      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      const result = await classifier.classify('data:image/jpeg;base64,test-image');
      
      expect(result.type).toBe('barcode');
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
    });

    it('should clear cache when clearCache is called', async () => {
      const mockResponse = {
        text: JSON.stringify({
          type: 'nutrition_label',
          confidence: 0.92,
          reasoning: 'Nutrition facts visible',
          metadata: { hasNutritionalFacts: true },
        }),
      };

      mockHashImage.mockResolvedValue('test-hash-123');
      mockGenerateText.mockResolvedValue(mockResponse as any);

      // First call - populate cache
      await classifier.classify('data:image/jpeg;base64,test-image');
      expect(mockGenerateText).toHaveBeenCalledTimes(1);

      // Clear cache
      classifier.clearCache();

      // Second call - should hit API again
      await classifier.classify('data:image/jpeg;base64,test-image');
      expect(mockGenerateText).toHaveBeenCalledTimes(2);
    });

    it('should return cache statistics', async () => {
      const mockResponse = {
        text: JSON.stringify({
          type: 'barcode',
          confidence: 0.95,
          reasoning: 'Barcode visible',
          metadata: { hasBarcodeVisible: true },
        }),
      };

      // Initially empty
      let stats = classifier.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.entries).toBe(0);

      // Add one entry
      mockHashImage.mockResolvedValueOnce('hash-1');
      mockGenerateText.mockResolvedValueOnce(mockResponse as any);
      await classifier.classify('data:image/jpeg;base64,image1');

      stats = classifier.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.entries).toBe(1);

      // Add another entry
      mockHashImage.mockResolvedValueOnce('hash-2');
      mockGenerateText.mockResolvedValueOnce(mockResponse as any);
      await classifier.classify('data:image/jpeg;base64,image2');

      stats = classifier.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.entries).toBe(2);
    });
  });
});
