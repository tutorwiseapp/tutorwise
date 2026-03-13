-- Migration 400: Fix analyst_tools input_schema to match actual executor params
-- Aligns DB-defined schemas with what executor.ts actually reads from input.
-- These schemas are shown to agents as parameter hints — incorrect schemas
-- cause agents to pass wrong parameter names.

-- query_caas_health: executor ignores all params
UPDATE analyst_tools SET input_schema = '{"type":"object","properties":{},"required":[]}'::jsonb
WHERE slug = 'query_caas_health';

-- query_resources_health: executor ignores all params
UPDATE analyst_tools SET input_schema = '{"type":"object","properties":{},"required":[]}'::jsonb
WHERE slug = 'query_resources_health';

-- query_editorial_opportunities: executor ignores all params
UPDATE analyst_tools SET input_schema = '{"type":"object","properties":{},"required":[]}'::jsonb
WHERE slug = 'query_editorial_opportunities';

-- query_seo_health: executor ignores all params
UPDATE analyst_tools SET input_schema = '{"type":"object","properties":{},"required":[]}'::jsonb
WHERE slug = 'query_seo_health';

-- query_keyword_opportunities: executor uses min_position, max_position, limit
UPDATE analyst_tools SET input_schema = '{"type":"object","properties":{"min_position":{"type":"integer","default":6},"max_position":{"type":"integer","default":20},"limit":{"type":"integer","default":25}},"required":[]}'::jsonb
WHERE slug = 'query_keyword_opportunities';

-- query_content_attribution: executor uses limit (not days/attribution_window)
UPDATE analyst_tools SET input_schema = '{"type":"object","properties":{"limit":{"type":"integer","default":20}},"required":[]}'::jsonb
WHERE slug = 'query_content_attribution';

-- query_booking_health: executor ignores all params
UPDATE analyst_tools SET input_schema = '{"type":"object","properties":{},"required":[]}'::jsonb
WHERE slug = 'query_booking_health';

-- query_listing_health: executor uses completeness_threshold (not days)
UPDATE analyst_tools SET input_schema = '{"type":"object","properties":{"completeness_threshold":{"type":"integer","default":70}},"required":[]}'::jsonb
WHERE slug = 'query_listing_health';

-- query_pricing_intelligence: executor uses subject only (not level)
UPDATE analyst_tools SET input_schema = '{"type":"object","properties":{"subject":{"type":"string"}},"required":[]}'::jsonb
WHERE slug = 'query_pricing_intelligence';

-- query_financial_health: executor ignores all params
UPDATE analyst_tools SET input_schema = '{"type":"object","properties":{},"required":[]}'::jsonb
WHERE slug = 'query_financial_health';

-- query_virtualspace_health: executor ignores all params
UPDATE analyst_tools SET input_schema = '{"type":"object","properties":{},"required":[]}'::jsonb
WHERE slug = 'query_virtualspace_health';

-- query_referral_funnel: executor uses segment (not period_days/compare)
UPDATE analyst_tools SET input_schema = '{"type":"object","properties":{"segment":{"type":"string","default":"platform"}},"required":[]}'::jsonb
WHERE slug = 'query_referral_funnel';
