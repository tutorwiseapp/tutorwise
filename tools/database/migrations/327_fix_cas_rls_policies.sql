-- ============================================================================
-- Migration: 327 - Fix CAS Table RLS Policies
-- ============================================================================
-- Purpose: Replace broken RLS policies that reference non-existent
--          `public.admin_users` table with `public.is_admin()` function.
-- Created: 2026-03-01
--
-- Background: Migration 315 created CAS tables with RLS policies checking
--             `EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())`
--             but the `admin_users` table does not exist. The correct pattern
--             is `public.is_admin()` which checks `profiles.role = 'admin'`.
-- ============================================================================

-- ============================================================================
-- 1. cas_agent_status
-- ============================================================================

DROP POLICY IF EXISTS "Allow admins to view agent status" ON cas_agent_status;

CREATE POLICY "Allow admins to view agent status" ON cas_agent_status
  FOR SELECT USING (public.is_admin());

-- Keep existing service_role policy (already correct)

-- ============================================================================
-- 2. cas_agent_events
-- ============================================================================

DROP POLICY IF EXISTS "Allow admins to view agent events" ON cas_agent_events;

CREATE POLICY "Allow admins to view agent events" ON cas_agent_events
  FOR SELECT USING (public.is_admin());

-- Keep existing service_role INSERT policy (already correct)

-- ============================================================================
-- 3. cas_agent_logs
-- ============================================================================

DROP POLICY IF EXISTS "Allow admins to view agent logs" ON cas_agent_logs;

CREATE POLICY "Allow admins to view agent logs" ON cas_agent_logs
  FOR SELECT USING (public.is_admin());

-- Keep existing service_role INSERT policy (already correct)

-- ============================================================================
-- 4. cas_metrics_timeseries
-- ============================================================================

DROP POLICY IF EXISTS "Allow admins to view metrics" ON cas_metrics_timeseries;

CREATE POLICY "Allow admins to view metrics" ON cas_metrics_timeseries
  FOR SELECT USING (public.is_admin());

-- Keep existing service_role INSERT policy (already correct)

-- ============================================================================
-- 5. cas_agent_config
-- ============================================================================

DROP POLICY IF EXISTS "Allow admins to view agent config" ON cas_agent_config;
DROP POLICY IF EXISTS "Allow admins to update agent config" ON cas_agent_config;

CREATE POLICY "Allow admins to manage agent config" ON cas_agent_config
  FOR ALL USING (public.is_admin());

-- Keep existing service_role policy (already correct)

-- ============================================================================
-- Verification
-- ============================================================================
-- Check policies are correct:
--   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
--   FROM pg_policies
--   WHERE tablename LIKE 'cas_%';
--
-- Test as authenticated non-admin (should return 0 rows):
--   SELECT count(*) FROM cas_agent_status;
--
-- Test as admin (should return rows):
--   SELECT count(*) FROM cas_agent_status;
-- ============================================================================
