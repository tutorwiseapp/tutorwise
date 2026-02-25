-- ===================================================================
-- Migration: 302_add_is_platform_owned_to_ai_tutors.sql
-- Purpose: Add is_platform_owned flag to ai_tutors table
-- Version: v1.0
-- Date: 2026-02-24
-- ===================================================================
-- This migration adds support for platform-owned AI tutors that are
-- created and managed by platform admins, appearing in the marketplace
-- with special badges and generating 100% revenue for the platform.
-- ===================================================================

-- Add is_platform_owned column to ai_tutors table
ALTER TABLE public.ai_tutors
ADD COLUMN IF NOT EXISTS is_platform_owned BOOLEAN NOT NULL DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.ai_tutors.is_platform_owned IS 'TRUE if AI tutor is owned by platform (admin-created), FALSE if user-created';

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_ai_tutors_is_platform_owned ON public.ai_tutors(is_platform_owned);

-- Create index for filtering platform-owned published tutors (common query)
CREATE INDEX IF NOT EXISTS idx_ai_tutors_platform_published
ON public.ai_tutors(is_platform_owned, status)
WHERE is_platform_owned = true AND status = 'published';

-- Update existing AI tutors to be user-created (default)
UPDATE public.ai_tutors
SET is_platform_owned = false
WHERE is_platform_owned IS NULL;

-- Add RLS policy to allow admins to create platform-owned AI tutors
-- (assumes existing RLS policies allow users to create their own)
DROP POLICY IF EXISTS ai_tutors_admin_manage_platform ON public.ai_tutors;

CREATE POLICY ai_tutors_admin_manage_platform ON public.ai_tutors
FOR ALL
TO authenticated
USING (
  -- Admins can manage all platform-owned AI tutors
  (is_platform_owned = true AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_admin = true
  ))
  OR
  -- Users can manage their own AI tutors
  (is_platform_owned = false AND owner_id = auth.uid())
)
WITH CHECK (
  -- Admins can create platform-owned AI tutors
  (is_platform_owned = true AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_admin = true
  ))
  OR
  -- Users can create their own AI tutors (not platform-owned)
  (is_platform_owned = false AND owner_id = auth.uid())
);

-- Migration complete
SELECT 'Migration 302: is_platform_owned column added to ai_tutors table' as status;
