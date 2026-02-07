/**
 * Filename: tools/database/migrations/240_no_show_reports.sql
 * Purpose: Add support for tracking no-show reports and auto-detection
 * Created: 2026-02-07
 *
 * Enhances the existing no-show system with dedicated table, dispute resolution,
 * and automatic detection capabilities.
 */

-- ===================================================================
-- 1. Create no_show_reports table
-- ===================================================================
CREATE TABLE IF NOT EXISTS no_show_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Who didn't show up
  no_show_party TEXT NOT NULL CHECK (no_show_party IN ('client', 'tutor')),

  -- Report status and resolution
  status TEXT NOT NULL CHECK (status IN ('pending_review', 'confirmed', 'disputed')) DEFAULT 'pending_review',
  admin_notes TEXT,

  -- Auto-detection tracking
  auto_resolved_at TIMESTAMPTZ,

  -- Timestamps
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===================================================================
-- 2. Create indexes for performance
-- ===================================================================
-- Index for querying by booking
CREATE INDEX IF NOT EXISTS idx_no_show_booking
  ON no_show_reports(booking_id);

-- Index for admin review (pending reports)
CREATE INDEX IF NOT EXISTS idx_no_show_pending
  ON no_show_reports(status, reported_at)
  WHERE status = 'pending_review';

-- Index for reporter history
CREATE INDEX IF NOT EXISTS idx_no_show_reporter
  ON no_show_reports(reported_by, reported_at);

-- ===================================================================
-- 3. Add unique constraint (one report per booking)
-- ===================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_no_show_unique_booking
  ON no_show_reports(booking_id);

-- ===================================================================
-- 4. Add comments for documentation
-- ===================================================================
COMMENT ON TABLE no_show_reports IS 'Tracks no-show incidents for bookings with manual and auto-detection support';
COMMENT ON COLUMN no_show_reports.no_show_party IS 'client or tutor - indicates who failed to show up';
COMMENT ON COLUMN no_show_reports.status IS 'pending_review: awaiting admin action, confirmed: verified no-show, disputed: under investigation';
COMMENT ON COLUMN no_show_reports.auto_resolved_at IS 'Timestamp if automatically detected by cron job (vs manual report)';

-- ===================================================================
-- 5. Enable Row Level Security
-- ===================================================================
ALTER TABLE no_show_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view reports for their bookings
CREATE POLICY "Users can view reports for own bookings"
  ON no_show_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = no_show_reports.booking_id
      AND (bookings.client_id = auth.uid() OR bookings.tutor_id = auth.uid())
    )
  );

-- Policy: Users can create reports for their bookings
CREATE POLICY "Users can create reports for own bookings"
  ON no_show_reports
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_id
      AND (bookings.client_id = auth.uid() OR bookings.tutor_id = auth.uid())
    )
    AND auth.uid() = reported_by
  );

-- Policy: Only admins can update report status (via service role)
-- No UPDATE policy for regular users
