/*
 * Migration: 095_add_admin_dashboard_support.sql
 * Purpose: Add admin dashboard support (admin users, audit logs, statistics)
 * Created: 2025-12-23
 * Specification: Admin Dashboard Solution Design v2, Section 6
 * Phase: Phase 0 - Foundation
 *
 * This migration adds:
 * 1. Admin fields to profiles table (is_admin, admin_role, admin_permissions)
 * 2. Admin audit logs table (track all admin actions)
 * 3. Platform statistics table (daily snapshots)
 * 4. Admin fields to SEO tables (created_by, last_edited_by, published_by)
 * 5. Listings moderation fields (moderation_status, quality_score)
 */

-- ============================================================================
-- 1. Admin Users (extend profiles table)
-- ============================================================================

-- Add admin fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_role TEXT CHECK (admin_role IN ('super_admin', 'seo_manager', 'support', 'analyst'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_permissions JSONB DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_admin_access TIMESTAMPTZ;

-- Create index for fast admin user lookups
CREATE INDEX IF NOT EXISTS idx_profiles_admin ON profiles(is_admin) WHERE is_admin = true;

-- Add comment
COMMENT ON COLUMN profiles.is_admin IS 'Whether this user has admin dashboard access';
COMMENT ON COLUMN profiles.admin_role IS 'Admin role: super_admin, seo_manager, support, or analyst';
COMMENT ON COLUMN profiles.admin_permissions IS 'JSONB object with granular admin permissions';
COMMENT ON COLUMN profiles.last_admin_access IS 'Last time user accessed admin dashboard';

-- ============================================================================
-- 2. Admin Audit Logs
-- ============================================================================

-- Create admin audit logs table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'publish', 'moderate', 'approve', 'reject', 'flag')),
  resource_type TEXT NOT NULL, -- 'hub', 'spoke', 'user', 'listing', 'booking', 'review', 'setting'
  resource_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON admin_audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON admin_audit_logs(action);

-- Add comments
COMMENT ON TABLE admin_audit_logs IS 'Audit log of all admin actions for compliance and debugging';
COMMENT ON COLUMN admin_audit_logs.action IS 'Type of action: create, update, delete, publish, moderate, approve, reject, flag';
COMMENT ON COLUMN admin_audit_logs.resource_type IS 'Type of resource affected: hub, spoke, user, listing, booking, review, setting';
COMMENT ON COLUMN admin_audit_logs.resource_id IS 'ID of the affected resource (if applicable)';
COMMENT ON COLUMN admin_audit_logs.details IS 'JSONB with additional context (old_value, new_value, reason, etc.)';

-- ============================================================================
-- 3. Platform Statistics (daily snapshots)
-- ============================================================================

-- Create platform statistics table
CREATE TABLE IF NOT EXISTS platform_statistics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  active_tutors INTEGER DEFAULT 0,
  active_students INTEGER DEFAULT 0,
  published_listings INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  completed_bookings INTEGER DEFAULT 0,
  total_revenue NUMERIC(10,2) DEFAULT 0,
  new_signups INTEGER DEFAULT 0,
  avg_listing_quality_score NUMERIC(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for date-based queries
CREATE INDEX IF NOT EXISTS idx_platform_stats_date ON platform_statistics_daily(date DESC);

-- Add comments
COMMENT ON TABLE platform_statistics_daily IS 'Daily snapshots of platform-wide statistics for reporting';
COMMENT ON COLUMN platform_statistics_daily.date IS 'Date of the snapshot (UTC)';
COMMENT ON COLUMN platform_statistics_daily.active_tutors IS 'Number of tutors with activity in last 30 days';
COMMENT ON COLUMN platform_statistics_daily.active_students IS 'Number of students with activity in last 30 days';
COMMENT ON COLUMN platform_statistics_daily.avg_listing_quality_score IS 'Average quality score across all published listings';

-- ============================================================================
-- 4. SEO Tables - Add Admin Fields
-- ============================================================================

-- Add admin fields to seo_hubs table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'seo_hubs') THEN
    ALTER TABLE seo_hubs ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);
    ALTER TABLE seo_hubs ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES profiles(id);
    ALTER TABLE seo_hubs ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;
    ALTER TABLE seo_hubs ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES profiles(id);

    -- Add comments
    COMMENT ON COLUMN seo_hubs.created_by IS 'Admin user who created this hub';
    COMMENT ON COLUMN seo_hubs.last_edited_by IS 'Admin user who last edited this hub';
    COMMENT ON COLUMN seo_hubs.published_by IS 'Admin user who published this hub';
  END IF;
