/**
 * Filename: tools/database/migrations/238_availability_exceptions.sql
 * Purpose: Add support for tutor availability exceptions (holidays, vacations)
 * Created: 2026-02-07
 *
 * Allows tutors to block out dates when they're unavailable for bookings
 * (vacations, holidays, personal days, etc.)
 */

-- ===================================================================
-- 1. Create tutor_availability_exceptions table
-- ===================================================================
CREATE TABLE IF NOT EXISTS tutor_availability_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Exception type
  exception_type TEXT NOT NULL CHECK (exception_type IN ('holiday', 'vacation', 'personal', 'unavailable')),

  -- Date range
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Exception details
  title VARCHAR(200),
  blocks_all_day BOOLEAN NOT NULL DEFAULT true,
  time_ranges JSONB, -- Optional: [{start: '09:00', end: '12:00'}] if not all-day

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraint: end_date must be >= start_date
  CHECK (end_date >= start_date)
);

-- ===================================================================
-- 2. Create indexes for performance
-- ===================================================================
-- Index for querying exceptions by tutor and date range
CREATE INDEX IF NOT EXISTS idx_exceptions_tutor_dates
  ON tutor_availability_exceptions(tutor_id, start_date, end_date);

-- Index for querying by exception type
CREATE INDEX IF NOT EXISTS idx_exceptions_type
  ON tutor_availability_exceptions(tutor_id, exception_type);

-- ===================================================================
-- 3. Add comments for documentation
-- ===================================================================
COMMENT ON TABLE tutor_availability_exceptions IS 'Stores tutor unavailability periods (holidays, vacations, etc.)';
COMMENT ON COLUMN tutor_availability_exceptions.exception_type IS 'Type of exception: holiday, vacation, personal, or unavailable';
COMMENT ON COLUMN tutor_availability_exceptions.blocks_all_day IS 'True if entire day is blocked, false if only specific time ranges';
COMMENT ON COLUMN tutor_availability_exceptions.time_ranges IS 'JSONB array of time ranges if not all-day: [{start: HH:MM, end: HH:MM}]';

-- ===================================================================
-- 4. Enable Row Level Security
-- ===================================================================
ALTER TABLE tutor_availability_exceptions ENABLE ROW LEVEL SECURITY;

-- Policy: Tutors can view their own exceptions
CREATE POLICY "Tutors can view own exceptions"
  ON tutor_availability_exceptions
  FOR SELECT
  USING (auth.uid() = tutor_id);

-- Policy: Tutors can create exceptions
CREATE POLICY "Tutors can create exceptions"
  ON tutor_availability_exceptions
  FOR INSERT
  WITH CHECK (auth.uid() = tutor_id);

-- Policy: Tutors can update their exceptions
CREATE POLICY "Tutors can update own exceptions"
  ON tutor_availability_exceptions
  FOR UPDATE
  USING (auth.uid() = tutor_id);

-- Policy: Tutors can delete their exceptions
CREATE POLICY "Tutors can delete own exceptions"
  ON tutor_availability_exceptions
  FOR DELETE
  USING (auth.uid() = tutor_id);

-- Policy: Anyone can view exceptions for availability checking
-- (needed for clients to see blocked dates when booking)
CREATE POLICY "Anyone can view exceptions for booking"
  ON tutor_availability_exceptions
  FOR SELECT
  USING (true);
