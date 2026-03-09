-- Migration 346: Phase 1 Production Fixes
--
-- Fixes live gaps in the workflow execution engine:
--   A. Deduplication index — prevents double-firing Tutor Approval
--   B. workflow_exceptions table — Exception Queue data model
--   C. workflow_entity_cooldowns — cross-workflow coordination
--   D. failed_webhooks table + DLQ retry cron (every 15 min, exponential backoff)
--   E. workflow-trigger-fallback cron — profiles stuck in under_review > 60 min

-- ---------------------------------------------------------------------------
-- A. Deduplication index
-- Prevents a second execution starting for the same process+entity while one
-- is already running or paused.
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_executions_active_entity
ON workflow_executions (process_id, target_entity_id)
WHERE status IN ('running', 'paused');

-- ---------------------------------------------------------------------------
-- B. workflow_exceptions — Exception Queue
-- Raised by the workflow engine when human intervention is needed.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS workflow_exceptions (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id     uuid        REFERENCES workflow_executions(id) ON DELETE CASCADE,
  severity         text        NOT NULL CHECK (severity IN ('high', 'medium', 'low')),
  domain           text        NOT NULL, -- 'bookings'|'referrals'|'financials'|'listings'|'orgs'
  title            text        NOT NULL DEFAULT '',
  description      text,
  ai_recommendation text,
  confidence_score integer     CHECK (confidence_score BETWEEN 0 AND 100),
  evidence_count   integer     DEFAULT 0,
  context_data     jsonb       DEFAULT '{}',
  claimed_by       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at       timestamptz,
  escalated_at     timestamptz,  -- set when unclaimed > 48h
  resolved_at      timestamptz,
  resolved_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution       text,
  resolution_data  jsonb,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_exceptions_execution_id
  ON workflow_exceptions (execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_exceptions_unresolved
  ON workflow_exceptions (created_at DESC)
  WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_exceptions_severity
  ON workflow_exceptions (severity, created_at DESC)
  WHERE resolved_at IS NULL;

-- RLS
ALTER TABLE workflow_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wex_admin_all" ON workflow_exceptions USING (is_admin());

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_workflow_exceptions_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_workflow_exceptions_updated_at
  BEFORE UPDATE ON workflow_exceptions
  FOR EACH ROW EXECUTE FUNCTION update_workflow_exceptions_updated_at();

-- ---------------------------------------------------------------------------
-- C. workflow_entity_cooldowns — Cross-workflow coordination
-- Prevents two workflows targeting the same entity simultaneously.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS workflow_entity_cooldowns (
  entity_id          uuid        NOT NULL,
  entity_type        text        NOT NULL, -- 'profile'|'booking'|'organisation'|'referral'
  last_workflow_at   timestamptz NOT NULL DEFAULT now(),
  last_workflow_type text,
  cooldown_until     timestamptz,
  PRIMARY KEY (entity_id, entity_type)
);

CREATE INDEX IF NOT EXISTS idx_workflow_entity_cooldowns_cooldown
  ON workflow_entity_cooldowns (cooldown_until)
  WHERE cooldown_until IS NOT NULL;

ALTER TABLE workflow_entity_cooldowns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wec_admin_all" ON workflow_entity_cooldowns USING (is_admin());

-- ---------------------------------------------------------------------------
-- D. failed_webhooks — DLQ for webhook delivery failures
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS failed_webhooks (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  url            text        NOT NULL,
  method         text        NOT NULL DEFAULT 'POST',
  headers        jsonb       DEFAULT '{}',
  payload        jsonb       DEFAULT '{}',
  status         text        NOT NULL DEFAULT 'failed'
                             CHECK (status IN ('failed', 'retrying', 'resolved', 'dead')),
  error_message  text,
  retry_count    integer     NOT NULL DEFAULT 0,
  max_retries    integer     NOT NULL DEFAULT 5,
  last_retry_at  timestamptz,
  resolved_at    timestamptz,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_failed_webhooks_pending
  ON failed_webhooks (created_at)
  WHERE status IN ('failed', 'retrying') AND retry_count < 5;

ALTER TABLE failed_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fw_admin_all" ON failed_webhooks USING (is_admin());

-- DLQ retry cron: every 15 minutes, exponential backoff (2^retry_count minutes)
SELECT cron.schedule(
  'process-failed-webhooks',
  '*/15 * * * *',
  $$
    UPDATE failed_webhooks
    SET
      retry_count   = retry_count + 1,
      last_retry_at = now(),
      status        = CASE
                        WHEN retry_count + 1 >= max_retries THEN 'dead'
                        ELSE 'retrying'
                      END
    WHERE status IN ('failed', 'retrying')
      AND retry_count < max_retries
      AND COALESCE(last_retry_at, created_at)
          + (INTERVAL '1 minute' * power(2, retry_count)::integer) < now()
  $$
);

-- ---------------------------------------------------------------------------
-- E. workflow-trigger-fallback cron
-- Catches profiles stuck in under_review with no active execution (missed webhook).
-- Runs every 5 minutes. Fires /api/webhooks/workflow for each stuck profile.
-- ---------------------------------------------------------------------------

SELECT cron.schedule(
  'workflow-trigger-fallback',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url     := 'https://tutorwise.vercel.app/api/webhooks/workflow',
      headers := '{"Content-Type": "application/json", "x-webhook-secret": "3506aa56aa49dd85df399abfe3128488e824b8a9aa1ab76ff3027145ea4375ae"}'::jsonb,
      body    := json_build_object(
        'type',   'UPDATE',
        'table',  'profiles',
        'schema', 'public',
        'record', json_build_object(
          'id',     p.id,
          'status', 'under_review',
          'email',  p.email
        ),
        'old_record', json_build_object('status', 'pending')
      )::jsonb
    )
    FROM profiles p
    WHERE p.status = 'under_review'
      AND NOT EXISTS (
        SELECT 1 FROM workflow_executions we
        WHERE we.target_entity_id = p.id
          AND we.status IN ('running', 'paused')
      )
      AND NOT EXISTS (
        SELECT 1 FROM workflow_executions we
        WHERE we.target_entity_id = p.id
          AND we.created_at > now() - INTERVAL '60 minutes'
      )
  $$
);
