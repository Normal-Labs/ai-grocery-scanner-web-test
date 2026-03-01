-- Migration: Add multi-image capture fields to products table
-- Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 9.2, 9.4, 13.1, 13.5
-- Description: Extends the products table with multi-image capture tracking fields
-- to support the multi-image product capture feature.

-- Add captured_images JSONB column to store array of captured image metadata
-- Requirement 8.2, 9.2: Array of image hash references with Image_Type labels
ALTER TABLE products
ADD COLUMN IF NOT EXISTS captured_images JSONB DEFAULT '[]';

-- Add completeness_status VARCHAR column to track product profile completeness
-- Requirement 8.7: Completeness indicator showing which Image_Types have been captured
ALTER TABLE products
ADD COLUMN IF NOT EXISTS completeness_status VARCHAR(20) DEFAULT 'incomplete'
CHECK (completeness_status IN ('incomplete', 'complete'));

-- Add captured_image_types TEXT[] column to store array of captured image types
-- Requirement 13.1: Array listing all Image_Types that have been captured
ALTER TABLE products
ADD COLUMN IF NOT EXISTS captured_image_types TEXT[] DEFAULT '{}';

-- Create index on completeness_status for querying complete/incomplete products
-- Requirement 8.7: Index for efficient querying by completeness
CREATE INDEX IF NOT EXISTS idx_products_completeness_status
ON products(completeness_status);

-- Create GIN index on captured_image_types for array containment queries
-- Requirement 13.5: Index for efficient querying by captured image types
CREATE INDEX IF NOT EXISTS idx_products_captured_image_types
ON products USING GIN(captured_image_types)
WHERE captured_image_types IS NOT NULL AND array_length(captured_image_types, 1) > 0;

-- Create GIN index on captured_images for JSONB queries
-- Requirement 9.4: Index for efficient querying of captured images
CREATE INDEX IF NOT EXISTS idx_products_captured_images
ON products USING GIN(captured_images)
WHERE captured_images IS NOT NULL AND captured_images != '[]'::jsonb;

-- Add comments to document the data structures
COMMENT ON COLUMN products.captured_images IS 'JSONB array structure: [
  {
    "imageHash": "string (SHA-256 hash)",
    "imageType": "barcode" | "packaging" | "nutrition_label",
    "timestamp": "ISO 8601 timestamp"
  },
  ...
]';

COMMENT ON COLUMN products.completeness_status IS 'Product profile completeness status:
  - "incomplete": Missing one or more image types
  - "complete": All three image types (barcode, packaging, nutrition_label) captured';

COMMENT ON COLUMN products.captured_image_types IS 'Array of captured image types:
  - Valid values: "barcode", "packaging", "nutrition_label"
  - Used to track which image types have been captured for this product
  - Should contain unique values only (no duplicates)';
