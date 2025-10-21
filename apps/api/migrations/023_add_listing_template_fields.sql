-- Migration 023: Add template support fields to listings table
-- Purpose: Add is_template and is_deletable flags to support listing templates

-- Add new columns
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_deletable BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS template_id VARCHAR(100);

-- Create index for template queries
CREATE INDEX IF NOT EXISTS idx_listings_is_template ON listings(is_template) WHERE is_template = true;

-- Add unique constraint for template_id (when not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_template_id ON listings(template_id) WHERE template_id IS NOT NULL;

-- Update RLS policies to prevent deletion of non-deletable listings
DROP POLICY IF EXISTS listings_delete_own ON listings;
CREATE POLICY listings_delete_own ON listings
  FOR DELETE
  USING (auth.uid() = profile_id AND is_deletable = true);

-- Add comment
COMMENT ON COLUMN listings.is_template IS 'Whether this listing is a system-generated template';
COMMENT ON COLUMN listings.is_deletable IS 'Whether this listing can be deleted by the user';
COMMENT ON COLUMN listings.template_id IS 'Unique identifier for template type (e.g., mathematics-gcse-group)';
