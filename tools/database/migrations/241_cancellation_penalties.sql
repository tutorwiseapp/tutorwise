/**
 * Filename: tools/database/migrations/241_cancellation_penalties.sql
 * Purpose: Track cancellation penalties for late cancellations and repeat offenders
 * Created: 2026-02-07
 *
 * Records penalty history for users who frequently cancel late, enabling
 * warnings and potential account restrictions.
 */

-- ===================================================================
-- 1. Create cancellation_penalties table
-- ===================================================================
CREATE TABLE IF NOT EXISTS cancellation_penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,

  -- Penalty type and impact
  penalty_type TEXT NOT NULL CHECK (penalty_type IN ('late_cancel', 'repeat_offender', 'no_refund')),
  penalty_amount INTEGER, -- CaaS points deducted or money forfeited

  -- Timestamp
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===================================================================
-- 2. Create indexes for performance
-- ===================================================================
-- Index for querying user's penalty history
CREATE INDEX IF NOT EXISTS idx_penalties_user
  ON cancellation_penalties(user_id, applied_at);

-- Index for calculating repeat offender status (last 30 days)
-- Note: Time filtering happens at query time, not in index predicate
CREATE INDEX IF NOT EXISTS idx_penalties_recent
  ON cancellation_penalties(user_id, penalty_type, applied_at)
  WHERE penalty_type = 'late_cancel';

-- Index for booking reference
CREATE INDEX IF NOT EXISTS idx_penalties_booking
  ON cancellation_penalties(booking_id)
  WHERE booking_id IS NOT NULL;

-- ===================================================================
-- 3. Add comments for documentation
-- ===================================================================
COMMENT ON TABLE cancellation_penalties IS 'Records cancellation penalties to track repeat late cancellations and enforce policies';
COMMENT ON COLUMN cancellation_penalties.penalty_type IS 'late_cancel: <24h cancellation, repeat_offender: >3 late cancels in 30 days, no_refund: penalty applied';
COMMENT ON COLUMN cancellation_penalties.penalty_amount IS 'CaaS score points deducted or money amount forfeited (in pence)';

-- ===================================================================
-- 4. Enable Row Level Security
-- ===================================================================
ALTER TABLE cancellation_penalties ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own penalties
CREATE POLICY "Users can view own penalties"
  ON cancellation_penalties
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: System creates penalties (via service role)
-- No INSERT policy for regular users - penalties created by system

-- ===================================================================
-- 5. Helper function to check repeat offender status
-- ===================================================================
CREATE OR REPLACE FUNCTION is_repeat_offender(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) >= 3
    FROM cancellation_penalties
    WHERE user_id = check_user_id
    AND penalty_type = 'late_cancel'
    AND applied_at >= NOW() - INTERVAL '30 days'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_repeat_offender IS 'Checks if user has 3+ late cancellations in past 30 days';
