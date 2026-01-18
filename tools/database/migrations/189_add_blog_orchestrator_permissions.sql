-- Migration 189: Add Blog Orchestrator RBAC Permissions
-- Purpose: Define permissions for Blog Demand Orchestrator dashboard
-- Created: 2026-01-18
-- Aligned with: Admin RBAC system (Migration 135-136)

-- Add blog resource permissions to admin_role_permissions table
-- This ensures Blog Orchestrator follows the same RBAC pattern as other admin features

INSERT INTO admin_role_permissions (role, resource, action, description)
VALUES
  -- Superadmin: Full blog access
  ('superadmin', 'blog', '*', 'Full access to blog management and analytics'),

  -- Admin: View and manage blog analytics
  ('admin', 'blog', 'view_analytics', 'View Blog Demand Orchestrator analytics'),
  ('admin', 'blog', 'export_data', 'Export blog attribution data'),
  ('admin', 'blog', 'manage_content', 'Manage blog articles and categories'),

  -- System Admin: View-only analytics
  ('systemadmin', 'blog', 'view_analytics', 'View Blog Demand Orchestrator analytics (read-only)')

ON CONFLICT (role, resource, action) DO NOTHING;

-- Verify permissions were added
SELECT
  role,
  resource,
  action,
  description
FROM admin_role_permissions
WHERE resource = 'blog'
ORDER BY
  CASE role
    WHEN 'superadmin' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'systemadmin' THEN 3
    ELSE 4
  END,
  action;
