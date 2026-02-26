-- Multi-Tier Product Identification System Schema Migration
-- This migration drops old tables and creates new schema for the multi-tier system
-- Date: 2026-02-25

-- ============================================================================
-- DROP OLD TABLES
-- ============================================================================

-- Drop old tables in reverse dependency order
DROP TABLE IF EXISTS store_inventory CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- Drop old helper functions
DROP FUNCTION IF EXISTS find_stores_nearby(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER);
DROP FUNCTION IF EXISTS upsert_product(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS record_inventory_sighting(UUID, UUID);
DROP FUNCTION IF EXISTS find_products_near_location(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER);

-- ============================================================================
-- PRODUCTS TABLE
-- ============================================================================
-- Requirements: 1.5, 2.5, 3.4, 12.1

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode VARCHAR(50) UNIQUE,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(255) NOT NULL,
  size VARCHAR(100),
  category VARCHAR(100),
  image_url TEXT,
  metadata JSONB,
  flagged_for_review BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_name_brand ON products(name, brand);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_flagged ON products(flagged_for_review);

-- Full-text search index for product metadata
CREATE INDEX idx_products_search ON products 
USING GIN (to_tsvector('english', name || ' ' || brand || ' ' || COALESCE(size, '')));

-- ============================================================================
-- ERROR REPORTS TABLE
-- ============================================================================
-- Requirements: 5.2, 5.3, 5.4, 5.5

CREATE TABLE error_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id VARCHAR(100),
  user_id VARCHAR(100) NOT NULL,
  incorrect_product_id UUID REFERENCES products(id),
  actual_product_name VARCHAR(255),
  actual_product_brand VARCHAR(255),
  actual_product_barcode VARCHAR(50),
  image_url TEXT NOT NULL,
  tier INTEGER NOT NULL,
  confidence_score DECIMAL(3,2),
  user_feedback TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- Create indexes for efficient queries
CREATE INDEX idx_error_reports_user_id ON error_reports(user_id);
CREATE INDEX idx_error_reports_incorrect_product ON error_reports(incorrect_product_id);
CREATE INDEX idx_error_reports_status ON error_reports(status);
CREATE INDEX idx_error_reports_created_at ON error_reports(created_at);

-- ============================================================================
-- SCAN LOGS TABLE
-- ============================================================================
-- Requirements: 6.6, 6.7, 14.1, 14.2, 14.3

CREATE TABLE scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100) NOT NULL,
  session_id VARCHAR(100) NOT NULL,
  tier INTEGER NOT NULL,
  success BOOLEAN NOT NULL,
  product_id UUID REFERENCES products(id),
  barcode VARCHAR(50),
  image_hash VARCHAR(64),
  confidence_score DECIMAL(3,2),
  processing_time_ms INTEGER,
  cached BOOLEAN DEFAULT FALSE,
  error_code VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient queries and analytics
CREATE INDEX idx_scan_logs_user_id ON scan_logs(user_id);
CREATE INDEX idx_scan_logs_session_id ON scan_logs(session_id);
CREATE INDEX idx_scan_logs_tier ON scan_logs(tier);
CREATE INDEX idx_scan_logs_created_at ON scan_logs(created_at);
CREATE INDEX idx_scan_logs_success ON scan_logs(success);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Add trigger to automatically update updated_at timestamp on products
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;

-- Products: Public read, authenticated write
CREATE POLICY "Public can read products"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert products"
  ON products FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update products"
  ON products FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Error Reports: Users can only access their own reports
CREATE POLICY "Users can read their own error reports"
  ON error_reports FOR SELECT
  USING (auth.uid()::TEXT = user_id);

CREATE POLICY "Users can insert their own error reports"
  ON error_reports FOR INSERT
  WITH CHECK (auth.uid()::TEXT = user_id);

