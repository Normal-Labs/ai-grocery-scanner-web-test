/**
 * Gemini AI utility functions for product analysis
 * 
 * This module provides functions for constructing prompts and parsing
 * responses from the Gemini 2.0 Flash API for grocery product analysis.
 * Supports tier-aware prompt construction for Free and Premium tiers.
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 11.2, 11.4, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8
 */

import { AnalysisResult, InsightCategory, TierType } from './types';

/**
 * Dimension metadata for display names
 */
const DIMENSION_NAMES: Record<InsightCategory, string> = {
  health: 'Health',
  preservatives: 'Processing and Preservatives',
  allergies: 'Allergens',
  sustainability: 'Responsibly Produced',
  carbon: 'Environmental Impact',
};

/**
 * Constructs the system prompt for Gemini AI product analysis
 * 
 * This prompt instructs Gemini to:
 * - Identify visible grocery products in an image
 * - Analyze specific categories based on tier
 * - Return results in a structured JSON format
 * - Use tools when information is insufficient (Premium tier only)
 * - Handle edge cases like unclear products or no products detected
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 11.2, 11.4, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8
 * 
 * @param {TierType} tier - The user's access tier (free or premium)
 * @param {InsightCategory} dimension - The dimension to analyze (required for free tier)
 * @returns {string} The complete system prompt for Gemini
 */
export function constructPrompt(tier: TierType, dimension?: InsightCategory): string {
  // Free tier: Single dimension analysis
  if (tier === 'free') {
    if (!dimension) {
      throw new Error('Dimension is required for free tier');
    }

    const dimensionName = DIMENSION_NAMES[dimension];

    return `You are an AI assistant analyzing grocery product images.

TASK:
- Identify the FIRST visible grocery product in the image (single product only)
- Analyze ONLY the ${dimensionName} dimension for this product

DIMENSION TO ANALYZE:
- ${dimensionName}: ${getDimensionDescription(dimension)}

OUTPUT FORMAT (STRICT JSON ONLY):
You MUST respond with ONLY a JSON array. Do not include any explanatory text.
Return exactly this structure:
[
  {
    "productName": "Product Name",
    "insights": {
      "${dimension}": { "rating": "...", "explanation": "Brief reason" }
    }
  }
]

RULES:
- Return ONLY valid JSON, no markdown, no explanations
- Analyze ONLY ONE product (the first/most prominent)
- Analyze ONLY the ${dimensionName} dimension
- If no products detected, return empty array: []
- If product details unclear, use "Unknown" rating
- Keep explanations concise (up to 3 lines of text)
- Do NOT use any external tools or search capabilities`;
  }

  // Premium tier: All dimensions, batch scanning, tool-calling
  return `You are an AI Research Agent analyzing grocery product images.

TASK:
- Identify ALL visible grocery products in the image
- For each product, analyze these 5 dimensions:
  1. Health: Nutritional quality (Good/Fair/Poor)
  2. Processing and Preservatives: Level of processing and artificial preservatives (None/Some/Many/Unknown)
  3. Allergens: Common allergens present (list or "None detected")
  4. Responsibly Produced: Sustainability practices (Yes/Partial/No/Unknown)
  5. Environmental Impact: Carbon footprint and environmental impact (Low/Medium/High/Unknown)

CRITICAL RESEARCH REQUIREMENTS:
- You MUST use tavilySearch BEFORE generating your response
- Make ONE comprehensive search that covers ALL dimensions: sustainability, carbon, certifications, sourcing
- Search query should be: "[Parent Company] [Brand] sustainability carbon footprint environmental report 2024"
- DO NOT say "Need to research" - you have the search tool, USE IT FIRST
- DO NOT return "Unknown" for sustainability/carbon without searching
- After searching, synthesize the results into your insights

SEARCH STRATEGY (ONE SEARCH FOR ALL INFO):
- Combine multiple topics in one query for efficiency
- Example: "Mondelez belVita sustainability carbon footprint environmental impact 2024"
- This finds: sustainability reports, carbon data, environmental certifications, sourcing practices
- Extract relevant information from search results for ALL five dimensions

TOOL USAGE WORKFLOW:
1. Analyze visible product information from image
2. Identify information gaps (especially sustainability, carbon, certifications)
3. Use tavilySearch with SPECIFIC queries. Examples:
   - For belVita products: "Mondelez sustainability report belVita"
   - For Coca-Cola: "Coca-Cola carbon footprint environmental report"
   - For organic products: "[Brand] organic certification USDA"
   - For allergens: "[Product name] allergen information ingredients"
4. Analyze search results and extract relevant information
5. Synthesize image data + web research into comprehensive insights

SEARCH QUERY BEST PRACTICES:
- Include brand/manufacturer name (e.g., "Mondelez" for belVita, "Unilever" for Dove)
- Add specific terms: "sustainability report", "carbon footprint", "environmental impact"
- Include year for recent data: "2024 sustainability report"
- Search for certifications: "Fair Trade certified", "B Corp", "Rainforest Alliance"

WHEN TO USE TOOLS:
- Sustainability practices not visible → Search for company sustainability reports
- Carbon impact unclear → Search for carbon footprint data or company environmental reports
- Certifications not visible → Search for product certifications (organic, fair trade, etc.)
- Nutritional details unclear → Search nutrition databases
- Allergen information incomplete → Search product specifications

OUTPUT FORMAT (STRICT JSON ONLY):
You MUST respond with ONLY a JSON array. Do not include any explanatory text.
Return exactly this structure:
[
  {
    "productName": "Product Name",
    "insights": {
      "health": { "rating": "Good", "explanation": "Brief reason" },
      "preservatives": { "rating": "None", "explanation": "Brief reason" },
      "allergies": { "rating": "None detected", "explanation": "Brief reason" },
      "sustainability": { "rating": "Yes", "explanation": "Brief reason" },
      "carbon": { "rating": "Low", "explanation": "Brief reason" }
    }
  }
]

RULES:
- Return ONLY valid JSON, no markdown, no explanations
- Analyze ALL visible products (batch scanning enabled)
- Analyze ALL 5 dimensions for each product
- If no products detected, return empty array: []
- ALWAYS attempt web search before returning "Unknown" for sustainability/carbon/responsible production
- Keep explanations concise (up to 3 lines of text)
- Handle multiple products in one image`;
}

