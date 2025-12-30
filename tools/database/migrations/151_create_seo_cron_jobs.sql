-- Migration: Create SEO cron jobs using pg_cron
-- Purpose: Automated daily/weekly SEO data synchronization
-- Date: 2025-12-29
--
-- Schedule:
-- - GSC sync: Daily at 6:00 AM UTC
-- - Rank tracking: Daily at 7:00 AM UTC
-- - Content quality: Weekly Monday at 3:00 AM UTC
-- - Backlink sync: Weekly Sunday at 2:00 AM UTC

-- =====================================================
-- 1. Enable pg_cron extension (if not already enabled)
-- =====================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =====================================================
-- 2. Create function to call API endpoints via HTTP
-- =====================================================

-- Note: Supabase uses pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =====================================================
-- 3. GSC Sync Cron Job (Daily 6am UTC)
-- =====================================================

SELECT cron.schedule(
    'seo-gsc-sync-daily',
    '0 6 * * *', -- Daily at 6:00 AM UTC
    $$
    SELECT net.http_post(
        url := 'https://tutorwise.io/api/cron/seo-sync',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
        ),
        body := jsonb_build_object(
            'tasks', jsonb_build_array('gsc')
        )
    );
    $$
);

-- =====================================================
-- 4. Rank Tracking Cron Job (Daily 7am UTC)
-- =====================================================

SELECT cron.schedule(
    'seo-rank-tracking-daily',
    '0 7 * * *', -- Daily at 7:00 AM UTC
    $$
    SELECT net.http_post(
        url := 'https://tutorwise.io/api/cron/seo-sync',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
        ),
        body := jsonb_build_object(
            'tasks', jsonb_build_array('ranks')
        )
    );
    $$
);

-- =====================================================
-- 5. Content Quality Analysis (Weekly Monday 3am UTC)
-- =====================================================

SELECT cron.schedule(
    'seo-content-quality-weekly',
    '0 3 * * 1', -- Every Monday at 3:00 AM UTC
    $$
    SELECT net.http_post(
        url := 'https://tutorwise.io/api/cron/seo-sync',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
        ),
        body := jsonb_build_object(
            'tasks', jsonb_build_array('quality'),
            'force_quality', true
        )
    );
    $$
);

-- =====================================================
-- 6. Comments and Documentation
-- =====================================================

COMMENT ON EXTENSION pg_cron IS 'PostgreSQL-based job scheduler for running periodic tasks';
COMMENT ON EXTENSION pg_net IS 'Async HTTP client for making web requests from PostgreSQL';

-- =====================================================
-- 7. View all scheduled cron jobs
-- =====================================================

-- Query to see all SEO cron jobs:
-- SELECT * FROM cron.job WHERE jobname LIKE 'seo-%';

-- To unschedule a job:
-- SELECT cron.unschedule('seo-gsc-sync-daily');

-- To manually run a cron job:
-- SELECT cron.schedule('seo-manual-test', '* * * * *', $$SELECT 1$$);
-- SELECT cron.unschedule('seo-manual-test');

-- =====================================================
-- 8. Set cron secret in database config
-- =====================================================

-- Run this separately in Supabase SQL Editor with your actual CRON_SECRET:
-- ALTER DATABASE postgres SET app.cron_secret = 'your_cron_secret_here';

-- Or set per session:
-- SET app.cron_secret = 'your_cron_secret_here';
