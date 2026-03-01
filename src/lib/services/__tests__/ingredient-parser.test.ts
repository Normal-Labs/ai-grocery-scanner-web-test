/**
 * Unit tests for IngredientParser service
 * 
 * Tests the ingredient list extraction and detection functionality.
 * Requirements: 3.1-3.8
 */

import { IngredientParser, IngredientList, ParsedIngredient } from '../ingredient-parser';
import { generateText } from 'ai';

// Mock the AI SDK
jest.mock('ai', () => ({
  generateText: jest.fn(),
}));

// Mock the Google AI SDK
jest.mock('@ai-sdk/google', () => ({
  google: jest.fn((model: string) => ({ model })),
}));

describe('IngredientParser', () => {
  let parser: IngredientParser;
  const mockGenerateText = generateText as jest.MockedFunction<typeof generateText>;

  beforeEach(() => {
    // Set up environment variable for API key
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-api-key';
    parser = new IngredientParser('test-api-key');
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  });

  describe('constructor', () => {
    it('should throw error if no API key is provided', () => {
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      
      expect(() => new IngredientParser()).toThrow('Gemini API key is required for IngredientParser');
    });

    it('should use provided API key', () => {
      const customParser = new IngredientParser('custom-key');
      expect(customParser).toBeDefined();
    });

    it('should use environment variable if no key provided', () => {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'env-key';
      const envParser = new IngredientParser();
      expect(envParser).toBeDefined();
    });
  });

  describe('parse', () => {
    it('should extract complete ingredient text', async () => {
      // Requirement 3.1: Extract complete ingredient text
      const mockResponse = {
        text: JSON.stringify({
          rawText: 'Whole grain oats, sugar, salt, natural flavor',
          confidence: 0.95,
        }),
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      const result = await parser.parse('data:image/jpeg;base64,test-image');

      expect(result.rawText).toBe('Whole grain oats, sugar, salt, natural flavor');
      expect(result.confidence).toBe(0.95);
    });

    it('should tokenize ingredients by commas', async () => {
      // Requirement 3.2: Tokenize ingredients by commas and semicolons
      const mockResponse = {
        text: JSON.stringify({
          rawText: 'Whole grain oats, sugar, salt, natural flavor',
          confidence: 0.95,
        }),
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      const result = await parser.parse('data:image/jpeg;base64,test-image');

      expect(result.ingredients).toHaveLength(4);
      expect(result.ingredients[0].name).toBe('Whole grain oats');
      expect(result.ingredients[1].name).toBe('sugar');
      expect(result.ingredients[2].name).toBe('salt');
      expect(result.ingredients[3].name).toBe('natural flavor');
    });

    it('should tokenize ingredients by semicolons', async () => {
      // Requirement 3.2: Tokenize ingredients by commas and semicolons
      const mockResponse = {
        text: JSON.stringify({
          rawText: 'Flour; sugar; eggs; milk',
          confidence: 0.95,
        }),
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      const result = await parser.parse('data:image/jpeg;base64,test-image');

      expect(result.ingredients).toHaveLength(4);
      expect(result.ingredients[0].name).toBe('Flour');
      expect(result.ingredients[1].name).toBe('sugar');
    });

    it('should preserve ingredient order', async () => {
      // Requirement 3.3: Preserve ingredient order as listed
      const mockResponse = {
        text: JSON.stringify({
          rawText: 'First ingredient, second ingredient, third ingredient',
          confidence: 0.95,
        }),
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      const result = await parser.parse('data:image/jpeg;base64,test-image');

      expect(result.ingredients[0].position).toBe(1);
      expect(result.ingredients[0].name).toBe('First ingredient');
      expect(result.ingredients[1].position).toBe(2);
      expect(result.ingredients[1].name).toBe('second ingredient');
      expect(result.ingredients[2].position).toBe(3);
      expect(result.ingredients[2].name).toBe('third ingredient');
    });

    it('should identify allergens', async () => {
      // Requirement 3.4: Identify and flag common allergens
      const mockResponse = {
        text: JSON.stringify({
          rawText: 'Wheat flour, milk, eggs, peanuts, soy lecithin',
          confidence: 0.95,
        }),
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      const result = await parser.parse('data:image/jpeg;base64,test-image');

      expect(result.allergens).toHaveLength(5);
      
      const wheatIngredient = result.ingredients.find(i => i.name === 'Wheat flour');
      expect(wheatIngredient?.isAllergen).toBe(true);
      expect(wheatIngredient?.allergenType).toBe('wheat');

      const milkIngredient = result.ingredients.find(i => i.name === 'milk');
      expect(milkIngredient?.isAllergen).toBe(true);
      expect(milkIngredient?.allergenType).toBe('milk');

      const eggsIngredient = result.ingredients.find(i => i.name === 'eggs');
      expect(eggsIngredient?.isAllergen).toBe(true);
      expect(eggsIngredient?.allergenType).toBe('eggs');

      const peanutsIngredient = result.ingredients.find(i => i.name === 'peanuts');
      expect(peanutsIngredient?.isAllergen).toBe(true);
      expect(peanutsIngredient?.allergenType).toBe('peanuts');
    });

    it('should identify preservatives', async () => {
      // Requirement 3.5: Identify artificial preservatives
      const mockResponse = {
        text: JSON.stringify({
          rawText: 'Sugar, BHA, BHT, sodium benzoate, potassium sorbate, TBHQ',
          confidence: 0.95,
        }),
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      const result = await parser.parse('data:image/jpeg;base64,test-image');

      expect(result.preservatives).toHaveLength(5);
      
      const bhaIngredient = result.ingredients.find(i => i.name === 'BHA');
      expect(bhaIngredient?.isPreservative).toBe(true);
      expect(bhaIngredient?.preservativeType).toBe('BHA');

      const bhtIngredient = result.ingredients.find(i => i.name === 'BHT');
      expect(bhtIngredient?.isPreservative).toBe(true);
      expect(bhtIngredient?.preservativeType).toBe('BHT');
    });

    it('should identify sweeteners', async () => {
      // Requirement 3.6: Identify artificial sweeteners
      const mockResponse = {
        text: JSON.stringify({
          rawText: 'Water, aspartame, sucralose, saccharin, acesulfame potassium',
          confidence: 0.95,
        }),
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      const result = await parser.parse('data:image/jpeg;base64,test-image');

      expect(result.sweeteners).toHaveLength(4);
      
      const aspartameIngredient = result.ingredients.find(i => i.name === 'aspartame');
      expect(aspartameIngredient?.isSweetener).toBe(true);
      expect(aspartameIngredient?.sweetenerType).toBe('aspartame');

      const sucraloseIngredient = result.ingredients.find(i => i.name === 'sucralose');
      expect(sucraloseIngredient?.isSweetener).toBe(true);
      expect(sucraloseIngredient?.sweetenerType).toBe('sucralose');
    });

    it('should identify artificial colors', async () => {
      // Requirement 3.7: Identify artificial colors
      const mockResponse = {
        text: JSON.stringify({
          rawText: 'Sugar, Red 40, Yellow 5, Blue 1, caramel color',
          confidence: 0.95,
        }),
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      const result = await parser.parse('data:image/jpeg;base64,test-image');

      expect(result.artificialColors).toHaveLength(4);
      
      const red40Ingredient = result.ingredients.find(i => i.name === 'Red 40');
      expect(red40Ingredient?.isArtificialColor).toBe(true);
      expect(red40Ingredient?.colorType).toBe('Red 40');

      const yellow5Ingredient = result.ingredients.find(i => i.name === 'Yellow 5');
      expect(yellow5Ingredient?.isArtificialColor).toBe(true);
      expect(yellow5Ingredient?.colorType).toBe('Yellow 5');
    });

    it('should flag incomplete lists when confidence is low', async () => {
      // Requirement 3.8: Flag as incomplete when OCR confidence is low
      const mockResponse = {
        text: JSON.stringify({
          rawText: 'Flour, sugar, partially visible text...',
          confidence: 0.65, // Below 0.7 threshold
        }),
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      const result = await parser.parse('data:image/jpeg;base64,test-image');

      expect(result.isComplete).toBe(false);
      expect(result.confidence).toBe(0.65);
    });

    it('should mark complete lists when confidence is high', async () => {
      // Requirement 3.8: Return complete list when confidence is high
      const mockResponse = {
        text: JSON.stringify({
          rawText: 'Flour, sugar, salt, yeast',
          confidence: 0.95,
        }),
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      const result = await parser.parse('data:image/jpeg;base64,test-image');

      expect(result.isComplete).toBe(true);
      expect(result.confidence).toBe(0.95);
    });

    it('should handle image data without data URI prefix', async () => {
      const mockResponse = {
        text: JSON.stringify({
          rawText: 'Flour, sugar, salt',
          confidence: 0.95,
        }),
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      const result = await parser.parse('base64-encoded-image-data');

      expect(result.ingredients).toHaveLength(3);
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
          rawText: 'Flour, sugar, salt',
          confidence: 0.95,
        }) + '\n```',
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      const result = await parser.parse('data:image/jpeg;base64,test-image');

      expect(result.ingredients).toHaveLength(3);
    });

    it('should throw error for invalid response format', async () => {
      const mockResponse = {
        text: 'This is not valid JSON',
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as any);

      await expect(parser.parse('data:image/jpeg;base64,test-image'))
        .rejects.toThrow('Failed to parse OCR response');
    });

    it('should use low temperature for consistent extraction', async () => {
      const mockResponse = {
        text: JSON.stringify({
          rawText: 'Flour, sugar, salt',
          confidence: 0.95,
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

  describe('identifyAllergens', () => {
    it('should identify allergens from ingredient list', () => {
      const ingredients = ['wheat flour', 'milk', 'eggs', 'sugar'];
      
      const allergens = parser.identifyAllergens(ingredients);

      expect(allergens).toHaveLength(3);
      expect(allergens.find(a => a.allergenType === 'wheat')).toBeDefined();
      expect(allergens.find(a => a.allergenType === 'milk')).toBeDefined();
      expect(allergens.find(a => a.allergenType === 'eggs')).toBeDefined();
    });

    it('should return empty array when no allergens present', () => {
      const ingredients = ['sugar', 'salt', 'water'];
      
      const allergens = parser.identifyAllergens(ingredients);

      expect(allergens).toHaveLength(0);
    });
  });

  describe('identifyPreservatives', () => {
    it('should identify preservatives from ingredient list', () => {
      const ingredients = ['sugar', 'BHA', 'sodium benzoate', 'salt'];
      
      const preservatives = parser.identifyPreservatives(ingredients);

      expect(preservatives).toHaveLength(2);
      expect(preservatives.find(p => p.preservativeType === 'BHA')).toBeDefined();
      expect(preservatives.find(p => p.preservativeType === 'sodium_benzoate')).toBeDefined();
    });

    it('should return empty array when no preservatives present', () => {
      const ingredients = ['sugar', 'salt', 'water'];
      
      const preservatives = parser.identifyPreservatives(ingredients);

      expect(preservatives).toHaveLength(0);
    });
  });

  describe('identifySweeteners', () => {
    it('should identify sweeteners from ingredient list', () => {
      const ingredients = ['water', 'aspartame', 'sucralose', 'citric acid'];
      
      const sweeteners = parser.identifySweeteners(ingredients);

      expect(sweeteners).toHaveLength(2);
      expect(sweeteners.find(s => s.sweetenerType === 'aspartame')).toBeDefined();
      expect(sweeteners.find(s => s.sweetenerType === 'sucralose')).toBeDefined();
    });

    it('should return empty array when no sweeteners present', () => {
      const ingredients = ['sugar', 'salt', 'water'];
      
      const sweeteners = parser.identifySweeteners(ingredients);

      expect(sweeteners).toHaveLength(0);
    });
  });

  describe('identifyArtificialColors', () => {
    it('should identify artificial colors from ingredient list', () => {
      const ingredients = ['sugar', 'Red 40', 'Yellow 5', 'salt'];
      
      const colors = parser.identifyArtificialColors(ingredients);

      expect(colors).toHaveLength(2);
      expect(colors.find(c => c.colorType === 'Red 40')).toBeDefined();
      expect(colors.find(c => c.colorType === 'Yellow 5')).toBeDefined();
    });

    it('should return empty array when no artificial colors present', () => {
      const ingredients = ['sugar', 'salt', 'water'];
      
      const colors = parser.identifyArtificialColors(ingredients);

      expect(colors).toHaveLength(0);
    });
  });
});
