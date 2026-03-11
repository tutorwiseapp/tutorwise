-- Migration 382: Activate scheduled agents + add Marketing space
-- Fixes two mismatches in the Conductor Build canvas:
--   1. market-intelligence / retention-monitor / operations-monitor were seeded
--      without status='active' so they are invisible in the agent palette.
--   2. No "Marketing" space existed — only "Go to Market" (a programme space).
--      Marketing is a function/department space; Go to Market is a campaign/execution space.

-- ─── 1. Activate the 3 scheduled specialist agents ────────────────────────────

UPDATE specialist_agents
SET status = 'active'
WHERE slug IN ('market-intelligence', 'retention-monitor', 'operations-monitor');

-- ─── 2. Add Marketing space ───────────────────────────────────────────────────

INSERT INTO agent_spaces (slug, name, description, color, built_in)
VALUES (
  'marketing',
  'Marketing',
  'Brand, content, SEO, campaigns and growth marketing functions',
  '#ec4899',
  true
)
ON CONFLICT (slug) DO NOTHING;
