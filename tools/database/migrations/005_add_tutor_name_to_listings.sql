-- Migration: Add tutor_name column to listings table
-- Purpose: Store the tutor's full name separately from the service title
-- Date: 2025-10-17

-- Add tutor_name column to listings table
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS tutor_name TEXT;

-- Add comment to document the column
COMMENT ON COLUMN listings.tutor_name IS 'Full name of the tutor providing the service (e.g., "Jane Doe")';

-- Create index for faster searches by tutor name
CREATE INDEX IF NOT EXISTS idx_listings_tutor_name ON listings(tutor_name);

-- Update existing listings to use display_name from profiles
-- This is a one-time migration for existing data
UPDATE listings l
SET tutor_name = p.display_name
FROM profiles p
WHERE l.profile_id = p.id
  AND l.tutor_name IS NULL
  AND p.display_name IS NOT NULL;
