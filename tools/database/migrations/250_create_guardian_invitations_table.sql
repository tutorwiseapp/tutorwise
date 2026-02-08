-- Migration: 250_create_guardian_invitations_table.sql
-- Purpose: Create guardian_invitations table for secure student invitation tokens
-- Created: 2026-02-08
-- Students Audit Fix #4: Secure invitation tokens with crypto.randomUUID()
--
-- CONTEXT:
-- Previous implementation used predictable tokens (timestamp + weak random).
-- This migration creates a proper invitations table with:
-- - Cryptographically secure UUID tokens
-- - Expiration tracking (7 days)
-- - Status management (pending/accepted/expired/revoked)
-- - Prevents token reuse and brute force attacks

-- ============================================================================
-- 1. Create guardian_invitations table
-- ============================================================================

CREATE TABLE IF NOT EXISTS guardian_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_email TEXT NOT NULL,
  token UUID NOT NULL UNIQUE,  -- Cryptographically secure UUID
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')) DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES profiles(id),

  -- Ensure one pending invitation per guardian-email combination
  CONSTRAINT unique_pending_guardian_invitation UNIQUE (guardian_id, student_email, status)
    DEFERRABLE INITIALLY DEFERRED
);

-- Add table comment
COMMENT ON TABLE guardian_invitations IS 'v5.0: Secure invitation tokens for guardian-student links. Replaces predictable timestamp-based tokens.';

-- Add column comments
COMMENT ON COLUMN guardian_invitations.guardian_id IS 'The profile ID of the guardian sending the invitation';
COMMENT ON COLUMN guardian_invitations.student_email IS 'Email address of the student being invited';
COMMENT ON COLUMN guardian_invitations.token IS 'Cryptographically secure UUID token (gen_random_uuid)';
COMMENT ON COLUMN guardian_invitations.status IS 'Invitation lifecycle: pending, accepted, expired, revoked';
COMMENT ON COLUMN guardian_invitations.expires_at IS 'Token expiration timestamp (typically 7 days from creation)';
COMMENT ON COLUMN guardian_invitations.accepted_by IS 'Profile ID of student who accepted (auto-created on signup)';

-- ============================================================================
-- 2. Create indexes for performance
-- ============================================================================

-- Index for token lookup (signup validation)
CREATE INDEX idx_guardian_invitations_token
  ON guardian_invitations(token)
  WHERE status = 'pending';

-- Index for guardian's invitations
CREATE INDEX idx_guardian_invitations_guardian
  ON guardian_invitations(guardian_id, status);

-- Index for email lookup
CREATE INDEX idx_guardian_invitations_email
  ON guardian_invitations(student_email, status);

-- Partial index for pending invitations (most common query)
CREATE INDEX idx_guardian_invitations_pending
  ON guardian_invitations(expires_at)
  WHERE status = 'pending';

-- ============================================================================
-- 3. Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE guardian_invitations ENABLE ROW LEVEL SECURITY;

-- Guardians can view their own invitations
CREATE POLICY "Guardians can view their invitations"
  ON guardian_invitations FOR SELECT
  USING (auth.uid() = guardian_id);

-- Guardians can create invitations
CREATE POLICY "Guardians can create invitations"
  ON guardian_invitations FOR INSERT
  WITH CHECK (auth.uid() = guardian_id);

-- Guardians can update their own invitations (revoke)
CREATE POLICY "Guardians can update their invitations"
  ON guardian_invitations FOR UPDATE
  USING (auth.uid() = guardian_id);

-- Admins can view all invitations
CREATE POLICY "Admins can view all invitations"
  ON guardian_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- 4. Create function to auto-expire old invitations
-- ============================================================================

CREATE OR REPLACE FUNCTION expire_old_guardian_invitations()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Update pending invitations that have passed expiration
  UPDATE guardian_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();

  -- Get count of expired invitations
  GET DIAGNOSTICS expired_count = ROW_COUNT;

  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION expire_old_guardian_invitations() IS 'Auto-expires pending invitations past their expiration date. Run daily via cron.';

-- ============================================================================
-- 5. Create function for updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_guardian_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at column (if needed for tracking)
ALTER TABLE guardian_invitations
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create trigger
CREATE TRIGGER update_guardian_invitations_timestamp
  BEFORE UPDATE ON guardian_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_guardian_invitations_updated_at();

-- ============================================================================
-- 6. Verification
-- ============================================================================

DO $$
BEGIN
  -- Verify table exists
  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'guardian_invitations'
  ) THEN
    RAISE EXCEPTION 'Failed to create guardian_invitations table';
  END IF;

  -- Verify token column is UUID type
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'guardian_invitations'
      AND column_name = 'token'
      AND udt_name = 'uuid'
  ) THEN
    RAISE EXCEPTION 'Token column is not UUID type';
  END IF;

  -- Verify indexes created
  IF NOT EXISTS (
    SELECT FROM pg_indexes
    WHERE tablename = 'guardian_invitations'
      AND indexname = 'idx_guardian_invitations_token'
  ) THEN
    RAISE EXCEPTION 'Token index not created';
  END IF;

  -- Verify RLS enabled
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE tablename = 'guardian_invitations'
      AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on guardian_invitations';
  END IF;

  RAISE NOTICE 'Migration 250_create_guardian_invitations_table completed successfully';
  RAISE NOTICE 'Guardian invitations table created with secure UUID tokens';
  RAISE NOTICE 'RLS policies: 4 policies created';
  RAISE NOTICE 'Indexes: 4 indexes created for performance';
  RAISE NOTICE 'Auto-expiration function: expire_old_guardian_invitations() created';
END $$;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================================

-- If you need to rollback this migration:
--
-- DROP TABLE IF EXISTS guardian_invitations CASCADE;
-- DROP FUNCTION IF EXISTS expire_old_guardian_invitations();
-- DROP FUNCTION IF EXISTS update_guardian_invitations_updated_at();
--
-- NOTE: This will delete all invitation tokens. Guardians will need to re-send invitations.

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
