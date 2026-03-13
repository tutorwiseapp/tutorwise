-- Migration: 394_scheduler_execution_tracking.sql
-- Purpose: Add execution tracking columns for standalone scheduler service
-- Created: 2026-03-13

-- Optimistic lock version: incremented on each status transition
ALTER TABLE scheduled_items ADD COLUMN IF NOT EXISTS lock_version INTEGER NOT NULL DEFAULT 0;

-- Which service instance claimed this item (for future multi-instance)
ALTER TABLE scheduled_items ADD COLUMN IF NOT EXISTS locked_by TEXT;

-- When the lock was acquired (stale lock detection)
ALTER TABLE scheduled_items ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

-- When execution started (separate from locked_at for accurate duration tracking)
ALTER TABLE scheduled_items ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- Number of retry attempts
ALTER TABLE scheduled_items ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0;

-- Maximum retries allowed (per-item override, default 3)
ALTER TABLE scheduled_items ADD COLUMN IF NOT EXISTS max_retries INTEGER NOT NULL DEFAULT 3;

-- Last error message (for failed items)
ALTER TABLE scheduled_items ADD COLUMN IF NOT EXISTS last_error TEXT;

-- Extend type CHECK to include cron_job and sql_func
ALTER TABLE scheduled_items DROP CONSTRAINT IF EXISTS scheduled_items_type_check;
ALTER TABLE scheduled_items ADD CONSTRAINT scheduled_items_type_check
  CHECK (type IN ('content', 'agent_run', 'team_run', 'task', 'reminder', 'cron_job', 'sql_func'));

-- Extend recurrence CHECK to include 'cron' for arbitrary cron expressions
ALTER TABLE scheduled_items DROP CONSTRAINT IF EXISTS scheduled_items_recurrence_check;
ALTER TABLE scheduled_items ADD CONSTRAINT scheduled_items_recurrence_check
  CHECK (recurrence IN ('daily', 'weekly', 'biweekly', 'monthly', 'cron'));

-- Cron expression for arbitrary schedules (e.g. '*/5 * * * *')
ALTER TABLE scheduled_items ADD COLUMN IF NOT EXISTS cron_expression TEXT;

-- HTTP endpoint for cron_job type (e.g. '/api/cron/session-reminders')
ALTER TABLE scheduled_items ADD COLUMN IF NOT EXISTS endpoint TEXT;

-- SQL function name for sql_func type (e.g. 'cleanup_expired_slot_reservations')
ALTER TABLE scheduled_items ADD COLUMN IF NOT EXISTS sql_function TEXT;

-- HTTP method for cron_job type (GET or POST)
ALTER TABLE scheduled_items ADD COLUMN IF NOT EXISTS http_method TEXT DEFAULT 'GET'
  CHECK (http_method IN ('GET', 'POST'));

-- Cross-field CHECK: cron_job and sql_func types must have a cron_expression
ALTER TABLE scheduled_items DROP CONSTRAINT IF EXISTS scheduled_items_cron_fields_check;
ALTER TABLE scheduled_items ADD CONSTRAINT scheduled_items_cron_fields_check
  CHECK (
    (type IN ('cron_job', 'sql_func') AND cron_expression IS NOT NULL)
    OR type NOT IN ('cron_job', 'sql_func')
  );

-- Partial index for the scheduler's main poll query: "give me due items"
-- NOTE: This partial index supersedes idx_scheduled_items_scheduled_at_status from 393
-- for the scheduler's main query, because the WHERE clause narrows to only actionable statuses.
CREATE INDEX IF NOT EXISTS idx_scheduled_items_due
  ON scheduled_items (scheduled_at)
  WHERE status IN ('scheduled', 'failed');
