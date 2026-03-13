/**
 * Migration 397: Add seed_config to specialist_agents + agent_teams
 *
 * Stores the "factory default" config so admins can:
 *   - See which tools/settings they changed vs the seed
 *   - Reset to default
 *   - Accept current config as new seed
 */

-- specialist_agents
ALTER TABLE specialist_agents ADD COLUMN IF NOT EXISTS seed_config JSONB;
UPDATE specialist_agents SET seed_config = config WHERE built_in = true AND seed_config IS NULL;

-- agent_teams
ALTER TABLE agent_teams ADD COLUMN IF NOT EXISTS seed_config JSONB;
UPDATE agent_teams
SET seed_config = jsonb_build_object(
  'nodes', nodes,
  'coordinator_slug', coordinator_slug,
  'pattern', pattern
)
WHERE built_in = true AND seed_config IS NULL;
