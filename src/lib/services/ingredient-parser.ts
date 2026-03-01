/**
 * IngredientParser Service for Nutritional Health Analysis
 * 
 * This service extracts and analyzes ingredient lists with allergen and additive detection
 * using OCR via Gemini Vision API and pattern matching.
 * 
 * Requirements: 3.1-3.8
 */

import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

/**
 * Allergen types (8 major allergens)
 * Requirement 3.4: Flag common allergens
 */
export type AllergenType = 
  | 'milk' | 'eggs' | 'fish' | 'shellfish' 
  | 'tree_nuts' | 'peanuts' | 'wheat' | 'soybeans';

/**
 * Preservative types
 * Requirement 3.5: Identify artificial preservatives
 */
export type PreservativeType = 
  | 'BHA' | 'BHT' | 'sodium_benzoate' 
  | 'potassium_sorbate' | 'TBHQ';

/**
 * Sweetener types
 * Requirement 3.6: Identify artificial sweeteners
 */
export type SweetenerType = 
  | 'aspartame' | 'sucralose' | 'saccharin' 
  | 'acesulfame_potassium';

/**
 * Parsed ingredient data structure
 * 
 * Each ingredient includes flags for allergens, preservatives, sweeteners, and colors.
 */
export interface ParsedIngredient {
  name: string;
  position: number; // Order in ingredient list (1-indexed)
  isAllergen: boolean;
  allergenType?: AllergenType;
  isPreservative: boolean;
  preservativeType?: PreservativeType;
  isSweetener: boolean;
  sweetenerType?: SweetenerType;
  isArtificialColor: boolean;
  colorType?: string; // e.g., "Red 40", "Yellow 5"
}

/**
 * Complete ingredient list data structure
 * 
 * Requirement 3.1-3.8: Extract and parse ingredient lists with all flags
 */
export interface IngredientList {
  rawText: string;
  ingredients: ParsedIngredient[];
  allergens: ParsedIngredient[];
  preservatives: ParsedIngredient[];
  sweeteners: ParsedIngredient[];
  artificialColors: ParsedIngredient[];
  isComplete: boolean; // false if partially obscured
  confidence: number;
}

/**
 * Allergen detection patterns (case-insensitive)
 * Requirement 3.4: Identify and flag common allergens
 */
const ALLERGEN_PATTERNS: Record<AllergenType, RegExp> = {
  milk: /\b(milk|dairy|cream|butter|cheese|whey|casein|lactose|yogurt|ghee)\b/i,
  eggs: /\b(eggs?|albumin|mayonnaise|meringue)\b/i,
  fish: /\b(fish|anchovy|bass|cod|salmon|tuna|tilapia|halibut|trout)\b/i,
  shellfish: /\b(shellfish|crab|lobster|shrimp|prawn|crayfish|clam|oyster|mussel|scallop)\b/i,
  tree_nuts: /\b(almonds?|cashews?|walnuts?|pecans?|pistachios?|hazelnuts?|macadamias?|brazil nuts?|pine nuts?)\b/i,
  peanuts: /\b(peanuts?|groundnuts?)\b/i,
  wheat: /\b(wheat|flour|gluten|semolina|durum|spelt|farina|graham)\b/i,
  soybeans: /\b(soy|soybeans?|tofu|edamame|tempeh|miso|soya)\b/i,
};

/**
 * Preservative detection patterns (case-insensitive)
 * Requirement 3.5: Identify artificial preservatives
 */
const PRESERVATIVE_PATTERNS: Record<PreservativeType, RegExp> = {
  BHA: /\b(BHA|butylated hydroxyanisole)\b/i,
  BHT: /\b(BHT|butylated hydroxytoluene)\b/i,
  sodium_benzoate: /\b(sodium benzoate)\b/i,
  potassium_sorbate: /\b(potassium sorbate)\b/i,
  TBHQ: /\b(TBHQ|tertiary butylhydroquinone|tert-butylhydroquinone)\b/i,
};

/**
 * Sweetener detection patterns (case-insensitive)
 * Requirement 3.6: Identify artificial sweeteners
 */
