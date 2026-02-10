-- Initial Schema Migration for AI Grocery Scanner
-- This migration creates the core tables for the Supabase system of record
-- Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 8.1, 8.2, 8.3, 8.4, 8.6

-- Enable PostGIS extension for geospatial queries
-- Requirement 3.1: Enable PostGIS extension in the extensions schema
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA extensions;

-- ============================================================================
-- PRODUCTS TABLE
-- ============================================================================
-- Requirement 2.1: Create products table with specified columns
-- Requirement 2.2: Enforce unique index on barcode column
-- Requirement 2.6: Allow barcode to be nullable for products without barcodes

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode TEXT UNIQUE,
  name TEXT NOT NULL,
  brand TEXT,
  last_scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
-- Requirement 8.3: Include all indexes in migration scripts
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_last_scanned ON products(last_scanned_at DESC);

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STORES TABLE
-- ============================================================================
-- Requirement 3.2: Create stores table with specified columns
-- Requirement 3.3: Define location column as geography(POINT, 4326)
-- Requirement 3.4: Create spatial index on location column

CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create spatial index for efficient proximity queries
-- Requirement 3.4: Create spatial index on location column
CREATE INDEX IF NOT EXISTS idx_stores_location ON stores USING GIST(location);

-- Add trigger to automatically update updated_at timestamp
DROP TRIGGER IF EXISTS update_stores_updated_at ON stores;
CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STORE_INVENTORY TABLE
-- ============================================================================
-- Requirement 4.1: Create store_inventory table with specified columns
-- Requirement 4.2: Enforce foreign key constraints
-- Requirement 4.3: Create composite unique index on (product_id, store_id)

CREATE TABLE IF NOT EXISTS store_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, store_id)
);

-- Create indexes for efficient queries
-- Requirement 8.3: Include all indexes in migration scripts
CREATE INDEX IF NOT EXISTS idx_inventory_product ON store_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_store ON store_inventory(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_last_seen ON store_inventory(last_seen_at DESC);

-- Add trigger to automatically update updated_at timestamp
DROP TRIGGER IF EXISTS update_store_inventory_updated_at ON store_inventory;
CREATE TRIGGER update_store_inventory_updated_at
  BEFORE UPDATE ON store_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Requirement 8.1, 8.2: Include RLS policies in migration scripts

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_inventory ENABLE ROW LEVEL SECURITY;

-- Products: Public read, authenticated write
-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Public can read products" ON products;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON products;

CREATE POLICY "Public can read products"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert products"
  ON products FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update products"
  ON products FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Stores: Public read, authenticated write
DROP POLICY IF EXISTS "Public can read stores" ON stores;
DROP POLICY IF EXISTS "Authenticated users can insert stores" ON stores;

CREATE POLICY "Public can read stores"
  ON stores FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert stores"
  ON stores FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Store Inventory: Public read, authenticated write
DROP POLICY IF EXISTS "Public can read inventory" ON store_inventory;
DROP POLICY IF EXISTS "Authenticated users can insert inventory" ON store_inventory;
DROP POLICY IF EXISTS "Authenticated users can update inventory" ON store_inventory;

CREATE POLICY "Public can read inventory"
  ON store_inventory FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert inventory"
  ON store_inventory FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update inventory"
  ON store_inventory FOR UPDATE
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to find stores within a radius (meters) of a point
-- This is a helper function for the StoreRepository.findNearby method
CREATE OR REPLACE FUNCTION find_stores_nearby(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_meters INTEGER
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  address TEXT,
  location GEOGRAPHY,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.address,
    s.location,
    s.created_at,
    s.updated_at,
    ST_Distance(
      s.location,
      ST_GeogFromText('POINT(' || lng || ' ' || lat || ')')
    ) as distance_meters
  FROM stores s
  WHERE ST_DWithin(
    s.location,
    ST_GeogFromText('POINT(' || lng || ' ' || lat || ')'),
    radius_meters
  )
  ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql;

-- Function to upsert product by barcode
-- This is a helper function for the ProductRepository.upsert method
CREATE OR REPLACE FUNCTION upsert_product(
  p_barcode TEXT,
  p_name TEXT,
  p_brand TEXT
)
RETURNS TABLE (
  id UUID,
  barcode TEXT,
  name TEXT,
  brand TEXT,
  last_scanned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  INSERT INTO products (barcode, name, brand, last_scanned_at)
  VALUES (p_barcode, p_name, p_brand, NOW())
  ON CONFLICT (barcode) 
  DO UPDATE SET
    name = EXCLUDED.name,
    brand = EXCLUDED.brand,
    last_scanned_at = NOW(),
    updated_at = NOW()
  RETURNING 
    products.id,
    products.barcode,
    products.name,
    products.brand,
    products.last_scanned_at,
    products.created_at,
    products.updated_at;
END;
$$ LANGUAGE plpgsql;

-- Function to record inventory sighting (upsert)
-- This is a helper function for the InventoryRepository.recordSighting method
CREATE OR REPLACE FUNCTION record_inventory_sighting(
  p_product_id UUID,
  p_store_id UUID
)
RETURNS TABLE (
  id UUID,
  product_id UUID,
  store_id UUID,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  INSERT INTO store_inventory (product_id, store_id, last_seen_at)
  VALUES (p_product_id, p_store_id, NOW())
  ON CONFLICT (product_id, store_id)
  DO UPDATE SET
    last_seen_at = NOW(),
    updated_at = NOW()
  RETURNING 
    store_inventory.id,
    store_inventory.product_id,
    store_inventory.store_id,
    store_inventory.last_seen_at,
    store_inventory.created_at,
    store_inventory.updated_at;
END;
$$ LANGUAGE plpgsql;

-- Function to find products available at nearby stores
-- This is a helper function for the InventoryRepository.getProductsNearLocation method
-- Combines spatial query with inventory lookup
CREATE OR REPLACE FUNCTION find_products_near_location(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_meters INTEGER
)
RETURNS TABLE (
  product_id UUID,
  product_barcode TEXT,
  product_name TEXT,
  product_brand TEXT,
  product_last_scanned_at TIMESTAMPTZ,
  product_created_at TIMESTAMPTZ,
  product_updated_at TIMESTAMPTZ,
  store_id UUID,
  store_name TEXT,
  store_address TEXT,
  store_location GEOGRAPHY,
  store_created_at TIMESTAMPTZ,
  store_updated_at TIMESTAMPTZ,
  distance_meters DOUBLE PRECISION
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    p.id as product_id,
    p.barcode as product_barcode,
    p.name as product_name,
    p.brand as product_brand,
    p.last_scanned_at as product_last_scanned_at,
    p.created_at as product_created_at,
    p.updated_at as product_updated_at,
    s.id as store_id,
    s.name as store_name,
    s.address as store_address,
    s.location as store_location,
    s.created_at as store_created_at,
    s.updated_at as store_updated_at,
    ST_Distance(
      s.location,
      ST_GeogFromText('POINT(' || lng || ' ' || lat || ')')
    ) as distance_meters
  FROM store_inventory si
  JOIN products p ON si.product_id = p.id
  JOIN stores s ON si.store_id = s.id
  WHERE ST_DWithin(
    s.location,
    ST_GeogFromText('POINT(' || lng || ' ' || lat || ')'),
    radius_meters
  )
  ORDER BY p.id, distance_meters;
END;
$ LANGUAGE plpgsql;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- This migration is idempotent and can be run multiple times safely
-- Requirement 8.6: Make migration scripts idempotent using IF NOT EXISTS clauses