-- Scan Logs: Users can only access their own logs
CREATE POLICY "Users can read their own scan logs"
  ON scan_logs FOR SELECT
  USING (auth.uid()::TEXT = user_id);

CREATE POLICY "Users can insert their own scan logs"
  ON scan_logs FOR INSERT
  WITH CHECK (auth.uid()::TEXT = user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to upsert product by barcode
CREATE OR REPLACE FUNCTION upsert_product(
  p_barcode VARCHAR(50),
  p_name VARCHAR(255),
  p_brand VARCHAR(255),
  p_size VARCHAR(100) DEFAULT NULL,
  p_category VARCHAR(100) DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  barcode VARCHAR(50),
  name VARCHAR(255),
  brand VARCHAR(255),
  size VARCHAR(100),
  category VARCHAR(100),
  image_url TEXT,
  metadata JSONB,
  flagged_for_review BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
) AS $$
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
  RETURNING 
    products.id,
    products.barcode,
    products.name,
    products.brand,
    products.size,
    products.category,
    products.image_url,
    products.metadata,
    products.flagged_for_review,
    products.created_at,
    products.updated_at;
END;
$$ LANGUAGE plpgsql;

-- Function to search products by metadata (name, brand, size)
CREATE OR REPLACE FUNCTION search_products_by_metadata(
  p_name VARCHAR(255),
  p_brand VARCHAR(255) DEFAULT NULL,
  p_size VARCHAR(100) DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  barcode VARCHAR(50),
  name VARCHAR(255),
  brand VARCHAR(255),
  size VARCHAR(100),
  category VARCHAR(100),
  image_url TEXT,
  metadata JSONB,
  flagged_for_review BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  similarity_score REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.barcode,
    p.name,
    p.brand,
    p.size,
    p.category,
    p.image_url,
    p.metadata,
    p.flagged_for_review,
    p.created_at,
    p.updated_at,
    -- Calculate similarity score based on text matching
    (
      CASE WHEN p.name ILIKE '%' || p_name || '%' THEN 0.5 ELSE 0.0 END +
      CASE WHEN p_brand IS NOT NULL AND p_brand ILIKE '%' || COALESCE(p_brand, '') || '%' THEN 0.3 ELSE 0.0 END +
      CASE WHEN p.size IS NOT NULL AND p.size ILIKE '%' || COALESCE(p_size, '') || '%' THEN 0.2 ELSE 0.0 END
    )::REAL as similarity_score
  FROM products p
  WHERE 
    p.name ILIKE '%' || p_name || '%'
    AND (p_brand IS NULL OR COALESCE(p_brand, '') = '' OR p.brand ILIKE '%' || p_brand || '%')
    AND (p_size IS NULL OR COALESCE(p_size, '') = '' OR p.size ILIKE '%' || p_size || '%')
  ORDER BY similarity_score DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Function to record scan log
CREATE OR REPLACE FUNCTION record_scan_log(
  p_user_id VARCHAR(100),
  p_session_id VARCHAR(100),
  p_tier INTEGER,
  p_success BOOLEAN,
  p_product_id UUID DEFAULT NULL,
  p_barcode VARCHAR(50) DEFAULT NULL,
  p_image_hash VARCHAR(64) DEFAULT NULL,
  p_confidence_score DECIMAL(3,2) DEFAULT NULL,
  p_processing_time_ms INTEGER DEFAULT NULL,
  p_cached BOOLEAN DEFAULT FALSE,
  p_error_code VARCHAR(50) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO scan_logs (
    user_id, session_id, tier, success, product_id, barcode, 
    image_hash, confidence_score, processing_time_ms, cached, error_code
  )
  VALUES (
    p_user_id, p_session_id, p_tier, p_success, p_product_id, p_barcode,
    p_image_hash, p_confidence_score, p_processing_time_ms, p_cached, p_error_code
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- This migration creates the new schema for the multi-tier product identification system
-- Old tables (stores, store_inventory) have been removed as they are not needed for the new system
