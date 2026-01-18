/**
 * Migration: 192_update_rbac_permissions_for_resources.sql
 * Purpose: Update RBAC permissions from 'blog' to 'resources'
 * Created: 2026-01-18
 * Depends on: 191_rename_blog_to_resources.sql
 *
 * STRATEGY:
 * - Add new 'resources' permissions
 * - Keep 'blog' permissions for backward compatibility (6 months)
 * - Update role_permissions table
 *
 * ROLLBACK:
 * - Remove 'resources' permissions
 * - Keep only 'blog' permissions
 */

-- ============================================
-- PHASE 1: ADD NEW 'RESOURCES' PERMISSIONS
-- ============================================

-- Superadmin: Full access to resources management
INSERT INTO public.role_permissions (role, resource, action, description)
VALUES ('superadmin', 'resources', '*', 'Full access to resources management')
ON CONFLICT (role, resource, action) DO NOTHING;

-- Admin: Manage resource content
INSERT INTO public.role_permissions (role, resource, action, description)
VALUES
  ('admin', 'resources', 'view_analytics', 'View resource analytics and performance metrics'),
  ('admin', 'resources', 'manage_content', 'Create, edit, and publish resource articles'),
  ('admin', 'resources', 'manage_categories', 'Manage resource categories'),
  ('admin', 'resources', 'view_attribution', 'View revenue signal attribution data')
ON CONFLICT (role, resource, action) DO NOTHING;

-- ============================================
-- PHASE 2: KEEP 'BLOG' PERMISSIONS FOR BACKWARD COMPATIBILITY
-- (Will be removed in July 2026)
-- ============================================

-- Add deprecation comments to existing blog permissions
COMMENT ON TABLE role_permissions IS 'RBAC permissions table. Note: "blog" permissions are deprecated in favor of "resources" (removal date: July 2026).';

-- Update descriptions to indicate deprecation
UPDATE public.role_permissions
SET description = '[DEPRECATED - Use resources.*] ' || description
WHERE resource = 'blog'
  AND action = '*'
  AND NOT description LIKE '[DEPRECATED%';

UPDATE public.role_permissions
SET description = '[DEPRECATED - Use resources.view_analytics] ' || description
WHERE resource = 'blog'
  AND action = 'view_analytics'
  AND NOT description LIKE '[DEPRECATED%';

UPDATE public.role_permissions
SET description = '[DEPRECATED - Use resources.manage_content] ' || description
WHERE resource = 'blog'
  AND action = 'manage_content'
  AND NOT description LIKE '[DEPRECATED%';

UPDATE public.role_permissions
SET description = '[DEPRECATED - Use resources.manage_categories] ' || description
WHERE resource = 'blog'
  AND action = 'manage_categories'
  AND NOT description LIKE '[DEPRECATED%';

UPDATE public.role_permissions
SET description = '[DEPRECATED - Use resources.view_attribution] ' || description
WHERE resource = 'blog'
  AND action = 'view_attribution'
  AND NOT description LIKE '[DEPRECATED%';

-- ============================================
-- PHASE 3: VERIFY PERMISSIONS SETUP
-- ============================================

DO $$
DECLARE
  resources_count integer;
  blog_count integer;
BEGIN
  -- Count new 'resources' permissions
  SELECT COUNT(*)
  INTO resources_count
  FROM public.role_permissions
  WHERE resource = 'resources';

  -- Count legacy 'blog' permissions
  SELECT COUNT(*)
  INTO blog_count
  FROM public.role_permissions
  WHERE resource = 'blog';

  RAISE NOTICE 'Resources permissions: % rows', resources_count;
  RAISE NOTICE 'Blog permissions (deprecated): % rows', blog_count;

  IF resources_count = 0 THEN
    RAISE EXCEPTION 'Migration failed: No resources permissions found';
  END IF;
END $$;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 192 complete: RBAC permissions updated for Resources';
  RAISE NOTICE 'New "resources" permissions added';
  RAISE NOTICE 'Legacy "blog" permissions marked as deprecated (6-month grace period)';
  RAISE NOTICE 'Next step: Update frontend code to use "resources" permission checks';
END $$;
