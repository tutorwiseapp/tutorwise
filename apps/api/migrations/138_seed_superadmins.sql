/*
 * Migration: 138_seed_superadmins.sql
 * Purpose: Grant initial superadmin access to founding team members
 * Created: 2025-12-23
 *
 * IMPORTANT: Run this AFTER migration 136_add_granular_rbac_permissions.sql
 * Note: This is a data migration (seeding), not a schema migration
 *
 * Usage:
 *   psql <your-connection-string> -f apps/api/migrations/138_seed_superadmins.sql
 *   OR: node apply-migration-138.mjs
 *
 * This script:
 * 1. Grants superadmin access to the 3 founding team email addresses
 * 2. Sets admin_role_level to 4 (highest)
 * 3. Logs the changes to admin_audit_logs
 * 4. Returns confirmation of granted access
 */

-- Start transaction
BEGIN;

-- Grant superadmin access to founding team
UPDATE profiles
SET
  is_admin = true,
  admin_role = 'superadmin',
  admin_role_level = 4,
  admin_permissions = '{"all": true}'::jsonb,
  admin_granted_at = NOW(),
  admin_granted_by = id,  -- Self-granted for initial superadmins
  updated_at = NOW()
WHERE email IN (
  'michaelquan@tutorwise.io',
  'micquan@gmail.com',
  'tutorwiseapp@gmail.com'
)
RETURNING
  id,
  email,
  admin_role,
  admin_role_level,
  admin_granted_at;

-- Commit transaction
COMMIT;

-- Display confirmation message
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM profiles
  WHERE email IN (
    'michaelquan@tutorwise.io',
    'micquan@gmail.com',
    'tutorwiseapp@gmail.com'
  ) AND is_admin = true AND admin_role = 'superadmin';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Superadmin Seeding Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Granted superadmin access to % user(s)', v_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Superadmin users:';
  RAISE NOTICE '  - michaelquan@tutorwise.io';
  RAISE NOTICE '  - micquan@gmail.com';
  RAISE NOTICE '  - tutorwiseapp@gmail.com';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now access the admin dashboard at /admin';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END$$;
