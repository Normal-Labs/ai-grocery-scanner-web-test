# Nutrition Facts Extraction Guide

## Overview

This guide documents the specialized prompt strategy for extracting nutrition facts from Nutrition Facts labels using Gemini Vision OCR.

## Test Page

**URL**: `/test-nutrition`

Access the isolated test page to validate and improve nutrition facts extraction.

## Extraction Challenges

### Common Issues
1. **Marketing Contamination**: Promotional callouts mixed with nutrition data
2. **Table Boundary Detection**: Unclear what's inside vs outside the official table
3. **Unit Inconsistency**: Missing or incorrect units (g, mg, mcg)
4. **Daily Value Confusion**: %DV not always present or correctly extracted
5. **Serving Size Ambiguity**: Multiple formats and units

### Examples of Problems

**Marketing Text Outside Table**:
- "Excellent source of Calcium!" (in colorful bubble)
- "Zero Sugar!" (large promotional text)
- "Low Fat" (banner across package)
- "Now with Vitamin D!" (callout)

**Unit Issues**:
- Missing units: "8" instead of "8g"
- Wrong units: "100g" instead of "100mg"
- Inconsistent formatting: "2.5mcg" vs "2.5 mcg"

**Daily Value Problems**:
- Missing %DV when it should be present
- Extracting %DV but missing absolute value
- Confusing %DV with absolute value

## Prompt Strategy

### Core Rules

#### 1. Table Integrity
```
RULE: Only extract from official Nutrition Facts table
- Look for bordered table with "Nutrition Facts" header
- Ignore all text outside the table boundaries
- Table typically has black border and structured rows
```

#### 2. Discard Marketing Claims
```
RULE: Ignore promotional callouts
- "Excellent source of Calcium"
- "Zero Sugar!"
- "Low Fat"
- "Now with Vitamin D!"
- Any colorful bubbles or large promotional text
```

#### 3. Unit Mapping
```
RULE: Always include units
- Calories: typically no unit (or kcal)
- Fat, Carbs, Protein, Fiber, Sugars: g (grams)
- Cholesterol, Sodium, Potassium: mg (milligrams)
- Vitamin D, B12: mcg (micrograms)
- Calcium, Iron: mg (milligrams)
```

#### 4. Daily Value (%DV)
```
RULE: Extract %DV when present
- Usually on right side of table
- Format: "10%" or "10% DV"
- Not all nutrients have %DV (trans fat, total sugars)
- Prioritize absolute value over %DV
```

#### 5. Serving Size Logic
```
RULE: Always capture serving information
- Serving Size: "1 cup (240ml)", "2 pieces (50g)", etc.
- Servings Per Container: number (e.g., 8, 12, "about 2")
- Critical for scaling nutrition data
```

## Data Structure

### JSONB Schema

```json
{
  "serving_size": "string with units",
  "servings_per_container": number,
  "calories_per_serving": number,
  "macros": {
    "total_fat": {
      "value": number,
      "unit": "g",
      "dv_percent": number | null
    },
    "saturated_fat": {
      "value": number,
      "unit": "g",
      "dv_percent": number | null
    },
    "trans_fat": {
      "value": number,
      "unit": "g"
    },
    "cholesterol": {
      "value": number,
      "unit": "mg",
      "dv_percent": number | null
    },
    "sodium": {
      "value": number,
      "unit": "mg",
      "dv_percent": number | null
    },
    "total_carbohydrate": {
      "value": number,
      "unit": "g",
      "dv_percent": number | null
    },
    "dietary_fiber": {
      "value": number,
      "unit": "g",
      "dv_percent": number | null
    },
    "total_sugars": {
      "value": number,
      "unit": "g"
    },
    "added_sugars": {
      "value": number,
      "unit": "g",
      "dv_percent": number | null
    },
    "protein": {
      "value": number,
      "unit": "g",
      "dv_percent": number | null
    }
  },
  "vitamins_minerals": {
    "vitamin_d": {
      "value": number,
      "unit": "mcg",
      "dv_percent": number | null
    },
    "calcium": {
      "value": number,
      "unit": "mg",
      "dv_percent": number | null
    },
    "iron": {
      "value": number,
      "unit": "mg",
      "dv_percent": number | null
    },
    "potassium": {
      "value": number,
      "unit": "mg",
      "dv_percent": number | null
    }
  },
  "confidence": 0.0-1.0,
  "notes": "extraction notes"
}
```

### Why JSONB?

