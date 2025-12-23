/*
 * Migration: 136_add_granular_rbac_permissions.sql
 * Purpose: Add granular RBAC (Role-Based Access Control) system for admin dashboard
 * Created: 2025-12-23
 * Specification: Admin Dashboard RBAC requirements
 *
 * This migration adds:
 * 1. Admin roles enum and updated profiles table
 * 2. Admin permissions table (granular permission system)
 * 3. User-specific permission overrides table
 * 4. Permission checking functions
 * 5. Seed default permissions for each role
 * 6. Admin activity notifications table
 */

-- ============================================================================
-- 1. Admin Roles Type and Profile Updates
-- ============================================================================

-- Create admin role enum
DO $$ BEGIN
  CREATE TYPE admin_role_type AS ENUM ('superadmin', 'admin', 'systemadmin', 'supportadmin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update profiles table to use enum (migrate existing text values)
ALTER TABLE profiles
  ALTER COLUMN admin_role TYPE admin_role_type
  USING admin_role::admin_role_type;

-- Add role level for hierarchy checks
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_role_level INTEGER;

-- Update role levels based on hierarchy
UPDATE profiles SET admin_role_level =
  CASE admin_role
    WHEN 'superadmin' THEN 4
    WHEN 'admin' THEN 3
    WHEN 'systemadmin' THEN 2
    WHEN 'supportadmin' THEN 1
    ELSE NULL
  END
WHERE is_admin = true;

-- Add granted_by field to track who granted admin access
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_granted_by UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_granted_at TIMESTAMPTZ;

-- Add comments
COMMENT ON COLUMN profiles.admin_role IS 'Admin role: superadmin (L4), admin (L3), systemadmin (L2), supportadmin (L1)';
COMMENT ON COLUMN profiles.admin_role_level IS 'Role hierarchy level (1-4), higher can manage lower';
COMMENT ON COLUMN profiles.admin_granted_by IS 'Admin user who granted this user admin access';
COMMENT ON COLUMN profiles.admin_granted_at IS 'Timestamp when admin access was granted';

-- ============================================================================
-- 2. Admin Permissions Table (Granular Permission System)
-- ============================================================================

-- Create admin permissions table
CREATE TABLE IF NOT EXISTS admin_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role admin_role_type NOT NULL,
  resource TEXT NOT NULL, -- 'users', 'listings', 'seo', 'bookings', 'reviews', 'settings', etc.
  action TEXT NOT NULL,   -- 'view', 'create', 'update', 'delete', 'moderate', 'approve', 'manage'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, resource, action)
);

-- Create index for fast permission lookups
CREATE INDEX IF NOT EXISTS idx_role_permissions_lookup ON admin_role_permissions(role, resource, action);

-- Add comments
COMMENT ON TABLE admin_role_permissions IS 'Granular permissions for each admin role (resource + action based)';
COMMENT ON COLUMN admin_role_permissions.resource IS 'Resource type: users, listings, seo, bookings, reviews, settings, etc.';
COMMENT ON COLUMN admin_role_permissions.action IS 'Action: view, create, update, delete, moderate, approve, manage';

-- ============================================================================
-- 3. User-Specific Permission Overrides
-- ============================================================================

-- Create user permission overrides table
CREATE TABLE IF NOT EXISTS admin_user_permission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true, -- true = grant, false = revoke
  granted_by UUID NOT NULL REFERENCES profiles(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, resource, action)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_overrides ON admin_user_permission_overrides(user_id, resource, action);

-- Add comments
COMMENT ON TABLE admin_user_permission_overrides IS 'User-specific permission overrides (grant additional or revoke role permissions)';
COMMENT ON COLUMN admin_user_permission_overrides.granted IS 'true = grant permission, false = explicitly revoke permission';

-- ============================================================================
-- 4. Admin Activity Notifications Table
-- ============================================================================

