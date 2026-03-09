-- Migration 352: agent_teams + agent_team_run_outputs
-- Phase 2 — Conductor: Agents + Teams
-- Multi-agent team registry with Supervisor/Pipeline/Swarm execution patterns.

-- ============================================================
-- 1. agent_teams — Multi-agent team topology
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_teams (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             TEXT UNIQUE NOT NULL,
  name             TEXT NOT NULL,
  description      TEXT,
  pattern          TEXT NOT NULL DEFAULT 'supervisor'
    CHECK (pattern IN ('supervisor', 'pipeline', 'swarm')),
  nodes            JSONB NOT NULL DEFAULT '[]',
  edges            JSONB NOT NULL DEFAULT '[]',
  coordinator_slug TEXT,
  config           JSONB NOT NULL DEFAULT '{}',
  status           TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  built_in         BOOLEAN NOT NULL DEFAULT false,
  created_by       UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE agent_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY agteam_admin_all ON agent_teams FOR ALL USING (is_admin());

CREATE INDEX idx_agteam_status ON agent_teams(status);
CREATE INDEX idx_agteam_built_in ON agent_teams(built_in) WHERE built_in = true;

CREATE OR REPLACE FUNCTION update_agent_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_teams_updated_at
  BEFORE UPDATE ON agent_teams
  FOR EACH ROW EXECUTE FUNCTION update_agent_teams_updated_at();

-- ============================================================
-- 2. agent_team_run_outputs — Team run history
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_team_run_outputs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         UUID NOT NULL REFERENCES agent_teams(id) ON DELETE CASCADE,
  trigger_type    TEXT NOT NULL DEFAULT 'manual',
  task            TEXT NOT NULL,
  team_result     TEXT,
  agent_outputs   JSONB NOT NULL DEFAULT '{}',
  handoff_history JSONB NOT NULL DEFAULT '[]',
  status          TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed')),
  duration_ms     INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE agent_team_run_outputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY agteamrun_admin_all ON agent_team_run_outputs FOR ALL USING (is_admin());

CREATE INDEX idx_agteamrun_team ON agent_team_run_outputs(team_id, created_at DESC);
CREATE INDEX idx_agteamrun_status ON agent_team_run_outputs(status);

-- ============================================================
-- 3. Seed — CAS Team (built-in Supervisor team)
-- ============================================================

INSERT INTO agent_teams (
  slug, name, description, pattern, coordinator_slug,
  nodes, edges, config, built_in
) VALUES (
  'cas-team',
  'CAS Team',
  'The full Conductor Agent System — 8 specialists coordinated by the Planner for strategic platform analysis and action.',
  'supervisor',
  'planner',
  '[
    {"id": "developer",  "type": "agent", "data": {"agentSlug": "developer",  "label": "Developer"}},
    {"id": "tester",     "type": "agent", "data": {"agentSlug": "tester",     "label": "Tester"}},
    {"id": "qa",         "type": "agent", "data": {"agentSlug": "qa",         "label": "QA"}},
    {"id": "engineer",   "type": "agent", "data": {"agentSlug": "engineer",   "label": "Engineer"}},
    {"id": "security",   "type": "agent", "data": {"agentSlug": "security",   "label": "Security"}},
    {"id": "marketer",   "type": "agent", "data": {"agentSlug": "marketer",   "label": "Marketer"}},
    {"id": "analyst",    "type": "agent", "data": {"agentSlug": "analyst",    "label": "Analyst"}},
    {"id": "planner",    "type": "agent", "data": {"agentSlug": "planner",    "label": "Planner", "isCoordinator": true}}
  ]'::jsonb,
  '[
    {"id": "e1", "source": "developer",  "target": "planner"},
    {"id": "e2", "source": "tester",     "target": "planner"},
    {"id": "e3", "source": "qa",         "target": "planner"},
    {"id": "e4", "source": "engineer",   "target": "planner"},
    {"id": "e5", "source": "security",   "target": "planner"},
    {"id": "e6", "source": "marketer",   "target": "planner"},
    {"id": "e7", "source": "analyst",    "target": "planner"}
  ]'::jsonb,
  '{"description": "All 8 CAS specialists report to the Planner coordinator who synthesises their outputs."}'::jsonb,
  true
)
ON CONFLICT (slug) DO NOTHING;
