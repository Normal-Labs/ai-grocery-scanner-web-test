/**
 * Gemini Extraction Prompts
 * 
 * Centralized location for all product extraction prompts.
 * This allows for easy updates and testing of different prompt strategies.
 */

/**
 * Barcode Extraction Prompt
 * 
 * Extracts barcode numbers from product images using OCR.
 * Looks for UPC, EAN, or similar barcode formats.
 */
export const BARCODE_EXTRACTION_PROMPT = `Extract the barcode number from this image.

INSTRUCTIONS:
1. Look for a barcode (UPC, EAN, or similar)
2. Extract ONLY the numeric digits below or near the barcode
3. Return ONLY the barcode number, nothing else
4. If you cannot find a barcode, return "NONE"

Return format: Just the barcode number (e.g., "012345678901")`;

/**
 * Packaging Information Extraction Prompt
 * 
 * Extracts product name, brand, size, category, and packaging type.
 * Returns structured JSON data.
 */
export const PACKAGING_EXTRACTION_PROMPT = `Extract product packaging information from this image.

INSTRUCTIONS:
1. Identify the PRODUCT NAME (the main product title)
2. Identify the BRAND (manufacturer or company name)
3. Identify the SIZE/QUANTITY (e.g., "12 oz", "500g", "6 pack")
4. Identify the CATEGORY (e.g., Beverages, Snacks, Dairy, Bakery, etc.)
5. Identify the PACKAGING TYPE (e.g., bottle, can, box, bag, jar, carton)

Return ONLY a JSON object with these fields:
{
  "productName": "extracted product name",
  "brand": "extracted brand name",
  "size": "extracted size/quantity",
  "category": "inferred category",
  "packagingType": "type of packaging",
  "confidence": 0.0-1.0
}

RULES:
- Extract text exactly as it appears
- Do not include label prefixes like "Product Name:" or "Brand:"
- If a field cannot be determined, use null
- Confidence should reflect overall extraction quality
- Return ONLY the JSON object, no additional text`;

/**
 * Ingredients List Extraction Prompt
 * 
 * Extracts ingredient lists with proper formatting.
 * Handles multi-line OCR, sub-ingredients, and allergen boundaries.
 */
export const INGREDIENTS_EXTRACTION_PROMPT = `Extract the ingredient list from this product label image.

CRITICAL RULES:

1. IGNORE MARKETING TEXT:
   - Discard all promotional phrases like "Now with less salt!", "Organic!", "Family Size", "New Recipe", etc.
   - Skip any text that is not part of the actual ingredient list

2. BOUNDARY DETECTION:
   - START extraction at the word "Ingredients" (or "INGREDIENTS:", "Ingredientes:", etc.)
   - STOP extraction when you see "Contains:" or "CONTAINS:" (allergen statement)
   - STOP at any change in font/layout or start of nutrition facts
   - Do NOT include allergen statements like "Contains: milk, soy" or "CONTAINS: WHEAT, SOY"
   - Do NOT include manufacturing statements like "Manufactured in a facility..."

3. PRESERVE SUB-INGREDIENTS:
   - If an ingredient has components in parentheses, you MUST include them
   - Example: "Enriched Flour (wheat flour, niacin, reduced iron)" - keep the entire structure
   - Maintain nested parentheses if present

4. SPLIT ON COMMAS:
   - Split ingredients by COMMAS, not line breaks
   - Ignore line breaks in the OCR text
   - Each comma-separated item is one ingredient
   - Keep sub-ingredients in parentheses together
   - If an ingredient spans multiple lines, join it into one array element

5. FORMATTING:
   - Return ingredients as a comma-separated list
   - Preserve capitalization as it appears
   - Keep percentage indicators if present (e.g., "Water (60%)")
   - Maintain "and/or" statements if present

6. NO HALLUCINATION:
   - If you cannot find a clear ingredient list, return "NONE"
   - Do not generate or guess ingredients
   - Only extract what is clearly visible

IMPORTANT:
- Split ONLY on commas, NOT on line breaks
- Each ingredient must be a SEPARATE array element
- Do NOT include the word "INGREDIENTS:" or "Ingredients:" in any array element
- Remove "INGREDIENTS:" prefix from the first ingredient
- STOP extraction when you see "CONTAINS:" or "Contains:"
- Do NOT include allergen statements
- Preserve capitalization and sub-ingredients in parentheses
- If an ingredient spans multiple lines, join it into one array element

Return ONLY a JSON object with this structure:
{
  "ingredients": ["ingredient 1", "ingredient 2", "ingredient 3 (with sub-ingredients)", ...],
  "confidence": 0.0-1.0,
  "notes": "any extraction notes or warnings"
}

EXAMPLE OUTPUT:
{
  "ingredients": [
    "Water",
    "Enriched Flour (wheat flour, niacin, reduced iron, thiamine mononitrate, riboflavin, folic acid)",
    "Sugar",
    "Vegetable Oil (soybean and/or palm oil)",
    "Salt"
  ],
  "confidence": 0.95,
  "notes": "Clear ingredient list found"
}

EXAMPLE 2 (Multi-line OCR):
Input: "INGREDIENTS: Whole Grain Blend (Rolled
Oats, Wheat), Sugar, Salt CONTAINS: WHEAT"
Output: {
  "ingredients": ["Whole Grain Blend (Rolled Oats, Wheat)", "Sugar", "Salt"],
  "confidence": 0.9,
  "notes": "Joined multi-line ingredients, stopped at CONTAINS"
}`;

