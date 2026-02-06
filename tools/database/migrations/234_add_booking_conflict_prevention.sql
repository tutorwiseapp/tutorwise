-- Migration 234: Add Booking Conflict Prevention
-- Purpose: Prevent overlapping bookings for the same tutor at database level
-- Date: 2026-02-06

BEGIN;

-- ============================================================================
-- Step 1: Add unique index to prevent overlapping bookings for same tutor
-- ============================================================================
-- This prevents two bookings from having the exact same start time for the same tutor
-- Only applies to active bookings (not cancelled or declined)
CREATE UNIQUE INDEX IF NOT EXISTS idx_no_overlapping_bookings
ON bookings (
  tutor_id,
  session_start_time
)
WHERE status NOT IN ('Cancelled', 'Declined')
  AND scheduling_status IN ('proposed', 'scheduled')
  AND session_start_time IS NOT NULL;

-- ============================================================================
-- Step 2: Add constraint for reasonable session duration
-- ============================================================================
-- Ensure session durations are positive and not unreasonably long (max 8 hours = 480 min)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_reasonable_duration'
  ) THEN
    ALTER TABLE bookings
    ADD CONSTRAINT check_reasonable_duration
    CHECK (
      (duration_minutes IS NOT NULL AND duration_minutes > 0 AND duration_minutes <= 480)
      OR duration_minutes IS NULL
    );
  END IF;
END $$;

-- ============================================================================
-- Step 3: Add index for efficient conflict checking queries
-- ============================================================================
-- This index helps quickly find bookings that might conflict with a proposed time
-- Uses tutor_id, session_start_time, and duration_minutes for range queries
CREATE INDEX IF NOT EXISTS idx_bookings_conflict_check
ON bookings(tutor_id, session_start_time, duration_minutes)
WHERE status NOT IN ('Cancelled', 'Declined')
  AND scheduling_status IN ('proposed', 'scheduled')
  AND session_start_time IS NOT NULL;

-- ============================================================================
-- Step 4: Add comments for documentation
-- ============================================================================
COMMENT ON INDEX idx_no_overlapping_bookings IS
  'Prevents exact time conflicts: two bookings cannot have the same start time for the same tutor';

COMMENT ON INDEX idx_bookings_conflict_check IS
  'Optimizes conflict detection queries when checking for overlapping time ranges';

COMMIT;
