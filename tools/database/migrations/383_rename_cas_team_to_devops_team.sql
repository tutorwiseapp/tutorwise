-- Migration 383: Rename CAS Team → DevOps Team
-- The 9-agent software delivery team is now a first-class citizen
-- in the Agent Registry under the Engineering Space.
-- CAS as a concept is being decommissioned in Phase 6 (TeamRuntime v2 upgrade).
-- This migration is the safe, runtime-neutral rename — no execution path changes.

-- ─── 1. Rename the team ───────────────────────────────────────────────────────

UPDATE agent_teams
SET
  slug        = 'devops-team',
  name        = 'DevOps Team',
  space_id    = (SELECT id FROM agent_spaces WHERE slug = 'engineering' LIMIT 1),
  config      = jsonb_set(
    COALESCE(config, '{}'),
    '{description}',
    '"9-agent DevOps delivery system: Director orchestrates the Planner, who coordinates 7 specialist agents (Developer, Tester, QA, Engineer, Security, Marketer, Analyst)."'
  )
WHERE slug = 'cas-team' AND built_in = true;

-- ─── 2. Update Director agent description ────────────────────────────────────

UPDATE specialist_agents
SET description = 'Chief orchestrator of the DevOps Team. Decomposes top-level objectives, allocates work to the Planner, and synthesises final outcomes across the 9-agent delivery system.'
WHERE slug = 'director' AND built_in = true;

-- ─── 3. Update cas_agent_status agent_id label (cosmetic — does not break lookup) ──

-- Note: cas_agent_status uses agent_id = 'director' (not 'cas-team') so no
-- row update needed. The team slug change above is sufficient.
-- CAS tables remain active until Phase 6D decommission.
