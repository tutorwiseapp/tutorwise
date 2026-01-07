/*
 * Seed File: 001_grant_superadmin_access.sql
 * Purpose: Grant superadmin access to platform owners and key personnel
 * Created: 2026-01-07
 * Security: This file grants highest level admin access
 *
 * IMPORTANT: This file should be:
 * 1. Version controlled (for disaster recovery)
 * 2. Protected (restrict access to authorized personnel only)
 * 3. Auditable (track who runs it and when)
 * 4. Idempotent (safe to run multiple times)
 *
 * Usage:
 *   psql "postgresql://..." -f tools/database/seeds/001_grant_superadmin_access.sql
 *
 * Rollback:
 *   See tools/database/seeds/rollback/001_revoke_superadmin_access.sql
 */

-- ============================================================================
-- BEGIN TRANSACTION
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Grant Superadmin Access to Platform Owners
-- ============================================================================

-- Update profile to grant superadmin access
-- This is idempotent - safe to run multiple times
UPDATE profiles
SET
  is_admin = true,
  admin_role = 'superadmin',
  admin_role_level = 4,
  admin_permissions = jsonb_build_object(
    'description', 'Platform owner with full system access',
    'granted_at', NOW(),
    'granted_reason', 'Platform owner - initial superadmin grant'
  ),
  admin_granted_at = NOW(),
  updated_at = NOW()
WHERE email = 'micquan@gmail.com'
  AND (is_admin IS NOT TRUE OR admin_role != 'superadmin');  -- Only update if not already set

-- ============================================================================
-- 2. Log Admin Access Grant in Audit Logs
-- ============================================================================

-- Insert audit log entry for admin access grant
-- This creates a permanent audit trail
INSERT INTO admin_audit_logs (
  admin_id,
  action,
  resource_type,
  resource_id,
  details
)
SELECT
  p.id,
  'create',
  'admin_access',
  p.id,
  jsonb_build_object(
    'role', 'superadmin',
    'user_email', p.email,
    'granted_via', 'seed_script',
    'script_name', '001_grant_superadmin_access.sql',
    'granted_reason', 'Platform owner - initial superadmin setup'
  )
FROM profiles p
WHERE p.email = 'micquan@gmail.com'
  AND NOT EXISTS (
    -- Avoid duplicate audit entries
    SELECT 1 FROM admin_audit_logs aal
    WHERE aal.admin_id = p.id
      AND aal.action = 'create'
      AND aal.resource_type = 'admin_access'
      AND aal.details->>'script_name' = '001_grant_superadmin_access.sql'
  );

-- ============================================================================
-- 3. Create Email Notification (Optional - will be sent by background job)
-- ============================================================================

-- Queue email notification to inform user of admin access
INSERT INTO admin_activity_notifications (
  recipient_email,
  notification_type,
  subject,
  body,
  metadata
)
SELECT
  p.email,
  'admin_granted',
  'Superadmin Access Granted - Tutorwise Platform',
  format(
    E'Hello %s,\n\nYou have been granted Superadmin access to the Tutorwise admin dashboard.\n\n' ||
    'Role: Superadmin (Level 4)\n' ||
    'Permissions: Full platform access\n' ||
    'Granted: %s\n\n' ||
    'You can access the admin dashboard at: /admin\n\n' ||
    'Security Notice:\n' ||
    '- Your admin actions are logged in the audit system\n' ||
    '- You can grant/revoke admin access to other users\n' ||
    '- You have access to all platform data and settings\n' ||
    '- Please use these privileges responsibly\n\n' ||
    'Questions? Contact platform@tutorwise.com',
    COALESCE(p.first_name, 'Admin'),
    TO_CHAR(NOW(), 'DD Mon YYYY at HH24:MI')
  ),
  jsonb_build_object(
    'role', 'superadmin',
    'granted_by', 'system',
    'granted_via', 'seed_script'
  )
FROM profiles p
WHERE p.email = 'micquan@gmail.com'
  AND NOT EXISTS (
    -- Avoid duplicate notifications
    SELECT 1 FROM admin_activity_notifications aan
    WHERE aan.recipient_email = p.email
      AND aan.notification_type = 'admin_granted'
      AND aan.metadata->>'granted_via' = 'seed_script'
  );

-- ============================================================================
-- 4. Verification Query
-- ============================================================================

-- Display the granted admin access for verification
\echo ''
\echo '═══════════════════════════════════════════════════════════════════'
\echo 'SUPERADMIN ACCESS GRANTED'
\echo '═══════════════════════════════════════════════════════════════════'
\echo ''

SELECT
  p.id,
  p.email,
  p.first_name || ' ' || COALESCE(p.last_name, '') as full_name,
  p.is_admin,
  p.admin_role,
  p.admin_role_level,
  p.admin_granted_at,
  p.last_admin_access
FROM profiles p
WHERE p.email = 'micquan@gmail.com';

\echo ''
\echo 'Verification:'
\echo '- is_admin should be: true'
\echo '- admin_role should be: superadmin'
\echo '- admin_role_level should be: 4'
\echo ''

-- ============================================================================
-- 5. Show Superadmin Permissions
-- ============================================================================

\echo 'Superadmin Permissions (from role):'
\echo ''

SELECT
  resource,
  action,
  description
FROM admin_role_permissions
WHERE role = 'superadmin'
ORDER BY resource, action;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════'

-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================

COMMIT;

-- ============================================================================
-- Post-Run Instructions
-- ============================================================================

\echo ''
\echo 'SUCCESS: Superadmin access granted!'
\echo ''
\echo 'Next Steps:'
\echo '1. Verify admin access by visiting: http://localhost:3000/admin'
\echo '2. Check audit logs: SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT 5;'
\echo '3. Review admin permissions: SELECT * FROM get_user_admin_permissions((SELECT id FROM profiles WHERE email = ''micquan@gmail.com''));'
\echo ''
\echo 'Security Reminders:'
\echo '- All admin actions are logged in admin_audit_logs'
\echo '- You can grant/revoke admin roles via the Admin > Accounts page'
\echo '- Superadmin access should be restricted to trusted personnel only'
\echo '- Review admin activity logs regularly for security audits'
\echo ''

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Seed script 001_grant_superadmin_access.sql completed at %', NOW();
  RAISE NOTICE 'Superadmin access granted to: micquan@gmail.com';
  RAISE NOTICE '';
END$$;