- **Structured Data**: Each nutrient has value, unit, and %DV
- **Flexible Schema**: Easy to add new nutrients
- **Efficient Queries**: Can query by specific nutrients
- **Type Safety**: Enforces structure while allowing flexibility
- **Indexing**: GIN indexes enable fast searches

## Example Outputs

### Complete Extraction
```json
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
```

### Partial Extraction (Missing Vitamins)
```json
{
  "serving_size": "2 pieces (50g)",
  "servings_per_container": 12,
  "calories_per_serving": 200,
  "macros": {
    "total_fat": {"value": 10, "unit": "g", "dv_percent": 13},
    "saturated_fat": {"value": 2, "unit": "g", "dv_percent": 10},
    "trans_fat": {"value": 0, "unit": "g"},
    "cholesterol": {"value": 5, "unit": "mg", "dv_percent": 2},
    "sodium": {"value": 150, "unit": "mg", "dv_percent": 7},
    "total_carbohydrate": {"value": 25, "unit": "g", "dv_percent": 9},
    "dietary_fiber": {"value": 2, "unit": "g", "dv_percent": 7},
    "total_sugars": {"value": 8, "unit": "g"},
    "added_sugars": {"value": 6, "unit": "g", "dv_percent": 12},
    "protein": {"value": 3, "unit": "g", "dv_percent": 6}
  },
  "vitamins_minerals": {},
  "confidence": 0.85,
  "notes": "Macros complete, vitamins section not visible"
}
```

## Database Storage

Nutrition facts are stored in the `nutrition_facts` JSONB column:

```sql
-- Table structure
CREATE TABLE products_dev (
  id UUID PRIMARY KEY,
  nutrition_facts JSONB,  -- Structured nutrition data
  metadata JSONB,          -- Extraction metadata
  ...
);

-- GIN index for efficient queries
CREATE INDEX idx_products_dev_nutrition_facts 
ON products_dev USING GIN (nutrition_facts);
```

## Query Examples

### Find High Protein Products
```sql
SELECT 
  id,
  name,
  nutrition_facts->'macros'->'protein'->>'value' as protein_g,
  nutrition_facts->>'serving_size' as serving_size
FROM products_dev
WHERE (nutrition_facts->'macros'->'protein'->>'value')::NUMERIC > 10
ORDER BY (nutrition_facts->'macros'->'protein'->>'value')::NUMERIC DESC;
```

### Find Low Sodium Products
```sql
SELECT 
  id,
  name,
  nutrition_facts->'macros'->'sodium'->>'value' as sodium_mg,
  nutrition_facts->'macros'->'sodium'->>'dv_percent' as sodium_dv
FROM products_dev
WHERE (nutrition_facts->'macros'->'sodium'->>'value')::NUMERIC < 100
ORDER BY (nutrition_facts->'macros'->'sodium'->>'value')::NUMERIC ASC;
```

### Find Products with Added Sugars
```sql
SELECT 
  id,
  name,
  nutrition_facts->'macros'->'added_sugars'->>'value' as added_sugars_g,
  nutrition_facts->'macros'->'added_sugars'->>'dv_percent' as dv_percent
FROM products_dev
WHERE (nutrition_facts->'macros'->'added_sugars'->>'value')::NUMERIC > 0
ORDER BY (nutrition_facts->'macros'->'added_sugars'->>'value')::NUMERIC DESC;
```

### Find Products with High Fiber
```sql
SELECT 
  id,
  name,
  nutrition_facts->'macros'->'dietary_fiber'->>'value' as fiber_g,
  nutrition_facts->'macros'->'dietary_fiber'->>'dv_percent' as fiber_dv
FROM products_dev
WHERE (nutrition_facts->'macros'->'dietary_fiber'->>'value')::NUMERIC >= 3
ORDER BY (nutrition_facts->'macros'->'dietary_fiber'->>'value')::NUMERIC DESC;
```

### Calculate Macronutrient Ratios
```sql
SELECT 
  id,
  name,
  nutrition_facts->>'calories_per_serving' as calories,
  ROUND(
    (nutrition_facts->'macros'->'protein'->>'value')::NUMERIC * 4 * 100.0 / 
    NULLIF((nutrition_facts->>'calories_per_serving')::NUMERIC, 0),
    1
  ) as protein_percent,
  ROUND(
    (nutrition_facts->'macros'->'total_carbohydrate'->>'value')::NUMERIC * 4 * 100.0 / 
    NULLIF((nutrition_facts->>'calories_per_serving')::NUMERIC, 0),
    1
  ) as carb_percent,
  ROUND(
    (nutrition_facts->'macros'->'total_fat'->>'value')::NUMERIC * 9 * 100.0 / 
    NULLIF((nutrition_facts->>'calories_per_serving')::NUMERIC, 0),
    1
  ) as fat_percent
FROM products_dev
WHERE nutrition_facts IS NOT NULL
  AND (nutrition_facts->>'calories_per_serving')::NUMERIC > 0;
```

