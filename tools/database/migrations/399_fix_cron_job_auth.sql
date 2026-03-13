-- ============================================================================
-- Migration: 399 — Fix cron job auth issues (audit C4, H1, H3)
-- ============================================================================
-- Fixes:
--   H1: cas-dspy-weekly-optimization had hard-coded 'REPLACE_WITH_CRON_SECRET'
--   H3+C4: mcp-health-check used wrong namespace (app.settings.* → app.*)
--
-- Both jobs are re-registered with correct auth using Authorization: Bearer.
-- ============================================================================

-- ── H1: Fix cas-dspy-weekly-optimization ─────────────────────────────────────
-- Original migration 326 had 'Bearer REPLACE_WITH_CRON_SECRET' placeholder.
-- Re-register with dynamic current_setting('app.cron_secret').

SELECT cron.unschedule('cas-dspy-weekly-optimization')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cas-dspy-weekly-optimization');

SELECT cron.schedule(
  'cas-dspy-weekly-optimization',
  '0 2 * * 0',
  $$
  SELECT net.http_post(
    url := current_setting('app.base_url', true) || '/api/cron/cas-dspy-optimize',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
    ),
    body := '{}'::jsonb
  )
  $$
);

-- ── H3+C4: Fix mcp-health-check ─────────────────────────────────────────────
-- Original migration 388 used app.settings.cron_secret (wrong namespace)
-- and x-cron-secret header. Re-register with app.cron_secret + Bearer auth.

SELECT cron.unschedule('mcp-health-check')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mcp-health-check');

SELECT cron.schedule(
  'mcp-health-check',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.base_url', true) || '/api/cron/mcp-health-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
    )
  )
  $$
);

-- ============================================================================
-- Verification
-- ============================================================================
-- Check both jobs are registered:
--   SELECT jobname, schedule, command FROM cron.job
--   WHERE jobname IN ('cas-dspy-weekly-optimization', 'mcp-health-check');
-- ============================================================================
