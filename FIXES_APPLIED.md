# Multi-Tier System Fixes

This document consolidates all fixes applied to make the multi-tier product identification system fully operational.

## Fix 1: Barcode Storage in Tier 4

**Problem**: Barcodes were logged correctly but stored as NULL in the products table.

**Root Cause**: The `attemptTier4` method wasn't receiving the barcode parameter from scan requests.

**Solution**: Updated `ScanOrchestratorMultiTier.ts`:
```typescript
// Updated method signature
private async attemptTier4(
  image: ImageData,
  imageHash?: string,
  barcode?: string  // Added parameter
)

// Updated method call
const tier4Result = await this.attemptTier4(
  request.image, 
  request.imageHash,
  request.barcode  // Now passing barcode
);

// Updated product creation
const productData: ProductData = {
  barcode: barcode,  // Now includes barcode
  // ... other fields
};
```

**Impact**: Products now store barcodes correctly, enabling Tier 1 cache hits on subsequent scans (~500ms vs ~20s).

## Fix 2: Duplicate Product Detection

**Problem**: Scanning the same product multiple times created duplicate database entries.

**Root Cause**: The `search_products_by_metadata` function had incorrect WHERE clause logic:
```sql
-- BUGGY: When p_brand is provided, "p_brand IS NULL" fails
WHERE p.name ILIKE '%' || p_name || '%'
  AND (p_brand IS NULL OR p.brand ILIKE '%' || COALESCE(p_brand, '') || '%')
```

**Solution**: Fixed the WHERE clause logic:
```sql
-- FIXED: Properly handles NULL and empty parameters
WHERE p.name ILIKE '%' || p_name || '%'
  AND (p_brand IS NULL OR COALESCE(p_brand, '') = '' OR p.brand ILIKE '%' || p_brand || '%')
  AND (p_size IS NULL OR COALESCE(p_size, '') = '' OR p.size ILIKE '%' || p_size || '%')
```

**Impact**: System now finds existing products by metadata, preventing duplicates.

## Fix 3: Scan Logging User ID Type

**Problem**: Scan logging failed with error: `invalid input syntax for type uuid: "user-1772113300889"`

**Root Cause**: The `scan_logs` table defined `user_id` as UUID, but test pages generate string IDs.

**Solution**: Changed `user_id` type from UUID to VARCHAR(100) in:
- `scan_logs` table definition
- `error_reports` table definition  
- `record_scan_log` function parameter

**Impact**: System now accepts both UUID and string-based user IDs.

## Fix 4: RLS Policy Type Mismatch

**Problem**: Migration failed with error: `operator does not exist: uuid = character varying`

**Root Cause**: RLS policies compared `auth.uid()` (UUID) with `user_id` (VARCHAR) without type casting.

**Solution**: Added ::TEXT casting to all RLS policies:
```sql
-- Before
WHERE auth.uid() = user_id

-- After
WHERE auth.uid()::TEXT = user_id
```

**Impact**: RLS policies now work correctly with VARCHAR user IDs.

## Fix 5: upsert_product Ambiguous Column

**Problem**: Function failed with error: `column reference 'barcode' is ambiguous`

**Root Cause**: Using `RETURNS TABLE` with column names that match table columns caused ambiguity.

**Solution**: Changed function to use `RETURNS SETOF products`:
```sql
-- Before
RETURNS TABLE (
  id UUID,
  barcode VARCHAR(50),
  -- ... other columns
)

-- After
RETURNS SETOF products
```

**Impact**: Function now returns product data without ambiguity errors.

## Files Modified

1. **src/lib/orchestrator/ScanOrchestratorMultiTier.ts**
   - Added barcode parameter to attemptTier4
   - Pass barcode from request to attemptTier4
   - Include barcode in productData creation

2. **supabase/migrations/20260225000000_multi_tier_schema.sql**
   - Fixed search_products_by_metadata WHERE clause
   - Changed user_id from UUID to VARCHAR(100)
   - Added ::TEXT casting to RLS policies
   - Changed upsert_product to RETURNS SETOF

## Testing After Fixes

### 1. Barcode Storage
```bash
# Scan a product with barcode
# Check: SELECT barcode FROM products ORDER BY created_at DESC LIMIT 1;
# Expected: Barcode is populated (not NULL)
```

### 2. Duplicate Detection
```bash
# Scan same product twice
# Check: SELECT COUNT(*), barcode FROM products GROUP BY barcode;
# Expected: Only 1 entry per barcode
```

### 3. Scan Logging
```bash
# Perform a scan
# Check: SELECT user_id, tier FROM scan_logs ORDER BY created_at DESC LIMIT 1;
# Expected: Log entry with no errors
```

### 4. Tier 1 Performance
```bash
# Scan product with known barcode
# Expected: Tier 1 success in ~500ms
```

## Expected Behavior

### First Scan (New Product)
```
[Scan Orchestrator] 🔍 Tier 1: Checking cache...
[Scan Orchestrator] ❌ Tier 1: Not found
[Scan Orchestrator] 📝 Tier 2: Extracting text...
[Scan Orchestrator] ❌ Tier 2: No matching products
[Scan Orchestrator] 🔍 Tier 3: Discovering barcode...
[Scan Orchestrator] ❌ Tier 3: API key not configured
[Scan Orchestrator] ⏳ Waiting 10s before Tier 4...
[Scan Orchestrator] 🤖 Tier 4: Analyzing image...
[Product Repository] ✅ Upserted product: <uuid>
[Scan Orchestrator] ✅ Tier 4 success
```

### Second Scan (Same Barcode)
```
[Scan Orchestrator] 🔍 Tier 1: Checking cache...
[Product Repository] ✅ Found product for barcode
[Scan Orchestrator] ✅ Tier 1 success (500ms)
```

## Related Documentation

- `IMPLEMENTATION_STATUS.md` - Current system status
- `MIGRATION_STEPS.md` - Database migration guide
- `.kiro/specs/multi-tier-product-identification/` - Original spec
