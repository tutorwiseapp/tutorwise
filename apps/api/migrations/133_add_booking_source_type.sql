-- Migration 133: Add booking_source_type to distinguish listing vs profile bookings
-- Purpose: Track whether booking came from listing page or profile page
-- Rationale:
--   - listing_id can be NULL for profile bookings (migration 132 discussion)
--   - Need explicit field to distinguish booking source for analytics
--   - Different booking flows: listing (with availability check) vs profile (direct)
-- Author: Senior Architect + Claude AI
-- Date: 2025-12-19
-- Related: Profile booking support (listing_id optional)

BEGIN;

-- ============================================================
-- 1. CREATE BOOKING SOURCE TYPE ENUM
-- ============================================================

-- Create enum for booking source
CREATE TYPE booking_source_type_enum AS ENUM ('listing', 'profile');

COMMENT ON TYPE booking_source_type_enum IS
  'Source of the booking: listing (via service listing page) or profile (direct from tutor profile page)';

-- ============================================================
-- 2. ADD BOOKING_SOURCE_TYPE FIELD
-- ============================================================

-- Add booking_source_type column
ALTER TABLE public.bookings
ADD COLUMN booking_source_type booking_source_type_enum;

-- Add comment explaining the field
COMMENT ON COLUMN public.bookings.booking_source_type IS
  'Source of booking: listing (via service listing with listing_id) or profile (direct from tutor profile, listing_id is NULL)';

-- Backfill: If listing_id IS NULL → 'profile', else → 'listing'
UPDATE public.bookings
SET booking_source_type = CASE
  WHEN listing_id IS NULL THEN 'profile'::booking_source_type_enum
  ELSE 'listing'::booking_source_type_enum
END;

-- Make NOT NULL after backfill
ALTER TABLE public.bookings
ALTER COLUMN booking_source_type SET NOT NULL;

-- Add index for analytics queries
CREATE INDEX idx_bookings_booking_source_type
  ON public.bookings(booking_source_type);

COMMENT ON INDEX idx_bookings_booking_source_type IS
  'Supports analytics queries filtering by booking source (listing vs profile bookings)';

-- ============================================================
-- 3. AUDIT LOG
-- ============================================================

INSERT INTO public.audit_log (action_type, module, details)
VALUES (
  'schema.add_booking_source_type',
  'Bookings',
  jsonb_build_object(
    'migration', '133',
    'changes', ARRAY[
      'Created booking_source_type_enum (listing, profile)',
      'Added booking_source_type column to bookings table',
      'Backfilled based on listing_id (NULL = profile, else = listing)',
      'Added index for analytics queries'
    ],
    'rationale', 'Distinguish listing bookings (with availability check) from profile bookings (direct). Supports analytics on booking sources.',
    'timestamp', NOW()
  )
);

COMMIT;
