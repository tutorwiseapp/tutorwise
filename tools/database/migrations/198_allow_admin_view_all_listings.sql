/*
 * Migration: 198_allow_admin_view_all_listings.sql
 * Purpose: Allow admins to view all listings (not just their own or published ones)
 * Created: 2026-01-20
 *
 * This migration updates the SELECT policy on listings table to allow:
 * 1. Users can view their own listings (any status)
 * 2. Anyone can view published listings
 * 3. Admins can view ALL listings (any status, any owner)
 */

-- ============================================================================
-- Update SELECT policy to allow admins to view all listings
-- ============================================================================

-- Drop existing select policies
DROP POLICY IF EXISTS listings_select_own ON listings;
DROP POLICY IF EXISTS listings_select_published ON listings;

-- Create a single comprehensive SELECT policy
CREATE POLICY listings_select_policy ON listings
  FOR SELECT
  USING (
    -- Published listings are visible to everyone
    status = 'published'
    OR
    -- Users can see their own listings
    auth.uid() = profile_id
    OR
    -- Admins can see all listings
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

COMMENT ON POLICY listings_select_policy ON listings IS
  'Published listings visible to all. Users can view their own listings. Admins can view all listings.';

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 198_allow_admin_view_all_listings.sql completed successfully';
  RAISE NOTICE 'Updated SELECT policy: admins can now view all listings regardless of status';
END $$;
