-- ===================================================================
-- Migration: 085_create_wiselist_invitations_table.sql
-- Purpose: Create wiselist_invitations for email-based collaboration (v5.7 + v4.3)
-- Created: 2025-11-15
-- Author: Senior Architect
-- Prerequisites: wiselists, profiles tables exist
-- ===================================================================
-- This table tracks pending invitations sent via email for wiselist collaboration.
-- Integrates with v4.3 Referral System for new user acquisition.
-- When invited user signs up via referral link, they auto-join as collaborator.
-- ===================================================================

CREATE TABLE public.wiselist_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wiselist_id UUID NOT NULL REFERENCES public.wiselists(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_by_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role wiselist_role NOT NULL DEFAULT 'EDITOR',
  invite_token UUID NOT NULL UNIQUE,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_pending_invitation UNIQUE (wiselist_id, invited_email, status)
);

-- Create indexes
CREATE INDEX idx_wiselist_invitations_wiselist_id ON public.wiselist_invitations(wiselist_id);
CREATE INDEX idx_wiselist_invitations_email ON public.wiselist_invitations(invited_email);
CREATE INDEX idx_wiselist_invitations_token ON public.wiselist_invitations(invite_token);
CREATE INDEX idx_wiselist_invitations_referral_code ON public.wiselist_invitations(referral_code);
CREATE INDEX idx_wiselist_invitations_status ON public.wiselist_invitations(status) WHERE status = 'pending';
CREATE INDEX idx_wiselist_invitations_expires_at ON public.wiselist_invitations(expires_at) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.wiselist_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policy 1: Wiselist owners can view invitations for their lists
CREATE POLICY "Owners can view wiselist invitations"
ON public.wiselist_invitations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.wiselists
    WHERE wiselists.id = wiselist_id
    AND wiselists.profile_id = auth.uid()
  )
);

-- RLS Policy 2: Wiselist owners can create invitations
CREATE POLICY "Owners can create wiselist invitations"
ON public.wiselist_invitations FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.wiselists
    WHERE wiselists.id = wiselist_id
    AND wiselists.profile_id = auth.uid()
  )
  AND invited_by_profile_id = auth.uid()
);

-- RLS Policy 3: Wiselist owners can update invitations (e.g., resend, cancel)
CREATE POLICY "Owners can update wiselist invitations"
ON public.wiselist_invitations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.wiselists
    WHERE wiselists.id = wiselist_id
    AND wiselists.profile_id = auth.uid()
  )
);

-- RLS Policy 4: Wiselist owners can delete invitations
CREATE POLICY "Owners can delete wiselist invitations"
ON public.wiselist_invitations FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.wiselists
    WHERE wiselists.id = wiselist_id
    AND wiselists.profile_id = auth.uid()
  )
);

-- RLS Policy 5: Public access to verify invite tokens (for signup flow)
CREATE POLICY "Anyone can verify invite tokens"
ON public.wiselist_invitations FOR SELECT
TO public
USING (status = 'pending' AND expires_at > NOW());

-- Add comments
COMMENT ON TABLE public.wiselist_invitations IS
'v5.7 + v4.3: Pending email invitations for wiselist collaboration.
Integrates with referral system for new user acquisition growth loop.';

COMMENT ON COLUMN public.wiselist_invitations.id IS 'Primary key';
COMMENT ON COLUMN public.wiselist_invitations.wiselist_id IS 'The wiselist being shared';
COMMENT ON COLUMN public.wiselist_invitations.invited_email IS 'Email address of invitee';
COMMENT ON COLUMN public.wiselist_invitations.invited_by_profile_id IS 'User who sent the invitation';
COMMENT ON COLUMN public.wiselist_invitations.role IS 'Role to assign when invitation is accepted';
COMMENT ON COLUMN public.wiselist_invitations.invite_token IS 'Unique token for invitation link';
COMMENT ON COLUMN public.wiselist_invitations.referral_code IS 'Inviter referral code (v4.3) for signup attribution';
COMMENT ON COLUMN public.wiselist_invitations.status IS 'Invitation status: pending, accepted, or expired';
COMMENT ON COLUMN public.wiselist_invitations.expires_at IS 'Invitation expiration timestamp (30 days default)';
COMMENT ON COLUMN public.wiselist_invitations.accepted_at IS 'When invitation was accepted';
COMMENT ON COLUMN public.wiselist_invitations.accepted_by_profile_id IS 'Profile ID created after accepting invitation';

-- Validation
DO $$
DECLARE
  v_table_exists BOOLEAN;
  v_index_count INTEGER;
  v_policy_count INTEGER;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'wiselist_invitations'
  ) INTO v_table_exists;

  -- Count indexes
  SELECT COUNT(*)
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND tablename = 'wiselist_invitations'
  INTO v_index_count;

  -- Count RLS policies
  SELECT COUNT(*)
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'wiselist_invitations'
  INTO v_policy_count;

  -- Report status
  RAISE NOTICE 'Migration 085 completed successfully';
  RAISE NOTICE 'wiselist_invitations table created: %', v_table_exists;
  RAISE NOTICE 'Indexes created: %', v_index_count;
  RAISE NOTICE 'RLS policies created: %', v_policy_count;
  RAISE NOTICE 'Ready for email-based collaboration invites (v5.7 + v4.3)';
  RAISE NOTICE 'Integration point: POST /api/wiselists/[id]/collaborators';
END $$;