/**
 * Nutrition Facts Extraction Prompt
 * 
 * Extracts complete nutrition facts from Nutrition Facts labels.
 * Returns structured data with proper units and daily values.
 */
export const NUTRITION_EXTRACTION_PROMPT = `Extract nutrition facts from this Nutrition Facts label image.

CRITICAL RULES:

1. TABLE INTEGRITY:
   - Only extract values found INSIDE the official Nutrition Facts table/box
   - The table typically has a bold header "Nutrition Facts" at the top
   - Ignore any text outside the bordered table area

2. DISCARD MARKETING CLAIMS:
   - Ignore callouts like "Excellent source of Calcium", "Zero Sugar!", "Low Fat"
   - Ignore colorful bubbles or large promotional text outside the table
   - Only extract data from the structured table rows

3. UNIT MAPPING:
   - Always include the unit (g, mg, mcg, kcal) for every value
   - Common units: g (grams), mg (milligrams), mcg (micrograms)
   - Calories are typically in kcal (kilocalories)

4. DAILY VALUE (%DV):
   - Extract the percentage if present (usually on the right side)
   - Prioritize the absolute weight/mass value
   - Not all nutrients have %DV (e.g., trans fat, total sugars)

5. SERVING SIZE LOGIC:
   - Always capture "Serving Size" (e.g., "1 cup (240ml)", "2 pieces (50g)")
   - Always capture "Servings Per Container" (number)
   - This ensures data is scalable for different portion sizes

6. REQUIRED FIELDS:
   - Serving Size (string with units)
   - Servings Per Container (number)
   - Calories per serving (number)
   - Total Fat, Saturated Fat, Trans Fat
   - Cholesterol, Sodium
   - Total Carbohydrate, Dietary Fiber, Total Sugars, Added Sugars
   - Protein

7. OPTIONAL FIELDS (if present):
   - Vitamins and Minerals (Vitamin D, Calcium, Iron, Potassium, etc.)
   - Other nutrients listed in the table

Return ONLY a JSON object with this EXACT structure:

{
  "serving_size": "string with units (e.g., '1 cup (240ml)')",
  "servings_per_container": number,
  "calories_per_serving": number,
  "macros": {
    "total_fat": {"value": number, "unit": "g", "dv_percent": number or null},
    "saturated_fat": {"value": number, "unit": "g", "dv_percent": number or null},
    "trans_fat": {"value": number, "unit": "g"},
    "cholesterol": {"value": number, "unit": "mg", "dv_percent": number or null},
    "sodium": {"value": number, "unit": "mg", "dv_percent": number or null},
    "total_carbohydrate": {"value": number, "unit": "g", "dv_percent": number or null},
    "dietary_fiber": {"value": number, "unit": "g", "dv_percent": number or null},
    "total_sugars": {"value": number, "unit": "g"},
    "added_sugars": {"value": number, "unit": "g", "dv_percent": number or null},
    "protein": {"value": number, "unit": "g", "dv_percent": number or null}
  },
  "vitamins_minerals": {
    "vitamin_d": {"value": number, "unit": "mcg", "dv_percent": number or null},
    "calcium": {"value": number, "unit": "mg", "dv_percent": number or null},
    "iron": {"value": number, "unit": "mg", "dv_percent": number or null},
    "potassium": {"value": number, "unit": "mg", "dv_percent": number or null}
  },
  "confidence": 0.0-1.0,
  "notes": "any extraction notes or warnings"
}

EXAMPLE OUTPUT:
{
  "serving_size": "1 cup (240ml)",
  "servings_per_container": 8,
  "calories_per_serving": 150,
  "macros": {
    "total_fat": {"value": 8, "unit": "g", "dv_percent": 10},
    "saturated_fat": {"value": 1, "unit": "g", "dv_percent": 5},
    "trans_fat": {"value": 0, "unit": "g"},
    "cholesterol": {"value": 0, "unit": "mg", "dv_percent": 0},
    "sodium": {"value": 100, "unit": "mg", "dv_percent": 4},
    "total_carbohydrate": {"value": 12, "unit": "g", "dv_percent": 4},
    "dietary_fiber": {"value": 0, "unit": "g", "dv_percent": 0},
    "total_sugars": {"value": 12, "unit": "g"},
    "added_sugars": {"value": 0, "unit": "g", "dv_percent": 0},
    "protein": {"value": 8, "unit": "g", "dv_percent": 16}
  },
  "vitamins_minerals": {
    "vitamin_d": {"value": 2.5, "unit": "mcg", "dv_percent": 10},
    "calcium": {"value": 300, "unit": "mg", "dv_percent": 25},
    "iron": {"value": 0, "unit": "mg", "dv_percent": 0},
    "potassium": {"value": 350, "unit": "mg", "dv_percent": 8}
  },
  "confidence": 0.95,
  "notes": "Complete nutrition facts extracted"
}

IMPORTANT:
- If a value is not present or unclear, use null
- If you cannot find a clear Nutrition Facts table, return confidence: 0.0
- Do not guess or hallucinate values`;

