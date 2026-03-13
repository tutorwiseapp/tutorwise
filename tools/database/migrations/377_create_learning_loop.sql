/*
 * Migration: 375_create_learning_loop.sql
 * Purpose: Learning Loop for Conductor Phase 4D
 *   - decision_rationale jsonb column on workflow_executions
 *   - decision_outcomes table (outcome measurement at lag intervals)
 *   - process_autonomy_config table (per-process tier config + accuracy tracking)
 *   - 3 pg_cron outcome measurement jobs
 * Created: 2026-03-10
 */

-- ── 1. Add decision_rationale to workflow_executions ──────────────────────────
-- Captures: signals used, confidence score, tier at time of decision, intelligence domains consulted
ALTER TABLE workflow_executions
  ADD COLUMN IF NOT EXISTS decision_rationale JSONB DEFAULT NULL;
-- Example structure:
-- {
--   "signals": [
--     { "source": "intel_caas", "value": 62, "threshold": 70, "weight": 0.4 },
--     { "source": "intel_bookings", "value": 3, "threshold": 5, "weight": 0.3 },
--     { "source": "intel_listings", "value": 75, "threshold": 80, "weight": 0.3 }
--   ],
--   "confidence": 0.94,
--   "tier": "autonomous",
--   "decided_at": "2026-03-10T10:00:00Z"
-- }

CREATE INDEX IF NOT EXISTS idx_we_decision_rationale
  ON workflow_executions USING gin(decision_rationale)
  WHERE decision_rationale IS NOT NULL;

-- ── 2. decision_outcomes table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS decision_outcomes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id    UUID        NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  outcome_metric  TEXT        NOT NULL,
  -- 'dispute_raised' | 'active_30d' | 'payout_correct' | 'booking_completed'
  -- 'cancellation_rate' | 'nudge_converted' | 'commission_earned' | 'converted' | 'churned_60d'
  outcome_value   NUMERIC,    -- 0/1 for boolean, rate (0.0–1.0) for conversion, NULL until measured
  lag_days        INT         NOT NULL CHECK (lag_days IN (7, 14, 30, 60, 90)),
  measured_at     TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_do_execution_id
  ON decision_outcomes(execution_id);

CREATE INDEX IF NOT EXISTS idx_do_metric_lag
  ON decision_outcomes(outcome_metric, lag_days);

CREATE INDEX IF NOT EXISTS idx_do_unmeasured
  ON decision_outcomes(execution_id, lag_days)
  WHERE outcome_value IS NULL;

-- RLS: admin-only
ALTER TABLE decision_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to decision_outcomes"
  ON decision_outcomes FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- ── 3. process_autonomy_config table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS process_autonomy_config (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id        UUID        NOT NULL REFERENCES workflow_processes(id) ON DELETE CASCADE,
  current_tier      TEXT        NOT NULL DEFAULT 'supervised'
                    CHECK (current_tier IN ('supervised', 'semi-autonomous', 'autonomous')),
  accuracy_30d      NUMERIC,    -- rolling accuracy percentage (0-100), computed by calibrator agent
  accuracy_threshold NUMERIC   NOT NULL DEFAULT 90,
  -- Pending admin proposal (written by autonomy-calibrator agent, cleared on approve/reject)
  proposal          TEXT        CHECK (proposal IN ('expand', 'downgrade', NULL)),
  proposal_reason   TEXT,
  proposed_at       TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(process_id)
);

CREATE INDEX IF NOT EXISTS idx_pac_process_id
  ON process_autonomy_config(process_id);

CREATE INDEX IF NOT EXISTS idx_pac_proposals
  ON process_autonomy_config(proposal)
  WHERE proposal IS NOT NULL;

-- Updated-at trigger
CREATE OR REPLACE FUNCTION update_pac_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pac_updated_at
  BEFORE UPDATE ON process_autonomy_config
  FOR EACH ROW EXECUTE FUNCTION update_pac_updated_at();

-- RLS: admin-only
ALTER TABLE process_autonomy_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to process_autonomy_config"
  ON process_autonomy_config FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- Seed: one row per existing workflow process
