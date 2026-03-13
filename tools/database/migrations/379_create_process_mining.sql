-- Migration 379: Process Mining — conformance_deviations + process_patterns
-- Created: 2026-03-10
-- Phase 5: Conductor Process Mining Enhancement

-- ============================================================================
-- 1. conformance_deviations — tracks where executions deviate from process graph
-- ============================================================================

CREATE TABLE IF NOT EXISTS conformance_deviations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  process_id UUID NOT NULL REFERENCES workflow_processes(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  deviation_type TEXT NOT NULL CHECK (deviation_type IN ('skipped', 'unexpected_path', 'stuck')),
  expected_node_ids TEXT[] DEFAULT '{}',  -- what the graph expected next
  actual_node_id TEXT,                    -- what actually happened (NULL for skipped/stuck)
  is_expected_path BOOLEAN DEFAULT false, -- admin can mark as allowed
  expected_path_note TEXT,               -- admin explanation
  detected_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cd_process_id ON conformance_deviations(process_id);
CREATE INDEX idx_cd_execution_id ON conformance_deviations(execution_id);
CREATE INDEX idx_cd_is_expected ON conformance_deviations(process_id, is_expected_path);

-- RLS: admin read/write
ALTER TABLE conformance_deviations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conformance_deviations_admin_all"
  ON conformance_deviations FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- 2. process_patterns — AI-discovered recurring patterns in process executions
-- ============================================================================

CREATE TABLE IF NOT EXISTS process_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES workflow_processes(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN (
    'rejection_cluster',  -- e.g. "65% of rejections when CaaS 60-70"
    'bottleneck',         -- e.g. "review node takes 62h avg (bottleneck)"
    'path_frequency',     -- e.g. "86% take validate→review→approve path"
    'anomaly'             -- unexpected but recurring deviation
  )),
  conditions JSONB NOT NULL,    -- signal conditions that define this pattern
  occurrence_count INT DEFAULT 0,
  confidence FLOAT CHECK (confidence BETWEEN 0 AND 1),
  ai_summary TEXT NOT NULL,
  first_detected_at TIMESTAMPTZ DEFAULT now(),
  last_detected_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pp_process_id ON process_patterns(process_id);
CREATE INDEX idx_pp_type ON process_patterns(process_id, pattern_type);

-- RLS: admin full access, service role for AI agent writes
ALTER TABLE process_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "process_patterns_admin_all"
  ON process_patterns FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "process_patterns_service_write"
  ON process_patterns FOR INSERT
  TO service_role WITH CHECK (true);

CREATE POLICY "process_patterns_service_update"
  ON process_patterns FOR UPDATE
  TO service_role USING (true);

-- ============================================================================
-- 3. Performance index for analytics queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_we_process_shadow
  ON workflow_executions(process_id, is_shadow, status);

CREATE INDEX IF NOT EXISTS idx_wt_execution_started
  ON workflow_tasks(execution_id, started_at);

-- ============================================================================
-- 4. Seed query_process_patterns analyst tool
-- ============================================================================

INSERT INTO analyst_tools (slug, name, description, input_schema, built_in, status)
VALUES (
  'query_process_patterns',
  'query_process_patterns',
  'Query AI-discovered process patterns: rejection clusters, bottlenecks, path anomalies, and recurring deviations. Returns top patterns by confidence with process context.',
  '{
    "type": "object",
    "properties": {
      "process_id": {
        "type": "string",
        "description": "Optional: scope to a specific process ID"
      },
      "pattern_type": {
        "type": "string",
        "enum": ["rejection_cluster", "bottleneck", "path_frequency", "anomaly"],
        "description": "Optional: filter by pattern type"
      }
    },
    "required": []
  }'::jsonb,
  true,
  'active'
)
ON CONFLICT (name) DO UPDATE SET
  description  = EXCLUDED.description,
  input_schema = EXCLUDED.input_schema,
  status       = EXCLUDED.status;
