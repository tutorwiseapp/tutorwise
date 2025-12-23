-- ===================================================================
-- Migration: 081_create_wiselists_table.sql
-- Purpose: Create wiselists table for Collaborative Wiselists (v5.7)
-- Created: 2025-11-15
-- Author: Senior Architect
-- Prerequisites: profiles table exists
-- ===================================================================
-- This migration creates the "folders" or "collections" table for users
-- to save and organize tutors/listings. Supports both private and public
-- lists for the "Save & Share" growth engine.
-- ===================================================================

-- Create ENUM for visibility
CREATE TYPE collection_visibility AS ENUM ('private', 'public');

COMMENT ON TYPE collection_visibility IS
'v5.7: Visibility setting for wiselists. Private = owner only, Public = shareable link';

-- Create wiselists table
CREATE TABLE public.wiselists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  visibility collection_visibility NOT NULL DEFAULT 'private',
  slug TEXT UNIQUE, -- For public lists: /w/[slug]
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_list_name_per_user UNIQUE (profile_id, name),
  CONSTRAINT slug_required_for_public CHECK (
    (visibility = 'public' AND slug IS NOT NULL) OR
    (visibility = 'private')
  )
);

-- Create indexes
CREATE INDEX idx_wiselists_profile_id ON public.wiselists(profile_id);
CREATE INDEX idx_wiselists_visibility ON public.wiselists(visibility);
CREATE INDEX idx_wiselists_slug ON public.wiselists(slug) WHERE slug IS NOT NULL;
CREATE INDEX idx_wiselists_created_at ON public.wiselists(created_at DESC);

-- Enable RLS
ALTER TABLE public.wiselists ENABLE ROW LEVEL SECURITY;

-- RLS Policy 1: Users can view their own lists
CREATE POLICY "Users can view their own wiselists"
ON public.wiselists FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

-- RLS Policy 2: Anyone can view public lists
CREATE POLICY "Anyone can view public wiselists"
ON public.wiselists FOR SELECT
TO public
USING (visibility = 'public');

-- RLS Policy 3: Users can create their own lists
CREATE POLICY "Users can create wiselists"
ON public.wiselists FOR INSERT
TO authenticated
WITH CHECK (profile_id = auth.uid());

-- RLS Policy 4: Users can update their own lists
CREATE POLICY "Users can update their own wiselists"
ON public.wiselists FOR UPDATE
TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- RLS Policy 5: Users can delete their own lists
CREATE POLICY "Users can delete their own wiselists"
ON public.wiselists FOR DELETE
TO authenticated
USING (profile_id = auth.uid());

-- Create updated_at trigger
CREATE TRIGGER update_wiselists_updated_at
BEFORE UPDATE ON public.wiselists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.wiselists IS
'v5.7: User-created collections (Wiselists) of tutors or listings.
Supports private planning and public sharing for growth/attribution loops.';

COMMENT ON COLUMN public.wiselists.id IS 'Primary key';
COMMENT ON COLUMN public.wiselists.profile_id IS 'Owner of the wiselist';
COMMENT ON COLUMN public.wiselists.name IS 'Display name (e.g., "A-Level Maths Tutors")';
COMMENT ON COLUMN public.wiselists.description IS 'Optional description';
COMMENT ON COLUMN public.wiselists.visibility IS 'Private (owner only) or Public (shareable)';
COMMENT ON COLUMN public.wiselists.slug IS 'URL-safe slug for public lists (e.g., /w/top-london-tutors)';

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
    AND table_name = 'wiselists'
  ) INTO v_table_exists;

  -- Check if enum exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'collection_visibility'
  ) INTO v_enum_exists;

  -- Count indexes
  SELECT COUNT(*)
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND tablename = 'wiselists'
  INTO v_index_count;

  -- Count RLS policies
  SELECT COUNT(*)
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'wiselists'
  INTO v_policy_count;

  -- Report status
  RAISE NOTICE 'Migration 081 completed successfully';
  RAISE NOTICE 'wiselists table created: %', v_table_exists;
  RAISE NOTICE 'collection_visibility enum created: %', v_enum_exists;
  RAISE NOTICE 'Indexes created: %', v_index_count;
  RAISE NOTICE 'RLS policies created: %', v_policy_count;
  RAISE NOTICE 'Ready for Wiselists (v5.7) - Save & Share growth engine';
END $$;