const SWEETENER_PATTERNS: Record<SweetenerType, RegExp> = {
  aspartame: /\b(aspartame)\b/i,
  sucralose: /\b(sucralose|splenda)\b/i,
  saccharin: /\b(saccharin|sweet'n low)\b/i,
  acesulfame_potassium: /\b(acesulfame potassium|acesulfame k|ace-k)\b/i,
};

/**
 * Artificial color detection patterns (case-insensitive)
 * Requirement 3.7: Identify artificial colors
 */
const COLOR_PATTERNS: RegExp[] = [
  /\b(red 40|red 3|red no\. 40|red no\. 3|allura red)\b/i,
  /\b(yellow 5|yellow 6|yellow no\. 5|yellow no\. 6|tartrazine|sunset yellow)\b/i,
  /\b(blue 1|blue 2|blue no\. 1|blue no\. 2|brilliant blue)\b/i,
  /\b(green 3|green no\. 3|fast green)\b/i,
  /\b(orange b|citrus red)\b/i,
  /\b(caramel color|caramel coloring)\b/i,
];

/**
 * IngredientParser class
 * 
 * Extracts ingredient lists from images using Gemini Vision API and identifies
 * allergens, preservatives, sweeteners, and artificial colors using pattern matching.
 */
export class IngredientParser {
  private apiKey: string;
  private model: string = 'gemini-2.0-flash-exp';
  private readonly CONFIDENCE_THRESHOLD = 0.7; // Threshold for incomplete list flagging

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('Gemini API key is required for IngredientParser');
    }
    
    // Set API key for @ai-sdk/google
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = this.apiKey;
  }

  /**
   * Extracts and parses ingredient list from image
   * 
   * Requirements:
   * - 3.1: Extract complete ingredient text
   * - 3.2: Tokenize ingredients by commas and semicolons
   * - 3.3: Preserve ingredient order
   * - 3.4: Identify and flag allergens
   * - 3.5: Identify and flag preservatives
   * - 3.6: Identify and flag sweeteners
   * - 3.7: Identify and flag artificial colors
   * - 3.8: Flag as incomplete when OCR confidence is low
   * 
   * @param imageData - Base64 encoded image (with or without data URI prefix)
   * @returns Parsed ingredient list with flagged items
   */
  async parse(imageData: string): Promise<IngredientList> {
    const startTime = Date.now();
    
    try {
      console.log('[IngredientParser] 🔍 Parsing ingredient list...');

      // Ensure imageData has proper data URI format
      const imageDataUrl = imageData.startsWith('data:') 
        ? imageData 
        : `data:image/jpeg;base64,${imageData}`;

      // Construct OCR prompt
      const prompt = this.buildOCRPrompt();

      // Call Gemini Vision API
      const result = await generateText({
        model: google(this.model),
        temperature: 0.1, // Low temperature for consistent extraction
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

      const responseText = result.text;
      
      // Parse JSON response
      const ocrResult = this.parseOCRResponse(responseText);

      // Tokenize ingredients (Requirement 3.2)
      const ingredientNames = this.tokenizeIngredients(ocrResult.rawText);

      // Parse each ingredient with detection (Requirements 3.4-3.7)
      const parsedIngredients = ingredientNames.map((name, index) => 
        this.parseIngredient(name, index + 1)
      );

      // Separate flagged items
      const allergens = parsedIngredients.filter(ing => ing.isAllergen);
      const preservatives = parsedIngredients.filter(ing => ing.isPreservative);
      const sweeteners = parsedIngredients.filter(ing => ing.isSweetener);
      const artificialColors = parsedIngredients.filter(ing => ing.isArtificialColor);

      // Determine if list is complete (Requirement 3.8)
      const isComplete = ocrResult.confidence >= this.CONFIDENCE_THRESHOLD;

      const ingredientList: IngredientList = {
        rawText: ocrResult.rawText,
        ingredients: parsedIngredients,
        allergens,
        preservatives,
        sweeteners,
        artificialColors,
        isComplete,
        confidence: ocrResult.confidence,
      };

      const duration = Date.now() - startTime;
      console.log(`[IngredientParser] ✅ Parsing complete (${duration}ms)`);
      console.log(`[IngredientParser] Found ${parsedIngredients.length} ingredients`);
      console.log(`[IngredientParser] Allergens: ${allergens.length}, Preservatives: ${preservatives.length}, Sweeteners: ${sweeteners.length}, Colors: ${artificialColors.length}`);
      console.log(`[IngredientParser] Complete: ${isComplete}, Confidence: ${ocrResult.confidence}`);

      return ingredientList;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[IngredientParser] ❌ Parsing failed (${duration}ms):`, error);
      throw error;
    }
  }

  /**
   * Identifies allergens in ingredient list
   * 
   * Requirement 3.4: Identify and flag common allergens
   * 
   * @param ingredients - List of ingredient names
   * @returns Allergens found with types
   */
  identifyAllergens(ingredients: string[]): ParsedIngredient[] {
    return ingredients
      .map((name, index) => this.parseIngredient(name, index + 1))
      .filter(ing => ing.isAllergen);
  }

  /**
   * Identifies preservatives in ingredient list
   * 
   * Requirement 3.5: Identify artificial preservatives
   * 
   * @param ingredients - List of ingredient names
   * @returns Preservatives found with types
   */
  identifyPreservatives(ingredients: string[]): ParsedIngredient[] {
    return ingredients
      .map((name, index) => this.parseIngredient(name, index + 1))
      .filter(ing => ing.isPreservative);
  }

  /**
   * Identifies artificial sweeteners in ingredient list
   * 
   * Requirement 3.6: Identify artificial sweeteners
   * 
   * @param ingredients - List of ingredient names
   * @returns Sweeteners found with types
   */
  identifySweeteners(ingredients: string[]): ParsedIngredient[] {
    return ingredients
      .map((name, index) => this.parseIngredient(name, index + 1))
      .filter(ing => ing.isSweetener);
  }

  /**
   * Identifies artificial colors in ingredient list
   * 
   * Requirement 3.7: Identify artificial colors
   * 
   * @param ingredients - List of ingredient names
   * @returns Colors found with identifiers
   */
  identifyArtificialColors(ingredients: string[]): ParsedIngredient[] {
    return ingredients
      .map((name, index) => this.parseIngredient(name, index + 1))
      .filter(ing => ing.isArtificialColor);
  }

  /**
   * Builds the OCR prompt for Gemini Vision
   * 
   * Instructs the model to extract ingredient list text with confidence score.
   */
  private buildOCRPrompt(): string {
    return `Extract the ingredient list from this product label image.

EXTRACTION RULES:
1. Extract the complete ingredient list text exactly as it appears
2. Preserve the original order of ingredients (first ingredient = highest quantity)
3. Include all visible ingredients, even if partially obscured
4. If the ingredient list is partially cut off or unclear, extract only the readable portion
5. Set confidence based on text clarity and completeness (1.0 = perfectly clear and complete, 0.0 = not visible)

Return ONLY valid JSON in this exact format (no markdown, no explanations):
{
  "rawText": "Complete ingredient list text as it appears on the label",
  "confidence": 0.0-1.0
}

Example:
{
  "rawText": "Whole grain oats, sugar, salt, natural flavor, vitamin E (mixed tocopherols) added to preserve freshness",
  "confidence": 0.95
}`;
  }

  /**
   * Parses and validates the OCR response from Gemini
   * 
   * @param responseText - Raw response from Gemini API
   * @returns OCR result with raw text and confidence
   * @throws Error if response is invalid
   */
  private parseOCRResponse(responseText: string): { rawText: string; confidence: number } {
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
      if (!parsed.rawText || typeof parsed.rawText !== 'string') {
        throw new Error('Missing or invalid rawText field');
      }

      if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
        throw new Error(`Invalid confidence: ${parsed.confidence}`);
      }

      return {
        rawText: parsed.rawText,
        confidence: parsed.confidence,
      };
    } catch (error) {
      console.error('[IngredientParser] Failed to parse response:', responseText);
      throw new Error(`Failed to parse OCR response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Tokenizes ingredient text into individual items
   * 
   * Requirement 3.2: Tokenize ingredients by commas and semicolons
   * Requirement 3.3: Preserve ingredient order
   * 
   * @param rawText - Raw ingredient list text
   * @returns Array of ingredient names in order
   */
  private tokenizeIngredients(rawText: string): string[] {
    // Split by commas and semicolons
    const tokens = rawText.split(/[,;]+/);

    // Clean up each token (trim whitespace, remove empty strings)
    const cleanedTokens = tokens
      .map(token => token.trim())
      .filter(token => token.length > 0);

    return cleanedTokens;
  }

  /**
   * Parses a single ingredient and detects allergens, preservatives, sweeteners, and colors
   * 
   * Requirements 3.4-3.7: Pattern matching for detection
   * 
   * @param name - Ingredient name
   * @param position - Position in ingredient list (1-indexed)
   * @returns Parsed ingredient with all flags
   */
  private parseIngredient(name: string, position: number): ParsedIngredient {
    const ingredient: ParsedIngredient = {
      name,
      position,
      isAllergen: false,
      isPreservative: false,
      isSweetener: false,
      isArtificialColor: false,
    };

    // Check for allergens (Requirement 3.4)
    for (const [allergenType, pattern] of Object.entries(ALLERGEN_PATTERNS)) {
      if (pattern.test(name)) {
        ingredient.isAllergen = true;
        ingredient.allergenType = allergenType as AllergenType;
        break; // Only flag first match
      }
    }

    // Check for preservatives (Requirement 3.5)
    for (const [preservativeType, pattern] of Object.entries(PRESERVATIVE_PATTERNS)) {
      if (pattern.test(name)) {
        ingredient.isPreservative = true;
        ingredient.preservativeType = preservativeType as PreservativeType;
        break; // Only flag first match
      }
    }

    // Check for sweeteners (Requirement 3.6)
    for (const [sweetenerType, pattern] of Object.entries(SWEETENER_PATTERNS)) {
      if (pattern.test(name)) {
        ingredient.isSweetener = true;
        ingredient.sweetenerType = sweetenerType as SweetenerType;
        break; // Only flag first match
      }
    }

    // Check for artificial colors (Requirement 3.7)
    for (const pattern of COLOR_PATTERNS) {
      const match = name.match(pattern);
      if (match) {
        ingredient.isArtificialColor = true;
        ingredient.colorType = match[0]; // Store the matched color name
        break; // Only flag first match
      }
    }

    return ingredient;
  }
}
