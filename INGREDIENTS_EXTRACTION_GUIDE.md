# Ingredients Extraction Guide

## Overview

This guide documents the specialized prompt strategy for extracting ingredient lists from product labels using Gemini Vision OCR.

## Test Page

**URL**: `/test-ingredients`

Access the isolated test page to validate and improve ingredient extraction.

## Extraction Challenges

### Common Issues
1. **Marketing Text Contamination**: Promotional phrases mixed with ingredients
2. **Boundary Detection**: Unclear where ingredient list starts/ends
3. **Sub-Ingredient Loss**: Parenthetical components get dropped
4. **Hallucination**: AI generates plausible but incorrect ingredients
5. **Formatting Inconsistencies**: Various label formats and layouts

### Examples of Problems

**Marketing Text**:
- "Now with less salt!"
- "Organic!"
- "Family Size"
- "New Recipe"
- "Gluten Free"

**Boundary Confusion**:
- Allergen statements: "Contains: milk, soy"
- Manufacturing info: "Manufactured in a facility..."
- Nutrition facts bleeding into ingredients

**Sub-Ingredient Loss**:
- Input: "Enriched Flour (wheat flour, niacin, reduced iron)"
- Bad Output: "Enriched Flour"
- Good Output: "Enriched Flour (wheat flour, niacin, reduced iron)"

## Prompt Strategy

### Core Rules

#### 1. Ignore Marketing Text
```
RULE: Discard all promotional phrases
- "Now with less salt!"
- "Organic!"
- "Family Size"
- "New Recipe"
- Any text that is not part of the actual ingredient list
```

#### 2. Boundary Detection
```
RULE: Start at "Ingredients" heading, stop at list end
- Start: Look for "Ingredients", "INGREDIENTS:", "Ingredientes:", etc.
- Stop: Change in font/layout or start of nutrition facts
- Exclude: Allergen statements ("Contains: milk, soy")
- Exclude: Manufacturing statements ("Manufactured in...")
```

#### 3. Preserve Sub-Ingredients
```
RULE: Keep ALL parenthetical content
- Example: "Enriched Flour (wheat flour, niacin, reduced iron)"
- Maintain nested parentheses if present
- Keep percentage indicators: "Water (60%)"
- Preserve "and/or" statements: "Vegetable Oil (soybean and/or palm oil)"
```

#### 4. Formatting Preservation
```
RULE: Maintain original formatting
- Preserve capitalization as it appears
- Keep percentage indicators
- Maintain "and/or" statements
- Return as comma-separated list
```

#### 5. No Hallucination
```
RULE: Only extract what is clearly visible
- If no clear ingredient list found, return "NONE"
- Do not generate or guess ingredients
- Do not fill in missing information
```

## Prompt Template

```
Extract the ingredient list from this product label image.

CRITICAL RULES:

1. IGNORE MARKETING TEXT:
   - Discard all promotional phrases like "Now with less salt!", "Organic!", "Family Size", "New Recipe", etc.
   - Skip any text that is not part of the actual ingredient list

2. BOUNDARY DETECTION:
   - Start extraction at the word "Ingredients" (or "INGREDIENTS:", "Ingredientes:", etc.)
   - Stop extraction once the list ends (usually marked by a change in font/layout or start of nutrition facts)
   - Do NOT include allergen statements like "Contains: milk, soy"
   - Do NOT include manufacturing statements like "Manufactured in a facility..."

3. PRESERVE SUB-INGREDIENTS:
   - If an ingredient has components in parentheses, you MUST include them
   - Example: "Enriched Flour (wheat flour, niacin, reduced iron)" - keep the entire structure
   - Maintain nested parentheses if present

4. FORMATTING:
   - Return ingredients as a comma-separated list
   - Preserve capitalization as it appears
   - Keep percentage indicators if present (e.g., "Water (60%)")
   - Maintain "and/or" statements if present

5. NO HALLUCINATION:
   - If you cannot find a clear ingredient list, return "NONE"
   - Do not generate or guess ingredients
   - Only extract what is clearly visible

Return ONLY a JSON object with this structure:
{
  "ingredients": ["ingredient 1", "ingredient 2", "ingredient 3 (with sub-ingredients)", ...],
  "confidence": 0.0-1.0,
  "notes": "any extraction notes or warnings"
}
```

