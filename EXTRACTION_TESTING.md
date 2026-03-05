# Image Extraction Testing Pages

## Overview

Isolated testing pages for debugging and improving image extraction functionality. Each page focuses on a single extraction type and saves results to `products_dev` table for analysis.

## Test Pages

### 1. Barcode Extraction Test
**URL**: `/test-barcode`

**Purpose**: Test barcode detection using both BarcodeDetector API and OCR fallback.

**Features**:
- Tests browser BarcodeDetector API
- Falls back to Gemini Vision OCR if BarcodeDetector fails
- Shows which method was used (BarcodeDetector vs OCR)
- Displays confidence scores
- Shows processing time and image size
- Saves results to `products_dev` table
- Shows raw OCR text for debugging

**How to Use**:
1. Navigate to `/test-barcode`
2. Click "Scan Barcode"
3. Point camera at product barcode
4. Wait for detection or capture manually
5. Review results showing:
   - Detected barcode number
   - Detection method used
   - Confidence score
   - Processing metrics
   - Raw OCR text (if applicable)

**Database Schema**:
```sql
CREATE TABLE products_dev (
  id UUID PRIMARY KEY,
  barcode TEXT NOT NULL,
  detection_method TEXT NOT NULL, -- 'BarcodeDetector' | 'OCR' | 'Failed'
  confidence DECIMAL(3, 2),
  raw_ocr_text TEXT,
  image_data TEXT,
  created_at TIMESTAMPTZ,
  -- Future fields for other extraction types
  product_name TEXT,
  brand TEXT,
  size TEXT,
  category TEXT,
  notes TEXT
);
```

### 2. Packaging Extraction Test
**URL**: `/test-packaging`

**Purpose**: Test product packaging information extraction using Gemini Vision OCR.

**Features**:
- Extracts product name from packaging
- Extracts brand name
- Extracts size/quantity information
- Infers product category
- Identifies packaging type (bottle, can, box, bag, jar, carton)
- Shows confidence scores
- Shows processing time and image size
- Saves results to `products_dev` table
- Shows raw OCR text for debugging

**How to Use**:
1. Navigate to `/test-packaging`
2. Click "Capture Packaging"
3. Point camera at product front label
4. Ensure product name and brand are clearly visible
5. Capture the image
6. Review results showing:
   - Product name
   - Brand name
   - Size/quantity
   - Category
   - Packaging type
   - Confidence score
   - Processing metrics
   - Raw extracted text

**Extracted Fields**:
- **Product Name**: Main product title (e.g., "Organic Whole Milk")
- **Brand**: Manufacturer or company name (e.g., "Horizon")
- **Size**: Quantity or volume (e.g., "64 fl oz", "1.89 L", "6 pack")
- **Category**: Inferred category (e.g., Beverages, Snacks, Dairy)
- **Packaging Type**: Container type (e.g., bottle, can, box, bag, jar, carton)

### 3. Ingredients Extraction Test
**URL**: `/test-ingredients`

**Purpose**: Test ingredient list extraction with sub-ingredient preservation using Gemini Vision OCR.

**Features**:
- Extracts complete ingredient list from product labels
- Preserves sub-ingredients in parentheses (e.g., "Enriched Flour (wheat flour, niacin)")
- Ignores marketing text and promotional phrases
- Detects ingredient list boundaries automatically
- Shows ingredient count and quality indicators
- Displays confidence scores
- Shows processing time and image size
- Saves results to `products_dev` table
- Shows raw OCR text for debugging

**How to Use**:
1. Navigate to `/test-ingredients`
2. Click "Scan Ingredients"
3. Point camera at ingredient list on product label
4. Ensure "Ingredients" heading and full list are visible
5. Capture the image
6. Review results showing:
   - Complete ingredient list (numbered)
   - Total ingredient count
   - Sub-ingredient preservation status
   - Confidence score
   - Processing metrics
   - Quality checks