END$$;

-- Add admin fields to seo_spokes table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'seo_spokes') THEN
    ALTER TABLE seo_spokes ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);
    ALTER TABLE seo_spokes ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES profiles(id);
    ALTER TABLE seo_spokes ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;
    ALTER TABLE seo_spokes ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES profiles(id);

    -- Add comments
    COMMENT ON COLUMN seo_spokes.created_by IS 'Admin user who created this spoke';
    COMMENT ON COLUMN seo_spokes.last_edited_by IS 'Admin user who last edited this spoke';
    COMMENT ON COLUMN seo_spokes.published_by IS 'Admin user who published this spoke';
  END IF;
END$$;

-- ============================================================================
-- 5. Listings - Add Moderation Fields
-- ============================================================================

-- Add moderation fields to listings_v4_1 table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'listings_v4_1') THEN
    ALTER TABLE listings_v4_1 ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'flagged', 'rejected'));
    ALTER TABLE listings_v4_1 ADD COLUMN IF NOT EXISTS moderation_notes TEXT;
    ALTER TABLE listings_v4_1 ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES profiles(id);
    ALTER TABLE listings_v4_1 ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;
    ALTER TABLE listings_v4_1 ADD COLUMN IF NOT EXISTS quality_score NUMERIC(3,2) CHECK (quality_score >= 0 AND quality_score <= 5);

    -- Create index for moderation status
    CREATE INDEX IF NOT EXISTS idx_listings_moderation ON listings_v4_1(moderation_status);

    -- Add comments
    COMMENT ON COLUMN listings_v4_1.moderation_status IS 'Moderation status: pending, approved, flagged, rejected';
    COMMENT ON COLUMN listings_v4_1.moderation_notes IS 'Internal admin notes about moderation decision';
    COMMENT ON COLUMN listings_v4_1.moderated_by IS 'Admin user who moderated this listing';
    COMMENT ON COLUMN listings_v4_1.quality_score IS 'Automated quality score from 0.00 to 5.00';
  END IF;
END$$;

-- ============================================================================
-- 6. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on admin_audit_logs
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read audit logs
CREATE POLICY admin_audit_logs_select_policy ON admin_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policy: Only admins can insert audit logs
CREATE POLICY admin_audit_logs_insert_policy ON admin_audit_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Enable RLS on platform_statistics_daily
ALTER TABLE platform_statistics_daily ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read platform statistics
CREATE POLICY platform_stats_select_policy ON platform_statistics_daily
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policy: Only super_admins can insert/update platform statistics
CREATE POLICY platform_stats_insert_policy ON platform_statistics_daily
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
      AND profiles.admin_role = 'super_admin'
    )
  );

-- ============================================================================
-- 7. Helper Functions
-- ============================================================================

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  -- Insert audit log
  INSERT INTO admin_audit_logs (
    admin_id,
    action,
    resource_type,
    resource_id,
    details,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_details,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

COMMENT ON FUNCTION log_admin_action IS 'Helper function to log admin actions with automatic admin_id, IP, and user agent';

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 095_add_admin_dashboard_support.sql completed successfully';
  RAISE NOTICE 'Added admin fields to profiles table';
  RAISE NOTICE 'Created admin_audit_logs table';
  RAISE NOTICE 'Created platform_statistics_daily table';
  RAISE NOTICE 'Added admin fields to SEO tables (if they exist)';
  RAISE NOTICE 'Added moderation fields to listings table (if it exists)';
  RAISE NOTICE 'Created RLS policies for admin tables';
  RAISE NOTICE 'Created log_admin_action helper function';
END$$;
