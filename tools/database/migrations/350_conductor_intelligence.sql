-- Migration 350: Phase 3 Intelligence — Specialist Agent + Tool Seeds
-- Phase: Conductor Phase 3 — Intelligence Layer
-- Seeds 3 specialist agents (market-intelligence, retention-monitor, operations-monitor)
-- and 14 new analyst tools for the intelligence layer.

-- ============================================================
-- 1. Seeds — 14 new Phase 3 analyst tools
-- ============================================================

INSERT INTO analyst_tools (slug, name, description, category, input_schema, return_type, built_in) VALUES

  ('query_caas_health', 'Query CaaS Health',
   'Returns platform-wide CaaS score distribution, stale score count, score velocity, and fraud signals.',
   'analytics',
   '{"type":"object","properties":{"role_type":{"type":"string","enum":["TUTOR","CLIENT","AGENT","all"],"default":"all"},"period_days":{"type":"integer","default":30}},"required":[]}',
   'json', true),

  ('query_resources_health', 'Query Resources Health',
   'Returns content creation velocity, publishing pipeline health, SEO readiness scores, and editorial coverage gaps.',
   'analytics',
   '{"type":"object","properties":{"days":{"type":"integer","default":30},"include_drafts":{"type":"boolean","default":true}},"required":[]}',
   'json', true),

  ('query_editorial_opportunities', 'Query Editorial Opportunities',
   'Identifies high-priority content gaps: uncovered hub keywords, competitor-ranking topics, high-intent queries with no article.',
   'analytics',
   '{"type":"object","properties":{"limit":{"type":"integer","default":10}},"required":[]}',
   'json', true),

  ('query_seo_health', 'Query SEO Health',
   'Returns keyword ranking health, backlink loss, content freshness, and GSC impression trends.',
   'analytics',
   '{"type":"object","properties":{"period_days":{"type":"integer","default":7},"priority_filter":{"type":"string","enum":["critical","high","all"],"default":"critical"}},"required":[]}',
   'json', true),

  ('query_keyword_opportunities', 'Query Keyword Opportunities',
   'Returns keywords in positions 6-20 where small content improvements could reach top 5.',
   'analytics',
   '{"type":"object","properties":{"volume_min":{"type":"integer","default":100},"difficulty_max":{"type":"integer","default":60}},"required":[]}',
   'json', true),

  ('query_content_attribution', 'Query Content Attribution',
   'Returns content attribution efficiency, article conversion rates, and content-to-booking flywheel health.',
   'analytics',
   '{"type":"object","properties":{"days":{"type":"integer","default":30},"attribution_window":{"type":"integer","default":14}},"required":[]}',
   'json', true),

  ('query_marketplace_health', 'Query Marketplace Health',
   'Returns marketplace supply/demand balance, listing quality distribution, search conversion funnel, and AI agent adoption metrics.',
   'analytics',
   '{"type":"object","properties":{"days":{"type":"integer","default":30}},"required":[]}',
   'json', true),

  ('query_supply_demand_gap', 'Query Supply Demand Gap',
   'Identifies subjects/levels where search demand exceeds available supply, and vice versa.',
   'analytics',
   '{"type":"object","properties":{"days":{"type":"integer","default":30},"min_search_volume":{"type":"integer","default":5}},"required":[]}',
   'json', true),

  ('query_booking_health', 'Query Booking Health',
   'Returns booking pipeline health, cancellation/no-show rates, scheduling stall patterns, and revenue protection signals.',
   'analytics',
   '{"type":"object","properties":{"days":{"type":"integer","default":30}},"required":[]}',
   'json', true),

  ('query_listing_health', 'Query Listing Health',
   'Returns listing quality distribution, pricing benchmarks, stale listing detection, and supply-side completeness gaps.',
   'analytics',
   '{"type":"object","properties":{"days":{"type":"integer","default":30}},"required":[]}',
   'json', true),

  ('query_pricing_intelligence', 'Query Pricing Intelligence',
   'Returns pricing distribution by subject/level/delivery mode, benchmark comparisons, and pricing opportunity signals.',
   'analytics',
   '{"type":"object","properties":{"subject":{"type":"string"},"level":{"type":"string"}},"required":[]}',
   'json', true),

  ('query_financial_health', 'Query Financial Health',
   'Returns clearing pipeline health, payout success rates, dispute patterns, revenue breakdown, and anomaly signals.',
   'analytics',
   '{"type":"object","properties":{"days":{"type":"integer","default":30}},"required":[]}',
   'json', true),

  ('query_virtualspace_health', 'Query VirtualSpace Health',
   'Returns VirtualSpace session adoption, completion rates, free-help conversion funnel, and session quality signals.',
   'analytics',
   '{"type":"object","properties":{"days":{"type":"integer","default":30}},"required":[]}',
   'json', true),

  ('query_referral_funnel', 'Query Referral Funnel',
   'Returns referral funnel rates, ghost rate, K coefficient and velocity vs prior period.',
   'analytics',
   '{"type":"object","properties":{"period_days":{"type":"integer","default":30},"compare":{"type":"boolean","default":true}},"required":[]}',
   'json', true)

ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 2. Seeds — 3 Phase 3 specialist agents
-- ============================================================

