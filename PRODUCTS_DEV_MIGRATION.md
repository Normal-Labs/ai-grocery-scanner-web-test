# Products Dev Table Migration

## Overview

The `products_dev` table has been recreated to match the `products` table schema exactly, but without foreign key relationships. This simplifies testing while maintaining consistency with the production schema.

## Changes

### Old Schema (products_dev)
```sql
- barcode TEXT NOT NULL
- detection_method TEXT NOT NULL
- confidence DECIMAL(3, 2)
- raw_ocr_text TEXT
- image_data TEXT
- product_name TEXT
- brand TEXT
- size TEXT
- category TEXT
- packaging_type TEXT
- notes TEXT
```

### New Schema (products_dev)
```sql
- id UUID PRIMARY KEY
- barcode VARCHAR(50)           -- Nullable, not unique (for testing)
- name VARCHAR(255)              -- Product name
- brand VARCHAR(255)             -- Brand name
- size VARCHAR(100)              -- Size/quantity
- category VARCHAR(100)          -- Product category
- image_url TEXT                 -- Image URL (optional)
- metadata JSONB                 -- Flexible metadata storage
- flagged_for_review BOOLEAN     -- Review flag
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### Metadata Field Structure

The `metadata` JSONB field stores extraction-specific information:

```json
{
  "detection_method": "BarcodeDetector" | "OCR" | "Failed",
  "confidence": 0.0-1.0,
  "raw_ocr_text": "...",
  "image_preview": "...",
  "extraction_type": "barcode" | "packaging" | "ingredients" | "nutrition",
  "packaging_type": "bottle" | "can" | "box" | "bag" | "jar" | "carton",
  // ... any other custom fields
}
```

## Running the Migration

### Option 1: Using Supabase CLI (Recommended)

```bash
# Apply the migration
npx supabase db push

# Or if you have supabase CLI installed globally
supabase db push
```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/20260305000001_recreate_products_dev_table.sql`
4. Paste and run the SQL

### Option 3: Manual SQL Execution

Connect to your database and run:

```bash
psql -h <your-db-host> -U postgres -d postgres -f supabase/migrations/20260305000001_recreate_products_dev_table.sql
```

## Benefits

1. **Schema Consistency**: Matches production `products` table structure
2. **No Relationships**: No foreign keys, making testing easier
3. **Flexible Metadata**: JSONB field allows storing any extraction-specific data
4. **Future-Proof**: Easy to add new extraction types without schema changes
5. **Clean Testing**: Can test all extraction types in one table

## API Updates

Both test API endpoints have been updated:

### Barcode Extraction API
- Stores barcode in `barcode` field
- Stores detection method, confidence, and raw OCR text in `metadata`

### Packaging Extraction API
- Stores product name in `name` field
- Stores brand, size, category in respective fields
- Stores packaging type, confidence, and raw OCR text in `metadata`

## Querying Examples

### Find all barcode extractions
```sql
SELECT * FROM products_dev 
WHERE barcode IS NOT NULL 
ORDER BY created_at DESC;
```

### Find all packaging extractions
```sql
SELECT * FROM products_dev 
WHERE name IS NOT NULL 
ORDER BY created_at DESC;
```

### Find extractions by method
```sql
SELECT * FROM products_dev 
WHERE metadata->>'detection_method' = 'BarcodeDetector'
ORDER BY created_at DESC;
```

### Find low confidence extractions
```sql
SELECT * FROM products_dev 
WHERE (metadata->>'confidence')::DECIMAL < 0.7
ORDER BY created_at DESC;
```

### View extraction metadata
```sql
SELECT 
  id,
  barcode,
  name,
  brand,
  metadata->>'detection_method' as method,
  metadata->>'confidence' as confidence,
  metadata->>'extraction_type' as type,
  created_at
FROM products_dev
ORDER BY created_at DESC
LIMIT 10;
```

## Rollback

If you need to rollback to the old schema:

```sql
-- This will restore the old products_dev table structure
-- WARNING: This will delete all data in products_dev

DROP TABLE IF EXISTS products_dev CASCADE;

-- Then run the old migration:
-- supabase/migrations/20260305000000_create_products_dev_table.sql
```

## Next Steps

After running the migration:

1. Test the barcode extraction page: `/test-barcode`
2. Test the packaging extraction page: `/test-packaging`
3. Verify data is being saved correctly in Supabase dashboard
4. Check metadata field contains expected extraction details

## Notes

- The `barcode` field is NOT unique in `products_dev` (unlike `products` table)
- This allows testing the same barcode multiple times
- The `name` field is nullable (unlike `products` table where it's required)
- This allows testing barcode-only extractions