**Extraction Rules**:
- **Ignore Marketing**: Discards promotional phrases like "Now with less salt!", "Organic!", "Family Size"
- **Boundary Detection**: Starts at "Ingredients" heading, stops at end of list
- **Preserve Sub-Ingredients**: Maintains parentheses and nested components
- **No Hallucination**: Returns empty if no clear ingredient list found
- **Formatting**: Preserves capitalization, percentages, and "and/or" statements

**Quality Indicators**:
- ✓ Ingredient count ≥3 (Good) / ⚠ <3 (May be incomplete)
- ✓ Confidence ≥0.7 (High) / ⚠ <0.7 (Medium - verify accuracy)
- ✓ Sub-ingredients preserved / ○ None detected

### 4. Nutrition Facts Extraction Test
**URL**: `/test-nutrition`

**Purpose**: Test nutrition facts extraction with units and daily values using Gemini Vision OCR.

**Features**:
- Extracts complete nutrition facts from Nutrition Facts table
- Captures serving size and servings per container
- Extracts all macronutrients with values, units, and %DV
- Extracts vitamins and minerals if present
- Ignores marketing claims outside the table
- Shows confidence scores and quality indicators
- Displays processing time and image size
- Saves results to `products_dev` table in structured JSONB format
- Shows raw OCR text for debugging

**How to Use**:
1. Navigate to `/test-nutrition`
2. Click "Scan Nutrition Facts"
3. Point camera at Nutrition Facts table on product
4. Ensure entire table is visible (header to bottom)
5. Capture the image
6. Review results showing:
   - Serving information (size, servings per container, calories)
   - Complete macronutrient breakdown
   - Vitamins and minerals (if present)
   - Confidence score and quality checks
   - Processing metrics

**Extraction Rules**:
- **Table Integrity**: Only extract from official Nutrition Facts table
- **Discard Marketing**: Ignore promotional callouts outside table
- **Unit Mapping**: Always include units (g, mg, mcg, kcal)
- **Daily Value**: Extract %DV when present
- **Serving Size**: Always capture serving size and servings per container
- **Required Fields**: All standard macronutrients must be present

**Data Structure**:
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
  }
}
```

**Quality Indicators**:
- ✓ Confidence ≥0.7 (High) / ⚠ <0.7 (Medium - verify accuracy)
- ✓ Serving size captured / ✗ Missing
- ✓ Macronutrients complete / ✗ Incomplete

### 5. Complete Extraction Test
**URL**: `/test-all`

**Purpose**: Test all extraction types sequentially from a single image.

**Features**:
- Orchestrates all 4 extraction types in sequence
- Single image capture for complete product profile
- Rate limiting delays (2s between steps) to avoid 429 errors
- Shows progress for each extraction step
- Continues even if one step fails
- Saves complete product to `products_dev` table
- Scrollable results view with detailed breakdown
- Shows status, confidence, and processing time per step

**How to Use**:
1. Navigate to `/test-all`
2. Click "Start Complete Scan"
3. Capture ONE image showing product (barcode, packaging, ingredients, nutrition)
4. Wait for all extractions to complete (~10-15 seconds)
5. Review results for each step:
   - Barcode detection
   - Packaging information
   - Ingredients list
   - Nutrition facts

**Extraction Sequence**:
1. **Initial Delay** (1s)
2. **Barcode Detection** (5s delay)
3. **Packaging Information** (5s delay)
4. **Ingredients List** (5s delay)
5. **Nutrition Facts**

**Results Display**:
- Summary banner with overall metrics
- Step status overview (success/failed/processing)
- Detailed scrollable results for each extraction
- Failed steps section with error messages
- Complete product saved to database

**Benefits**:
- Test complete extraction pipeline
- Validate all extraction types at once
- Identify which extractions work best
- Realistic end-to-end testing
- Rate limiting prevents API errors

## Analyzing Results

### Query Barcode Detection Success Rate
```sql
SELECT 
  detection_method,
  COUNT(*) as total,
  ROUND(AVG(confidence), 2) as avg_confidence
