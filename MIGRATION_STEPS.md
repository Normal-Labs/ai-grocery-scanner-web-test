# Database Migration Guide

This guide covers applying the multi-tier product identification database schema to Supabase.

## Migration Steps

### Step 1: Run the Complete Migration

In Supabase SQL Editor, run the entire migration file:
```
supabase/migrations/20260225000000_multi_tier_schema.sql
```

This creates:
- products, scan_logs, error_reports tables
- search_products_by_metadata function
- RLS policies with proper type casting
- All necessary indexes

### Step 2: Fix the upsert_product Function

Apply this fix to resolve the ambiguous column reference:

```sql
DROP FUNCTION IF EXISTS upsert_product(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, JSONB);
DROP FUNCTION IF EXISTS upsert_product(VARCHAR(50), VARCHAR(255), VARCHAR(255), VARCHAR(100), VARCHAR(100), TEXT, JSONB);

CREATE OR REPLACE FUNCTION upsert_product(
  p_barcode VARCHAR(50),
  p_name VARCHAR(255),
  p_brand VARCHAR(255),
  p_size VARCHAR(100) DEFAULT NULL,
  p_category VARCHAR(100) DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS SETOF products AS $$
BEGIN
  RETURN QUERY
  INSERT INTO products (barcode, name, brand, size, category, image_url, metadata)
  VALUES (p_barcode, p_name, p_brand, p_size, p_category, p_image_url, p_metadata)
  ON CONFLICT (barcode) 
  DO UPDATE SET
    name = EXCLUDED.name,
    brand = EXCLUDED.brand,
    size = COALESCE(EXCLUDED.size, products.size),
    category = COALESCE(EXCLUDED.category, products.category),
    image_url = COALESCE(EXCLUDED.image_url, products.image_url),
    metadata = COALESCE(EXCLUDED.metadata, products.metadata),
    updated_at = NOW()
  RETURNING *;
END;
$$ LANGUAGE plpgsql;
```

### Step 3: Verify Migration

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('products', 'scan_logs', 'error_reports');

-- Verify functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('search_products_by_metadata', 'upsert_product');
```

## Testing

### 1. Barcode Storage
Scan a product and verify barcode is stored:
```sql
SELECT barcode, name FROM products ORDER BY created_at DESC LIMIT 1;
```

### 2. Duplicate Detection
Scan same product twice and verify only one entry:
```sql
SELECT COUNT(*), barcode FROM products GROUP BY barcode;
```

### 3. Scan Logging
Verify scan logs are created:
```sql
SELECT user_id, tier, success FROM scan_logs ORDER BY created_at DESC LIMIT 5;
```

## Troubleshooting

**"operator does not exist: uuid = character varying"**
- Run the complete migration file (includes ::TEXT casting)

**"column reference 'barcode' is ambiguous"**
- Run the upsert_product fix from Step 2

**"relation already exists"**
- Drop tables first: `DROP TABLE IF EXISTS scan_logs, error_reports, products CASCADE;`

## Success Criteria

- ✅ Products store barcodes correctly
- ✅ Second scan uses Tier 1 (~500ms)
- ✅ No duplicate products created
- ✅ Scan logs written successfully

## Related Documentation

- `FIXES_APPLIED.md` - All fixes explained in detail
- `IMPLEMENTATION_STATUS.md` - Current system status
