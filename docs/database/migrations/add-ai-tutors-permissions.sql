/**
 * Migration: Add AI Tutors Permissions
 * Date: 2026-02-25
 * Purpose: Add 'ai_tutors' resource permissions to admin_permissions table
 *
 * Instructions:
 * 1. Run this SQL in Supabase SQL Editor
 * 2. Or apply via migration system
 * 3. Permissions will be automatically available to admin roles
 */

-- ========================================
-- AI TUTORS PERMISSIONS
-- ========================================

-- Insert permissions for 'ai_tutors' resource
-- These will be available to admins based on their role

-- Superadmin: Full access (already has '*' wildcard, but explicit grants for clarity)
INSERT INTO admin_role_permissions (role, resource, action, description)
VALUES
  ('superadmin', 'ai_tutors', 'view', 'View all AI tutors and analytics'),
  ('superadmin', 'ai_tutors', 'create', 'Create new AI tutors'),
  ('superadmin', 'ai_tutors', 'update', 'Update existing AI tutors'),
  ('superadmin', 'ai_tutors', 'delete', 'Delete AI tutors'),
  ('superadmin', 'ai_tutors', 'manage', 'Full AI tutor management')
ON CONFLICT (role, resource, action) DO NOTHING;

-- Admin: View and manage (for content management admins)
INSERT INTO admin_role_permissions (role, resource, action, description)
VALUES
  ('admin', 'ai_tutors', 'view', 'View all AI tutors and analytics'),
  ('admin', 'ai_tutors', 'create', 'Create new AI tutors'),
  ('admin', 'ai_tutors', 'update', 'Update existing AI tutors'),
  ('admin', 'ai_tutors', 'manage', 'Manage AI tutors')
ON CONFLICT (role, resource, action) DO NOTHING;

-- Systemadmin: View only (for monitoring)
INSERT INTO admin_role_permissions (role, resource, action, description)
VALUES
  ('systemadmin', 'ai_tutors', 'view', 'View AI tutors for system monitoring')
ON CONFLICT (role, resource, action) DO NOTHING;

-- Supportadmin: View only (for support inquiries)
INSERT INTO admin_role_permissions (role, resource, action, description)
VALUES
  ('supportadmin', 'ai_tutors', 'view', 'View AI tutors for support purposes')
ON CONFLICT (role, resource, action) DO NOTHING;

-- ========================================
-- VERIFICATION
-- ========================================

-- Verify permissions were added
SELECT
  role,
  resource,
  action,
  description
FROM admin_role_permissions
WHERE resource = 'ai_tutors'
ORDER BY
  CASE role
    WHEN 'superadmin' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'systemadmin' THEN 3
    WHEN 'supportadmin' THEN 4
  END,
  action;

-- Expected output:
-- role          | resource   | action | description
-- --------------|------------|--------|----------------------------------
-- superadmin    | ai_tutors  | view   | View all AI tutors and analytics
-- superadmin    | ai_tutors  | create | Create new AI tutors
-- superadmin    | ai_tutors  | update | Update existing AI tutors
-- superadmin    | ai_tutors  | delete | Delete AI tutors
-- superadmin    | ai_tutors  | manage | Full AI tutor management
-- admin         | ai_tutors  | view   | View all AI tutors and analytics
-- admin         | ai_tutors  | create | Create new AI tutors
-- admin         | ai_tutors  | update | Update existing AI tutors
-- admin         | ai_tutors  | manage | Manage AI tutors
-- systemadmin   | ai_tutors  | view   | View AI tutors for system monitoring
-- supportadmin  | ai_tutors  | view   | View AI tutors for support purposes
