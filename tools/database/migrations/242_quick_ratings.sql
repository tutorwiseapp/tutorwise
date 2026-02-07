/**
 * Filename: tools/database/migrations/242_quick_ratings.sql
 * Purpose: Add support for immediate post-session quick ratings
 * Created: 2026-02-07
 *
 * Enables users to quickly rate sessions immediately after completion,
 * which can pre-fill the full review form (7-day escrow system).
 */

-- ===================================================================
-- 1. Create session_quick_ratings table
-- ===================================================================
CREATE TABLE IF NOT EXISTS session_quick_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ratee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Rating value (1-5 stars)
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),

  -- Tracking
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_in_review BOOLEAN NOT NULL DEFAULT false,

  -- Unique constraint: one quick rating per rater/ratee pair per booking
  UNIQUE(booking_id, rater_id, ratee_id)
);

-- ===================================================================
-- 2. Create indexes for performance
-- ===================================================================
-- Index for querying by booking
CREATE INDEX IF NOT EXISTS idx_quick_ratings_booking
  ON session_quick_ratings(booking_id);

-- Index for querying user's quick ratings
CREATE INDEX IF NOT EXISTS idx_quick_ratings_rater
  ON session_quick_ratings(rater_id, captured_at);

-- Index for checking if quick rating was used in review
CREATE INDEX IF NOT EXISTS idx_quick_ratings_unused
  ON session_quick_ratings(booking_id, used_in_review)
  WHERE used_in_review = false;

-- ===================================================================
-- 3. Add comments for documentation
-- ===================================================================
COMMENT ON TABLE session_quick_ratings IS 'Stores immediate post-session ratings (1-5 stars) that can pre-fill full reviews';
COMMENT ON COLUMN session_quick_ratings.rating IS '1-5 star rating captured immediately after session';
COMMENT ON COLUMN session_quick_ratings.used_in_review IS 'True if this quick rating was carried forward to the full review submission';

-- ===================================================================
-- 4. Enable Row Level Security
-- ===================================================================
ALTER TABLE session_quick_ratings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view quick ratings for their bookings
CREATE POLICY "Users can view quick ratings for own bookings"
  ON session_quick_ratings
  FOR SELECT
  USING (
    auth.uid() = rater_id OR
    auth.uid() = ratee_id OR
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = session_quick_ratings.booking_id
      AND (bookings.client_id = auth.uid() OR bookings.tutor_id = auth.uid())
    )
  );

-- Policy: Users can create quick ratings for their bookings
CREATE POLICY "Users can create quick ratings for own bookings"
  ON session_quick_ratings
  FOR INSERT
  WITH CHECK (
    auth.uid() = rater_id
    AND EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_id
      AND (bookings.client_id = auth.uid() OR bookings.tutor_id = auth.uid())
    )
  );

-- Policy: Users can update their own quick ratings
CREATE POLICY "Users can update own quick ratings"
  ON session_quick_ratings
  FOR UPDATE
  USING (auth.uid() = rater_id)
  WITH CHECK (auth.uid() = rater_id);
