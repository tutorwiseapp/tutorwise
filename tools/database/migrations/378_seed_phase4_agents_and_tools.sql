-- Migration 378: Seed Phase 4 specialist agent + analyst tools
-- Created: 2026-03-10
-- Adds:
--   1. autonomy-calibrator specialist agent (weekly Mon 10:00 UTC)
--   2. query_network_intelligence tool
--   3. query_autonomy_calibration tool
--
-- FIX: specialist_agents uses config JSONB (not separate columns for
-- capabilities/model/system_prompt/schedule). analyst_tools uses status
-- (not enabled boolean).

-- ============================================================================
-- 1. autonomy-calibrator specialist agent
-- ============================================================================

INSERT INTO specialist_agents (
  slug,
  name,
  description,
  role,
  config,
  built_in,
  status
)
VALUES (
  'autonomy-calibrator',
  'Autonomy Calibrator',
  'Weekly learning loop agent that reviews process outcome accuracy and proposes autonomy tier promotions or demotions.',
  'analyst',
  '{
    "capabilities": ["query_autonomy_calibration", "query_financial_health", "query_booking_health"],
    "model": "gemini-flash",
    "system_prompt": "You are the Autonomy Calibrator for the Tutorwise Process Studio.\n\nYour job is to review the accuracy of autonomous workflow decisions over the past 30 days and propose tier changes.\n\nFor each workflow process:\n1. Query its autonomy calibration data using query_autonomy_calibration\n2. Review accuracy_30d against the accuracy_threshold\n3. If accuracy > threshold + 10% for 30d → propose ''expand'' tier\n4. If accuracy < threshold for 14d → propose ''downgrade'' tier\n5. Summarise findings and store proposals via the calibration tool\n\nAlways be conservative: propose downgrades if uncertain, expand only with strong evidence.\nReturn a structured summary of all proposals made.",
    "schedule": "0 10 * * 1"
  }'::jsonb,
  true,
  'active'
)
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  config      = EXCLUDED.config,
  status      = EXCLUDED.status;

-- ============================================================================
-- 2. query_network_intelligence tool
-- ============================================================================

INSERT INTO analyst_tools (
  name,
  description,
  input_schema,
  built_in,
  status
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
  'active'
)
ON CONFLICT (name) DO UPDATE SET
  description  = EXCLUDED.description,
  input_schema = EXCLUDED.input_schema,
  status       = EXCLUDED.status;

-- ============================================================================
-- 3. query_autonomy_calibration tool
-- ============================================================================

INSERT INTO analyst_tools (
  name,
  description,
  input_schema,
  built_in,
  status
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
  'active'
)
ON CONFLICT (name) DO UPDATE SET
  description  = EXCLUDED.description,
  input_schema = EXCLUDED.input_schema,
  status       = EXCLUDED.status;
