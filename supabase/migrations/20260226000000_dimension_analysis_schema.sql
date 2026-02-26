-- Migration: Add Dimension Analysis Support to Scan Logs
-- Date: 2026-02-26
-- Requirements: 6.7, 14.1
--
-- This migration extends the scan_logs table to track dimension analysis
-- metrics including cache status, processing time, analysis status, and user tier.

-- Add dimension analysis columns to scan_logs table
ALTER TABLE scan_logs 
  ADD COLUMN IF NOT EXISTS dimension_analysis_cached BOOLEAN,
  ADD COLUMN IF NOT EXISTS dimension_analysis_time_ms INTEGER,
  ADD COLUMN IF NOT EXISTS dimension_analysis_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS user_tier VARCHAR(20);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_scan_logs_dimension_status 
  ON scan_logs(dimension_analysis_status);

CREATE INDEX IF NOT EXISTS idx_scan_logs_user_tier 
  ON scan_logs(user_tier);

-- Add comments for documentation
COMMENT ON COLUMN scan_logs.dimension_analysis_cached IS 
  'Whether dimension analysis result was retrieved from cache';

COMMENT ON COLUMN scan_logs.dimension_analysis_time_ms IS 
  'Time taken for dimension analysis in milliseconds';

COMMENT ON COLUMN scan_logs.dimension_analysis_status IS 
  'Status of dimension analysis: completed, processing, failed, or skipped';

COMMENT ON COLUMN scan_logs.user_tier IS 
  'User subscription tier: free or premium';

-- Verify the migration
DO $$
BEGIN
  -- Check if columns were added successfully
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'scan_logs' 
    AND column_name = 'dimension_analysis_cached'
  ) THEN
    RAISE NOTICE 'Migration successful: dimension_analysis_cached column added';
  END IF;

  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'scan_logs' 
    AND column_name = 'dimension_analysis_time_ms'
  ) THEN
    RAISE NOTICE 'Migration successful: dimension_analysis_time_ms column added';
  END IF;

  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'scan_logs' 
    AND column_name = 'dimension_analysis_status'
  ) THEN
    RAISE NOTICE 'Migration successful: dimension_analysis_status column added';
  END IF;

  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'scan_logs' 
    AND column_name = 'user_tier'
  ) THEN
    RAISE NOTICE 'Migration successful: user_tier column added';
  END IF;
END $$;