INSERT INTO specialist_agents (slug, name, role, department, description, config, built_in) VALUES

  ('market-intelligence', 'Market Intelligence', 'Market Intelligence Agent', 'Marketing',
   'Weekly agent monitoring organic acquisition, content performance, marketplace supply/demand, and listing quality. Runs Monday 09:00 UTC.',
   '{
     "schedule": "0 9 * * 1",
     "tools": [
       "query_seo_health",
       "query_keyword_opportunities",
       "query_resources_health",
       "query_editorial_opportunities",
       "query_content_attribution",
       "query_marketplace_health",
       "query_supply_demand_gap",
       "query_listing_health",
       "query_pricing_intelligence",
       "query_virtualspace_health"
     ],
     "system_prompt_template": "You are the Market Intelligence Agent for Tutorwise. Your role is to monitor and analyse the organic acquisition pipeline, content performance, marketplace health, and supply-side quality.\n\nYour scope:\n- Resources: publishing cadence, SEO readiness, editorial coverage\n- SEO: keyword rankings, backlink health, content freshness\n- Signal: content attribution, article intelligence scores, flywheel health\n- Marketplace: supply/demand balance, search funnel, AI adoption\n- Listings: quality distribution, pricing intelligence\n- VirtualSpace: session adoption, free-help conversion\n\nRun your tools systematically. Surface alerts with recommended actions. Flag issues that require human decision (supply gaps, rank drops on critical keywords, flywheel weakening)."
   }',
   true),

  ('retention-monitor', 'Retention Monitor', 'Retention Monitor Agent', 'Analytics',
   'Daily agent monitoring referral pipeline, booking health, financial integrity, and supply/demand balance. Runs daily 08:00 UTC.',
   '{
     "schedule": "0 8 * * *",
     "tools": [
       "query_referral_funnel",
       "query_supply_demand_gap",
       "query_booking_health",
       "query_financial_health",
       "query_at_risk_tutors",
       "flag_for_review",
       "send_notification"
     ],
     "system_prompt_template": "You are the Retention Monitor Agent for Tutorwise. Your role is to monitor platform retention signals daily — referral pipeline health, booking lifecycle, financial integrity, and supply/demand balance.\n\nYour scope:\n- Referral: K coefficient, ghost rate, funnel velocity\n- Bookings: cancellation/no-show rates, scheduling stalls, GMV trends\n- Financials: clearing pipeline, payout success, dispute detection, revenue anomalies\n- Supply: idle tutors, subject gaps, at-risk tutor identification\n\nAlert conditions (flag immediately):\n- K coefficient drop > 15% MoM\n- Ghost rate > 75%\n- Cancellation rate > 15% for 7+ days\n- Clearing stall > 14 days (any transactions)\n- Unreversed commissions on refunded bookings\n- Duplicate payout risk\n- GMV declining week < 80% of 4-week average"
   }',
   true),

  ('operations-monitor', 'Operations Monitor', 'Operations Monitor Agent', 'Operations',
   'Daily agent monitoring platform operational health: CaaS scores, at-risk tutors, workflow exceptions, and system anomalies. Runs daily 07:00 UTC.',
   '{
     "schedule": "0 7 * * *",
     "tools": [
       "query_caas_health",
       "query_platform_health",
       "query_at_risk_tutors",
       "flag_for_review",
       "send_notification"
     ],
     "system_prompt_template": "You are the Operations Monitor Agent for Tutorwise. Your role is to monitor platform operational health daily — CaaS score distribution, at-risk tutors, workflow health, and system anomalies.\n\nYour scope:\n- CaaS: score distribution, stale scores, provisional user %, score-revenue correlation\n- Platform: failed webhooks, shadow divergences, running executions\n- At-risk tutors: low CaaS score, declining activity\n\nAlert conditions (flag immediately):\n- Median CaaS score drops > 3 pts MoM\n- Stale scores > 5% of active users\n- Zero-score active users > 2%\n- Provisional % rising MoM\n- Failed webhooks elevated\n- Shadow divergences increasing"
   }',
   true)

ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 3. pg_cron — Schedule specialist agent runs
-- ============================================================

SELECT cron.schedule(
  'market-intelligence-weekly',
  '0 9 * * 1',
  $$
    SELECT net.http_post(
      url := current_setting('app.base_url', true) || '/api/admin/agents/market-intelligence/run',
      headers := ('{"Content-Type":"application/json","x-cron-secret":"' || current_setting('app.cron_secret', true) || '"}')::jsonb,
      body := '{"trigger":"schedule"}'::jsonb
    )
  $$
);

SELECT cron.schedule(
  'retention-monitor-daily',
  '0 8 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.base_url', true) || '/api/admin/agents/retention-monitor/run',
      headers := ('{"Content-Type":"application/json","x-cron-secret":"' || current_setting('app.cron_secret', true) || '"}')::jsonb,
      body := '{"trigger":"schedule"}'::jsonb
    )
  $$
);

SELECT cron.schedule(
  'operations-monitor-daily',
  '0 7 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.base_url', true) || '/api/admin/agents/operations-monitor/run',
      headers := ('{"Content-Type":"application/json","x-cron-secret":"' || current_setting('app.cron_secret', true) || '"}')::jsonb,
      body := '{"trigger":"schedule"}'::jsonb
    )
  $$
);
