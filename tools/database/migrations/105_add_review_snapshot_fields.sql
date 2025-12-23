-- ============================================================================
-- Migration 105: Add Review Snapshot Fields
-- ============================================================================
-- Purpose: Add service context fields to profile_reviews for better display
-- Author: AI Architect
-- Date: 2025-12-10
-- Related: Migration 104 (Booking Snapshot Fields)
--
-- Problem:
-- - Reviews only store reviewer_id, reviewee_id, and rating/comment
-- - Missing service context (what subject was taught, what service, etc.)
-- - Have to join to bookings → booking_review_sessions for context
-- - If booking deleted, review loses all context
--
-- Solution:
-- Add snapshot fields from booking at review creation time:
-- - service_name: What service was reviewed (e.g., "GCSE Maths Tutoring")
-- - subjects: Subject categories (e.g., ["Mathematics"])
-- - levels: Education levels (e.g., ["GCSE"])
-- - session_date: When the session occurred
-- - location_type: online/in_person/hybrid
-- - booking_id: Reference to original booking (for joining if needed)
--
-- Benefits:
-- 1. Reviews show service context even if booking deleted
-- 2. Can filter/group reviews by subject without joins
-- 3. Better UX - show "Mathematics tutor" instead of generic "tutor"
-- 4. Performance - no joins needed for common queries
-- ============================================================================

-- Step 1: Add snapshot columns
ALTER TABLE profile_reviews ADD COLUMN IF NOT EXISTS service_name TEXT;
ALTER TABLE profile_reviews ADD COLUMN IF NOT EXISTS subjects TEXT[];
ALTER TABLE profile_reviews ADD COLUMN IF NOT EXISTS levels TEXT[];
ALTER TABLE profile_reviews ADD COLUMN IF NOT EXISTS session_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE profile_reviews ADD COLUMN IF NOT EXISTS location_type TEXT;
ALTER TABLE profile_reviews ADD COLUMN IF NOT EXISTS booking_id TEXT;

COMMENT ON COLUMN profile_reviews.service_name IS 'Service name at review time (snapshot from booking)';
COMMENT ON COLUMN profile_reviews.subjects IS 'Subjects taught (snapshot from booking)';
COMMENT ON COLUMN profile_reviews.levels IS 'Education levels (snapshot from booking)';
COMMENT ON COLUMN profile_reviews.session_date IS 'Session date (snapshot from booking.session_start_time)';
COMMENT ON COLUMN profile_reviews.location_type IS 'Delivery mode: online/in_person/hybrid (snapshot from booking)';
COMMENT ON COLUMN profile_reviews.booking_id IS 'Reference to booking (for joining if needed)';

-- Step 2: Backfill existing reviews from bookings (via booking_review_sessions)
UPDATE profile_reviews pr
SET
  service_name = b.service_name,
  subjects = b.subjects,
  levels = b.levels,
  session_date = b.session_start_time,
  location_type = b.location_type,
  booking_id = b.id
FROM booking_review_sessions brs
JOIN bookings b ON brs.booking_id = b.id
WHERE pr.session_id = brs.id
  AND pr.service_name IS NULL;

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profile_reviews_subjects ON profile_reviews USING GIN (subjects);
CREATE INDEX IF NOT EXISTS idx_profile_reviews_booking_id ON profile_reviews (booking_id);
CREATE INDEX IF NOT EXISTS idx_profile_reviews_session_date ON profile_reviews (session_date);

-- Step 4: Show migration results
DO $$
DECLARE
  total_reviews INTEGER;
  reviews_with_subjects INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_reviews FROM profile_reviews;
  SELECT COUNT(*) INTO reviews_with_subjects FROM profile_reviews WHERE subjects IS NOT NULL;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 105 Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total reviews: %', total_reviews;
  RAISE NOTICE 'Reviews with subjects: %', reviews_with_subjects;
  RAISE NOTICE '========================================';
END $$;
