# Apply Product Search Fix Migration

## Quick Guide

The product search fix migration needs to be applied to your Supabase database to prevent duplicate products.

### Option 1: Supabase Dashboard (Recommended)

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the entire contents of `supabase/migrations/20260227000000_fix_product_search.sql`
6. Paste into the SQL Editor
7. Click **Run** or press `Cmd/Ctrl + Enter`

### Option 2: Supabase CLI (If installed and linked)

```bash
supabase db push
```

### What This Migration Does

- **Improves product matching logic** to prevent duplicate products
- **Adds bidirectional name matching** (product name contains search OR search contains product name)
- **Better handles NULL values** for brand and size
- **More accurate similarity scoring** (0-1.0 scale with weighted components)
- **Prevents false matches** while catching true duplicates

### Expected Result

After applying this migration:
- ✅ Scanning the same product multiple times will reuse existing product data
- ✅ Dimension analysis will be reused (saving API costs)
- ✅ Database won't fill up with duplicate products
- ✅ Minimum 60% similarity required for product matching

### Verification

After applying, test by:
1. Scanning a product image (without barcode)
2. Wait for Tier 4 analysis to complete
3. Scan the same product again
4. Check logs - should see "Matched to existing product" with similarity score

### Troubleshooting

If you see errors:
- Make sure you're connected to the correct Supabase project
- Verify you have admin/owner permissions
- Check that the `products` table exists
- The function will be created/replaced automatically

### Migration File Location

`supabase/migrations/20260227000000_fix_product_search.sql`
