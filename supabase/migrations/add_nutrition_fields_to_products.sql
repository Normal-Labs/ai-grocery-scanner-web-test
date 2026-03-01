-- Migration: Add nutrition fields to products table
-- Requirements: 6.1, 6.2, 6.3
-- Description: Extends the products table with nutrition-related columns
-- to store nutritional analysis results from the nutrition scanning feature.

-- Add nutrition_data JSONB column to store complete nutritional facts
ALTER TABLE products
ADD COLUMN IF NOT EXISTS nutrition_data JSONB DEFAULT NULL;

-- Add health_score INTEGER column to store calculated health score (0-100)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT NULL
CHECK (health_score >= 0 AND health_score <= 100);

-- Add has_allergens BOOLEAN column to flag products with allergens
ALTER TABLE products
ADD COLUMN IF NOT EXISTS has_allergens BOOLEAN DEFAULT FALSE;

-- Add allergen_types TEXT[] column to store array of allergen types
ALTER TABLE products
ADD COLUMN IF NOT EXISTS allergen_types TEXT[] DEFAULT '{}';

-- Create index on health_score for filtering and sorting
CREATE INDEX IF NOT EXISTS idx_products_health_score
ON products(health_score)
WHERE health_score IS NOT NULL;

-- Create index on has_allergens for filtering
CREATE INDEX IF NOT EXISTS idx_products_has_allergens
ON products(has_allergens)
WHERE has_allergens = TRUE;

-- Create GIN index on allergen_types for array containment queries
CREATE INDEX IF NOT EXISTS idx_products_allergen_types
ON products USING GIN(allergen_types)
WHERE allergen_types IS NOT NULL AND array_length(allergen_types, 1) > 0;

-- Create GIN index on nutrition_data for JSONB queries
CREATE INDEX IF NOT EXISTS idx_products_nutrition_data
ON products USING GIN(nutrition_data)
WHERE nutrition_data IS NOT NULL;

-- Add comment to document the nutrition_data structure
COMMENT ON COLUMN products.nutrition_data IS 'JSONB structure: {
  "servingSize": {"amount": number, "unit": string},
  "calories": number,
  "macros": {
    "fat": number,
    "saturatedFat": number,
    "transFat": number,
    "carbs": number,
    "fiber": number,
    "sugars": number,
    "protein": number
  },
  "sodium": number,
  "lastUpdated": string (ISO timestamp)
}';

COMMENT ON COLUMN products.health_score IS 'Calculated health score from 0-100 based on nutritional content and ingredients';
COMMENT ON COLUMN products.has_allergens IS 'Flag indicating if product contains any of the 8 major allergens';
COMMENT ON COLUMN products.allergen_types IS 'Array of allergen types: milk, eggs, fish, shellfish, tree_nuts, peanuts, wheat, soybeans';