## Example Outputs

### Good Extraction
```json
{
  "ingredients": [
    "Water",
    "Enriched Flour (wheat flour, niacin, reduced iron, thiamine mononitrate, riboflavin, folic acid)",
    "Sugar",
    "Vegetable Oil (soybean and/or palm oil)",
    "Salt",
    "Leavening (baking soda, sodium acid pyrophosphate, monocalcium phosphate)",
    "Natural and Artificial Flavors",
    "Soy Lecithin"
  ],
  "confidence": 0.95,
  "notes": "Clear ingredient list found with sub-ingredients preserved"
}
```

### Incomplete Extraction (Low Confidence)
```json
{
  "ingredients": [
    "Water",
    "Flour",
    "Sugar"
  ],
  "confidence": 0.4,
  "notes": "Partial list visible, image may be cut off or blurry"
}
```

### No Ingredients Found
```json
{
  "ingredients": [],
  "confidence": 0.0,
  "notes": "No clear ingredient list found in image"
}
```

## Quality Indicators

### Ingredient Count
- ✓ **Good**: ≥3 ingredients (typical for most products)
- ⚠ **Low**: <3 ingredients (may be incomplete or image issue)

### Confidence Score
- ✓ **High**: ≥0.7 (reliable extraction)
- ⚠ **Medium**: 0.4-0.7 (verify accuracy)
- ❌ **Low**: <0.4 (likely unreliable)

### Sub-Ingredient Preservation
- ✓ **Preserved**: Contains parentheses with sub-components
- ○ **None Detected**: No sub-ingredients in list (may be simple product)

## Database Storage

Ingredients are stored in the `products_dev` table in a dedicated `ingredients` TEXT[] column:

```sql
-- Table structure
CREATE TABLE products_dev (
  id UUID PRIMARY KEY,
  ingredients TEXT[],  -- Array of ingredients
  metadata JSONB,      -- Additional extraction metadata
  ...
);

-- Example row
{
  "id": "...",
  "ingredients": [
    "Water",
    "Enriched Flour (wheat flour, niacin, reduced iron)",
    "Sugar",
    "Vegetable Oil (soybean and/or palm oil)",
    "Salt"
  ],
  "metadata": {
    "ingredient_count": 5,
    "detection_method": "OCR",
    "confidence": 0.95,
    "raw_ocr_text": "...",
    "extraction_type": "ingredients",
    "notes": "Clear ingredient list found"
  }
}
```

### Why TEXT[] Array?

Using a PostgreSQL array provides several benefits:
- **Efficient Queries**: Search for specific ingredients using `ANY()` or `@>` operators
- **Order Preservation**: Ingredients maintain their order (important for regulations)
- **Type Safety**: Each element is a string, no parsing needed
- **Indexing**: GIN indexes enable fast ingredient searches
- **Native Support**: PostgreSQL arrays are well-supported in Supabase

## Testing Best Practices

### Image Capture Tips
1. **Full List Visible**: Ensure entire ingredient list is in frame
2. **Good Lighting**: Avoid glare and shadows on label
3. **Steady Camera**: Hold parallel to label, avoid blur
4. **No Cutoff**: Don't cut off text at edges
5. **Focus**: Ensure text is sharp and readable

### Validation Checks
1. **Count Check**: Does ingredient count seem reasonable?
2. **Sub-Ingredients**: Are parenthetical components preserved?
3. **Marketing Text**: Is promotional text excluded?
4. **Boundaries**: Does list start/end at correct points?
5. **Formatting**: Are special characters and formatting preserved?

## Common Failure Patterns

### Pattern 1: Marketing Text Included
**Symptom**: Promotional phrases in ingredient list
**Example**: ["Organic!", "Water", "Sugar"]
**Fix**: Strengthen marketing text filtering in prompt

### Pattern 2: Sub-Ingredients Lost
**Symptom**: Parenthetical content missing
**Example**: "Enriched Flour" instead of "Enriched Flour (wheat flour, niacin)"
**Fix**: Emphasize sub-ingredient preservation in prompt

### Pattern 3: Boundary Overrun
**Symptom**: Allergen statements or nutrition facts included
**Example**: ["Water", "Sugar", "Contains: milk, soy"]
**Fix**: Improve boundary detection rules

