/**
 * Gemini AI utility functions for product analysis
 * 
 * This module provides functions for constructing prompts and parsing
 * responses from the Gemini 2.0 Flash API for grocery product analysis.
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7
 */

import { AnalysisResult, InsightCategory } from './types';

/**
 * Constructs the system prompt for Gemini AI product analysis
 * 
 * This prompt instructs Gemini to:
 * - Identify all visible grocery products in an image
 * - Analyze five specific categories for each product
 * - Return results in a structured JSON format
 * - Handle edge cases like unclear products or no products detected
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7
 * 
 * @returns {string} The complete system prompt for Gemini
 */
export function constructPrompt(): string {
  return `You are an AI assistant analyzing grocery product images.

TASK:
- Identify all visible grocery products in the image
- For each product, analyze these 5 categories:
  1. Health: Nutritional quality (Good/Fair/Poor)
  2. Responsibly Produced: Sustainability practices (Yes/Partial/No/Unknown)
  3. Carbon Impact: Environmental footprint (Low/Medium/High/Unknown)
  4. Preservatives: Presence of artificial preservatives (None/Some/Many/Unknown)
  5. Allergies: Common allergens present (list or "None detected")

OUTPUT FORMAT:
Return a JSON array of products:
[
  {
    "productName": "Product Name",
    "insights": {
      "health": { "rating": "Good", "explanation": "..." },
      "sustainability": { "rating": "Yes", "explanation": "..." },
      "carbon": { "rating": "Low", "explanation": "..." },
      "preservatives": { "rating": "None", "explanation": "..." },
      "allergies": { "rating": "None detected", "explanation": "..." }
    }
  }
]

RULES:
- If no products detected, return empty array []
- If product details unclear, use "Unknown" ratings
- Provide brief, actionable explanations (1-2 sentences)
- Handle multiple products in one image`;
}

/**
 * Parses and validates Gemini's JSON response
 * 
 * This function:
 * - Strips markdown code blocks (```json ... ```) if present
 * - Validates that the response is valid JSON
 * - Contains an array of products
 * - Each product has required fields (productName, insights)
 * - Each product has all five insight categories
 * - Each insight has rating and explanation fields
 * 
 * Requirements: 3.5, 3.6
 * 
 * @param {string} response - The raw response from Gemini (may include markdown)
 * @returns {AnalysisResult} Validated and typed analysis result
 * @throws {Error} If response is invalid or missing required fields
 */
export function parseGeminiResponse(response: string): AnalysisResult {
  // Step 1: Strip markdown code blocks if present
  // Gemini sometimes wraps JSON in ```json ... ```
  let cleanedResponse = response.trim();
  const codeBlockMatch = cleanedResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    cleanedResponse = codeBlockMatch[1].trim();
  }

  // Step 2: Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanedResponse);
  } catch (error) {
    throw new Error('Invalid JSON response from Gemini: Unable to parse response');
  }

  // Step 2: Validate it's an array
  if (!Array.isArray(parsed)) {
    throw new Error('Invalid response structure: Expected an array of products');
  }

  // Step 3: Validate each product in the array
  const requiredCategories: InsightCategory[] = [
    'health',
    'sustainability',
    'carbon',
    'preservatives',
    'allergies'
  ];

  for (let i = 0; i < parsed.length; i++) {
    const product = parsed[i];

    // Validate product is an object
    if (typeof product !== 'object' || product === null) {
      throw new Error(`Invalid product at index ${i}: Expected an object`);
    }

    // Validate productName exists and is a string
    if (typeof product.productName !== 'string' || product.productName.trim() === '') {
      throw new Error(`Invalid product at index ${i}: Missing or empty productName`);
    }

    // Validate insights object exists
    if (typeof product.insights !== 'object' || product.insights === null) {
      throw new Error(`Invalid product at index ${i}: Missing insights object`);
    }

    // Validate all five insight categories are present
    for (const category of requiredCategories) {
      const insight = product.insights[category];

      if (typeof insight !== 'object' || insight === null) {
        throw new Error(
          `Invalid product "${product.productName}": Missing or invalid "${category}" insight`
        );
      }

      // Validate rating field
      if (typeof insight.rating !== 'string' || insight.rating.trim() === '') {
        throw new Error(
          `Invalid product "${product.productName}": Missing or empty rating for "${category}" insight`
        );
      }

      // Validate explanation field
      if (typeof insight.explanation !== 'string' || insight.explanation.trim() === '') {
        throw new Error(
          `Invalid product "${product.productName}": Missing or empty explanation for "${category}" insight`
        );
      }
    }
  }

  // Step 4: Return typed result
  return { products: parsed } as AnalysisResult;
}
