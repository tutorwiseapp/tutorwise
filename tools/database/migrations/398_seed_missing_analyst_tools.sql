/**
 * Migration 398: Seed 5 missing analyst tools
 *
 * These tools have executor implementations but were never seeded:
 *   - query_retention_health
 *   - query_ai_adoption_health
 *   - query_ai_studio_health
 *   - query_org_conversion_health
 *   - query_onboarding_health
 */

INSERT INTO analyst_tools (slug, name, description, category, input_schema, built_in, status) VALUES
  ('query_retention_health', 'Query Retention Health',
   'Query user retention and growth score metrics: active users, churn signals, engagement trends.',
   'analytics',
   '{"type":"object","properties":{"days":{"type":"integer","default":30,"description":"Lookback period in days"}},"required":[]}'::jsonb,
   true, 'active'),

  ('query_ai_adoption_health', 'Query AI Adoption Health',
   'Query AI agent adoption metrics: active agents, session volumes, completion rates, revenue.',
   'analytics',
   '{"type":"object","properties":{"days":{"type":"integer","default":30,"description":"Lookback period in days"}},"required":[]}'::jsonb,
   true, 'active'),

  ('query_ai_studio_health', 'Query AI Studio Health',
   'Query AI studio platform metrics: agent creation, publishing, marketplace activity.',
   'analytics',
   '{"type":"object","properties":{"days":{"type":"integer","default":30,"description":"Lookback period in days"}},"required":[]}'::jsonb,
   true, 'active'),

  ('query_org_conversion_health', 'Query Org Conversion Health',
   'Query organisation conversion metrics: signups, verification rates, listing activity.',
   'analytics',
   '{"type":"object","properties":{"days":{"type":"integer","default":30,"description":"Lookback period in days"}},"required":[]}'::jsonb,
   true, 'active'),

  ('query_onboarding_health', 'Query Onboarding Health',
   'Query onboarding funnel metrics: stalled users, completion rates, drop-off points.',
   'analytics',
   '{"type":"object","properties":{"days":{"type":"integer","default":30,"description":"Lookback period in days"}},"required":[]}'::jsonb,
   true, 'active')
ON CONFLICT (slug) DO UPDATE SET
  description = EXCLUDED.description,
  status = EXCLUDED.status;
