/*
 * Migration: 140_add_daily_statistics_aggregation.sql
 * Purpose: Add daily statistics aggregation function and cron job
 * Created: 2025-12-24
 * Phase: Admin Dashboard - Platform Statistics
 *
 * This migration adds:
 * 1. Function to aggregate daily platform statistics
 * 2. Supabase pg_cron schedule to run nightly at midnight UTC
 * 3. Enhanced platform_statistics_daily table with SEO and user metrics
 */

-- ============================================================================
-- 1. Extend platform_statistics_daily table with additional metrics
-- ============================================================================

-- Add SEO content metrics
ALTER TABLE platform_statistics_daily
  ADD COLUMN IF NOT EXISTS total_users INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_users INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS admin_users INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_onboarding_users INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seo_total_hubs INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seo_published_hubs INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seo_draft_hubs INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seo_total_spokes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seo_published_spokes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seo_total_citations INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seo_active_citations INTEGER DEFAULT 0;

-- Add comments
COMMENT ON COLUMN platform_statistics_daily.total_users IS 'Total registered users (all profiles)';
COMMENT ON COLUMN platform_statistics_daily.active_users IS 'Users who completed onboarding';
COMMENT ON COLUMN platform_statistics_daily.admin_users IS 'Users with admin access';
COMMENT ON COLUMN platform_statistics_daily.pending_onboarding_users IS 'Users who have not completed onboarding';
COMMENT ON COLUMN platform_statistics_daily.seo_total_hubs IS 'Total SEO hubs (all statuses)';
COMMENT ON COLUMN platform_statistics_daily.seo_published_hubs IS 'Published SEO hubs';
COMMENT ON COLUMN platform_statistics_daily.seo_draft_hubs IS 'Draft SEO hubs';
COMMENT ON COLUMN platform_statistics_daily.seo_total_spokes IS 'Total SEO spokes (all statuses)';
COMMENT ON COLUMN platform_statistics_daily.seo_published_spokes IS 'Published SEO spokes';
COMMENT ON COLUMN platform_statistics_daily.seo_total_citations IS 'Total SEO citations (all statuses)';
COMMENT ON COLUMN platform_statistics_daily.seo_active_citations IS 'Active SEO citations';

-- ============================================================================
-- 2. Create daily statistics aggregation function
-- ============================================================================

CREATE OR REPLACE FUNCTION aggregate_daily_statistics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_users INTEGER;
  v_active_users INTEGER;
  v_admin_users INTEGER;
  v_pending_onboarding INTEGER;
  v_seo_total_hubs INTEGER;
  v_seo_published_hubs INTEGER;
  v_seo_draft_hubs INTEGER;
  v_seo_total_spokes INTEGER;
  v_seo_published_spokes INTEGER;
  v_seo_total_citations INTEGER;
  v_seo_active_citations INTEGER;
BEGIN
  -- Aggregate user statistics
  SELECT
    COUNT(*) FILTER (WHERE true),
    COUNT(*) FILTER (WHERE onboarding_completed = true),
    COUNT(*) FILTER (WHERE is_admin = true),
    COUNT(*) FILTER (WHERE onboarding_completed = false OR onboarding_completed IS NULL)
  INTO
    v_total_users,
    v_active_users,
    v_admin_users,
    v_pending_onboarding
  FROM profiles;

  -- Aggregate SEO hub statistics
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'seo_hubs') THEN
    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'published'),
      COUNT(*) FILTER (WHERE status = 'draft')
    INTO
      v_seo_total_hubs,
      v_seo_published_hubs,
      v_seo_draft_hubs
    FROM seo_hubs;
  ELSE
    v_seo_total_hubs := 0;
    v_seo_published_hubs := 0;
    v_seo_draft_hubs := 0;
  END IF;

  -- Aggregate SEO spoke statistics
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'seo_spokes') THEN
    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'published')
    INTO
      v_seo_total_spokes,
      v_seo_published_spokes
    FROM seo_spokes;
  ELSE
    v_seo_total_spokes := 0;
    v_seo_published_spokes := 0;
  END IF;

  -- Aggregate SEO citation statistics
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'seo_citations') THEN
    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'active')
    INTO
      v_seo_total_citations,
      v_seo_active_citations
    FROM seo_citations;
  ELSE
    v_seo_total_citations := 0;
    v_seo_active_citations := 0;
  END IF;

  -- Insert or update statistics for the target date
  INSERT INTO platform_statistics_daily (
    date,
    total_users,
    active_users,
    admin_users,
    pending_onboarding_users,
    seo_total_hubs,
    seo_published_hubs,
    seo_draft_hubs,
    seo_total_spokes,
    seo_published_spokes,
    seo_total_citations,
    seo_active_citations
  ) VALUES (
    target_date,
    v_total_users,
    v_active_users,
    v_admin_users,
    v_pending_onboarding,
    v_seo_total_hubs,
    v_seo_published_hubs,
    v_seo_draft_hubs,
    v_seo_total_spokes,
    v_seo_published_spokes,
    v_seo_total_citations,
    v_seo_active_citations
  )
  ON CONFLICT (date)
  DO UPDATE SET
    total_users = EXCLUDED.total_users,
    active_users = EXCLUDED.active_users,
    admin_users = EXCLUDED.admin_users,
    pending_onboarding_users = EXCLUDED.pending_onboarding_users,
    seo_total_hubs = EXCLUDED.seo_total_hubs,
    seo_published_hubs = EXCLUDED.seo_published_hubs,
    seo_draft_hubs = EXCLUDED.seo_draft_hubs,
    seo_total_spokes = EXCLUDED.seo_total_spokes,
    seo_published_spokes = EXCLUDED.seo_published_spokes,
    seo_total_citations = EXCLUDED.seo_total_citations,
    seo_active_citations = EXCLUDED.seo_active_citations;

  RAISE NOTICE 'Daily statistics aggregated for %: % users, % hubs, % spokes, % citations',
    target_date, v_total_users, v_seo_total_hubs, v_seo_total_spokes, v_seo_total_citations;
END;
$$;

COMMENT ON FUNCTION aggregate_daily_statistics IS 'Aggregates platform statistics for a given date (defaults to today). Upserts into platform_statistics_daily table.';

-- ============================================================================
-- 3. Set up Supabase pg_cron schedule
-- ============================================================================

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily statistics aggregation at midnight UTC
-- Note: If this schedule name already exists, it will be updated
SELECT cron.schedule(
  'aggregate-daily-statistics',     -- job name
  '0 0 * * *',                      -- cron expression: midnight UTC daily
  $$SELECT aggregate_daily_statistics(CURRENT_DATE);$$
);

COMMENT ON EXTENSION pg_cron IS 'Cron-based job scheduler for PostgreSQL';

-- ============================================================================
-- 4. Run initial aggregation for today
-- ============================================================================

-- Aggregate statistics for today immediately
SELECT aggregate_daily_statistics(CURRENT_DATE);

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Migration 140_add_daily_statistics_aggregation.sql completed';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Added columns to platform_statistics_daily table';
  RAISE NOTICE 'Created aggregate_daily_statistics() function';
  RAISE NOTICE 'Scheduled nightly cron job at midnight UTC';
  RAISE NOTICE 'Ran initial aggregation for today';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run backfill script to populate historical data';
  RAISE NOTICE '2. Verify cron job: SELECT * FROM cron.job;';
  RAISE NOTICE '3. Check statistics: SELECT * FROM platform_statistics_daily ORDER BY date DESC LIMIT 7;';
  RAISE NOTICE '=================================================================';
END$$;
