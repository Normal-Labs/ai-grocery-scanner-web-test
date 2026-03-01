/**
 * NutritionParser Service for Nutritional Health Analysis
 * 
 * This service extracts structured nutritional data from nutrition facts labels
 * using OCR via Gemini Vision API.
 * 
 * Requirements: 2.1-2.10, 10.1-10.4
 */

import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

/**
 * Nutritional facts data structure
 * 
 * Each field includes the extracted value and OCR confidence score.
 * Requirement 2.10: Return structured JSON data with all extracted nutritional values
 */
export interface NutritionalFacts {
  servingSize: {
    amount: number;
    unit: string; // "g", "ml", "oz", "cup", etc.
    confidence: number;
  };
  servingsPerContainer?: number;
  calories: {
    value: number;
    confidence: number;
  };
  totalFat: {
    value: number; // grams
    confidence: number;
  };
  saturatedFat: {
    value: number; // grams
    confidence: number;
  };
  transFat: {
    value: number; // grams
    confidence: number;
  };
  cholesterol: {
    value: number; // milligrams
    confidence: number;
  };
  sodium: {
    value: number; // milligrams
    confidence: number;
  };
  totalCarbohydrates: {
    value: number; // grams
    confidence: number;
  };
  dietaryFiber: {
    value: number; // grams
    confidence: number;
  };
  totalSugars: {
    value: number; // grams
    confidence: number;
  };
  addedSugars?: {
    value: number; // grams
    confidence: number;
  };
  protein: {
    value: number; // grams
    confidence: number;
  };
  vitamins?: Record<string, {
    value: number; // % daily value
    confidence: number;
  }>;
  minerals?: Record<string, {
    value: number; // % daily value
    confidence: number;
  }>;
  validationStatus: 'valid' | 'uncertain' | 'invalid';
  validationErrors?: string[];
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * NutritionParser class
 * 
 * Extracts nutritional facts from nutrition label images using Gemini Vision API
 * and validates the extracted data for consistency.
 */
export class NutritionParser {
  private apiKey: string;
  private model: string = 'gemini-2.0-flash'; // Same model as GeminiClient
  private readonly CONFIDENCE_THRESHOLD = 0.8; // Requirement 2.9
  private readonly CALORIE_TOLERANCE = 0.2; // ±20% for calorie validation (Requirement 10.1)

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('Gemini API key is required for NutritionParser');
    }
    
