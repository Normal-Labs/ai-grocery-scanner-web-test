-- Recreate products_dev table to match products schema
-- This migration drops the old products_dev table and creates a new one
-- that mirrors the products table structure without foreign key relationships
-- Date: 2026-03-05

-- ============================================================================
-- DROP OLD PRODUCTS_DEV TABLE
-- ============================================================================

DROP TABLE IF EXISTS products_dev CASCADE;

-- ============================================================================
-- PRODUCTS_DEV TABLE
-- ============================================================================
-- Mirrors the products table schema without relationships
-- Used for isolated testing of extraction functionality

CREATE TABLE products_dev (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode VARCHAR(50),
  name VARCHAR(255),
  brand VARCHAR(255),
  size VARCHAR(100),
  category VARCHAR(100),
  image_url TEXT,
  metadata JSONB,
  flagged_for_review BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_products_dev_barcode ON products_dev(barcode);
CREATE INDEX idx_products_dev_name_brand ON products_dev(name, brand);
CREATE INDEX idx_products_dev_category ON products_dev(category);
CREATE INDEX idx_products_dev_created_at ON products_dev(created_at DESC);

-- Full-text search index for product metadata
CREATE INDEX idx_products_dev_search ON products_dev 
USING GIN (to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(brand, '') || ' ' || COALESCE(size, '')));

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Add trigger to automatically update updated_at timestamp
CREATE TRIGGER update_products_dev_updated_at
  BEFORE UPDATE ON products_dev
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE products_dev IS 'Development table for testing product extraction functionality - mirrors products table schema without relationships';
COMMENT ON COLUMN products_dev.barcode IS 'Product barcode (UPC, EAN, etc.) - not required to be unique in dev table';
COMMENT ON COLUMN products_dev.name IS 'Product name extracted from packaging';
COMMENT ON COLUMN products_dev.brand IS 'Brand name extracted from packaging';
COMMENT ON COLUMN products_dev.size IS 'Product size/quantity (e.g., "12 oz", "500ml")';
COMMENT ON COLUMN products_dev.category IS 'Product category (e.g., "Beverages", "Snacks")';
COMMENT ON COLUMN products_dev.image_url IS 'URL to product image (if stored)';
COMMENT ON COLUMN products_dev.metadata IS 'Additional metadata in JSON format (extraction method, confidence, raw OCR text, etc.)';
COMMENT ON COLUMN products_dev.flagged_for_review IS 'Flag for products that need manual review';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
