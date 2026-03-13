-- Migration: 400 — Scheduler runs cleanup + retention
-- Purpose: Add SQL function to prune old scheduler_runs (keep 30 days).
--          Register as a weekly cron job via the scheduler itself.

-- Cleanup function: delete runs older than 30 days
CREATE OR REPLACE FUNCTION cleanup_scheduler_runs() RETURNS void AS $$
BEGIN
  DELETE FROM scheduler_runs WHERE created_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql;

-- Seed as a scheduled item (weekly Sunday 3am UTC)
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, sql_function, metadata, tags, max_retries)
SELECT 'Cleanup Scheduler Runs', 'sql_func', 'scheduled', now(), 'cron', '0 3 * * 0',
   'cleanup_scheduler_runs',
   '{"description": "Delete scheduler_runs older than 30 days", "migration": "400"}',
   ARRAY['cron', 'scheduler', 'cleanup'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Cleanup Scheduler Runs');
