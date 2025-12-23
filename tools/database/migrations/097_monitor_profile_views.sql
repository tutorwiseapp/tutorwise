-- ================================================
-- Profile Views Monitoring & Management Queries
-- ================================================
-- File: 097_monitor_profile_views.sql
-- Purpose: Helpful queries to monitor profile views tracking
-- Run these in Supabase SQL Editor as needed

-- ================================================
-- 1. CHECK CRON JOB STATUS
-- ================================================

-- View the scheduled refresh job
SELECT
    jobid,
    schedule,
    command,
    nodename,
    active,
    jobname
FROM cron.job
WHERE jobname = 'refresh-profile-view-counts';

-- View recent job runs (success/failure)
SELECT
    jobname,
    start_time,
    end_time,
    status,
    return_message,
    end_time - start_time as duration
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'refresh-profile-view-counts')
ORDER BY start_time DESC
LIMIT 10;

-- ================================================
-- 2. PROFILE VIEWS ANALYTICS
-- ================================================

-- Top 10 most viewed profiles
SELECT
    pvc.profile_id,
    p.full_name,
    pvc.total_views,
    pvc.unique_viewers,
    pvc.unique_sessions,
    pvc.last_viewed_at
FROM profile_view_counts pvc
JOIN profiles p ON p.id = pvc.profile_id
ORDER BY pvc.total_views DESC
LIMIT 10;

-- Recent views (last 24 hours)
SELECT
    pv.viewed_at,
    p_profile.full_name as profile_name,
    p_viewer.full_name as viewer_name,
    pv.referrer_source,
    pv.session_id
FROM profile_views pv
JOIN profiles p_profile ON p_profile.id = pv.profile_id
LEFT JOIN profiles p_viewer ON p_viewer.id = pv.viewer_id
WHERE pv.viewed_at > NOW() - INTERVAL '24 hours'
ORDER BY pv.viewed_at DESC
LIMIT 50;

-- Views by referrer source
SELECT
    referrer_source,
    COUNT(*) as view_count,
    COUNT(DISTINCT profile_id) as unique_profiles,
    COUNT(DISTINCT viewer_id) as unique_viewers
FROM profile_views
GROUP BY referrer_source
ORDER BY view_count DESC;

-- Anonymous vs Authenticated views
SELECT
    CASE WHEN viewer_id IS NULL THEN 'Anonymous' ELSE 'Authenticated' END as viewer_type,
    COUNT(*) as total_views,
    COUNT(DISTINCT profile_id) as profiles_viewed,
    COUNT(DISTINCT session_id) as unique_sessions
FROM profile_views
GROUP BY viewer_type;

-- ================================================
-- 3. PERFORMANCE CHECKS
-- ================================================

-- Check materialized view freshness
SELECT
    schemaname,
    matviewname,
    last_refresh
FROM pg_matviews
WHERE matviewname = 'profile_view_counts';

-- Count total views vs materialized view
SELECT
    'Raw table' as source,
    COUNT(*) as count
FROM profile_views
UNION ALL
SELECT
    'Materialized view' as source,
    SUM(total_views) as count
FROM profile_view_counts;

-- ================================================
-- 4. MANUAL OPERATIONS
-- ================================================

-- Manually refresh materialized view NOW
SELECT refresh_profile_view_counts();

-- Trigger cron job immediately (for testing)
SELECT cron.schedule_immediately('refresh-profile-view-counts');

-- Verify refresh worked
SELECT
    matviewname,
    last_refresh,
    NOW() - last_refresh as time_since_refresh
FROM pg_matviews
WHERE matviewname = 'profile_view_counts';

-- ================================================
-- 5. TROUBLESHOOTING
-- ================================================

-- Check for failed cron runs
SELECT
    start_time,
    status,
    return_message
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'refresh-profile-view-counts')
  AND status != 'succeeded'
ORDER BY start_time DESC
LIMIT 20;

-- Check if pg_cron extension is enabled
SELECT
    extname,
    extversion
FROM pg_extension
WHERE extname = 'pg_cron';

-- View all cron jobs (to see if there are conflicts)
SELECT * FROM cron.job;

-- ================================================
-- 6. CLEANUP (USE WITH CAUTION)
-- ================================================

-- Delete old views (older than 90 days) to save space
-- UNCOMMENT TO RUN:
-- DELETE FROM profile_views
-- WHERE viewed_at < NOW() - INTERVAL '90 days';

-- Reset view counts for a specific profile (testing only)
-- UNCOMMENT TO RUN:
-- DELETE FROM profile_views WHERE profile_id = 'YOUR-PROFILE-UUID';
-- SELECT refresh_profile_view_counts();

-- Unschedule the cron job (if you want to stop auto-refresh)
-- UNCOMMENT TO RUN:
-- SELECT cron.unschedule('refresh-profile-view-counts');

-- ================================================
-- 7. EXPORT DATA (For Analytics)
-- ================================================

-- Export views by day for last 30 days
SELECT
    DATE(viewed_at) as date,
    COUNT(*) as total_views,
    COUNT(DISTINCT profile_id) as unique_profiles,
    COUNT(DISTINCT viewer_id) FILTER (WHERE viewer_id IS NOT NULL) as unique_viewers,
    COUNT(DISTINCT session_id) as unique_sessions
FROM profile_views
WHERE viewed_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(viewed_at)
ORDER BY date DESC;

-- Export top profiles by views (last 7 days)
SELECT
    p.id,
    p.full_name,
    p.active_role,
    COUNT(*) as views_last_7_days,
    COUNT(DISTINCT pv.viewer_id) as unique_viewers
FROM profile_views pv
JOIN profiles p ON p.id = pv.profile_id
WHERE pv.viewed_at > NOW() - INTERVAL '7 days'
GROUP BY p.id, p.full_name, p.active_role
ORDER BY views_last_7_days DESC
LIMIT 20;
