/**
 * Filename: tools/database/migrations/239_enhanced_reminders.sql
 * Purpose: Add support for multiple reminder intervals (24h, 1h, 15min)
 * Created: 2026-02-07
 *
 * Extends the existing 24h reminder system to support 1h and 15min reminders
 * for better session attendance.
 */

-- ===================================================================
-- 1. Create booking_reminders table
-- ===================================================================
CREATE TABLE IF NOT EXISTS booking_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  -- Reminder timing
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('24h', '1h', '15min')),

  -- Delivery tracking
  sent_at TIMESTAMPTZ,
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('email', 'push', 'sms')) DEFAULT 'email',
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')) DEFAULT 'pending',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===================================================================
-- 2. Create indexes for performance
-- ===================================================================
-- Index for finding pending reminders to send
CREATE INDEX IF NOT EXISTS idx_reminders_pending
  ON booking_reminders(booking_id, reminder_type, status)
  WHERE status = 'pending';

-- Index for querying by booking
CREATE INDEX IF NOT EXISTS idx_reminders_booking
  ON booking_reminders(booking_id, reminder_type);

-- Index for querying by status
CREATE INDEX IF NOT EXISTS idx_reminders_status
  ON booking_reminders(status, created_at)
  WHERE status = 'pending';

-- ===================================================================
-- 3. Add unique constraint to prevent duplicate reminders
-- ===================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_reminders_unique
  ON booking_reminders(booking_id, reminder_type);

-- ===================================================================
-- 4. Add comments for documentation
-- ===================================================================
COMMENT ON TABLE booking_reminders IS 'Stores scheduled reminders for confirmed bookings (24h, 1h, 15min before session)';
COMMENT ON COLUMN booking_reminders.reminder_type IS '24h, 1h, or 15min before session start time';
COMMENT ON COLUMN booking_reminders.status IS 'pending: not sent yet, sent: delivered successfully, failed: delivery error';
COMMENT ON COLUMN booking_reminders.delivery_method IS 'email, push notification, or SMS';

-- ===================================================================
-- 5. Enable Row Level Security
-- ===================================================================
ALTER TABLE booking_reminders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view reminders for their bookings
CREATE POLICY "Users can view own booking reminders"
  ON booking_reminders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_reminders.booking_id
      AND (bookings.client_id = auth.uid() OR bookings.tutor_id = auth.uid())
    )
  );

-- Policy: System can insert reminders (via service role)
-- No INSERT policy for regular users - reminders created by system

-- Policy: System can update reminder status
-- No UPDATE policy for regular users - status updated by cron jobs
