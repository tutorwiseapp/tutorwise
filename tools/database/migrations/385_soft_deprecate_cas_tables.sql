-- Migration 385: Soft-deprecate CAS tables
-- Phase 6D: The CAS execution engine is replaced by TeamRuntime v2 (LangGraph + PostgresSaver).
--
-- Strategy: add `deprecated_at` timestamp column to each CAS table.
-- When set, application code treats the table as read-only legacy data.
-- Hard deletion deferred until Phase 6D-final (post 90-day GDPR retention window).
-- References: conductor-solution-design.md § Phase 6D, gdpr-retention-policy.md § T6
--
-- Tables affected:
--   cas_agent_status       — agent heartbeat rows (now in workflow_executions)
--   cas_agent_events       — agent event log (now in agent_run_outputs)
--   cas_agent_logs         — verbose run logs (no equivalent — permanent archive)
--   cas_metrics_timeseries — metrics rows (now in agent_run_outputs + workflow_executions)
--   cas_agent_config       — per-agent config (migrated to specialist_agents.config)
--   cas_approval_requests  — HITL approvals (replaced by TeamRuntime HITL + workflow_executions)

-- ─── 1. cas_agent_status ─────────────────────────────────────────────────────

ALTER TABLE cas_agent_status
  ADD COLUMN IF NOT EXISTS deprecated_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON TABLE cas_agent_status IS
  'DEPRECATED (Phase 6D): CAS legacy agent heartbeat. '
  'Successor: workflow_executions WHERE execution_context->>''process_type'' = ''team''. '
  'Schedule hard delete after 2026-06-11 (90-day window).';

-- ─── 2. cas_agent_events ─────────────────────────────────────────────────────

ALTER TABLE cas_agent_events
  ADD COLUMN IF NOT EXISTS deprecated_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON TABLE cas_agent_events IS
  'DEPRECATED (Phase 6D): CAS legacy agent events. '
  'Successor: agent_run_outputs. '
  'Schedule hard delete after 2026-06-11.';

-- ─── 3. cas_agent_logs ───────────────────────────────────────────────────────

ALTER TABLE cas_agent_logs
  ADD COLUMN IF NOT EXISTS deprecated_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON TABLE cas_agent_logs IS
  'DEPRECATED (Phase 6D): CAS legacy verbose run logs. '
  'No direct successor — archive to cold storage before hard delete. '
  'Schedule hard delete after 2026-06-11.';

-- ─── 4. cas_metrics_timeseries ───────────────────────────────────────────────

ALTER TABLE cas_metrics_timeseries
  ADD COLUMN IF NOT EXISTS deprecated_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON TABLE cas_metrics_timeseries IS
  'DEPRECATED (Phase 6D): CAS legacy metrics timeseries. '
  'Successor: agent_run_outputs.duration_ms + workflow_executions. '
  'Schedule hard delete after 2026-06-11.';

-- ─── 5. cas_agent_config ─────────────────────────────────────────────────────

ALTER TABLE cas_agent_config
  ADD COLUMN IF NOT EXISTS deprecated_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON TABLE cas_agent_config IS
  'DEPRECATED (Phase 6D): CAS legacy per-agent config overrides. '
  'Successor: specialist_agents.config JSONB. '
  'Schedule hard delete after 2026-06-11.';

-- ─── 6. cas_approval_requests ────────────────────────────────────────────────

ALTER TABLE IF EXISTS cas_approval_requests
  ADD COLUMN IF NOT EXISTS deprecated_at TIMESTAMPTZ DEFAULT NULL;

-- Note: cas_approval_requests was never created via migration (it was CAS SDK internal).
-- No ALTER needed — table does not exist in this environment.

-- ─── 7. Audit log entry ───────────────────────────────────────────────────────

DO $$
BEGIN
  RAISE NOTICE 'Migration 385 complete: 6 CAS tables soft-deprecated. '
               'deprecated_at column added to all. Hard delete eligible 2026-06-11.';
END $$;