-- Create admin notifications table for email alerts
CREATE TABLE IF NOT EXISTS admin_activity_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  notification_type TEXT NOT NULL, -- 'admin_granted', 'admin_revoked', 'role_changed', 'permission_changed'
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for unsent notifications
CREATE INDEX IF NOT EXISTS idx_notifications_unsent ON admin_activity_notifications(sent, created_at) WHERE sent = false;

-- Add comments
COMMENT ON TABLE admin_activity_notifications IS 'Queue for admin activity email notifications';
COMMENT ON COLUMN admin_activity_notifications.notification_type IS 'Type: admin_granted, admin_revoked, role_changed, permission_changed';

-- ============================================================================
-- 5. Seed Default Permissions for Each Role
-- ============================================================================

-- Clear existing permissions (for re-running migration)
TRUNCATE admin_role_permissions;

-- SUPERADMIN: Full access to everything
INSERT INTO admin_role_permissions (role, resource, action, description) VALUES
  ('superadmin', '*', '*', 'Full access to all resources and actions'),
  ('superadmin', 'admins', 'manage', 'Can grant/revoke any admin role');

-- ADMIN: SEO & Content Management
INSERT INTO admin_role_permissions (role, resource, action, description) VALUES
  ('admin', 'seo', 'view', 'View SEO hubs, spokes, citations'),
  ('admin', 'seo', 'create', 'Create SEO content'),
  ('admin', 'seo', 'update', 'Edit SEO content'),
  ('admin', 'seo', 'delete', 'Delete SEO content'),
  ('admin', 'seo', 'publish', 'Publish SEO content'),
  ('admin', 'listings', 'view', 'View all listings'),
  ('admin', 'listings', 'moderate', 'Moderate listings'),
  ('admin', 'users', 'view', 'View user profiles'),
  ('admin', 'reports', 'view', 'View SEO reports'),
  ('admin', 'admins', 'manage_lower', 'Can grant/revoke systemadmin and supportadmin roles');

-- SYSTEMADMIN: Platform Configuration & Monitoring
INSERT INTO admin_role_permissions (role, resource, action, description) VALUES
  ('systemadmin', 'settings', 'view', 'View platform settings'),
  ('systemadmin', 'settings', 'update', 'Update platform settings'),
  ('systemadmin', 'integrations', 'view', 'View integrations'),
  ('systemadmin', 'integrations', 'manage', 'Manage integrations'),
  ('systemadmin', 'reports', 'view', 'View platform reports'),
  ('systemadmin', 'reports', 'create', 'Generate custom reports'),
  ('systemadmin', 'users', 'view', 'View user profiles'),
  ('systemadmin', 'audit_logs', 'view', 'View audit logs'),
  ('systemadmin', 'admins', 'manage_lower', 'Can grant/revoke supportadmin roles');

-- SUPPORTADMIN: User Support & Moderation
INSERT INTO admin_role_permissions (role, resource, action, description) VALUES
  ('supportadmin', 'users', 'view', 'View user profiles'),
  ('supportadmin', 'users', 'suspend', 'Suspend/unsuspend users'),
  ('supportadmin', 'bookings', 'view', 'View all bookings'),
  ('supportadmin', 'bookings', 'manage', 'Manage bookings (cancel, refund)'),
  ('supportadmin', 'disputes', 'view', 'View disputes'),
  ('supportadmin', 'disputes', 'manage', 'Resolve disputes'),
  ('supportadmin', 'reviews', 'view', 'View all reviews'),
  ('supportadmin', 'reviews', 'moderate', 'Moderate reviews (flag, delete)'),
  ('supportadmin', 'listings', 'view', 'View listings'),
  ('supportadmin', 'messages', 'view', 'View user messages (for support)');

-- ============================================================================
-- 6. Permission Checking Functions
-- ============================================================================

