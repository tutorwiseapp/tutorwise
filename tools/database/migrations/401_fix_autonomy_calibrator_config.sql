-- Migration 401: Fix autonomy-calibrator config — rename "capabilities" → "tools"
-- The SpecialistAgentRunner reads config.tools but this agent was seeded with
-- config.capabilities in migration 378, so it effectively has zero tools.

UPDATE specialist_agents
SET config = jsonb_set(
  config - 'capabilities',
  '{tools}',
  config->'capabilities'
)
WHERE slug = 'autonomy-calibrator'
  AND config ? 'capabilities'
  AND NOT (config ? 'tools');
