-- Migration 372: Phase 3 — Shadow monitoring pg_cron schedules
--
-- Adds two cron jobs:
--   1. shadow-reconcile   — hourly, compares completed shadow executions against DB state
--   2. trigger-fallback   — every 30 min, catches profiles stuck in under_review > 60 min
--
-- Note: process-failed-webhooks DLQ retry runs every 15 min (also added here).
-- These crons call the Next.js API routes via pg_net HTTP requests.
-- pg_net extension must be enabled (it is, via migration 346).

-- Remove old jobs if they exist (idempotent)
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname IN (
  'shadow-reconcile',
  'workflow-trigger-fallback',
  'process-failed-webhooks'
);

-- 1. Shadow divergence reconciliation — hourly at :05
SELECT cron.schedule(
  'shadow-reconcile',
  '5 * * * *',
  $$
  SELECT net.http_get(
    url := current_setting('app.site_url') || '/api/cron/shadow-reconcile',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.cron_secret')
    )
  );
  $$
);

-- 2. Trigger fallback for stuck profiles — every 30 minutes
SELECT cron.schedule(
  'workflow-trigger-fallback',
  '*/30 * * * *',
  $$
  SELECT net.http_get(
    url := current_setting('app.site_url') || '/api/cron/workflow-trigger-fallback',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.cron_secret')
    )
  );
  $$
);

-- 3. DLQ retry — every 15 minutes
SELECT cron.schedule(
  'process-failed-webhooks',
  '*/15 * * * *',
  $$
  SELECT net.http_get(
    url := current_setting('app.site_url') || '/api/cron/process-failed-webhooks',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.cron_secret')
    )
  );
  $$
);
