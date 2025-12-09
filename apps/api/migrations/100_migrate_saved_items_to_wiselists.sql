-- ===================================================================
-- Migration: 100_migrate_saved_items_to_wiselists.sql
-- Purpose: Migrate saved_listings and saved_profiles to wiselists
-- Created: 2025-12-09
-- Author: Claude Code
-- ===================================================================
-- This migration:
-- 1. Creates "My Saves" wiselist for each user with saved items
-- 2. Migrates saved_listings → wiselist_items
-- 3. Migrates saved_profiles → wiselist_items
-- 4. Preserves created_at timestamps
-- ===================================================================

-- Step 1: Create "My Saves" wiselist for each user who has saved items
INSERT INTO public.wiselists (profile_id, name, description, visibility, slug, created_at, updated_at)
SELECT DISTINCT
  user_id as profile_id,
  'My Saves',
  'Items you''ve saved for quick access',
  'private'::collection_visibility,
  NULL,
  MIN(created_at) as created_at,
  NOW() as updated_at
FROM (
  SELECT user_id, created_at FROM public.saved_listings
  UNION
  SELECT user_id, created_at FROM public.saved_profiles
) AS all_saves
GROUP BY user_id
ON CONFLICT (profile_id, name) DO NOTHING;

-- Step 2: Migrate saved_listings to wiselist_items
INSERT INTO public.wiselist_items (wiselist_id, profile_id, listing_id, notes, added_by_profile_id, created_at)
SELECT
  w.id as wiselist_id,
  NULL as profile_id,
  sl.listing_id,
  NULL as notes,
  sl.user_id as added_by_profile_id,
  sl.created_at
FROM public.saved_listings sl
JOIN public.wiselists w ON w.profile_id = sl.user_id AND w.name = 'My Saves'
ON CONFLICT (wiselist_id, profile_id, listing_id) DO NOTHING;

-- Step 3: Migrate saved_profiles to wiselist_items
INSERT INTO public.wiselist_items (wiselist_id, profile_id, listing_id, notes, added_by_profile_id, created_at)
SELECT
  w.id as wiselist_id,
  sp.profile_id,
  NULL as listing_id,
  NULL as notes,
  sp.user_id as added_by_profile_id,
  sp.created_at
FROM public.saved_profiles sp
JOIN public.wiselists w ON w.profile_id = sp.user_id AND w.name = 'My Saves'
ON CONFLICT (wiselist_id, profile_id, listing_id) DO NOTHING;

-- Validation report
DO $$
DECLARE
  v_saved_listings_count INTEGER;
  v_saved_profiles_count INTEGER;
  v_migrated_items_count INTEGER;
  v_my_saves_count INTEGER;
BEGIN
  -- Count original saved items
  SELECT COUNT(*) INTO v_saved_listings_count FROM public.saved_listings;
  SELECT COUNT(*) INTO v_saved_profiles_count FROM public.saved_profiles;

  -- Count "My Saves" wiselists created
  SELECT COUNT(*) INTO v_my_saves_count
  FROM public.wiselists
  WHERE name = 'My Saves';

  -- Count migrated items (approximate, may have some duplicates)
  SELECT COUNT(*) INTO v_migrated_items_count
  FROM public.wiselist_items wi
  JOIN public.wiselists w ON w.id = wi.wiselist_id
  WHERE w.name = 'My Saves';

  -- Report status
  RAISE NOTICE 'Migration 100 completed successfully';
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'Original saved_listings: %', v_saved_listings_count;
  RAISE NOTICE 'Original saved_profiles: %', v_saved_profiles_count;
  RAISE NOTICE '"My Saves" wiselists created: %', v_my_saves_count;
  RAISE NOTICE 'Total items migrated: %', v_migrated_items_count;
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Verify data in wiselist_items';
  RAISE NOTICE '2. Drop old tables: DROP TABLE saved_listings CASCADE;';
  RAISE NOTICE '3. Drop old tables: DROP TABLE saved_profiles CASCADE;';
END $$;