/**
 * Combined Extraction Prompt (Experimental)
 * 
 * Extracts all information in a single API call.
 * More efficient but may reduce accuracy per field.
 */
export const COMBINED_EXTRACTION_PROMPT = `Extract ALL product information from this image in a single pass.

Extract the following information:

1. BARCODE:
   - Look for UPC, EAN, or similar barcode
   - Extract the numeric digits
   - Return null if not found

2. PACKAGING:
   - Product name (main title)
   - Brand (manufacturer)
   - Size/quantity (e.g., "12 oz", "500g")
   - Category (e.g., Beverages, Snacks, Dairy)
   - Packaging type (bottle, can, box, bag, jar)

3. INGREDIENTS:
   - Start at "Ingredients" or "INGREDIENTS:"
   - Stop at "Contains:" or "CONTAINS:"
   - Split on commas, not line breaks
   - Preserve sub-ingredients in parentheses
   - Return as array of strings

4. NUTRITION FACTS:
   - Extract from official Nutrition Facts table only
   - Include serving size, calories, macros, vitamins/minerals
   - Use proper units (g, mg, mcg)
   - Include %DV when present

Return ONLY a JSON object with this structure:
{
  "barcode": "string or null",
  "packaging": {
    "productName": "string or null",
    "brand": "string or null",
    "size": "string or null",
    "category": "string or null",
    "packagingType": "string or null"
  },
  "ingredients": ["ingredient 1", "ingredient 2", ...] or null,
  "nutrition_facts": {
    "serving_size": "string",
    "servings_per_container": number,
    "calories_per_serving": number,
    "macros": { ... },
    "vitamins_minerals": { ... }
  } or null,
  "confidence": {
    "barcode": 0.0-1.0,
    "packaging": 0.0-1.0,
    "ingredients": 0.0-1.0,
    "nutrition": 0.0-1.0
  }
}

IMPORTANT:
- Extract all visible information
- Use null for fields that cannot be determined
- Maintain data quality standards for each section
- Return confidence scores for each extraction type`;

/**
 * Prompt Templates
 * 
 * Helper object for easy access to all prompts
 */
export const ExtractionPrompts = {
  barcode: BARCODE_EXTRACTION_PROMPT,
  packaging: PACKAGING_EXTRACTION_PROMPT,
  ingredients: INGREDIENTS_EXTRACTION_PROMPT,
  nutrition: NUTRITION_EXTRACTION_PROMPT,
  combined: COMBINED_EXTRACTION_PROMPT,
} as const;

/**
 * Get a specific extraction prompt by type
 */
