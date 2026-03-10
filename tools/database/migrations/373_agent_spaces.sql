-- Migration 373: agent_spaces — purpose containers for agent teams
-- Hierarchy: Space > Team > Agent (multi-tenant ready via RLS + created_by)

-- ─── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE agent_spaces (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  slug        TEXT    UNIQUE NOT NULL,
  name        TEXT    NOT NULL,
  description TEXT,
  color       TEXT    DEFAULT '#6366f1',   -- accent hex for UI
  status      TEXT    DEFAULT 'active'  CHECK (status IN ('active', 'inactive')),
  built_in    BOOLEAN DEFAULT false,
  created_by  UUID    REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ─── FK on agent_teams ────────────────────────────────────────────────────────

ALTER TABLE agent_teams ADD COLUMN space_id UUID REFERENCES agent_spaces(id) ON DELETE SET NULL;

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE agent_spaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage agent_spaces"
  ON agent_spaces FOR ALL
  USING (is_admin());

-- ─── updated_at trigger ───────────────────────────────────────────────────────

CREATE TRIGGER agent_spaces_updated_at
  BEFORE UPDATE ON agent_spaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Built-in seed spaces ─────────────────────────────────────────────────────

INSERT INTO agent_spaces (slug, name, description, color, built_in) VALUES
  ('go-to-market',  'Go to Market',  'Campaigns, growth and market expansion programmes',             '#ec4899', true),
  ('engineering',   'Engineering',   'Software development, testing, security and QA',               '#6366f1', true),
  ('operations',    'Operations',    'Workflow orchestration, process automation and monitoring',     '#14b8a6', true),
  ('analytics',     'Analytics',     'Data intelligence, reporting and performance analysis',        '#3b82f6', true);

-- ─── Assign existing built-in team to Operations ─────────────────────────────

UPDATE agent_teams
SET space_id = (SELECT id FROM agent_spaces WHERE slug = 'operations')
WHERE built_in = true;