-- Function to check if user has a specific permission
CREATE OR REPLACE FUNCTION has_admin_permission(
  p_user_id UUID,
  p_resource TEXT,
  p_action TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_role admin_role_type;
  v_has_permission BOOLEAN := false;
  v_override_granted BOOLEAN;
BEGIN
  -- Check if user is admin
  SELECT is_admin, admin_role INTO v_is_admin, v_role
  FROM profiles
  WHERE id = p_user_id;

  -- If not admin, return false
  IF NOT v_is_admin THEN
    RETURN false;
  END IF;

  -- Check for user-specific override first (highest priority)
  SELECT granted INTO v_override_granted
  FROM admin_user_permission_overrides
  WHERE user_id = p_user_id
    AND resource = p_resource
    AND action = p_action;

  IF FOUND THEN
    RETURN v_override_granted;
  END IF;

  -- Check role permissions
  SELECT EXISTS (
    SELECT 1 FROM admin_role_permissions
    WHERE role = v_role
      AND (
        (resource = '*' AND action = '*') OR  -- Superadmin wildcard
        (resource = p_resource AND action = '*') OR  -- Resource wildcard
        (resource = p_resource AND action = p_action)  -- Exact match
      )
  ) INTO v_has_permission;

  RETURN v_has_permission;
END;
$$;

COMMENT ON FUNCTION has_admin_permission IS 'Check if user has specific admin permission (checks overrides first, then role permissions)';

-- Function to get all permissions for a user
CREATE OR REPLACE FUNCTION get_user_admin_permissions(p_user_id UUID)
RETURNS TABLE (
  resource TEXT,
  action TEXT,
  source TEXT  -- 'role' or 'override'
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_role admin_role_type;
BEGIN
  -- Get user's role
  SELECT admin_role INTO v_role
  FROM profiles
  WHERE id = p_user_id AND is_admin = true;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Return role permissions
  RETURN QUERY
  SELECT
    arp.resource,
    arp.action,
    'role'::TEXT as source
  FROM admin_role_permissions arp
  WHERE arp.role = v_role
    AND NOT EXISTS (
      -- Exclude if explicitly revoked in overrides
      SELECT 1 FROM admin_user_permission_overrides auo
      WHERE auo.user_id = p_user_id
        AND auo.resource = arp.resource
        AND auo.action = arp.action
        AND auo.granted = false
    )

  UNION

  -- Return granted overrides
  SELECT
    auo.resource,
    auo.action,
    'override'::TEXT as source
  FROM admin_user_permission_overrides auo
  WHERE auo.user_id = p_user_id
    AND auo.granted = true;
END;
$$;

COMMENT ON FUNCTION get_user_admin_permissions IS 'Get all effective permissions for an admin user (role + overrides)';

-- Function to check if user can manage another admin
CREATE OR REPLACE FUNCTION can_manage_admin(
  p_manager_id UUID,
  p_target_role admin_role_type
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_manager_level INTEGER;
  v_target_level INTEGER;
BEGIN
  -- Get manager's role level
  SELECT admin_role_level INTO v_manager_level
  FROM profiles
  WHERE id = p_manager_id AND is_admin = true;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Get target role level
  v_target_level := CASE p_target_role
    WHEN 'superadmin' THEN 4
    WHEN 'admin' THEN 3
    WHEN 'systemadmin' THEN 2
    WHEN 'supportadmin' THEN 1
  END;

  -- Managers can only manage roles with lower or equal level
  -- Exception: superadmins can manage other superadmins
  IF v_manager_level = 4 THEN
    RETURN true;  -- Superadmin can manage anyone
  ELSE
    RETURN v_manager_level > v_target_level;  -- Higher level can manage lower
  END IF;
END;
$$;

COMMENT ON FUNCTION can_manage_admin IS 'Check if manager can grant/revoke a specific admin role (based on hierarchy)';

-- ============================================================================
-- 7. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE admin_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_user_permission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view role permissions
CREATE POLICY role_permissions_select_policy ON admin_role_permissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policy: Only superadmins can modify role permissions
CREATE POLICY role_permissions_modify_policy ON admin_role_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.admin_role = 'superadmin'
    )
  );

-- Policy: Admins can view their own overrides, superadmins can view all
CREATE POLICY user_overrides_select_policy ON admin_user_permission_overrides
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.admin_role = 'superadmin'
    )
  );

