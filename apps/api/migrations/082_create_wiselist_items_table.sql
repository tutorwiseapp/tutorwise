-- ===================================================================
-- Migration: 082_create_wiselist_items_table.sql
-- Purpose: Create wiselist_items table for Collaborative Wiselists (v5.7)
-- Created: 2025-11-15
-- Author: Senior Architect
-- Prerequisites: wiselists, profiles, listings tables exist
-- ===================================================================
-- This polymorphic table stores the items (Profiles or Listings) inside
-- each Wiselist. Supports saving both tutor profiles and service listings.
-- ===================================================================

CREATE TABLE public.wiselist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wiselist_id UUID NOT NULL REFERENCES public.wiselists(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  notes TEXT,
  added_by_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_item_in_list UNIQUE (wiselist_id, profile_id, listing_id),
  CONSTRAINT check_item_has_target CHECK (
    (profile_id IS NOT NULL AND listing_id IS NULL) OR
    (profile_id IS NULL AND listing_id IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX idx_wiselist_items_wiselist_id ON public.wiselist_items(wiselist_id);
CREATE INDEX idx_wiselist_items_profile_id ON public.wiselist_items(profile_id) WHERE profile_id IS NOT NULL;
CREATE INDEX idx_wiselist_items_listing_id ON public.wiselist_items(listing_id) WHERE listing_id IS NOT NULL;
CREATE INDEX idx_wiselist_items_added_by ON public.wiselist_items(added_by_profile_id);
CREATE INDEX idx_wiselist_items_created_at ON public.wiselist_items(created_at DESC);

-- Enable RLS
ALTER TABLE public.wiselist_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy 1: Users can view items in their own lists
CREATE POLICY "Users can view items in their wiselists"
ON public.wiselist_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.wiselists
    WHERE wiselists.id = wiselist_id
    AND wiselists.profile_id = auth.uid()
  )
);

-- RLS Policy 2: Users can view items in lists they collaborate on
CREATE POLICY "Collaborators can view wiselist items"
ON public.wiselist_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.wiselist_collaborators
    WHERE wiselist_collaborators.wiselist_id = wiselist_items.wiselist_id
    AND wiselist_collaborators.profile_id = auth.uid()
  )
);

-- RLS Policy 3: Anyone can view items in public lists
CREATE POLICY "Anyone can view items in public wiselists"
ON public.wiselist_items FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.wiselists
    WHERE wiselists.id = wiselist_id
    AND wiselists.visibility = 'public'
  )
);

-- RLS Policy 4: Users can add items to their own lists
CREATE POLICY "Users can add items to their wiselists"
ON public.wiselist_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.wiselists
    WHERE wiselists.id = wiselist_id
    AND wiselists.profile_id = auth.uid()
  )
  AND added_by_profile_id = auth.uid()
);

-- RLS Policy 5: Collaborators can add items (if they have EDITOR role)
CREATE POLICY "Editors can add items to shared wiselists"
ON public.wiselist_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.wiselist_collaborators
    WHERE wiselist_collaborators.wiselist_id = wiselist_items.wiselist_id
    AND wiselist_collaborators.profile_id = auth.uid()
    AND wiselist_collaborators.role IN ('OWNER', 'EDITOR')
  )
  AND added_by_profile_id = auth.uid()
);

-- RLS Policy 6: Users can update items in their own lists
CREATE POLICY "Users can update items in their wiselists"
ON public.wiselist_items FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.wiselists
    WHERE wiselists.id = wiselist_id
    AND wiselists.profile_id = auth.uid()
  )
);

-- RLS Policy 7: Users can delete items from their own lists
CREATE POLICY "Users can delete items from their wiselists"
ON public.wiselist_items FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.wiselists
    WHERE wiselists.id = wiselist_id
    AND wiselists.profile_id = auth.uid()
  )
);

-- Add comments
COMMENT ON TABLE public.wiselist_items IS
'v5.7: Items (tutor profiles or listings) saved to a Wiselist.
Polymorphic table supporting both profile_id and listing_id.';

COMMENT ON COLUMN public.wiselist_items.id IS 'Primary key';
COMMENT ON COLUMN public.wiselist_items.wiselist_id IS 'Parent wiselist';
COMMENT ON COLUMN public.wiselist_items.profile_id IS 'Tutor profile (mutually exclusive with listing_id)';
COMMENT ON COLUMN public.wiselist_items.listing_id IS 'Service listing (mutually exclusive with profile_id)';
COMMENT ON COLUMN public.wiselist_items.notes IS 'Optional user notes about the item';
COMMENT ON COLUMN public.wiselist_items.added_by_profile_id IS 'Who added this item (for collaboration tracking)';

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
    AND table_name = 'wiselist_items'
  ) INTO v_table_exists;

  -- Count indexes
  SELECT COUNT(*)
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND tablename = 'wiselist_items'
  INTO v_index_count;

  -- Count RLS policies
  SELECT COUNT(*)
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'wiselist_items'
  INTO v_policy_count;

  -- Report status
  RAISE NOTICE 'Migration 082 completed successfully';
  RAISE NOTICE 'wiselist_items table created: %', v_table_exists;
  RAISE NOTICE 'Indexes created: %', v_index_count;
  RAISE NOTICE 'RLS policies created: %', v_policy_count;
  RAISE NOTICE 'Polymorphic support: profile_id OR listing_id';
END $$;
