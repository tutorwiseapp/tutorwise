-- Migration: Create profile_views table for analytics
-- Version: 097
-- Created: 2025-12-08
-- Description: Creates profile_views table to track profile page views and provide social proof metrics

BEGIN;

-- ================================
-- STEP 1: Create profile_views Table
-- ================================
CREATE TABLE IF NOT EXISTS public.profile_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- NULL for anonymous/logged-out viewers
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    session_id TEXT, -- Browser session ID for deduplication
    referrer_source TEXT, -- Where the view came from (e.g., 'search', 'listing', 'referral')
    user_agent TEXT, -- Browser/device info
    ip_address INET, -- IP address (for fraud detection, respecting privacy)

    -- Indexes for performance
    CONSTRAINT profile_views_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT profile_views_viewer_id_fkey FOREIGN KEY (viewer_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Create indexes for efficient queries
CREATE INDEX idx_profile_views_profile_id ON public.profile_views(profile_id);
CREATE INDEX idx_profile_views_viewer_id ON public.profile_views(viewer_id);
CREATE INDEX idx_profile_views_viewed_at ON public.profile_views(viewed_at DESC);
CREATE INDEX idx_profile_views_session_id ON public.profile_views(session_id);

-- Composite index for deduplication queries (same session viewing same profile)
CREATE INDEX idx_profile_views_dedup ON public.profile_views(profile_id, session_id, viewed_at DESC);

-- ================================
-- STEP 2: Create View Count Materialized View
-- ================================
-- This materialized view caches profile view counts for performance
CREATE MATERIALIZED VIEW IF NOT EXISTS public.profile_view_counts AS
SELECT
    profile_id,
    COUNT(*) as total_views,
    COUNT(DISTINCT viewer_id) as unique_viewers,
    COUNT(DISTINCT session_id) as unique_sessions,
    MAX(viewed_at) as last_viewed_at
FROM public.profile_views
GROUP BY profile_id;

-- Index on materialized view
CREATE UNIQUE INDEX idx_profile_view_counts_profile_id ON public.profile_view_counts(profile_id);

-- ================================
-- STEP 3: Create Function to Refresh View Counts
-- ================================
CREATE OR REPLACE FUNCTION public.refresh_profile_view_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.profile_view_counts;
END;
$$;

-- ================================
-- STEP 4: Enable Row Level Security
-- ================================
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view profile_views (for analytics)
CREATE POLICY "Anyone can view profile views"
    ON public.profile_views
    FOR SELECT
    USING (true);

-- Policy: Authenticated users can insert their own views
CREATE POLICY "Authenticated users can insert views"
    ON public.profile_views
    FOR INSERT
    WITH CHECK (
        -- Either viewer_id matches authenticated user, or it's an anonymous view (viewer_id IS NULL)
        auth.uid() = viewer_id OR viewer_id IS NULL
    );

-- Policy: No updates or deletes (views are immutable)
CREATE POLICY "No updates on profile views"
    ON public.profile_views
    FOR UPDATE
    USING (false);

CREATE POLICY "No deletes on profile views"
    ON public.profile_views
    FOR DELETE
    USING (false);

-- ================================
-- STEP 5: Grant Permissions
-- ================================
GRANT SELECT ON public.profile_views TO authenticated, anon;
GRANT INSERT ON public.profile_views TO authenticated, anon;
GRANT SELECT ON public.profile_view_counts TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.refresh_profile_view_counts() TO authenticated;

-- ================================
-- STEP 6: Setup pg_cron for Automatic Refresh
-- ================================
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule materialized view refresh every hour at minute 0
-- This keeps view counts up-to-date without manual intervention
SELECT cron.schedule(
    'refresh-profile-view-counts',  -- Job name
    '0 * * * *',                     -- Cron expression: every hour at :00
    $$SELECT public.refresh_profile_view_counts();$$
);

COMMIT;

-- ================================
-- USAGE NOTES
-- ================================
-- 1. Track a view:
--    INSERT INTO profile_views (profile_id, viewer_id, session_id, referrer_source)
--    VALUES ('profile-uuid', 'viewer-uuid', 'session-abc123', 'search');
--
-- 2. Get view count for a profile:
--    SELECT total_views FROM profile_view_counts WHERE profile_id = 'profile-uuid';
--
-- 3. Get recent views:
--    SELECT * FROM profile_views WHERE profile_id = 'profile-uuid' ORDER BY viewed_at DESC LIMIT 10;
--
-- 4. Deduplication: Query to check if session already viewed profile recently (within 24 hours):
--    SELECT EXISTS (
--      SELECT 1 FROM profile_views
--      WHERE profile_id = 'profile-uuid'
--        AND session_id = 'session-abc123'
--        AND viewed_at > NOW() - INTERVAL '24 hours'
--    );
--
-- 5. Manually refresh materialized view (if needed):
--    SELECT refresh_profile_view_counts();
--
-- 6. Monitor pg_cron job status:
--    -- View scheduled jobs:
--    SELECT * FROM cron.job WHERE jobname = 'refresh-profile-view-counts';
--
--    -- View job run history (last 20 runs):
--    SELECT * FROM cron.job_run_details
--    WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'refresh-profile-view-counts')
--    ORDER BY start_time DESC LIMIT 20;
--
--    -- Check if job is running successfully:
--    SELECT
--      jobname,
--      start_time,
--      end_time,
--      status,
--      return_message
--    FROM cron.job_run_details
--    WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'refresh-profile-view-counts')
--    ORDER BY start_time DESC LIMIT 5;
--
-- 7. Manually trigger refresh (for testing):
--    SELECT cron.schedule_immediately('refresh-profile-view-counts');
--
-- 8. Unschedule job (if needed):
--    SELECT cron.unschedule('refresh-profile-view-counts');