### Pattern 4: Incomplete List
**Symptom**: Only first few ingredients extracted
**Example**: ["Water", "Flour", "Sugar"] when list has 15 items
**Fix**: Check image quality, ensure full list visible

### Pattern 5: Hallucination
**Symptom**: Ingredients not present in image
**Example**: AI generates plausible but incorrect ingredients
**Fix**: Strengthen "no hallucination" rule, lower confidence

## Improvement Workflow

1. **Test**: Use `/test-ingredients` page to capture samples
2. **Analyze**: Review results in `products_dev` table
3. **Identify Patterns**: Look for common failure modes
4. **Refine Prompt**: Adjust rules to address failures
5. **Validate**: Re-test with same images to verify improvement
6. **Deploy**: Update production extraction logic

## Query Examples

### Find All Products with Ingredients
```sql
SELECT 
  id,
  name,
  ingredients,
  array_length(ingredients, 1) as ingredient_count,
  created_at
FROM products_dev
WHERE ingredients IS NOT NULL
ORDER BY created_at DESC;
```

### Find Products with Specific Ingredient
```sql
SELECT 
  id,
  name,
  ingredients
FROM products_dev
WHERE 'Sugar' = ANY(ingredients)
ORDER BY created_at DESC;
```

### Find Products with Ingredient Containing Text
```sql
SELECT 
  id,
  name,
  ingredients
FROM products_dev
WHERE EXISTS (
  SELECT 1 FROM unnest(ingredients) AS ingredient 
  WHERE ingredient ILIKE '%wheat%'
)
ORDER BY created_at DESC;
```

### Find Extractions with Sub-Ingredients
```sql
SELECT 
  id,
  ingredients,
  metadata->>'confidence' as confidence
FROM products_dev
WHERE ingredients IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM unnest(ingredients) AS ingredient 
    WHERE ingredient LIKE '%(%'
  )
ORDER BY created_at DESC;
```

### Count Ingredients Per Product
```sql
SELECT 
  id,
  name,
  array_length(ingredients, 1) as ingredient_count,
  metadata->>'confidence' as confidence
FROM products_dev
WHERE ingredients IS NOT NULL
ORDER BY ingredient_count DESC;
```

### Find Low Confidence Extractions
```sql
SELECT 
  id,
  ingredients,
  metadata->>'confidence' as confidence,
  metadata->>'notes' as notes
FROM products_dev
WHERE ingredients IS NOT NULL
  AND (metadata->>'confidence')::DECIMAL < 0.7
ORDER BY created_at DESC;
```

### Find Incomplete Lists
```sql
SELECT 
  id,
  ingredients,
  array_length(ingredients, 1) as count
FROM products_dev
WHERE ingredients IS NOT NULL
  AND array_length(ingredients, 1) < 3
ORDER BY created_at DESC;
```

### Average Ingredient Count
```sql
SELECT 
  ROUND(AVG(array_length(ingredients, 1)), 1) as avg_ingredient_count,
  MIN(array_length(ingredients, 1)) as min_count,
  MAX(array_length(ingredients, 1)) as max_count,
  COUNT(*) as total_products
FROM products_dev
WHERE ingredients IS NOT NULL;
```

## Success Metrics

Track these metrics to measure extraction quality:

- **Extraction Success Rate**: % of scans that find ingredients
- **Average Ingredient Count**: Mean number of ingredients per product
- **Sub-Ingredient Preservation Rate**: % with parenthetical content preserved
- **Average Confidence**: Mean confidence score
- **Complete List Rate**: % with ≥3 ingredients

Target goals:
- Extraction Success Rate: >90%
- Average Ingredient Count: 8-12 (typical for packaged foods)
- Sub-Ingredient Preservation Rate: >80%
- Average Confidence: >0.8
- Complete List Rate: >85%

## Related Documentation

- [Extraction Testing Guide](EXTRACTION_TESTING.md) - Overview of all test pages
- [Camera UI Improvements](CAMERA_UI_IMPROVEMENTS.md) - Standardized camera interface
- [Products Dev Migration](PRODUCTS_DEV_MIGRATION.md) - Database schema details
- [Gemini Model Config](GEMINI_MODEL_CONFIG.md) - Model configuration
