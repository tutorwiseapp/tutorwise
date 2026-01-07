/*
 * Rollback File: 001_revoke_superadmin_access.sql
 * Purpose: Revoke superadmin access (emergency rollback)
 * Created: 2026-01-07
 *
 * WARNING: This script revokes superadmin access.
 * Only use in emergency situations or for testing.
 *
 * Usage:
 *   psql "postgresql://..." -f tools/database/seeds/rollback/001_revoke_superadmin_access.sql
 */

BEGIN;

-- Revoke superadmin access
UPDATE profiles
SET
  is_admin = false,
  admin_role = NULL,
  admin_role_level = NULL,
  admin_permissions = NULL,
  updated_at = NOW()
WHERE email = 'micquan@gmail.com';

-- Log revocation in audit logs
INSERT INTO admin_audit_logs (
  admin_id,
  action,
  resource_type,
  resource_id,
  details
)
SELECT
  p.id,
  'delete',
  'admin_access',
  p.id,
  jsonb_build_object(
    'old_role', 'superadmin',
    'user_email', p.email,
    'revoked_via', 'rollback_script',
    'script_name', '001_revoke_superadmin_access.sql'
  )
FROM profiles p
WHERE p.email = 'micquan@gmail.com';

\echo 'Superadmin access revoked for micquan@gmail.com'

COMMIT;
