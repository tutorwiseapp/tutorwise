-- Migration 348: Specialist Agents, Agent Run Outputs, Analyst Tools
-- Phase 2 — Conductor: Agents + Teams
-- Creates the agent registry, tool registry, and run output tracking.

-- ============================================================
-- 1. specialist_agents — Registry of AI specialist agents
-- ============================================================

CREATE TABLE IF NOT EXISTS specialist_agents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL,
  department  TEXT NOT NULL DEFAULT 'Engineering',
  description TEXT,
  config      JSONB NOT NULL DEFAULT '{}',
  status      TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  built_in    BOOLEAN NOT NULL DEFAULT false,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE specialist_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY sa_admin_all ON specialist_agents FOR ALL USING (is_admin());

CREATE INDEX idx_sa_status ON specialist_agents(status);
CREATE INDEX idx_sa_built_in ON specialist_agents(built_in) WHERE built_in = true;

CREATE OR REPLACE FUNCTION update_specialist_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER specialist_agents_updated_at
  BEFORE UPDATE ON specialist_agents
  FOR EACH ROW EXECUTE FUNCTION update_specialist_agents_updated_at();

-- ============================================================
-- 2. analyst_tools — Registry of callable tools for agents
-- ============================================================

CREATE TABLE IF NOT EXISTS analyst_tools (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT 'analytics',
  input_schema JSONB NOT NULL DEFAULT '{}',
  return_type  TEXT NOT NULL DEFAULT 'json',
  built_in     BOOLEAN NOT NULL DEFAULT false,
  status       TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE analyst_tools ENABLE ROW LEVEL SECURITY;
CREATE POLICY at_admin_all ON analyst_tools FOR ALL USING (is_admin());

-- ============================================================
-- 3. agent_run_outputs — Run history per agent
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_run_outputs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id     UUID NOT NULL REFERENCES specialist_agents(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  input_prompt TEXT NOT NULL,
  output_text  TEXT,
  tools_called JSONB NOT NULL DEFAULT '[]',
  status       TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed')),
  duration_ms  INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE agent_run_outputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY aro_admin_all ON agent_run_outputs FOR ALL USING (is_admin());

CREATE INDEX idx_aro_agent_id ON agent_run_outputs(agent_id, created_at DESC);
CREATE INDEX idx_aro_status ON agent_run_outputs(status);

-- ============================================================
-- 4. Seeds — 8 built-in agents
-- ============================================================

INSERT INTO specialist_agents (slug, name, role, department, description, config, built_in) VALUES
  ('developer', 'Developer Agent', 'Developer', 'Engineering',
   'Full-stack software developer specialising in Next.js, TypeScript, and Supabase.',
   '{"skills": ["code review", "architecture", "debugging", "API design"], "tools": ["query_platform_health"]}',
   true),
  ('tester', 'Tester Agent', 'Tester', 'Engineering',
   'QA engineer focused on test strategy, automated testing, and quality gates.',
   '{"skills": ["test planning", "bug triage", "regression testing", "coverage analysis"], "tools": ["query_platform_health"]}',
   true),
  ('qa', 'QA Agent', 'Quality Assurance', 'Engineering',
   'Quality assurance specialist reviewing processes, compliance, and platform reliability.',
   '{"skills": ["process audit", "compliance checks", "SLA monitoring", "incident review"], "tools": ["query_platform_health", "flag_for_review"]}',
   true),
  ('engineer', 'Engineer Agent', 'Engineer', 'Engineering',
   'Platform infrastructure engineer monitoring system health and performance.',
   '{"skills": ["infrastructure", "performance tuning", "monitoring", "capacity planning"], "tools": ["query_platform_health", "query_booking_trends"]}',
   true),
  ('security', 'Security Agent', 'Security', 'Engineering',
   'Security specialist auditing access controls, fraud signals, and compliance.',
   '{"skills": ["security audit", "fraud detection", "access review", "compliance"], "tools": ["query_platform_health", "flag_for_review"]}',
   true),
  ('marketer', 'Marketer Agent', 'Marketing', 'Marketing',
   'Growth marketing specialist analysing acquisition, retention, and referral performance.',
   '{"skills": ["growth analysis", "campaign strategy", "referral optimisation", "content"], "tools": ["query_growth_scores", "query_referral_pipeline", "query_booking_trends"]}',
   true),
  ('analyst', 'Analyst Agent', 'Analyst', 'Analytics',
   'Business intelligence analyst surfacing revenue trends, tutor performance, and platform health.',
   '{"skills": ["data analysis", "reporting", "trend detection", "forecasting"], "tools": ["query_booking_trends", "query_tutor_performance", "query_commissions", "query_stripe_payouts", "query_growth_scores"]}',
   true),
  ('planner', 'Planner Agent', 'Planner', 'Strategy',
   'Strategic planner coordinating multi-agent tasks, synthesising outputs, and driving decisions.',
   '{"skills": ["strategic planning", "task coordination", "synthesis", "prioritisation"], "tools": ["query_platform_health", "query_growth_scores", "query_at_risk_tutors", "send_notification"]}',
   true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 5. Seeds — 10 built-in analyst tools
-- ============================================================

INSERT INTO analyst_tools (slug, name, description, category, input_schema, return_type, built_in) VALUES
  ('query_booking_trends', 'Query Booking Trends',
   'Retrieves booking volume grouped by week and subject for the past N days.',
   'analytics',
   '{"type":"object","properties":{"days":{"type":"integer","default":30}},"required":[]}',
   'json', true),

  ('query_tutor_performance', 'Query Tutor Performance',
   'Returns tutor performance metrics: booking rate, avg rating, response time, and revenue.',
   'analytics',
   '{"type":"object","properties":{"limit":{"type":"integer","default":20}},"required":[]}',
   'json', true),

  ('query_platform_health', 'Query Platform Health',
   'Returns live platform health: failed webhooks, shadow divergences, and running executions.',
   'analytics',
   '{"type":"object","properties":{},"required":[]}',
   'json', true),

  ('query_commissions', 'Query Commissions',
   'Returns commission totals and splits (platform/tutor/referrer) for a given period.',
   'analytics',
   '{"type":"object","properties":{"days":{"type":"integer","default":30}},"required":[]}',
   'json', true),

  ('query_growth_scores', 'Query Growth Scores',
   'Returns tutor growth scores with trend direction (up/down/stable) for the past N days.',
   'analytics',
   '{"type":"object","properties":{"limit":{"type":"integer","default":20}},"required":[]}',
   'json', true),

  ('query_referral_pipeline', 'Query Referral Pipeline',
   'Returns referral pipeline stages: referred, converted, and commission earned.',
   'analytics',
   '{"type":"object","properties":{"days":{"type":"integer","default":30}},"required":[]}',
   'json', true),

  ('query_at_risk_tutors', 'Query At-Risk Tutors',
   'Returns tutors with declining growth scores, low booking rates, or recent inactivity.',
   'analytics',
   '{"type":"object","properties":{"threshold":{"type":"integer","default":40}},"required":[]}',
   'json', true),

  ('query_stripe_payouts', 'Query Stripe Payouts',
   'Returns recent Stripe payout records with amounts, statuses, and failure reasons.',
   'analytics',
   '{"type":"object","properties":{"limit":{"type":"integer","default":20}},"required":[]}',
   'json', true),

  ('flag_for_review', 'Flag for Review',
   'Creates a workflow exception record flagging an entity for human review.',
   'actions',
   '{"type":"object","properties":{"domain":{"type":"string"},"severity":{"type":"string","enum":["high","medium","low"]},"title":{"type":"string"},"ai_recommendation":{"type":"string"}},"required":["domain","severity","title"]}',
   'json', true),

  ('send_notification', 'Send Notification',
   'Sends an in-app notification to a user or admin.',
   'notifications',
   '{"type":"object","properties":{"user_id":{"type":"string"},"title":{"type":"string"},"message":{"type":"string"},"type":{"type":"string","default":"info"}},"required":["user_id","title","message"]}',
   'json', true)

ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 6. pg_cron — Proactive Nudge Scheduler (every 4 hours)
-- ============================================================

SELECT cron.schedule(
  'proactive-nudges',
  '0 */4 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.base_url', true) || '/api/cron/process-nudges',
      headers := ('{"Content-Type":"application/json","x-cron-secret":"' || current_setting('app.cron_secret', true) || '"}')::jsonb,
      body := '{}'::jsonb
    )
  $$
);
