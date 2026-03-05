-- Create products_dev table for testing barcode extraction
-- This table stores test results for barcode detection and extraction

CREATE TABLE IF NOT EXISTS products_dev (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Barcode information
  barcode TEXT NOT NULL,
  detection_method TEXT NOT NULL CHECK (detection_method IN ('BarcodeDetector', 'OCR', 'Failed')),
  confidence DECIMAL(3, 2), -- 0.00 to 1.00
  
  -- Raw data for debugging
  raw_ocr_text TEXT,
  image_data TEXT, -- Truncated base64 for reference
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Additional fields for future testing
  product_name TEXT,
  brand TEXT,
  size TEXT,
  category TEXT,
  notes TEXT
);

-- Create index on barcode for quick lookups
CREATE INDEX IF NOT EXISTS idx_products_dev_barcode ON products_dev(barcode);

-- Create index on detection method for analysis
CREATE INDEX IF NOT EXISTS idx_products_dev_method ON products_dev(detection_method);

-- Create index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_products_dev_created_at ON products_dev(created_at DESC);

-- Add comment
COMMENT ON TABLE products_dev IS 'Development table for testing image extraction functionality';
COMMENT ON COLUMN products_dev.barcode IS 'Extracted barcode number';
COMMENT ON COLUMN products_dev.detection_method IS 'Method used to detect barcode: BarcodeDetector (browser API) or OCR (Gemini Vision)';
COMMENT ON COLUMN products_dev.confidence IS 'Confidence score for the extraction (0.0 to 1.0)';
COMMENT ON COLUMN products_dev.raw_ocr_text IS 'Raw text returned by OCR for debugging';
COMMENT ON COLUMN products_dev.image_data IS 'Truncated base64 image data for reference';
