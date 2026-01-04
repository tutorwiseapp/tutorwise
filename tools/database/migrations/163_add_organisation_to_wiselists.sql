-- Migration 163: Add organisation_id support to wiselist_items
-- Purpose: Allow organisations to be saved to wiselists alongside profiles and listings
-- Created: 2026-01-04

BEGIN;

-- Step 1: Add organisation_id column
ALTER TABLE wiselist_items
ADD COLUMN organisation_id UUID REFERENCES connection_groups(id) ON DELETE CASCADE;

-- Step 2: Create index for organisation_id lookups
CREATE INDEX idx_wiselist_items_organisation_id
ON wiselist_items(organisation_id)
WHERE organisation_id IS NOT NULL;

-- Step 3: Drop old check constraint
ALTER TABLE wiselist_items
DROP CONSTRAINT IF EXISTS check_item_has_target;

-- Step 4: Add new check constraint that allows exactly one of profile_id, listing_id, or organisation_id
ALTER TABLE wiselist_items
ADD CONSTRAINT check_item_has_target CHECK (
  (profile_id IS NOT NULL AND listing_id IS NULL AND organisation_id IS NULL) OR
  (profile_id IS NULL AND listing_id IS NOT NULL AND organisation_id IS NULL) OR
  (profile_id IS NULL AND listing_id IS NULL AND organisation_id IS NOT NULL)
);

-- Step 5: Drop old unique constraint
ALTER TABLE wiselist_items
DROP CONSTRAINT IF EXISTS unique_item_in_list;

-- Step 6: Add new unique constraint that includes organisation_id
CREATE UNIQUE INDEX unique_item_in_list
ON wiselist_items(wiselist_id, COALESCE(profile_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(listing_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(organisation_id, '00000000-0000-0000-0000-000000000000'::uuid));

COMMIT;
