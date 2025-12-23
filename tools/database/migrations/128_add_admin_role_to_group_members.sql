-- Migration: 128_add_admin_role_to_group_members.sql
-- Purpose: Add admin role support to organisation members
-- Created: 2025-12-17
-- Version: v7.2 - Admin role management
--
-- This migration adds role column to group_members table to support:
-- - 'member': Regular member (default) - sees only their own analytics
-- - 'admin': Admin member - sees full organisation analytics like owner

-- ============================================================================
-- 1. Add role column to group_members table
-- ============================================================================

ALTER TABLE public.group_members
ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('member', 'admin')) DEFAULT 'member';

COMMENT ON COLUMN public.group_members.role IS
  'Member role: "member" (default) sees own data, "admin" sees org-wide data like owner';

-- ============================================================================
-- 2. Create index for role lookups
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_group_members_role
  ON public.group_members(group_id, role)
  WHERE role = 'admin';

COMMENT ON INDEX idx_group_members_role IS
  'Optimize queries for finding admin members in organisations';

-- ============================================================================
-- 3. Create function to check if user is admin
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_organisation_admin(
  org_id UUID,
  user_profile_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.group_members gm
    JOIN public.profile_graph pg ON pg.id = gm.connection_id
    WHERE gm.group_id = org_id
      AND gm.role = 'admin'
      AND (pg.source_profile_id = user_profile_id OR pg.target_profile_id = user_profile_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_organisation_admin IS
  'v7.2: Check if a user has admin role in an organisation';

GRANT EXECUTE ON FUNCTION public.is_organisation_admin TO authenticated;

-- ============================================================================
-- 4. Add RLS policy for admins to manage members
-- ============================================================================

-- Allow admins to view all members in their organisation
CREATE POLICY "Admins can view all members"
  ON public.group_members FOR SELECT
  USING (
    group_id IN (
      SELECT gm.group_id
      FROM public.group_members gm
      JOIN public.profile_graph pg ON pg.id = gm.connection_id
      WHERE gm.role = 'admin'
        AND (pg.source_profile_id = auth.uid() OR pg.target_profile_id = auth.uid())
    )
  );

-- Allow admins to update member roles (but not their own)
CREATE POLICY "Admins can update member roles"
  ON public.group_members FOR UPDATE
  USING (
    group_id IN (
      SELECT gm.group_id
      FROM public.group_members gm
      JOIN public.profile_graph pg ON pg.id = gm.connection_id
      WHERE gm.role = 'admin'
        AND (pg.source_profile_id = auth.uid() OR pg.target_profile_id = auth.uid())
    )
    AND connection_id != (
      -- Prevent admins from changing their own role
      SELECT gm2.connection_id
      FROM public.group_members gm2
      JOIN public.profile_graph pg2 ON pg2.id = gm2.connection_id
      WHERE (pg2.source_profile_id = auth.uid() OR pg2.target_profile_id = auth.uid())
        AND gm2.group_id = group_members.group_id
    )
  );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 128 complete: Admin role support added';
  RAISE NOTICE '  ✓ Added role column to group_members (member/admin)';
  RAISE NOTICE '  ✓ Created index for admin role lookups';
  RAISE NOTICE '  ✓ Created is_organisation_admin() function';
  RAISE NOTICE '  ✓ Added RLS policies for admin member management';
END $$;