### Find Products with Vitamin D
```sql
SELECT 
  id,
  name,
  nutrition_facts->'vitamins_minerals'->'vitamin_d'->>'value' as vitamin_d_mcg,
  nutrition_facts->'vitamins_minerals'->'vitamin_d'->>'dv_percent' as vitamin_d_dv
FROM products_dev
WHERE nutrition_facts->'vitamins_minerals'->'vitamin_d' IS NOT NULL
  AND (nutrition_facts->'vitamins_minerals'->'vitamin_d'->>'value')::NUMERIC > 0
ORDER BY (nutrition_facts->'vitamins_minerals'->'vitamin_d'->>'value')::NUMERIC DESC;
```

### Validate Calorie Calculation
```sql
-- Calories should equal (protein * 4) + (carbs * 4) + (fat * 9)
SELECT 
  id,
  name,
  nutrition_facts->>'calories_per_serving' as stated_calories,
  (
    (nutrition_facts->'macros'->'protein'->>'value')::NUMERIC * 4 +
    (nutrition_facts->'macros'->'total_carbohydrate'->>'value')::NUMERIC * 4 +
    (nutrition_facts->'macros'->'total_fat'->>'value')::NUMERIC * 9
  ) as calculated_calories,
  ABS(
    (nutrition_facts->>'calories_per_serving')::NUMERIC -
    (
      (nutrition_facts->'macros'->'protein'->>'value')::NUMERIC * 4 +
      (nutrition_facts->'macros'->'total_carbohydrate'->>'value')::NUMERIC * 4 +
      (nutrition_facts->'macros'->'total_fat'->>'value')::NUMERIC * 9
    )
  ) as calorie_difference
FROM products_dev
WHERE nutrition_facts IS NOT NULL
ORDER BY calorie_difference DESC;
```

## Quality Indicators

### Confidence Score
- ✓ **High**: ≥0.7 (reliable extraction)
- ⚠ **Medium**: 0.4-0.7 (verify accuracy)
- ❌ **Low**: <0.4 (likely unreliable)

### Completeness Checks
- ✓ Serving size captured
- ✓ All macronutrients present
- ✓ Units included for all values
- ✓ %DV present where applicable

### Validation Rules
- Calories should roughly equal (protein×4 + carbs×4 + fat×9)
- Saturated fat + trans fat ≤ total fat
- Added sugars ≤ total sugars
- All values should be ≥ 0

## Testing Best Practices

### Image Capture Tips
1. **Full Table Visible**: Capture entire Nutrition Facts table
2. **Good Lighting**: Avoid glare on label
3. **Straight Angle**: Hold camera parallel to label
4. **Focus**: Ensure all text is sharp
5. **No Cutoff**: Don't cut off any rows

### Common Failure Patterns

#### Pattern 1: Marketing Text Included
**Symptom**: Promotional text in extracted data
**Fix**: Strengthen table boundary detection

#### Pattern 2: Missing Units
**Symptom**: Values without units (e.g., "8" instead of "8g")
**Fix**: Emphasize unit requirement in prompt

#### Pattern 3: Incorrect %DV
**Symptom**: %DV values don't match absolute values
**Fix**: Validate %DV against absolute values

#### Pattern 4: Incomplete Macros
**Symptom**: Some macronutrients missing
**Fix**: Check image quality, ensure full table visible

## Success Metrics

Track these metrics to measure extraction quality:

- **Extraction Success Rate**: % of scans that extract complete nutrition facts
- **Average Confidence**: Mean confidence score
- **Completeness Rate**: % with all required macronutrients
- **Unit Accuracy**: % with correct units for all nutrients
- **%DV Accuracy**: % with correct daily value percentages

Target goals:
- Extraction Success Rate: >85%
- Average Confidence: >0.8
- Completeness Rate: >90%
- Unit Accuracy: >95%
- %DV Accuracy: >80%

## Related Documentation

- [Extraction Testing Guide](EXTRACTION_TESTING.md) - Overview of all test pages
- [Products Dev Migration](PRODUCTS_DEV_MIGRATION.md) - Database schema details
- [Camera UI Improvements](CAMERA_UI_IMPROVEMENTS.md) - Standardized camera interface
- [Ingredients Extraction Guide](INGREDIENTS_EXTRACTION_GUIDE.md) - Ingredients extraction
