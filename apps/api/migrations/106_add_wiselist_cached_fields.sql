-- ============================================================================
-- Migration 106: Add Wiselist Item Cached Fields
-- ============================================================================
-- Purpose: Add cached listing/profile data to wiselist_items for better UX
-- Author: AI Architect
-- Date: 2025-12-10
-- Related: Migration 104 (Booking Snapshot), Migration 105 (Review Snapshot)
--
-- Problem:
-- - Wiselist items only store listing_id or profile_id
-- - If listing/profile is deleted, wiselist item shows "Unknown" or broken
-- - Have to join to listings/profiles tables for basic display
-- - Poor UX when saved items are removed from platform
--
-- Solution:
-- Add cached fields from listing/profile at save time:
-- - cached_type: 'listing' | 'profile' (what type of item)
-- - cached_title: Listing title or profile full_name
-- - cached_subjects: Subject categories (for listings)
-- - cached_tutor_name: Tutor name (for listings)
-- - cached_avatar_url: Avatar URL (for profiles or listing tutor)
-- - cached_active_role: Profile's active role (for profiles)
--
-- Benefits:
-- 1. Wiselist items show cached data even if listing/profile deleted
-- 2. Better UX - show "Maths Tutoring (deleted)" instead of blank
-- 3. Performance - no joins needed for basic display
-- 4. Historical record of what was saved
-- ============================================================================

-- Step 1: Add cached columns
ALTER TABLE wiselist_items ADD COLUMN IF NOT EXISTS cached_type TEXT;
ALTER TABLE wiselist_items ADD COLUMN IF NOT EXISTS cached_title TEXT;
ALTER TABLE wiselist_items ADD COLUMN IF NOT EXISTS cached_subjects TEXT[];
ALTER TABLE wiselist_items ADD COLUMN IF NOT EXISTS cached_tutor_name TEXT;
ALTER TABLE wiselist_items ADD COLUMN IF NOT EXISTS cached_avatar_url TEXT;
ALTER TABLE wiselist_items ADD COLUMN IF NOT EXISTS cached_active_role TEXT;

COMMENT ON COLUMN wiselist_items.cached_type IS 'Item type: listing or profile';
COMMENT ON COLUMN wiselist_items.cached_title IS 'Listing title or profile full_name (cached at save time)';
COMMENT ON COLUMN wiselist_items.cached_subjects IS 'Subjects for listings (cached from listing.subjects)';
COMMENT ON COLUMN wiselist_items.cached_tutor_name IS 'Tutor name for listings (cached from listing tutor)';
COMMENT ON COLUMN wiselist_items.cached_avatar_url IS 'Avatar URL (profile or listing tutor)';
COMMENT ON COLUMN wiselist_items.cached_active_role IS 'Active role for profile items';

-- Step 2: Backfill existing wiselist items from listings
UPDATE wiselist_items wi
SET
  cached_type = 'listing',
  cached_title = l.title,
  cached_subjects = l.subjects,
  cached_tutor_name = p.full_name,
  cached_avatar_url = p.avatar_url
FROM listings l
LEFT JOIN profiles p ON l.profile_id = p.id
WHERE wi.listing_id = l.id
  AND wi.cached_type IS NULL;

-- Step 3: Backfill existing wiselist items from profiles
UPDATE wiselist_items wi
SET
  cached_type = 'profile',
  cached_title = p.full_name,
  cached_avatar_url = p.avatar_url,
  cached_active_role = p.active_role
FROM profiles p
WHERE wi.profile_id = p.id
  AND wi.cached_type IS NULL;

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wiselist_items_cached_subjects ON wiselist_items USING GIN (cached_subjects);
CREATE INDEX IF NOT EXISTS idx_wiselist_items_cached_type ON wiselist_items (cached_type);

-- Step 5: Show migration results
DO $$
DECLARE
  total_items INTEGER;
  items_with_cache INTEGER;
  listing_items INTEGER;
  profile_items INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_items FROM wiselist_items;
  SELECT COUNT(*) INTO items_with_cache FROM wiselist_items WHERE cached_type IS NOT NULL;
  SELECT COUNT(*) INTO listing_items FROM wiselist_items WHERE cached_type = 'listing';
  SELECT COUNT(*) INTO profile_items FROM wiselist_items WHERE cached_type = 'profile';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 106 Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total wiselist items: %', total_items;
  RAISE NOTICE 'Items with cached data: %', items_with_cache;
  RAISE NOTICE 'Listing items: %', listing_items;
  RAISE NOTICE 'Profile items: %', profile_items;
  RAISE NOTICE '========================================';
END $$;
