-- Migration 219: Add Booking Scheduling Fields
-- Purpose: Implements the 5-stage booking workflow (Discover > Book > Schedule > Pay > Review)
--
-- Key Changes:
-- 1. Add scheduling_status enum and column to track scheduling state
-- 2. Add scheduling metadata fields (proposed_by, proposed_at, confirmed_by, confirmed_at)
-- 3. Add slot_reserved_until for temporary proposal holds (15 min)
-- 4. Add reschedule_count to track number of reschedules
-- 5. Make session_start_time nullable (bookings can be created without a scheduled time)
--
-- Related: booking-scheduling-system-proposal.md
-- Date: 2026-02-05

BEGIN;

-- ============================================================================
-- Step 1: Create scheduling_status type if it doesn't exist
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scheduling_status') THEN
    CREATE TYPE scheduling_status AS ENUM ('unscheduled', 'proposed', 'scheduled');
  END IF;
END $$;

-- ============================================================================
-- Step 2: Add new scheduling columns to bookings table
-- ============================================================================

-- Scheduling status - tracks the state of session time negotiation
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS scheduling_status scheduling_status DEFAULT 'scheduled';
  -- Default to 'scheduled' for backwards compatibility with existing bookings

-- Who proposed the current session time
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS proposed_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- When the current session time was proposed
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS proposed_at TIMESTAMPTZ;

-- Who confirmed/accepted the proposed time (must be different from proposed_by)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS schedule_confirmed_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- When the schedule was confirmed
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS schedule_confirmed_at TIMESTAMPTZ;

-- Temporary hold expiration for proposed time slots (15-minute window)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS slot_reserved_until TIMESTAMPTZ;

-- Track number of reschedules (limit to 2 per party = 4 total)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS reschedule_count INTEGER DEFAULT 0;

-- ============================================================================
-- Step 3: Make session_start_time nullable
-- ============================================================================
-- This allows bookings to be created without a scheduled time (unscheduled state)
ALTER TABLE bookings
  ALTER COLUMN session_start_time DROP NOT NULL;

-- ============================================================================
-- Step 4: Update existing bookings to have scheduling_status = 'scheduled'
-- ============================================================================
-- All existing bookings with a session_start_time should be marked as scheduled
UPDATE bookings
SET scheduling_status = 'scheduled'
WHERE session_start_time IS NOT NULL
  AND scheduling_status IS NULL;

-- Any bookings without a session time (edge case) should be unscheduled
UPDATE bookings
SET scheduling_status = 'unscheduled'
WHERE session_start_time IS NULL
  AND scheduling_status IS NULL;

-- ============================================================================
-- Step 5: Create index for common queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_bookings_scheduling_status
  ON bookings(scheduling_status);

CREATE INDEX IF NOT EXISTS idx_bookings_slot_reserved_until
  ON bookings(slot_reserved_until)
  WHERE slot_reserved_until IS NOT NULL;

-- ============================================================================
-- Step 6: Add comments for documentation
-- ============================================================================
COMMENT ON COLUMN bookings.scheduling_status IS
  'Scheduling state: unscheduled (no time set), proposed (time proposed, awaiting confirmation), scheduled (time confirmed)';

COMMENT ON COLUMN bookings.proposed_by IS
  'Profile ID of the user who proposed the current session_start_time';

COMMENT ON COLUMN bookings.proposed_at IS
  'Timestamp when the current session_start_time was proposed';

COMMENT ON COLUMN bookings.schedule_confirmed_by IS
  'Profile ID of the user who confirmed/accepted the proposed time (must differ from proposed_by)';

COMMENT ON COLUMN bookings.schedule_confirmed_at IS
  'Timestamp when the proposed time was confirmed';

COMMENT ON COLUMN bookings.slot_reserved_until IS
  'Temporary hold expiration for the proposed time slot (15-minute window). After expiry, slot becomes available again.';

COMMENT ON COLUMN bookings.reschedule_count IS
  'Number of times this booking has been rescheduled. Limited to 4 total (2 per party).';

COMMIT;