FROM products_dev
WHERE barcode IS NOT NULL
GROUP BY detection_method
ORDER BY total DESC;
```

### Query Packaging Extraction Success Rate
```sql
SELECT 
  COUNT(*) as total_extractions,
  COUNT(product_name) as has_product_name,
  COUNT(brand) as has_brand,
  COUNT(size) as has_size,
  COUNT(category) as has_category,
  COUNT(packaging_type) as has_packaging_type,
  ROUND(AVG(confidence), 2) as avg_confidence
FROM products_dev
WHERE product_name IS NOT NULL OR brand IS NOT NULL;
```

### Query Ingredients Extraction Success Rate
```sql
SELECT 
  COUNT(*) as total_extractions,
  ROUND(AVG(array_length(ingredients, 1)), 1) as avg_ingredient_count,
  ROUND(AVG((metadata->>'confidence')::DECIMAL), 2) as avg_confidence,
  COUNT(*) FILTER (WHERE array_length(ingredients, 1) >= 3) as complete_lists,
  COUNT(*) FILTER (WHERE array_length(ingredients, 1) < 3) as incomplete_lists
FROM products_dev
WHERE ingredients IS NOT NULL;
```

### View Ingredients with Sub-Components
```sql
SELECT 
  id,
  ingredients,
  array_length(ingredients, 1) as count,
  metadata->>'confidence' as confidence,
  created_at
FROM products_dev
WHERE ingredients IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM unnest(ingredients) AS ingredient 
    WHERE ingredient LIKE '%(%'
  )
ORDER BY created_at DESC
LIMIT 10;
```

### Query Nutrition Facts Extraction Success Rate
```sql
SELECT 
  COUNT(*) as total_extractions,
  ROUND(AVG((metadata->>'confidence')::DECIMAL), 2) as avg_confidence,
  COUNT(*) FILTER (WHERE nutrition_facts->>'serving_size' IS NOT NULL) as has_serving_size,
  COUNT(*) FILTER (WHERE nutrition_facts->'macros' IS NOT NULL) as has_macros,
  COUNT(*) FILTER (WHERE nutrition_facts->'vitamins_minerals' IS NOT NULL) as has_vitamins
FROM products_dev
WHERE nutrition_facts IS NOT NULL;
```

### Find High Protein Products
```sql
SELECT 
  id,
  name,
  nutrition_facts->>'serving_size' as serving_size,
  nutrition_facts->'macros'->'protein'->>'value' as protein_g,
  created_at
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
  nutrition_facts->'macros'->'sodium'->>'dv_percent' as sodium_dv,
  created_at
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
  nutrition_facts->'macros'->'added_sugars'->>'dv_percent' as added_sugars_dv,
  created_at
FROM products_dev
WHERE (nutrition_facts->'macros'->'added_sugars'->>'value')::NUMERIC > 0
ORDER BY (nutrition_facts->'macros'->'added_sugars'->>'value')::NUMERIC DESC;
```

### Find Incomplete Packaging Extractions
```sql
SELECT 
  id,
  product_name,
  brand,
  size,
  category,
  packaging_type,
  confidence,
  created_at
FROM products_dev
WHERE (product_name IS NULL OR brand IS NULL)
  AND raw_ocr_text IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

### Find Failed Extractions
```sql
SELECT 
  id,
  detection_method,
  raw_ocr_text,
  created_at
FROM products_dev
WHERE detection_method = 'Failed'
ORDER BY created_at DESC
LIMIT 10;
```

### Compare BarcodeDetector vs OCR
```sql
SELECT 
  detection_method,
  COUNT(*) as count,
  AVG(confidence) as avg_confidence,
  MIN(confidence) as min_confidence,
  MAX(confidence) as max_confidence
FROM products_dev
WHERE barcode IS NOT NULL
GROUP BY detection_method;
```

### View Recent Tests
```sql
SELECT 
  barcode,
  product_name,
  brand,
  size,
  category,
  detection_method,
  confidence,
  created_at
FROM products_dev
ORDER BY created_at DESC
LIMIT 20;
```

