-- Add ingredients column to products and products_dev tables
-- This migration adds a TEXT array column to store ingredient lists
-- Date: 2026-03-05

-- ============================================================================
-- ADD INGREDIENTS COLUMN TO PRODUCTS TABLE
-- ============================================================================

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS ingredients TEXT[];

-- Create GIN index for efficient array searches
CREATE INDEX IF NOT EXISTS idx_products_ingredients 
ON products USING GIN (ingredients);

-- Add comment
COMMENT ON COLUMN products.ingredients IS 'Array of ingredients in order, with sub-ingredients preserved in parentheses';

-- ============================================================================
-- ADD INGREDIENTS COLUMN TO PRODUCTS_DEV TABLE
-- ============================================================================

ALTER TABLE products_dev 
ADD COLUMN IF NOT EXISTS ingredients TEXT[];

-- Create GIN index for efficient array searches
CREATE INDEX IF NOT EXISTS idx_products_dev_ingredients 
ON products_dev USING GIN (ingredients);

-- Add comment
COMMENT ON COLUMN products_dev.ingredients IS 'Array of ingredients in order, with sub-ingredients preserved in parentheses';

-- ============================================================================
-- EXAMPLE QUERIES
-- ============================================================================

-- Find products with specific ingredient
-- SELECT * FROM products WHERE 'Sugar' = ANY(ingredients);

-- Find products with ingredient containing text
-- SELECT * FROM products WHERE EXISTS (
--   SELECT 1 FROM unnest(ingredients) AS ingredient 
--   WHERE ingredient ILIKE '%wheat%'
-- );

-- Count ingredients per product
-- SELECT name, array_length(ingredients, 1) as ingredient_count 
-- FROM products 
-- WHERE ingredients IS NOT NULL 
-- ORDER BY ingredient_count DESC;

-- Find products with sub-ingredients (containing parentheses)
-- SELECT name, ingredients 
-- FROM products 
-- WHERE EXISTS (
--   SELECT 1 FROM unnest(ingredients) AS ingredient 
--   WHERE ingredient LIKE '%(%'
-- );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