export function getExtractionPrompt(type: keyof typeof ExtractionPrompts): string {
  return ExtractionPrompts[type];
}

/**
 * Combine multiple extraction prompts into a single prompt
 * 
 * This allows making a single API call to extract multiple types of data.
 * More efficient than sequential calls, but may reduce accuracy per field.
 * 
 * @param types - Array of prompt types to combine
 * @returns Combined prompt string with instructions for all requested extractions
 * 
 * @example
 * // Extract only barcode and packaging
 * const prompt = combineExtractionPrompts(['barcode', 'packaging']);
 * 
 * @example
 * // Extract all information in one call
 * const prompt = combineExtractionPrompts(['barcode', 'packaging', 'ingredients', 'nutrition']);
 */
export function combineExtractionPrompts(
  types: Array<keyof typeof ExtractionPrompts>
): string {
  if (types.length === 0) {
    throw new Error('At least one prompt type must be specified');
  }

  // If only one type, return the single prompt
  if (types.length === 1) {
    return ExtractionPrompts[types[0]];
  }

  // Build combined prompt
  const sections: string[] = [];
  
  sections.push('Extract ALL of the following information from this product image:\n');

  // Add each extraction type as a numbered section
  types.forEach((type, index) => {
    const sectionNumber = index + 1;
    let sectionTitle = '';
    let sectionKey = '';

    switch (type) {
      case 'barcode':
        sectionTitle = 'BARCODE DETECTION';
        sectionKey = 'barcode';
        break;
      case 'packaging':
        sectionTitle = 'PACKAGING INFORMATION';
        sectionKey = 'packaging';
        break;
      case 'ingredients':
        sectionTitle = 'INGREDIENTS LIST';
        sectionKey = 'ingredients';
        break;
      case 'nutrition':
        sectionTitle = 'NUTRITION FACTS';
        sectionKey = 'nutrition_facts';
        break;
      case 'combined':
        // Skip - this is already a combined prompt
        return;
    }

    sections.push(`\n${'='.repeat(80)}`);
    sections.push(`SECTION ${sectionNumber}: ${sectionTitle}`);
    sections.push('='.repeat(80));
    sections.push(ExtractionPrompts[type]);
  });

  // Add combined output format instructions
  sections.push('\n' + '='.repeat(80));
  sections.push('COMBINED OUTPUT FORMAT');
  sections.push('='.repeat(80));
  sections.push('\nReturn a SINGLE JSON object with ALL extracted data:\n');
  sections.push('{');

  types.forEach((type) => {
    switch (type) {
      case 'barcode':
        sections.push('  "barcode": "string or null",');
        break;
      case 'packaging':
        sections.push('  "packaging": {');
        sections.push('    "productName": "string or null",');
        sections.push('    "brand": "string or null",');
        sections.push('    "size": "string or null",');
        sections.push('    "category": "string or null",');
        sections.push('    "packagingType": "string or null",');
        sections.push('    "confidence": 0.0-1.0');
        sections.push('  },');
        break;
      case 'ingredients':
        sections.push('  "ingredients": {');
        sections.push('    "ingredients": ["ingredient 1", "ingredient 2", ...] or null,');
        sections.push('    "confidence": 0.0-1.0,');
        sections.push('    "notes": "string"');
        sections.push('  },');
        break;
      case 'nutrition':
        sections.push('  "nutrition_facts": {');
        sections.push('    "serving_size": "string",');
        sections.push('    "servings_per_container": number,');
        sections.push('    "calories_per_serving": number,');
        sections.push('    "macros": { ... },');
        sections.push('    "vitamins_minerals": { ... },');
        sections.push('    "confidence": 0.0-1.0');
        sections.push('  },');
        break;
    }
  });

  sections.push('  "overall_confidence": 0.0-1.0');
  sections.push('}');

  sections.push('\nIMPORTANT:');
  sections.push('- Return ONLY the JSON object, no additional text');
  sections.push('- Use null for any field that cannot be determined');
  sections.push('- Follow the specific extraction rules for each section above');
  sections.push('- Maintain data quality standards for each extraction type');
  sections.push('- The overall_confidence should reflect the quality of all extractions');

  return sections.join('\n');
}

/**
 * Type guard to check if a string is a valid extraction prompt type
 */
export function isValidPromptType(type: string): type is keyof typeof ExtractionPrompts {
  return type in ExtractionPrompts;
}
