-- Migration 378: Seed Phase 4 specialist agent + analyst tools
-- Created: 2026-03-10
-- Adds:
--   1. autonomy-calibrator specialist agent (weekly Mon 10:00 UTC)
--   2. query_network_intelligence tool
--   3. query_autonomy_calibration tool

-- ============================================================================
-- 1. autonomy-calibrator specialist agent
-- ============================================================================

INSERT INTO specialist_agents (
  slug,
  name,
  description,
  role,
  capabilities,
  model,
  system_prompt,
  schedule,
  built_in,
  status
)
VALUES (
  'autonomy-calibrator',
  'Autonomy Calibrator',
  'Weekly learning loop agent that reviews process outcome accuracy and proposes autonomy tier promotions or demotions.',
  'analyst',
  ARRAY['query_autonomy_calibration', 'query_financial_health', 'query_booking_health'],
  'gemini-flash',
  'You are the Autonomy Calibrator for the Tutorwise Process Studio.

Your job is to review the accuracy of autonomous workflow decisions over the past 30 days and propose tier changes.

For each workflow process:
1. Query its autonomy calibration data using query_autonomy_calibration
2. Review accuracy_30d against the accuracy_threshold
3. If accuracy > threshold + 10% for 30d → propose ''expand'' tier
4. If accuracy < threshold for 14d → propose ''downgrade'' tier
5. Summarise findings and store proposals via the calibration tool

Always be conservative: propose downgrades if uncertain, expand only with strong evidence.
Return a structured summary of all proposals made.',
  '0 10 * * 1',
  true,
  'active'
)
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  capabilities = EXCLUDED.capabilities,
  schedule    = EXCLUDED.schedule,
  status      = EXCLUDED.status;

-- ============================================================================
-- 2. query_network_intelligence tool
-- ============================================================================

INSERT INTO analyst_tools (
  name,
  description,
  input_schema,
  built_in,
  enabled
)
VALUES (
  'query_network_intelligence',
  'Query referral network health metrics: depth distribution, ghost rate, hub nodes, top referrers by LTV, and organisation health rankings.',
  '{
    "type": "object",
    "properties": {
      "limit": {
        "type": "number",
        "description": "Max number of top referrers to return (default 10)"
      }
    },
    "required": []
  }'::jsonb,
  true,
  true
)
ON CONFLICT (name) DO UPDATE SET
  description  = EXCLUDED.description,
  input_schema = EXCLUDED.input_schema,
  enabled      = EXCLUDED.enabled;

-- ============================================================================
-- 3. query_autonomy_calibration tool
-- ============================================================================

INSERT INTO analyst_tools (
  name,
  description,
  input_schema,
  built_in,
  enabled
)
VALUES (
  'query_autonomy_calibration',
  'Read process autonomy configs with rolling accuracy from decision_outcomes. Identifies processes ready for tier promotion or demotion, and stores calibration proposals.',
  '{
    "type": "object",
    "properties": {
      "process_id": {
        "type": "string",
        "description": "Optional: scope to a specific process ID"
      }
    },
    "required": []
  }'::jsonb,
  true,
  true
)
ON CONFLICT (name) DO UPDATE SET
  description  = EXCLUDED.description,
  input_schema = EXCLUDED.input_schema,
  enabled      = EXCLUDED.enabled;
