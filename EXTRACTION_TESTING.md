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

### 2. Packaging Extraction Test (Coming Soon)
**URL**: `/test-packaging`

**Purpose**: Test product name, brand, size, and category extraction from packaging images.

### 3. Nutrition Label Extraction Test (Coming Soon)
**URL**: `/test-nutrition`

**Purpose**: Test nutrition facts and ingredient list extraction from nutrition labels.

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
  detection_method,
  confidence,
  created_at
FROM products_dev
ORDER BY created_at DESC
LIMIT 20;
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
