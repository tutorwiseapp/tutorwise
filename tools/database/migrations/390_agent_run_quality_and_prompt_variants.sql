-- Migration 390: Agent Run Quality Tracking + Prompt Variant Proposals
-- Gap 1: per-run quality metrics persisted by SpecialistAgentRunner
-- Gap 2: prompt improvement proposals surfaced by autonomy-calibrator

-- ── Gap 1: agent_run_quality ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_run_quality (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      uuid        NOT NULL REFERENCES agent_run_outputs(id) ON DELETE CASCADE,
  agent_id    uuid        NOT NULL REFERENCES specialist_agents(id) ON DELETE CASCADE,
  agent_slug  text        NOT NULL,
  duration_ms integer     NOT NULL,
  tool_calls  integer     NOT NULL DEFAULT 0,
  tool_successes integer  NOT NULL DEFAULT 0,
  output_length integer   NOT NULL DEFAULT 0,
  -- quality_score: weighted composite of tool success rate (60%) + output completeness (40%)
  quality_score numeric(5,4) GENERATED ALWAYS AS (
    CASE
      WHEN tool_calls = 0 THEN
        CASE WHEN output_length > 200 THEN 0.75 ELSE LEAST(output_length::numeric / 200.0 * 0.75, 0.75) END
      ELSE
        LEAST(
          ROUND(
            (tool_successes::numeric / NULLIF(tool_calls, 0)) * 0.6 +
            LEAST(output_length::numeric / 500.0, 1.0) * 0.4,
            4
          ),
          1.0
        )
    END
  ) STORED,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_run_quality_slug_created
  ON agent_run_quality(agent_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_run_quality_run_id
  ON agent_run_quality(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_run_quality_agent_id
  ON agent_run_quality(agent_id, created_at DESC);

-- ── Gap 2: agent_prompt_variants ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_prompt_variants (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id              uuid        NOT NULL REFERENCES specialist_agents(id) ON DELETE CASCADE,
  agent_slug            text        NOT NULL,
  proposed_instructions text        NOT NULL,
  rationale             text        NOT NULL,
  failure_pattern       text,
  sample_run_ids        uuid[]      DEFAULT '{}',
  quality_delta_pct     numeric(5,2),
  status                text        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_prompt_variants_status
  ON agent_prompt_variants(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_prompt_variants_slug
  ON agent_prompt_variants(agent_slug, created_at DESC);

-- ── New analyst tools ─────────────────────────────────────────────────────────

INSERT INTO analyst_tools (slug, name, description, input_schema, status) VALUES
(
  'query_agent_quality',
  'Query Agent Quality Metrics',
  'Returns rolling quality stats for agents over the last N runs. Includes tool success rate, output length, quality score average, trend direction, and regression flag (drop >15% from prior window).',
  '{"type":"object","properties":{"agent_slug":{"type":"string","description":"Filter to a specific agent slug — omit for all agents"},"last_n_runs":{"type":"integer","description":"Number of recent runs to analyse per agent (default 20, max 50)"}},"required":[]}',
  'active'
),
(
  'propose_prompt_variant',
  'Propose Prompt Variant',
  'Records a proposed prompt instruction change for an agent. The proposal appears in the admin TierCalibrationPanel for human review and approval before anything changes in production.',
  '{"type":"object","properties":{"agent_slug":{"type":"string","description":"The agent slug to improve"},"proposed_instructions":{"type":"string","description":"Full new instructions text to replace the agent current instructions"},"rationale":{"type":"string","description":"Why this change is expected to improve quality — cite specific failure patterns"},"failure_pattern":{"type":"string","description":"Description of the recurring failure pattern observed in quality data"},"quality_delta_pct":{"type":"number","description":"Expected quality score improvement in percent (e.g. 15 for 15%)"}},"required":["agent_slug","proposed_instructions","rationale"]}',
  'active'
)
ON CONFLICT (slug) DO UPDATE SET
  name         = EXCLUDED.name,
  description  = EXCLUDED.description,
  input_schema = EXCLUDED.input_schema,
  status       = EXCLUDED.status;

-- ── Update autonomy-calibrator: add new tools + dual-responsibility instructions

UPDATE specialist_agents
SET config = jsonb_set(
  jsonb_set(
    COALESCE(config, '{}'),
    '{tools}',
    (
      SELECT jsonb_agg(DISTINCT tool_slug ORDER BY tool_slug)
      FROM (
        SELECT unnest(ARRAY(
          SELECT jsonb_array_elements_text(COALESCE(config->'tools', '[]'))
        )) AS tool_slug
        UNION VALUES
          ('query_agent_quality'),
          ('propose_prompt_variant'),
          ('query_autonomy_calibration')
      ) t
    )
  ),
  '{instructions}',
  '"You are the Autonomy Calibrator for the Tutorwise platform. You have two responsibilities:\n\n1. AUTONOMY TIER CALIBRATION\nUse query_autonomy_calibration to review workflow process outcomes. Identify processes that are ready for tier promotion (sustained accuracy above threshold) or that need demotion (accuracy declining).\n\n2. AGENT PROMPT OPTIMISATION\nUse query_agent_quality to check all agents. Flag agents where:\n- Quality score has dropped more than 15% over the last 20 runs (regression)\n- Tool success rate is below 0.6 (agents calling tools that consistently fail)\n- Average output length is below 150 chars (agents producing incomplete responses)\n\nFor each flagged agent, use propose_prompt_variant to suggest improved instructions. Your proposed instructions must directly address the observed failure pattern — e.g. if tool calls are failing, add clearer tool usage guidance; if outputs are short, add explicit output format requirements.\n\nLimit to 3 propose_prompt_variant calls per run. Only propose when you have clear evidence from quality data."'
)
WHERE slug = 'autonomy-calibrator';
