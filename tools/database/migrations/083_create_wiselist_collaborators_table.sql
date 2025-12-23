-- ===================================================================
-- Migration: 083_create_wiselist_collaborators_table.sql
-- Purpose: Create wiselist_collaborators table for Collaborative Wiselists (v5.7)
-- Created: 2025-11-15
-- Author: Senior Architect
-- Prerequisites: wiselists, profiles tables exist
-- ===================================================================
-- This table links multiple users to a single Wiselist for collaboration.
-- Supports OWNER, EDITOR, and VIEWER roles for permission management.
-- ===================================================================

-- Create ENUM for roles
CREATE TYPE wiselist_role AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

COMMENT ON TYPE wiselist_role IS
'v5.7: Collaboration role in a wiselist.
OWNER = creator (full control), EDITOR = can add/remove items, VIEWER = read-only';

-- Create wiselist_collaborators table
CREATE TABLE public.wiselist_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wiselist_id UUID NOT NULL REFERENCES public.wiselists(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role wiselist_role NOT NULL DEFAULT 'EDITOR',
  invited_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_collaborator_in_list UNIQUE (wiselist_id, profile_id)
);

-- Create indexes
CREATE INDEX idx_wiselist_collaborators_wiselist_id ON public.wiselist_collaborators(wiselist_id);
CREATE INDEX idx_wiselist_collaborators_profile_id ON public.wiselist_collaborators(profile_id);
CREATE INDEX idx_wiselist_collaborators_role ON public.wiselist_collaborators(role);
CREATE INDEX idx_wiselist_collaborators_invited_by ON public.wiselist_collaborators(invited_by_profile_id) WHERE invited_by_profile_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.wiselist_collaborators ENABLE ROW LEVEL SECURITY;

-- RLS Policy 1: Users can view collaborators of their own lists
CREATE POLICY "Owners can view wiselist collaborators"
ON public.wiselist_collaborators FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.wiselists
    WHERE wiselists.id = wiselist_id
    AND wiselists.profile_id = auth.uid()
  )
);

-- RLS Policy 2: Collaborators can view other collaborators
CREATE POLICY "Collaborators can view fellow collaborators"
ON public.wiselist_collaborators FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

-- RLS Policy 3: Anyone can view collaborators of public lists (for attribution)
CREATE POLICY "Anyone can view collaborators of public wiselists"
ON public.wiselist_collaborators FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.wiselists
    WHERE wiselists.id = wiselist_id
    AND wiselists.visibility = 'public'
  )
);

-- RLS Policy 4: Owners can add collaborators
CREATE POLICY "Owners can add collaborators"
ON public.wiselist_collaborators FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.wiselists
    WHERE wiselists.id = wiselist_id
    AND wiselists.profile_id = auth.uid()
  )
  AND invited_by_profile_id = auth.uid()
);

-- RLS Policy 5: Owners can update collaborators
CREATE POLICY "Owners can update collaborators"
ON public.wiselist_collaborators FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.wiselists
    WHERE wiselists.id = wiselist_id
    AND wiselists.profile_id = auth.uid()
  )
);

-- RLS Policy 6: Owners can remove collaborators
CREATE POLICY "Owners can remove collaborators"
ON public.wiselist_collaborators FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.wiselists
    WHERE wiselists.id = wiselist_id
    AND wiselists.profile_id = auth.uid()
  )
);

-- RLS Policy 7: Collaborators can remove themselves
CREATE POLICY "Collaborators can remove themselves"
ON public.wiselist_collaborators FOR DELETE
TO authenticated
USING (profile_id = auth.uid());

-- Add comments
COMMENT ON TABLE public.wiselist_collaborators IS
'v5.7: Users who have access to a specific Wiselist.
Enables collaborative planning and sharing for growth loops.';

COMMENT ON COLUMN public.wiselist_collaborators.id IS 'Primary key';
COMMENT ON COLUMN public.wiselist_collaborators.wiselist_id IS 'The wiselist being shared';
COMMENT ON COLUMN public.wiselist_collaborators.profile_id IS 'The collaborator user';
COMMENT ON COLUMN public.wiselist_collaborators.role IS 'Access level: OWNER, EDITOR, or VIEWER';
COMMENT ON COLUMN public.wiselist_collaborators.invited_by_profile_id IS 'Who invited this collaborator (for v4.3 referral tracking)';

-- Validation
DO $$
DECLARE
  v_table_exists BOOLEAN;
  v_enum_exists BOOLEAN;
  v_index_count INTEGER;
  v_policy_count INTEGER;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'wiselist_collaborators'
  ) INTO v_table_exists;

  -- Check if enum exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'wiselist_role'
  ) INTO v_enum_exists;

  -- Count indexes
  SELECT COUNT(*)
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND tablename = 'wiselist_collaborators'
  INTO v_index_count;

  -- Count RLS policies
  SELECT COUNT(*)
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'wiselist_collaborators'
  INTO v_policy_count;

  -- Report status
  RAISE NOTICE 'Migration 083 completed successfully';
  RAISE NOTICE 'wiselist_collaborators table created: %', v_table_exists;
  RAISE NOTICE 'wiselist_role enum created: %', v_enum_exists;
  RAISE NOTICE 'Indexes created: %', v_index_count;
  RAISE NOTICE 'RLS policies created: %', v_policy_count;
  RAISE NOTICE 'Ready for collaborative sharing and v4.3 referral tracking';
END $$;
