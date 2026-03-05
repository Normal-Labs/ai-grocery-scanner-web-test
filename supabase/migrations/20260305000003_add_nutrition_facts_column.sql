-- Add nutrition_facts column to products and products_dev tables
-- This migration adds a JSONB column to store structured nutrition facts data
-- Date: 2026-03-05

-- ============================================================================
-- ADD NUTRITION_FACTS COLUMN TO PRODUCTS TABLE
-- ============================================================================

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS nutrition_facts JSONB;

-- Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_products_nutrition_facts 
ON products USING GIN (nutrition_facts);

-- Add comment
COMMENT ON COLUMN products.nutrition_facts IS 'Structured nutrition facts data including serving size, macros, and micronutrients with units and daily values';

-- ============================================================================
-- ADD NUTRITION_FACTS COLUMN TO PRODUCTS_DEV TABLE
-- ============================================================================

ALTER TABLE products_dev 
ADD COLUMN IF NOT EXISTS nutrition_facts JSONB;

-- Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_products_dev_nutrition_facts 
ON products_dev USING GIN (nutrition_facts);

-- Add comment
COMMENT ON COLUMN products_dev.nutrition_facts IS 'Structured nutrition facts data including serving size, macros, and micronutrients with units and daily values';

-- ============================================================================
-- EXAMPLE STRUCTURE
-- ============================================================================

-- Example nutrition_facts JSONB structure:
-- {
--   "serving_size": "1 cup (240ml)",
--   "servings_per_container": 8,
--   "calories_per_serving": 150,
--   "macros": {
--     "total_fat": {"value": 8, "unit": "g", "dv_percent": 10},
--     "saturated_fat": {"value": 1, "unit": "g", "dv_percent": 5},
--     "trans_fat": {"value": 0, "unit": "g"},
--     "cholesterol": {"value": 0, "unit": "mg", "dv_percent": 0},
--     "sodium": {"value": 100, "unit": "mg", "dv_percent": 4},
--     "total_carbohydrate": {"value": 12, "unit": "g", "dv_percent": 4},
--     "dietary_fiber": {"value": 0, "unit": "g", "dv_percent": 0},
--     "total_sugars": {"value": 12, "unit": "g"},
--     "added_sugars": {"value": 0, "unit": "g", "dv_percent": 0},
--     "protein": {"value": 8, "unit": "g", "dv_percent": 16}
--   },
--   "vitamins_minerals": {
--     "vitamin_d": {"value": 2.5, "unit": "mcg", "dv_percent": 10},
--     "calcium": {"value": 300, "unit": "mg", "dv_percent": 25},
--     "iron": {"value": 0, "unit": "mg", "dv_percent": 0},
--     "potassium": {"value": 350, "unit": "mg", "dv_percent": 8}
--   }
-- }

-- ============================================================================
-- EXAMPLE QUERIES
-- ============================================================================

-- Find products with high protein (>10g per serving)
-- SELECT name, nutrition_facts->'macros'->'protein'->>'value' as protein
-- FROM products 
-- WHERE (nutrition_facts->'macros'->'protein'->>'value')::NUMERIC > 10;

-- Find products with low sodium (<100mg per serving)
-- SELECT name, nutrition_facts->'macros'->'sodium'->>'value' as sodium
-- FROM products 
-- WHERE (nutrition_facts->'macros'->'sodium'->>'value')::NUMERIC < 100;

-- Find products with added sugars
-- SELECT name, nutrition_facts->'macros'->'added_sugars'->>'value' as added_sugars
-- FROM products 
-- WHERE (nutrition_facts->'macros'->'added_sugars'->>'value')::NUMERIC > 0;

-- Calculate calories from macros (for validation)
-- SELECT 
--   name,
--   nutrition_facts->>'calories_per_serving' as stated_calories,
--   (
--     (nutrition_facts->'macros'->'protein'->>'value')::NUMERIC * 4 +
--     (nutrition_facts->'macros'->'total_carbohydrate'->>'value')::NUMERIC * 4 +
--     (nutrition_facts->'macros'->'total_fat'->>'value')::NUMERIC * 9
--   ) as calculated_calories
-- FROM products
-- WHERE nutrition_facts IS NOT NULL;

-- Find products by serving size
-- SELECT name, nutrition_facts->>'serving_size' as serving_size
-- FROM products
-- WHERE nutrition_facts->>'serving_size' ILIKE '%cup%';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
