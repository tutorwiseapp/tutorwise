-- Migration: Add archived_at timestamp to listings table
-- Version: 031
-- Date: 2025-11-03
-- Purpose: Track when listings are archived to enforce 30-day deletion rule

-- Add archived_at column to listings table
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Create index for archived listings query
CREATE INDEX IF NOT EXISTS idx_listings_archived_at
ON listings(archived_at)
WHERE status = 'archived' AND archived_at IS NOT NULL;

-- Create trigger to set archived_at when status changes to 'archived'
CREATE OR REPLACE FUNCTION set_listing_archived_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Set archived_at when status changes to 'archived'
  IF NEW.status = 'archived' AND OLD.status != 'archived' THEN
    NEW.archived_at = NOW();
  END IF;

  -- Clear archived_at when status changes from 'archived' to something else
  IF NEW.status != 'archived' AND OLD.status = 'archived' THEN
    NEW.archived_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to listings table
DROP TRIGGER IF EXISTS listings_set_archived_at ON listings;
CREATE TRIGGER listings_set_archived_at
  BEFORE UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION set_listing_archived_at();

-- Backfill archived_at for existing archived listings (use updated_at as proxy)
UPDATE listings
SET archived_at = updated_at
WHERE status = 'archived' AND archived_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN listings.archived_at IS 'Timestamp when listing was archived. Used to enforce 30-day deletion rule.';
