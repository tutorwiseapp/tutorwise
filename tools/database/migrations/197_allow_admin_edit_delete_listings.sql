/*
 * Migration: 197_allow_admin_edit_delete_listings.sql
 * Purpose: Allow admins to delete any listing (not just their own)
 * Created: 2026-01-20
 * Updated: 2026-01-21 - Removed admin UPDATE capability (admins can only view/delete)
 *
 * This migration updates RLS policies on the listings table to allow:
 * 1. Admins to DELETE any listing
 * 2. Regular users can still only edit/delete their own listings
 */

-- ============================================================================
-- 1. Update DELETE policy to allow admins
-- ============================================================================

-- Drop existing delete policy
DROP POLICY IF EXISTS listings_delete_own ON listings;

-- Recreate delete policy: Users can delete their own listings OR admins can delete any listing
CREATE POLICY listings_delete_own ON listings
  FOR DELETE
  USING (
    auth.uid() = profile_id
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

COMMENT ON POLICY listings_delete_own ON listings IS
  'Users can delete their own listings. Admins can delete any listing.';

-- ============================================================================
-- 2. Ensure UPDATE policy only allows owners (not admins)
-- ============================================================================

-- Drop existing update policy
DROP POLICY IF EXISTS listings_update_own ON listings;

-- Recreate update policy: Users can ONLY update their own listings
CREATE POLICY listings_update_own ON listings
  FOR UPDATE
  USING (auth.uid() = profile_id);

COMMENT ON POLICY listings_update_own ON listings IS
  'Users can only update their own listings. Admins cannot edit listings.';

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 197_allow_admin_edit_delete_listings.sql completed successfully';
  RAISE NOTICE 'Updated DELETE policy: admins can delete any listing';
  RAISE NOTICE 'Updated UPDATE policy: only owners can update listings (admins cannot)';
END $$;