### Compare Extraction Quality by Field
```sql
SELECT 
  'Product Name' as field,
  COUNT(*) FILTER (WHERE product_name IS NOT NULL) as extracted,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE product_name IS NOT NULL) / COUNT(*), 1) as success_rate
FROM products_dev
WHERE raw_ocr_text IS NOT NULL

UNION ALL

SELECT 
  'Brand' as field,
  COUNT(*) FILTER (WHERE brand IS NOT NULL) as extracted,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE brand IS NOT NULL) / COUNT(*), 1) as success_rate
FROM products_dev
WHERE raw_ocr_text IS NOT NULL

UNION ALL

SELECT 
  'Size' as field,
  COUNT(*) FILTER (WHERE size IS NOT NULL) as extracted,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE size IS NOT NULL) / COUNT(*), 1) as success_rate
FROM products_dev
WHERE raw_ocr_text IS NOT NULL

ORDER BY success_rate DESC;
```

## Benefits of This Approach

1. **Isolation**: Test each extraction type independently without affecting main workflow
2. **Debugging**: See raw OCR responses and intermediate data
3. **Metrics**: Track success rates, confidence scores, and processing times
4. **Comparison**: Compare different extraction methods (BarcodeDetector vs OCR)
5. **Data Collection**: Build dataset of successful/failed extractions for improvement
6. **Iteration**: Quickly test and refine extraction logic without breaking production

## Next Steps

### Immediate
1. Run migration to create `products_dev` table:
   ```bash
   # Apply migration in Supabase dashboard or via CLI
   ```

2. Test barcode extraction:
   - Navigate to `/test-barcode`
   - Test with various barcodes
   - Review results in `products_dev` table

3. Analyze results:
   - Check success rate
   - Compare BarcodeDetector vs OCR
   - Identify patterns in failures

### Future Test Pages

**Packaging Extraction** (`/test-packaging`):
- Extract product name, brand, size, category
- Test visual extractor accuracy
- Compare different prompt strategies
- Save results with confidence scores

**Nutrition Label Extraction** (`/test-nutrition`):
- Extract nutrition facts (calories, macros, etc.)
- Extract ingredient list
- Detect allergens and additives
- Test with various label formats
- Save results with field-level confidence

## Troubleshooting

### Model Not Found Error (404)
- **Error**: `models/gemini-1.5-flash is not found`
- **Solution**: All services now use `gemini-2.0-flash` by default
- **Config**: See `src/lib/config/gemini.ts` to change model
- **Docs**: See `GEMINI_MODEL_CONFIG.md` for details

### BarcodeDetector Not Working
- Check browser support (Chrome/Edge recommended)
- Ensure HTTPS connection (required for camera access)
- Check camera permissions

### OCR Extraction Failing
- Verify `GOOGLE_GENERATIVE_AI_API_KEY` is set
- Check Gemini API quota/limits
- Review raw OCR text for clues

### Database Save Failing
- Verify `products_dev` table exists
- Check Supabase connection
- Review API logs for errors

## Migration Instructions

1. **Create products_dev table**:
   ```bash
   # In Supabase dashboard: SQL Editor
   # Run: supabase/migrations/20260305000000_create_products_dev_table.sql
   ```

2. **Verify table creation**:
   ```sql
   SELECT * FROM products_dev LIMIT 1;
   ```

3. **Test the page**:
   - Navigate to `/test-barcode`
   - Scan a barcode
   - Check if data appears in table

## Success Metrics

Track these metrics to measure improvement:

- **Detection Success Rate**: % of scans that successfully extract barcode
- **BarcodeDetector Success Rate**: % using browser API vs OCR fallback
- **Average Confidence**: Mean confidence score across all extractions
- **Processing Time**: Average time to extract barcode
- **Error Rate**: % of scans that fail completely

Target goals:
- Detection Success Rate: >95%
- BarcodeDetector Success Rate: >80% (prefer browser API)
- Average Confidence: >0.9
- Processing Time: <2 seconds
- Error Rate: <5%
