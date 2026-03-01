-- ============================================================================
-- Migration: 328 - Add CAS RBAC Permissions
-- ============================================================================
-- Purpose: Integrate CAS into the granular RBAC permission system.
--          Adds 'cas' resource with role-based permissions for viewing,
--          approving deployments, and managing workflows/agents.
-- Created: 2026-03-01
--
-- Depends on: Migration 136 (granular RBAC system)
-- ============================================================================

-- Seed CAS permissions for each admin role

-- SUPERADMIN: Full CAS access (already covered by wildcard '*'/'*', but explicit for clarity)
INSERT INTO admin_role_permissions (role, resource, action, description) VALUES
  ('superadmin', 'cas', '*', 'Full access to CAS platform')
ON CONFLICT (role, resource, action) DO NOTHING;

-- ADMIN: View, approve deployments, manage workflows
INSERT INTO admin_role_permissions (role, resource, action, description) VALUES
  ('admin', 'cas', 'view', 'View CAS dashboard, agents, metrics, and workflow status'),
  ('admin', 'cas', 'approve', 'Approve or reject CAS deployment requests'),
  ('admin', 'cas', 'manage', 'Trigger workflows, configure agents, manage CAS settings')
ON CONFLICT (role, resource, action) DO NOTHING;

-- SYSTEMADMIN: View-only access
INSERT INTO admin_role_permissions (role, resource, action, description) VALUES
  ('systemadmin', 'cas', 'view', 'View CAS dashboard and agent status (read-only)')
ON CONFLICT (role, resource, action) DO NOTHING;

-- SUPPORTADMIN: No CAS access (not relevant to user support role)

-- ============================================================================
-- Verification
-- ============================================================================
-- Check CAS permissions are seeded:
--   SELECT role, resource, action, description
--   FROM admin_role_permissions
--   WHERE resource = 'cas'
--   ORDER BY role, action;
--
-- Test permission check:
--   SELECT has_admin_permission(
--     '<admin-user-id>',
--     'cas',
--     'approve'
--   );
-- ============================================================================
