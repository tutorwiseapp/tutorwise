/**
 * Migration 104: Add Snapshot Fields to Bookings
 * Purpose: Copy listing data to bookings at creation time for data integrity and performance
 * Created: 2025-12-10
 *
 * Problem Statement:
 * - Bookings currently only store listing_id and service_name
 * - If listing changes or is deleted, booking loses critical context
 * - Cannot determine subject for avatar colors → defaults to grey
 * - Cannot analyze bookings by subject/level without joining to listings
 * - Missing historical pricing/location data
 *
 * Solution:
 * - Add snapshot fields from listings to bookings table
 * - Enables subject-based avatar colors for booking cards
 * - Improves query performance (avoid joins)
 * - Preserves booking context even if listing is deleted/modified
 *
 * Fields Added:
 * - subjects: TEXT[] - Subjects being taught (from listing.subjects)
 * - levels: TEXT[] - Education levels (from listing.levels)
 * - location_type: TEXT - Delivery mode: online, in_person, hybrid
 * - location_city: TEXT - City for in-person sessions
 * - free_trial: BOOLEAN - Whether this was a trial session
 * - hourly_rate: NUMERIC(10,2) - Rate at booking time
 * - listing_slug: TEXT - Listing slug for reference
 */

-- Add snapshot fields to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS subjects TEXT[];
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS levels TEXT[];
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS location_type TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS location_city TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS free_trial BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS listing_slug TEXT;

-- Add constraints
ALTER TABLE bookings ADD CONSTRAINT check_location_type
  CHECK (location_type IS NULL OR location_type IN ('online', 'in_person', 'hybrid'));

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bookings_subjects ON bookings USING GIN (subjects);
CREATE INDEX IF NOT EXISTS idx_bookings_location_type ON bookings (location_type);
CREATE INDEX IF NOT EXISTS idx_bookings_free_trial ON bookings (free_trial) WHERE free_trial = TRUE;

-- Add column comments for documentation
COMMENT ON COLUMN bookings.subjects IS 'Snapshot of listing.subjects at booking time - used for subject-based avatar colors and analytics';
COMMENT ON COLUMN bookings.levels IS 'Snapshot of listing.levels at booking time (GCSE, A-Level, etc.)';
COMMENT ON COLUMN bookings.location_type IS 'Snapshot of listing.location_type at booking time (online, in_person, hybrid)';
COMMENT ON COLUMN bookings.location_city IS 'Snapshot of listing.location_city at booking time for in-person sessions';
COMMENT ON COLUMN bookings.free_trial IS 'Whether this was a free trial session (copied from listing.free_trial)';
COMMENT ON COLUMN bookings.hourly_rate IS 'Rate at time of booking - may differ from current listing rate if listing was updated';
COMMENT ON COLUMN bookings.listing_slug IS 'Snapshot of listing.slug for reference';

-- Backfill existing bookings from listings
-- This updates bookings where listing still exists
UPDATE bookings b
SET
  subjects = l.subjects,
  levels = l.levels,
  location_type = l.location_type,
  location_city = l.location_city,
  free_trial = COALESCE(l.free_trial, FALSE),
  hourly_rate = l.hourly_rate,
  listing_slug = l.slug
FROM listings l
WHERE b.listing_id = l.id
  AND b.subjects IS NULL; -- Only update if not already set

-- Log backfill results
DO $$
DECLARE
  updated_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM bookings;
  SELECT COUNT(*) INTO updated_count FROM bookings WHERE subjects IS NOT NULL;

  RAISE NOTICE 'Migration 104 Complete:';
  RAISE NOTICE '  Total bookings: %', total_count;
  RAISE NOTICE '  Backfilled bookings: %', updated_count;
  RAISE NOTICE '  Bookings without listing data: %', total_count - updated_count;
END $$;