    // Set API key for @ai-sdk/google
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = this.apiKey;
  }

  /**
   * Extracts nutritional facts from a label image
   * 
   * Requirements:
   * - 2.1: Extract serving size and unit
   * - 2.2: Extract calories per serving
   * - 2.3: Extract total fat, saturated fat, and trans fat values
   * - 2.4: Extract cholesterol value
   * - 2.5: Extract sodium value
   * - 2.6: Extract total carbohydrates, dietary fiber, and total sugars
   * - 2.7: Extract protein value
   * - 2.8: Extract vitamin and mineral percentages when present
   * - 2.9: Flag fields with confidence below 80% as "uncertain"
   * - 2.10: Return structured JSON data
   * 
   * @param imageData - Base64 encoded image (with or without data URI prefix)
   * @returns Structured nutritional data with confidence scores
   */
  async parse(imageData: string): Promise<NutritionalFacts> {
    const startTime = Date.now();
    
    try {
      console.log('[NutritionParser] 🔍 Parsing nutrition label...');

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
      const nutritionalFacts = this.parseOCRResponse(responseText);

      // Validate extracted data
      const validationResult = this.validate(nutritionalFacts);
      
      // Update validation status based on results
      nutritionalFacts.validationStatus = validationResult.isValid ? 'valid' : 'invalid';
      nutritionalFacts.validationErrors = validationResult.errors.length > 0 ? validationResult.errors : undefined;

      // Check for uncertain fields (Requirement 2.9)
      const hasUncertainFields = this.hasLowConfidenceFields(nutritionalFacts);
      if (hasUncertainFields && nutritionalFacts.validationStatus === 'valid') {
        nutritionalFacts.validationStatus = 'uncertain';
      }

      const duration = Date.now() - startTime;
      console.log(`[NutritionParser] ✅ Parsing complete (${duration}ms)`);
      console.log(`[NutritionParser] Validation status: ${nutritionalFacts.validationStatus}`);

      return nutritionalFacts;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[NutritionParser] ❌ Parsing failed (${duration}ms):`, error);
      throw error;
    }
  }

  /**
   * Validates extracted nutritional data
   * 
   * Requirements:
   * - 10.1: Validate calorie calculation (4×carbs + 4×protein + 9×fat ≈ stated calories ±20%)
   * - 10.2: Flag data as "potentially inaccurate" if calorie calculation differs by >20%
   * - 10.3: Validate percentage daily values are within 0-200% range
   * - 10.4: Validate serving size is positive with valid units
   * 
   * @param facts - Extracted nutritional facts
   * @returns Validation result with errors if any
   */
  validate(facts: NutritionalFacts): ValidationResult {
    const errors: string[] = [];

    // Requirement 10.4: Validate serving size is positive with valid units
    if (facts.servingSize.amount <= 0) {
      errors.push('Serving size must be a positive number');
    }

    const validUnits = ['g', 'mg', 'ml', 'oz', 'cup', 'tbsp', 'tsp', 'fl oz', 'serving'];
    if (!validUnits.includes(facts.servingSize.unit.toLowerCase())) {
      errors.push(`Invalid serving size unit: ${facts.servingSize.unit}`);
    }

    // Requirement 10.1 & 10.2: Validate calorie calculation
    const calculatedCalories = 
      (facts.totalCarbohydrates.value * 4) +
      (facts.protein.value * 4) +
      (facts.totalFat.value * 9);

    const statedCalories = facts.calories.value;
    const calorieDifference = Math.abs(calculatedCalories - statedCalories);
    const caloriePercentDiff = statedCalories > 0 ? calorieDifference / statedCalories : 0;

    if (caloriePercentDiff > this.CALORIE_TOLERANCE) {
      errors.push(
        `Calorie calculation mismatch: calculated ${Math.round(calculatedCalories)} cal ` +
        `vs stated ${statedCalories} cal (${Math.round(caloriePercentDiff * 100)}% difference)`
      );
    }

    // Requirement 10.3: Validate percentage daily values are within 0-200% range
    if (facts.vitamins) {
      for (const [vitamin, data] of Object.entries(facts.vitamins)) {
        if (data.value < 0 || data.value > 200) {
          errors.push(`${vitamin} percentage daily value out of range: ${data.value}%`);
        }
      }
    }

    if (facts.minerals) {
      for (const [mineral, data] of Object.entries(facts.minerals)) {
        if (data.value < 0 || data.value > 200) {
          errors.push(`${mineral} percentage daily value out of range: ${data.value}%`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Builds the OCR prompt for Gemini Vision
   * 
   * Instructs the model to extract all nutritional fields with confidence scores.
   */
  private buildOCRPrompt(): string {
    return `Extract nutritional facts from this nutrition label image.
Return structured JSON with all visible values.
For each field, include the value and your confidence (0.0-1.0).
If a field is not visible or unclear, set the value to 0 and confidence to 0.0.

REQUIRED FIELDS (always include these):
- servingSize: { amount: number, unit: string, confidence: number }
- servingsPerContainer: number (optional, omit if not visible)
- calories: { value: number, confidence: number }
- totalFat: { value: number (grams), confidence: number }
- saturatedFat: { value: number (grams), confidence: number }
- transFat: { value: number (grams), confidence: number }
- cholesterol: { value: number (milligrams), confidence: number }
- sodium: { value: number (milligrams), confidence: number }
- totalCarbohydrates: { value: number (grams), confidence: number }
- dietaryFiber: { value: number (grams), confidence: number }
- totalSugars: { value: number (grams), confidence: number }
- protein: { value: number (grams), confidence: number }

OPTIONAL FIELDS (include only if visible):
- addedSugars: { value: number (grams), confidence: number }
- vitamins: { [name]: { value: number (% daily value), confidence: number } }
- minerals: { [name]: { value: number (% daily value), confidence: number } }

EXTRACTION RULES:
1. Extract exact numeric values as they appear on the label
2. For serving size, extract both the amount and unit (e.g., "28g" → amount: 28, unit: "g")
3. Convert all values to standard units (grams for macros, milligrams for sodium/cholesterol)
4. Set confidence based on text clarity and visibility (1.0 = perfectly clear, 0.0 = not visible)
5. If a value shows "0" or "0g" on the label, extract it as 0 with high confidence
6. For vitamins/minerals, use the vitamin/mineral name as the key (e.g., "Vitamin D", "Calcium")

Return ONLY valid JSON in this exact format (no markdown, no explanations):
{
  "servingSize": { "amount": 28, "unit": "g", "confidence": 0.95 },
  "servingsPerContainer": 10,
  "calories": { "value": 150, "confidence": 0.98 },
  "totalFat": { "value": 8, "confidence": 0.96 },
  "saturatedFat": { "value": 1, "confidence": 0.94 },
  "transFat": { "value": 0, "confidence": 0.92 },
  "cholesterol": { "value": 0, "confidence": 0.90 },
  "sodium": { "value": 170, "confidence": 0.97 },
  "totalCarbohydrates": { "value": 15, "confidence": 0.96 },
  "dietaryFiber": { "value": 3, "confidence": 0.93 },
  "totalSugars": { "value": 1, "confidence": 0.95 },
  "protein": { "value": 6, "confidence": 0.97 }
}`;
  }

  /**
   * Parses and validates the OCR response from Gemini
   * 
   * @param responseText - Raw response from Gemini API
   * @returns Validated NutritionalFacts object
   * @throws Error if response is invalid
   */
  private parseOCRResponse(responseText: string): NutritionalFacts {
    try {
      // Strip markdown code blocks if present
      let cleanedResponse = responseText.trim();
      const codeBlockMatch = cleanedResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        cleanedResponse = codeBlockMatch[1].trim();
      }

      // Parse JSON
      const parsed = JSON.parse(cleanedResponse);

      // Validate required fields exist
      const requiredFields = [
        'servingSize', 'calories', 'totalFat', 'saturatedFat', 'transFat',
        'cholesterol', 'sodium', 'totalCarbohydrates', 'dietaryFiber',
        'totalSugars', 'protein'
      ];

      for (const field of requiredFields) {
        if (!parsed[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Validate serving size structure
      if (!parsed.servingSize.amount || !parsed.servingSize.unit || parsed.servingSize.confidence === undefined) {
        throw new Error('Invalid servingSize structure');
      }

      // Return with default validation status (will be updated by validate())
      return {
        ...parsed,
        validationStatus: 'valid',
      } as NutritionalFacts;
    } catch (error) {
      console.error('[NutritionParser] Failed to parse response:', responseText);
      throw new Error(`Failed to parse OCR response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Checks if any fields have confidence below the threshold
   * 
   * Requirement 2.9: Flag fields with confidence below 0.8 as "uncertain"
   * 
   * @param facts - Nutritional facts to check
   * @returns True if any field has low confidence
   */
  private hasLowConfidenceFields(facts: NutritionalFacts): boolean {
    const fieldsToCheck = [
      facts.servingSize,
      facts.calories,
      facts.totalFat,
      facts.saturatedFat,
      facts.transFat,
      facts.cholesterol,
      facts.sodium,
      facts.totalCarbohydrates,
      facts.dietaryFiber,
      facts.totalSugars,
      facts.protein,
    ];

    // Check optional fields
    if (facts.addedSugars) {
      fieldsToCheck.push(facts.addedSugars);
    }

    // Check all fields for low confidence
    for (const field of fieldsToCheck) {
      if (field.confidence < this.CONFIDENCE_THRESHOLD) {
        console.log(`[NutritionParser] ⚠️  Low confidence field detected: ${field.confidence}`);
        return true;
      }
    }

    // Check vitamins
    if (facts.vitamins) {
      for (const [name, data] of Object.entries(facts.vitamins)) {
        if (data.confidence < this.CONFIDENCE_THRESHOLD) {
          console.log(`[NutritionParser] ⚠️  Low confidence vitamin detected: ${name} (${data.confidence})`);
          return true;
        }
      }
    }

    // Check minerals
    if (facts.minerals) {
      for (const [name, data] of Object.entries(facts.minerals)) {
        if (data.confidence < this.CONFIDENCE_THRESHOLD) {
          console.log(`[NutritionParser] ⚠️  Low confidence mineral detected: ${name} (${data.confidence})`);
          return true;
        }
      }
    }

    return false;
  }
}
