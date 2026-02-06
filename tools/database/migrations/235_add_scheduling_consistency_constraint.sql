-- Migration: 235_add_scheduling_consistency_constraint
-- Purpose: Ensure scheduling_status and session_start_time are consistent
-- Date: 2026-02-06

BEGIN;

-- ============================================================================
-- Add constraint to ensure scheduling_status and session_start_time consistency
-- ============================================================================
-- This prevents invalid states like:
-- - scheduling_status = 'scheduled' with session_start_time = NULL
-- - scheduling_status = 'proposed' with session_start_time = NULL
-- - scheduling_status = 'unscheduled' with session_start_time NOT NULL

ALTER TABLE bookings ADD CONSTRAINT check_scheduling_consistency
CHECK (
  (
    -- If unscheduled, session_start_time must be NULL
    (scheduling_status = 'unscheduled' AND session_start_time IS NULL)
  ) OR (
    -- If proposed or scheduled, session_start_time must NOT be NULL
    (scheduling_status IN ('proposed', 'scheduled') AND session_start_time IS NOT NULL)
  ) OR (
    -- Allow NULL scheduling_status (for backwards compatibility with old bookings)
    scheduling_status IS NULL
  )
);

COMMENT ON CONSTRAINT check_scheduling_consistency ON bookings IS
  'Ensures scheduling_status and session_start_time are consistent. Unscheduled bookings must have NULL start time, while proposed/scheduled bookings must have a start time.';

COMMIT;
