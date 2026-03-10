-- Migration 374: Director Agent + corrected CAS team topology
-- Adds the Director as top-level orchestrator above the Planner
-- Hierarchy: Director → Planner → 7 Specialists

-- ─── Director specialist agent ────────────────────────────────────────────────

INSERT INTO specialist_agents (
  slug, name, role, department, description, status, built_in, config
) VALUES (
  'director',
  'Director Agent',
  'Director',
  'Strategy',
  'Chief orchestrator of the CAS team. Decomposes top-level objectives, allocates work to the Planner, and synthesises final outcomes.',
  'active',
  true,
  '{
    "skills": ["strategic direction", "objective decomposition", "resource allocation", "team coordination", "output synthesis"],
    "tools": ["query_platform_health", "query_growth_scores", "send_notification"]
  }'::jsonb
);

-- ─── Initialize cas_agent_status for Director ─────────────────────────────────

INSERT INTO cas_agent_status (agent_id, status, metadata)
VALUES (
  'director',
  'running',
  '{"role": "Director", "description": "Top-level CAS orchestrator"}'::jsonb
)
ON CONFLICT (agent_id) DO NOTHING;

-- ─── Update CAS team: correct topology Director → Planner → Specialists ───────
-- Nodes: add Director as isCoordinator, Planner stays as sub-coordinator
-- Edges: Director→Planner then Planner→each specialist (top-down dispatch)

UPDATE agent_teams
SET
  coordinator_slug = 'director',
  nodes = '[
    {"id": "director",  "type": "agent", "data": {"agentSlug": "director",  "label": "Director",  "isCoordinator": true}},
    {"id": "planner",   "type": "agent", "data": {"agentSlug": "planner",   "label": "Planner",   "isCoordinator": false}},
    {"id": "developer", "type": "agent", "data": {"agentSlug": "developer", "label": "Developer"}},
    {"id": "tester",    "type": "agent", "data": {"agentSlug": "tester",    "label": "Tester"}},
    {"id": "qa",        "type": "agent", "data": {"agentSlug": "qa",        "label": "QA"}},
    {"id": "engineer",  "type": "agent", "data": {"agentSlug": "engineer",  "label": "Engineer"}},
    {"id": "security",  "type": "agent", "data": {"agentSlug": "security",  "label": "Security"}},
    {"id": "marketer",  "type": "agent", "data": {"agentSlug": "marketer",  "label": "Marketer"}},
    {"id": "analyst",   "type": "agent", "data": {"agentSlug": "analyst",   "label": "Analyst"}}
  ]'::jsonb,
  edges = '[
    {"id": "e0", "source": "director", "target": "planner"},
    {"id": "e1", "source": "planner",  "target": "developer"},
    {"id": "e2", "source": "planner",  "target": "tester"},
    {"id": "e3", "source": "planner",  "target": "qa"},
    {"id": "e4", "source": "planner",  "target": "engineer"},
    {"id": "e5", "source": "planner",  "target": "security"},
    {"id": "e6", "source": "planner",  "target": "marketer"},
    {"id": "e7", "source": "planner",  "target": "analyst"}
  ]'::jsonb,
  config = jsonb_set(
    COALESCE(config, '{}'),
    '{description}',
    '"9-agent CAS system: Director orchestrates the Planner, who coordinates 7 specialist agents."'
  )
WHERE slug = 'cas-team' AND built_in = true;