-- Policy: Only superadmins can insert/update overrides
CREATE POLICY user_overrides_modify_policy ON admin_user_permission_overrides
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.admin_role = 'superadmin'
    )
  );

-- Policy: Admins can view notifications sent to them
CREATE POLICY notifications_select_policy ON admin_activity_notifications
  FOR SELECT
  USING (
    recipient_email IN (
      SELECT email FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- 8. Triggers for Automatic Audit Logging
-- ============================================================================

-- Trigger function to log admin grants/revokes
CREATE OR REPLACE FUNCTION log_admin_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    -- Log role change
    IF OLD.admin_role IS DISTINCT FROM NEW.admin_role THEN
      INSERT INTO admin_audit_logs (admin_id, action, resource_type, resource_id, details)
      VALUES (
        auth.uid(),
        'update',
        'admin_role',
        NEW.id,
        jsonb_build_object(
          'old_role', OLD.admin_role,
          'new_role', NEW.admin_role,
          'user_email', NEW.email
        )
      );
    END IF;

    -- Log admin access granted
    IF OLD.is_admin = false AND NEW.is_admin = true THEN
      INSERT INTO admin_audit_logs (admin_id, action, resource_type, resource_id, details)
      VALUES (
        auth.uid(),
        'create',
        'admin_access',
        NEW.id,
        jsonb_build_object(
          'role', NEW.admin_role,
          'user_email', NEW.email
        )
      );

      -- Queue email notification
      INSERT INTO admin_activity_notifications (
        recipient_email,
        notification_type,
        subject,
        body,
        metadata
      ) VALUES (
        NEW.email,
        'admin_granted',
        'Admin Access Granted - Tutorwise',
        format('You have been granted %s access to the Tutorwise admin dashboard.', NEW.admin_role),
        jsonb_build_object('role', NEW.admin_role, 'granted_by', auth.uid())
      );
    END IF;

    -- Log admin access revoked
    IF OLD.is_admin = true AND NEW.is_admin = false THEN
      INSERT INTO admin_audit_logs (admin_id, action, resource_type, resource_id, details)
      VALUES (
        auth.uid(),
        'delete',
        'admin_access',
        NEW.id,
        jsonb_build_object(
          'old_role', OLD.admin_role,
          'user_email', NEW.email
        )
      );

      -- Queue email notification
      INSERT INTO admin_activity_notifications (
        recipient_email,
        notification_type,
        subject,
        body,
        metadata
      ) VALUES (
        NEW.email,
        'admin_revoked',
        'Admin Access Revoked - Tutorwise',
        'Your admin access to the Tutorwise admin dashboard has been revoked.',
        jsonb_build_object('old_role', OLD.admin_role, 'revoked_by', auth.uid())
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS admin_role_change_trigger ON profiles;
CREATE TRIGGER admin_role_change_trigger
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (
    OLD.is_admin IS DISTINCT FROM NEW.is_admin OR
    OLD.admin_role IS DISTINCT FROM NEW.admin_role
  )
  EXECUTE FUNCTION log_admin_role_change();

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 096_add_granular_rbac_permissions.sql completed successfully';
  RAISE NOTICE 'Added admin_role_type enum (superadmin, admin, systemadmin, supportadmin)';
  RAISE NOTICE 'Created admin_role_permissions table with granular permissions';
  RAISE NOTICE 'Created admin_user_permission_overrides table for custom permissions';
  RAISE NOTICE 'Created admin_activity_notifications table for email alerts';
  RAISE NOTICE 'Added permission checking functions (has_admin_permission, get_user_admin_permissions, can_manage_admin)';
  RAISE NOTICE 'Seeded default permissions for all 4 roles';
  RAISE NOTICE 'Created RLS policies for secure access';
  RAISE NOTICE 'Added triggers for automatic audit logging and email notifications';
  RAISE NOTICE '';
  RAISE NOTICE 'Next step: Run seed_superadmins.sql to grant initial superadmin access';
END$$;
