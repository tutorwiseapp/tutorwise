-- Migration 190: Add Signal (Revenue Signal) RBAC Permissions
-- Purpose: Create proper permissions for /admin/signal (moved from /admin/blog/orchestrator)
-- Created: 2026-01-18
-- Context: Strategic migration to align with Revenue Signal spec architecture
-- Related: Migration 189 (blog permissions retained for blog-specific features like /admin/blog/seo)

-- Add signal resource permissions
-- Signal = Platform-level business intelligence (attribution, distribution, experiments)
-- Blog = Content management (articles, SEO, categories)

INSERT INTO admin_role_permissions (role, resource, action, description)
VALUES
  -- Superadmin: Full Signal access
  ('superadmin', 'signal', '*', 'Full access to Revenue Signal platform intelligence'),

  -- Admin: View and manage Signal analytics
  ('admin', 'signal', 'view_analytics', 'View Revenue Signal analytics dashboard'),
  ('admin', 'signal', 'export_data', 'Export signal attribution data'),
  ('admin', 'signal', 'manage_distribution', 'Manage content distribution (future Phase 4)'),

  -- System Admin: View-only Signal analytics
  ('systemadmin', 'signal', 'view_analytics', 'View Revenue Signal analytics (read-only)')

ON CONFLICT (role, resource, action) DO NOTHING;

-- Note: 'blog:view_analytics' permissions from Migration 189 are RETAINED
-- They're used for blog-specific SEO analytics at /admin/blog/seo (Google Search Console, sitemaps)
-- Signal and Blog permissions serve different purposes:
--   - signal:view_analytics = Revenue attribution intelligence (/admin/signal)
--   - blog:view_analytics = SEO performance monitoring (/admin/blog/seo)

-- Verify permissions were added
SELECT
  role,
  resource,
  action,
  description
FROM admin_role_permissions
WHERE resource = 'signal'
ORDER BY
  CASE role
    WHEN 'superadmin' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'systemadmin' THEN 3
    ELSE 4
  END,
  action;
