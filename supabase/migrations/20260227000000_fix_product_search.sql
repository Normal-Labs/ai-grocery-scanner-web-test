-- Fix product search by metadata function
-- This migration improves the product matching logic to better identify duplicate products

-- Drop and recreate the search function with improved matching logic
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
      -- Name match (required, 50% weight)
      CASE 
        WHEN LOWER(p.name) = LOWER(p_name) THEN 0.5
        WHEN p.name ILIKE '%' || p_name || '%' THEN 0.3
        WHEN p_name ILIKE '%' || p.name || '%' THEN 0.2
        ELSE 0.0 
      END +
      -- Brand match (30% weight, optional)
      CASE 
        WHEN p_brand IS NULL OR p_brand = '' THEN 0.0
        WHEN p.brand IS NULL OR p.brand = '' THEN 0.0
        WHEN LOWER(p.brand) = LOWER(p_brand) THEN 0.3
        WHEN p.brand ILIKE '%' || p_brand || '%' THEN 0.2
        WHEN p_brand ILIKE '%' || p.brand || '%' THEN 0.1
        ELSE 0.0 
      END +
      -- Size match (20% weight, optional)
      CASE 
        WHEN p_size IS NULL OR p_size = '' THEN 0.0
        WHEN p.size IS NULL OR p.size = '' THEN 0.0
        WHEN LOWER(p.size) = LOWER(p_size) THEN 0.2
        WHEN p.size ILIKE '%' || p_size || '%' THEN 0.1
        ELSE 0.0 
      END
    )::REAL as similarity_score
  FROM products p
  WHERE 
    -- Name must have some match (required)
    (
      p.name ILIKE '%' || p_name || '%' 
      OR p_name ILIKE '%' || p.name || '%'
    )
    -- Brand filter (only if provided)
    AND (
      p_brand IS NULL 
      OR p_brand = '' 
      OR p.brand IS NULL
      OR p.brand = ''
      OR p.brand ILIKE '%' || p_brand || '%'
      OR p_brand ILIKE '%' || p.brand || '%'
    )
    -- Size filter (only if provided)
    AND (
      p_size IS NULL 
      OR p_size = '' 
      OR p.size IS NULL
      OR p.size = ''
      OR p.size ILIKE '%' || p_size || '%'
      OR p_size ILIKE '%' || p.size || '%'
    )
  ORDER BY similarity_score DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION search_products_by_metadata IS 
  'Searches for products by metadata (name, brand, size) with improved fuzzy matching. Returns up to 10 results ordered by similarity score.';
