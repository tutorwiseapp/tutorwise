/**
 * Filename: tools/database/migrations/237_recurring_bookings.sql
 * Purpose: Add support for recurring/repeating booking sessions
 * Created: 2026-02-07
 *
 * Enables clients to book recurring sessions (weekly, biweekly, monthly)
 * with automatic booking generation for future occurrences.
 */

-- ===================================================================
-- 1. Create recurring_booking_series table
-- ===================================================================
CREATE TABLE IF NOT EXISTS recurring_booking_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,

  -- Recurrence pattern stored as JSONB
  -- Format: { frequency, interval, daysOfWeek, endType, occurrences, endDate }
  recurrence_pattern JSONB NOT NULL,

  -- Status of the series
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'cancelled')) DEFAULT 'active',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===================================================================
-- 2. Add recurring fields to bookings table
-- ===================================================================
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS recurring_series_id UUID REFERENCES recurring_booking_series(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS series_instance_number INTEGER;

-- ===================================================================
-- 3. Create indexes for performance
-- ===================================================================
CREATE INDEX IF NOT EXISTS idx_recurring_series_client
  ON recurring_booking_series(client_id, status);

CREATE INDEX IF NOT EXISTS idx_recurring_series_tutor
  ON recurring_booking_series(tutor_id, status);

CREATE INDEX IF NOT EXISTS idx_bookings_recurring_series
  ON bookings(recurring_series_id)
  WHERE recurring_series_id IS NOT NULL;

-- ===================================================================
-- 4. Add comments for documentation
-- ===================================================================
COMMENT ON TABLE recurring_booking_series IS 'Stores recurring booking series with recurrence patterns';
COMMENT ON COLUMN recurring_booking_series.recurrence_pattern IS 'JSONB pattern: {frequency: weekly|biweekly|monthly, interval: number, daysOfWeek: number[], endType: after_count|by_date|never, occurrences: number, endDate: date}';
COMMENT ON COLUMN bookings.recurring_series_id IS 'Links booking to its recurring series (NULL for one-off bookings)';
COMMENT ON COLUMN bookings.series_instance_number IS 'Occurrence number in series (1 for first, 2 for second, etc.)';

-- ===================================================================
-- 5. Enable Row Level Security
-- ===================================================================
ALTER TABLE recurring_booking_series ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own series (as client or tutor)
CREATE POLICY "Users can view own recurring series"
  ON recurring_booking_series
  FOR SELECT
  USING (
    auth.uid() = client_id OR
    auth.uid() = tutor_id
  );

-- Policy: Clients can create series
CREATE POLICY "Clients can create recurring series"
  ON recurring_booking_series
  FOR INSERT
  WITH CHECK (auth.uid() = client_id);

-- Policy: Clients and tutors can update their series
CREATE POLICY "Users can update own series"
  ON recurring_booking_series
  FOR UPDATE
  USING (
    auth.uid() = client_id OR
    auth.uid() = tutor_id
  );

-- Policy: Clients can delete their series
CREATE POLICY "Clients can delete own series"
  ON recurring_booking_series
  FOR DELETE
  USING (auth.uid() = client_id);