INSERT INTO process_autonomy_config (process_id, current_tier, accuracy_threshold)
SELECT id, 'supervised', 90 FROM workflow_processes
ON CONFLICT (process_id) DO NOTHING;

-- ── 4. pg_cron outcome measurement jobs ──────────────────────────────────────
-- These jobs fill outcome_value for stub rows created at workflow completion.

-- Job 1: measure-tutor-approval-outcomes (every Monday 09:15 UTC)
-- Checks tutors approved 30d ago — did any disputes get raised?
SELECT cron.schedule(
  'measure-tutor-approval-outcomes',
  '15 9 * * 1',
  $$
  UPDATE decision_outcomes do
  SET
    outcome_value = CASE
      WHEN do.outcome_metric = 'dispute_raised' THEN
        (SELECT COUNT(*)::numeric FROM disputes d
         JOIN workflow_executions we2 ON we2.target_entity_id = d.profile_id
         WHERE we2.id = do.execution_id AND d.created_at > we2.completed_at)
      WHEN do.outcome_metric = 'active_30d' THEN
        (SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END FROM bookings b
         JOIN workflow_executions we2 ON we2.target_entity_id = b.tutor_id
         WHERE we2.id = do.execution_id
           AND b.created_at > we2.completed_at
           AND b.created_at < we2.completed_at + interval '30 days')
      ELSE NULL
    END,
    measured_at = now()
  FROM workflow_executions we
  JOIN workflow_processes wp ON we.process_id = wp.id
  WHERE do.execution_id = we.id
    AND wp.slug = 'tutor-approval'
    AND do.lag_days = 30
    AND do.outcome_value IS NULL
    AND we.completed_at < now() - interval '30 days'
    AND we.status = 'completed';
  $$
);

-- Job 2: measure-payout-outcomes (every Friday 10:30 UTC)
-- Checks payouts sent 7d ago — were they correct (no reversal/dispute)?
SELECT cron.schedule(
  'measure-payout-outcomes',
  '30 10 * * 5',
  $$
  UPDATE decision_outcomes do
  SET
    outcome_value = CASE
      WHEN do.outcome_metric = 'payout_correct' THEN
        (SELECT CASE WHEN COUNT(*) = 0 THEN 1 ELSE 0 END
         FROM stripe_payout_disputes spd
         JOIN workflow_executions we2 ON we2.id = do.execution_id
         WHERE spd.created_at > we2.completed_at
           AND spd.created_at < we2.completed_at + interval '7 days')
      ELSE NULL
    END,
    measured_at = now()
  FROM workflow_executions we
  JOIN workflow_processes wp ON we.process_id = wp.id
  WHERE do.execution_id = we.id
    AND wp.slug = 'commission-payout'
    AND do.lag_days = 7
    AND do.outcome_value IS NULL
    AND we.completed_at < now() - interval '7 days'
    AND we.status = 'completed';
  $$
);

-- Job 3: measure-nudge-outcomes (every 3 days at 08:30 UTC)
-- Checks nudges sent 14d ago — did the user convert (complete a booking)?
SELECT cron.schedule(
  'measure-nudge-outcomes',
  '30 8 */3 * *',
  $$
  UPDATE decision_outcomes do
  SET
    outcome_value = CASE
      WHEN do.outcome_metric = 'nudge_converted' THEN
        (SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END FROM bookings b
         JOIN workflow_executions we2 ON we2.target_entity_id = b.tutor_id
         WHERE we2.id = do.execution_id
           AND b.created_at > we2.completed_at
           AND b.created_at < we2.completed_at + interval '14 days'
           AND b.status = 'completed')
      ELSE NULL
    END,
    measured_at = now()
  FROM workflow_executions we
  JOIN workflow_processes wp ON we.process_id = wp.id
  WHERE do.execution_id = we.id
    AND wp.slug IN ('booking-lifecycle-human', 'booking-lifecycle-ai', 'referral-attribution')
    AND do.lag_days = 14
    AND do.outcome_value IS NULL
    AND we.completed_at < now() - interval '14 days'
    AND we.status = 'completed';
  $$
);
