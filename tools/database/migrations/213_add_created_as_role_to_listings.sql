/**
 * Migration 213: Add created_as_role to listings table
 * Created: 2026-01-23
 * Purpose: Track which role the user was in when they created a listing
 * Context: Role-based filtering v2.0 - Separate listing inventories per role
 *
 * Business Logic:
 * - Client creates request listings (listing_type = 'request')
 * - Tutor creates tutoring service listings (listing_type NOT IN ('request', 'job'))
 * - Agent creates job listings + tutoring services (listing_type = 'job' OR other services)
 *
 * With created_as_role, each role has its own separate inventory:
 * - A listing created as "agent" is only visible when user is in "agent" role
 * - A listing created as "tutor" is only visible when user is in "tutor" role
 * - A listing created as "client" is only visible when user is in "client" role
 */

BEGIN;

-- ============================================================================
-- Add created_as_role column to listings table
-- ============================================================================

ALTER TABLE listings
ADD COLUMN IF NOT EXISTS created_as_role VARCHAR(20);

COMMENT ON COLUMN listings.created_as_role IS
'The role the user was in when they created this listing (client, tutor, agent). Used for role-based filtering.';

-- ============================================================================
-- Create index for efficient filtering
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_listings_created_as_role
  ON listings(created_as_role);

CREATE INDEX IF NOT EXISTS idx_listings_profile_created_role
  ON listings(profile_id, created_as_role);

-- ============================================================================
-- Backfill existing listings based on listing_type
-- ============================================================================

-- Strategy: Infer created_as_role from listing_type for existing records
-- - listing_type = 'request' → created_as_role = 'client'
-- - listing_type = 'job' → created_as_role = 'agent'
-- - All other listing types → created_as_role = 'tutor'

UPDATE listings
SET created_as_role = CASE
  WHEN listing_type = 'request' THEN 'client'
  WHEN listing_type = 'job' THEN 'agent'
  ELSE 'tutor'
END
WHERE created_as_role IS NULL;

-- ============================================================================
-- Add NOT NULL constraint after backfill
-- ============================================================================

ALTER TABLE listings
ALTER COLUMN created_as_role SET NOT NULL;

-- ============================================================================
-- Create trigger to auto-set created_as_role on new listings
-- ============================================================================

CREATE OR REPLACE FUNCTION set_listing_created_as_role()
RETURNS TRIGGER AS $$
BEGIN
  -- If created_as_role is already set (from application), keep it
  -- Otherwise, infer from listing_type as fallback
  IF NEW.created_as_role IS NULL THEN
    NEW.created_as_role := CASE
      WHEN NEW.listing_type = 'request' THEN 'client'
      WHEN NEW.listing_type = 'job' THEN 'agent'
      ELSE 'tutor'
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_listing_created_as_role
  BEFORE INSERT ON listings
  FOR EACH ROW
  EXECUTE FUNCTION set_listing_created_as_role();

COMMENT ON FUNCTION set_listing_created_as_role() IS
'Trigger function to auto-set created_as_role on new listings if not explicitly provided';

-- ============================================================================
-- Verification queries
-- ============================================================================

DO $$
DECLARE
  v_total_listings INTEGER;
  v_client_listings INTEGER;
  v_tutor_listings INTEGER;
  v_agent_listings INTEGER;
  v_null_role_listings INTEGER;
BEGIN
  -- Count listings by role
  SELECT COUNT(*) INTO v_total_listings FROM listings;
  SELECT COUNT(*) INTO v_client_listings FROM listings WHERE created_as_role = 'client';
  SELECT COUNT(*) INTO v_tutor_listings FROM listings WHERE created_as_role = 'tutor';
  SELECT COUNT(*) INTO v_agent_listings FROM listings WHERE created_as_role = 'agent';
  SELECT COUNT(*) INTO v_null_role_listings FROM listings WHERE created_as_role IS NULL;

  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Migration 213: Add created_as_role to listings - COMPLETE';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Backfill Results:';
  RAISE NOTICE '  Total listings: %', v_total_listings;
  RAISE NOTICE '  Client listings (requests): %', v_client_listings;
  RAISE NOTICE '  Tutor listings (services): %', v_tutor_listings;
  RAISE NOTICE '  Agent listings (jobs): %', v_agent_listings;
  RAISE NOTICE '  NULL role (should be 0): %', v_null_role_listings;
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Update listing creation API to set created_as_role = active_role';
  RAISE NOTICE '  2. Update listings page filter to use created_as_role';
  RAISE NOTICE '  3. Test role switching to verify separate inventories';
  RAISE NOTICE '';
END $$;

COMMIT;

-- ============================================================================
-- Manual verification queries (run after migration)
-- ============================================================================
/*
-- Check distribution of listings by role
SELECT created_as_role, listing_type, COUNT(*) as count
FROM listings
GROUP BY created_as_role, listing_type
ORDER BY created_as_role, listing_type;

-- Check a specific user's listings across roles
SELECT id, title, listing_type, created_as_role, status
FROM listings
WHERE profile_id = 'your-user-id'
ORDER BY created_as_role, created_at DESC;
*/
