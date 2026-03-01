/**
 * Unit tests for NutritionParser service
 * 
 * Tests the nutritional data extraction and validation functionality.
 * Requirements: 2.1-2.10, 10.1-10.4
 */

import { NutritionParser, NutritionalFacts } from '../nutrition-parser';
import { generateText } from 'ai';

// Mock the AI SDK
jest.mock('ai', () => ({
  generateText: jest.fn(),
}));

// Mock the Google AI SDK
jest.mock('@ai-sdk/google', () => ({
  google: jest.fn((model: string) => ({ model })),
}));

describe('NutritionParser', () => {
  let parser: NutritionParser;
  const mockGenerateText = generateText as jest.MockedFunction<typeof generateText>;

  beforeEach(() => {
    // Set up environment variable for API key
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-api-key';
    parser = new NutritionParser('test-api-key');
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  });

  describe('constructor', () => {
    it('should throw error if no API key is provided', () => {
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      
      expect(() => new NutritionParser()).toThrow('Gemini API key is required for NutritionParser');
    });

    it('should use provided API key', () => {
      const customParser = new NutritionParser('custom-key');
      expect(customParser).toBeDefined();
    });

    it('should use environment variable if no key provided', () => {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'env-key';
      const envParser = new NutritionParser();
      expect(envParser).toBeDefined();
    });
  });

  describe('parse', () => {
    it('should extract all required nutritional fields', async () => {
      // Requirements 2.1-2.7: Extract all required fields
      const mockResponse = {
        text: JSON.stringify({
          servingSize: { amount: 28, unit: 'g', confidence: 0.95 },
          servingsPerContainer: 10,
          calories: { value: 150, confidence: 0.98 },
          totalFat: { value: 8, confidence: 0.96 },
          saturatedFat: { value: 1, confidence: 0.94 },
          transFat: { value: 0, confidence: 0.92 },
          cholesterol: { value: 0, confidence: 0.90 },
          sodium: { value: 170, confidence: 0.97 },
          totalCarbohydrates: { value: 15, confidence: 0.96 },
          dietaryFiber: { value: 3, confidence: 0.93 },
          totalSugars: { value: 1, confidence: 0.95 },
          protein: { value: 6, confidence: 0.97 },
        }),
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      const result = await parser.parse('data:image/jpeg;base64,test-image');

      expect(result.servingSize.amount).toBe(28);
      expect(result.servingSize.unit).toBe('g');
      expect(result.calories.value).toBe(150);
      expect(result.totalFat.value).toBe(8);
      expect(result.saturatedFat.value).toBe(1);
      expect(result.transFat.value).toBe(0);
      expect(result.cholesterol.value).toBe(0);
      expect(result.sodium.value).toBe(170);
      expect(result.totalCarbohydrates.value).toBe(15);
      expect(result.dietaryFiber.value).toBe(3);
      expect(result.totalSugars.value).toBe(1);
      expect(result.protein.value).toBe(6);
    });

    it('should extract optional fields when present', async () => {
      // Requirement 2.8: Extract vitamin and mineral percentages when present
      const mockResponse = {
        text: JSON.stringify({
          servingSize: { amount: 28, unit: 'g', confidence: 0.95 },
          calories: { value: 150, confidence: 0.98 },
          totalFat: { value: 8, confidence: 0.96 },
          saturatedFat: { value: 1, confidence: 0.94 },
          transFat: { value: 0, confidence: 0.92 },
          cholesterol: { value: 0, confidence: 0.90 },
          sodium: { value: 170, confidence: 0.97 },
          totalCarbohydrates: { value: 15, confidence: 0.96 },
          dietaryFiber: { value: 3, confidence: 0.93 },
          totalSugars: { value: 1, confidence: 0.95 },
          protein: { value: 6, confidence: 0.97 },
          addedSugars: { value: 0, confidence: 0.90 },
          vitamins: {
            'Vitamin D': { value: 10, confidence: 0.88 },
            'Calcium': { value: 15, confidence: 0.90 },
          },
          minerals: {
            'Iron': { value: 8, confidence: 0.85 },
          },
        }),
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      const result = await parser.parse('data:image/jpeg;base64,test-image');

      expect(result.addedSugars?.value).toBe(0);
      expect(result.vitamins?.['Vitamin D'].value).toBe(10);
      expect(result.vitamins?.['Calcium'].value).toBe(15);
      expect(result.minerals?.['Iron'].value).toBe(8);
    });

    it('should flag fields with low confidence as uncertain', async () => {
      // Requirement 2.9: Flag fields with confidence below 0.8 as "uncertain"
      const mockResponse = {
        text: JSON.stringify({
          servingSize: { amount: 28, unit: 'g', confidence: 0.75 }, // Low confidence
          calories: { value: 150, confidence: 0.98 },
          totalFat: { value: 8, confidence: 0.96 },
          saturatedFat: { value: 1, confidence: 0.94 },
          transFat: { value: 0, confidence: 0.92 },
          cholesterol: { value: 0, confidence: 0.90 },
          sodium: { value: 170, confidence: 0.97 },
          totalCarbohydrates: { value: 15, confidence: 0.96 },
          dietaryFiber: { value: 3, confidence: 0.93 },
          totalSugars: { value: 1, confidence: 0.95 },
          protein: { value: 6, confidence: 0.97 },
        }),
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      const result = await parser.parse('data:image/jpeg;base64,test-image');

      expect(result.validationStatus).toBe('uncertain');
    });

    it('should return structured JSON data', async () => {
      // Requirement 2.10: Return structured JSON data with all extracted nutritional values
      const mockResponse = {
        text: JSON.stringify({
          servingSize: { amount: 28, unit: 'g', confidence: 0.95 },
          calories: { value: 150, confidence: 0.98 },
          totalFat: { value: 8, confidence: 0.96 },
          saturatedFat: { value: 1, confidence: 0.94 },
          transFat: { value: 0, confidence: 0.92 },
          cholesterol: { value: 0, confidence: 0.90 },
          sodium: { value: 170, confidence: 0.97 },
          totalCarbohydrates: { value: 15, confidence: 0.96 },
          dietaryFiber: { value: 3, confidence: 0.93 },
          totalSugars: { value: 1, confidence: 0.95 },
          protein: { value: 6, confidence: 0.97 },
        }),
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      const result = await parser.parse('data:image/jpeg;base64,test-image');

      expect(result).toHaveProperty('servingSize');
      expect(result).toHaveProperty('calories');
      expect(result).toHaveProperty('validationStatus');
      expect(typeof result).toBe('object');
    });

    it('should handle image data without data URI prefix', async () => {
      const mockResponse = {
        text: JSON.stringify({
          servingSize: { amount: 28, unit: 'g', confidence: 0.95 },
          calories: { value: 150, confidence: 0.98 },
          totalFat: { value: 8, confidence: 0.96 },
          saturatedFat: { value: 1, confidence: 0.94 },
          transFat: { value: 0, confidence: 0.92 },
          cholesterol: { value: 0, confidence: 0.90 },
          sodium: { value: 170, confidence: 0.97 },
          totalCarbohydrates: { value: 15, confidence: 0.96 },
          dietaryFiber: { value: 3, confidence: 0.93 },
          totalSugars: { value: 1, confidence: 0.95 },
          protein: { value: 6, confidence: 0.97 },
        }),
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      const result = await parser.parse('base64-encoded-image-data');

      expect(result.calories.value).toBe(150);
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
          servingSize: { amount: 28, unit: 'g', confidence: 0.95 },
          calories: { value: 150, confidence: 0.98 },
          totalFat: { value: 8, confidence: 0.96 },
          saturatedFat: { value: 1, confidence: 0.94 },
          transFat: { value: 0, confidence: 0.92 },
          cholesterol: { value: 0, confidence: 0.90 },
          sodium: { value: 170, confidence: 0.97 },
          totalCarbohydrates: { value: 15, confidence: 0.96 },
          dietaryFiber: { value: 3, confidence: 0.93 },
          totalSugars: { value: 1, confidence: 0.95 },
          protein: { value: 6, confidence: 0.97 },
        }) + '\n```',
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      const result = await parser.parse('data:image/jpeg;base64,test-image');

      expect(result.calories.value).toBe(150);
    });

    it('should throw error for invalid response format', async () => {
      const mockResponse = {
        text: 'This is not valid JSON',
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      await expect(parser.parse('data:image/jpeg;base64,test-image'))
        .rejects.toThrow('Failed to parse OCR response');
    });

    it('should throw error for missing required fields', async () => {
      const mockResponse = {
        text: JSON.stringify({
          servingSize: { amount: 28, unit: 'g', confidence: 0.95 },
          calories: { value: 150, confidence: 0.98 },
          // Missing other required fields
        }),
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      await expect(parser.parse('data:image/jpeg;base64,test-image'))
        .rejects.toThrow('Failed to parse OCR response');
    });

    it('should use low temperature for consistent extraction', async () => {
      const mockResponse = {
        text: JSON.stringify({
          servingSize: { amount: 28, unit: 'g', confidence: 0.95 },
          calories: { value: 150, confidence: 0.98 },
          totalFat: { value: 8, confidence: 0.96 },
          saturatedFat: { value: 1, confidence: 0.94 },
          transFat: { value: 0, confidence: 0.92 },
          cholesterol: { value: 0, confidence: 0.90 },
          sodium: { value: 170, confidence: 0.97 },
          totalCarbohydrates: { value: 15, confidence: 0.96 },
          dietaryFiber: { value: 3, confidence: 0.93 },
          totalSugars: { value: 1, confidence: 0.95 },
          protein: { value: 6, confidence: 0.97 },
        }),
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      await parser.parse('data:image/jpeg;base64,test-image');

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.1,
        })
      );
    });
  });

  describe('validate', () => {
    it('should validate calorie calculation within tolerance', () => {
      // Requirement 10.1: Validate calorie calculation (4×carbs + 4×protein + 9×fat ≈ stated calories ±20%)
      const facts: NutritionalFacts = {
        servingSize: { amount: 28, unit: 'g', confidence: 0.95 },
        calories: { value: 150, confidence: 0.98 },
        totalFat: { value: 8, confidence: 0.96 }, // 8 * 9 = 72 cal
        saturatedFat: { value: 1, confidence: 0.94 },
        transFat: { value: 0, confidence: 0.92 },
        cholesterol: { value: 0, confidence: 0.90 },
        sodium: { value: 170, confidence: 0.97 },
        totalCarbohydrates: { value: 15, confidence: 0.96 }, // 15 * 4 = 60 cal
        dietaryFiber: { value: 3, confidence: 0.93 },
        totalSugars: { value: 1, confidence: 0.95 },
        protein: { value: 6, confidence: 0.97 }, // 6 * 4 = 24 cal
        validationStatus: 'valid',
      };
      // Total calculated: 72 + 60 + 24 = 156 cal (within 20% of 150)

      const result = parser.validate(facts);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should flag data as invalid when calorie calculation differs by more than 20%', () => {
      // Requirement 10.2: Flag data as "potentially inaccurate" if calorie calculation differs by >20%
      const facts: NutritionalFacts = {
        servingSize: { amount: 28, unit: 'g', confidence: 0.95 },
        calories: { value: 100, confidence: 0.98 }, // Stated calories
        totalFat: { value: 20, confidence: 0.96 }, // 20 * 9 = 180 cal
        saturatedFat: { value: 5, confidence: 0.94 },
        transFat: { value: 0, confidence: 0.92 },
        cholesterol: { value: 0, confidence: 0.90 },
        sodium: { value: 170, confidence: 0.97 },
        totalCarbohydrates: { value: 10, confidence: 0.96 }, // 10 * 4 = 40 cal
        dietaryFiber: { value: 2, confidence: 0.93 },
        totalSugars: { value: 1, confidence: 0.95 },
        protein: { value: 5, confidence: 0.97 }, // 5 * 4 = 20 cal
        validationStatus: 'valid',
      };
      // Total calculated: 180 + 40 + 20 = 240 cal (140% more than stated 100)

      const result = parser.validate(facts);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Calorie calculation mismatch');
    });

    it('should validate percentage daily values are within 0-200% range', () => {
      // Requirement 10.3: Validate percentage daily values are within 0-200% range
      const facts: NutritionalFacts = {
        servingSize: { amount: 28, unit: 'g', confidence: 0.95 },
        calories: { value: 150, confidence: 0.98 },
        totalFat: { value: 8, confidence: 0.96 },
        saturatedFat: { value: 1, confidence: 0.94 },
        transFat: { value: 0, confidence: 0.92 },
        cholesterol: { value: 0, confidence: 0.90 },
        sodium: { value: 170, confidence: 0.97 },
        totalCarbohydrates: { value: 15, confidence: 0.96 },
        dietaryFiber: { value: 3, confidence: 0.93 },
        totalSugars: { value: 1, confidence: 0.95 },
        protein: { value: 6, confidence: 0.97 },
        vitamins: {
          'Vitamin D': { value: 250, confidence: 0.88 }, // Out of range
        },
        validationStatus: 'valid',
      };

      const result = parser.validate(facts);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('percentage daily value out of range');
    });

    it('should validate serving size is positive', () => {
      // Requirement 10.4: Validate serving size is positive with valid units
      const facts: NutritionalFacts = {
        servingSize: { amount: -5, unit: 'g', confidence: 0.95 }, // Invalid: negative
        calories: { value: 150, confidence: 0.98 },
        totalFat: { value: 8, confidence: 0.96 },
        saturatedFat: { value: 1, confidence: 0.94 },
        transFat: { value: 0, confidence: 0.92 },
        cholesterol: { value: 0, confidence: 0.90 },
        sodium: { value: 170, confidence: 0.97 },
        totalCarbohydrates: { value: 15, confidence: 0.96 },
        dietaryFiber: { value: 3, confidence: 0.93 },
        totalSugars: { value: 1, confidence: 0.95 },
        protein: { value: 6, confidence: 0.97 },
        validationStatus: 'valid',
      };

      const result = parser.validate(facts);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Serving size must be a positive number');
    });

    it('should validate serving size has valid units', () => {
      // Requirement 10.4: Validate serving size is positive with valid units
      const facts: NutritionalFacts = {
        servingSize: { amount: 28, unit: 'invalid-unit', confidence: 0.95 },
        calories: { value: 150, confidence: 0.98 },
        totalFat: { value: 8, confidence: 0.96 },
        saturatedFat: { value: 1, confidence: 0.94 },
        transFat: { value: 0, confidence: 0.92 },
        cholesterol: { value: 0, confidence: 0.90 },
        sodium: { value: 170, confidence: 0.97 },
        totalCarbohydrates: { value: 15, confidence: 0.96 },
        dietaryFiber: { value: 3, confidence: 0.93 },
        totalSugars: { value: 1, confidence: 0.95 },
        protein: { value: 6, confidence: 0.97 },
        validationStatus: 'valid',
      };

      const result = parser.validate(facts);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Invalid serving size unit');
    });

    it('should accept valid serving size units', () => {
      const validUnits = ['g', 'mg', 'ml', 'oz', 'cup', 'tbsp', 'tsp', 'fl oz', 'serving'];

      for (const unit of validUnits) {
        const facts: NutritionalFacts = {
          servingSize: { amount: 28, unit, confidence: 0.95 },
          calories: { value: 150, confidence: 0.98 },
          totalFat: { value: 8, confidence: 0.96 },
          saturatedFat: { value: 1, confidence: 0.94 },
          transFat: { value: 0, confidence: 0.92 },
          cholesterol: { value: 0, confidence: 0.90 },
          sodium: { value: 170, confidence: 0.97 },
          totalCarbohydrates: { value: 15, confidence: 0.96 },
          dietaryFiber: { value: 3, confidence: 0.93 },
          totalSugars: { value: 1, confidence: 0.95 },
          protein: { value: 6, confidence: 0.97 },
          validationStatus: 'valid',
        };

        const result = parser.validate(facts);
        expect(result.isValid).toBe(true);
      }
    });
  });
});