/**
 * Get description for a dimension
 */
function getDimensionDescription(dimension: InsightCategory): string {
  const descriptions: Record<InsightCategory, string> = {
    health: 'Nutritional quality and health impact (Good/Fair/Poor)',
    preservatives: 'Level of processing and artificial preservatives (None/Some/Many/Unknown)',
    allergies: 'Common allergens present (list or "None detected")',
    sustainability: 'Responsible production practices (Yes/Partial/No/Unknown)',
    carbon: 'Carbon footprint and environmental impact (Low/Medium/High/Unknown)',
  };
  return descriptions[dimension];
}

/**
 * Parses and validates Gemini's JSON response
 * 
 * This function:
 * - Strips markdown code blocks (```json ... ```) if present
 * - Validates that the response is valid JSON
 * - Contains an array of products
 * - Each product has required fields (productName, insights)
 * - Validates insight categories based on tier
 * - Each insight has rating and explanation fields
 * 
 * Requirements: 3.5, 3.6, 11.2
 * 
 * @param {string} response - The raw response from Gemini (may include markdown)
 * @param {TierType} tier - The user's access tier
 * @param {InsightCategory} dimension - The dimension analyzed (for free tier)
 * @returns {AnalysisResult} Validated and typed analysis result
 * @throws {Error} If response is invalid or missing required fields
 */
export function parseGeminiResponse(
  response: string,
  tier: TierType = 'premium',
  dimension?: InsightCategory
): AnalysisResult {
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

  // Step 3: Validate it's an array
  if (!Array.isArray(parsed)) {
    throw new Error('Invalid response structure: Expected an array of products');
  }

  // Step 4: Determine required categories based on tier
  const requiredCategories: InsightCategory[] =
    tier === 'free' && dimension
      ? [dimension] // Free tier: Only the selected dimension
      : ['health', 'preservatives', 'allergies', 'sustainability', 'carbon']; // Premium: All five

  // Step 5: Validate each product in the array
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

    // Validate required insight categories are present
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

  // Step 6: Return typed result
  return { products: parsed } as AnalysisResult;
}
