-- Migration 359: Marketplace Platform Metrics Daily + Search Events
-- Phase: Conductor Phase 3 — Marketplace Intelligence (Content Intelligence Loop Stage 4)
-- Tables: marketplace_platform_metrics_daily + marketplace_search_events
-- Spec: conductor/marketplace-intelligence-spec.md
-- Agent: Market Intelligence (query_marketplace_health, query_supply_demand_gap tools)
-- pg_cron: daily 06:00 UTC

-- ============================================================
-- 1. marketplace_search_events — search event log for supply/demand analysis
-- ============================================================

CREATE TABLE IF NOT EXISTS marketplace_search_events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id     text,
  query          text,
  subject        text,
  level          text,
  delivery_mode  text[],
  results_count  integer,
  is_zero_result boolean GENERATED ALWAYS AS (results_count = 0) STORED,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketplace_search_events_created_at
  ON marketplace_search_events (created_at DESC);
CREATE INDEX IF NOT EXISTS marketplace_search_events_subject_level
  ON marketplace_search_events (subject, level);
CREATE INDEX IF NOT EXISTS marketplace_search_events_zero_result
  ON marketplace_search_events (is_zero_result) WHERE is_zero_result = true;

ALTER TABLE marketplace_search_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY mse_admin ON marketplace_search_events FOR ALL USING (is_admin());

-- ============================================================
-- 2. marketplace_platform_metrics_daily — daily supply/demand snapshot
-- ============================================================

CREATE TABLE IF NOT EXISTS marketplace_platform_metrics_daily (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date             date NOT NULL UNIQUE,
  -- Supply
  active_tutors           integer NOT NULL DEFAULT 0,
  active_listings         integer NOT NULL DEFAULT 0,
  active_ai_agents        integer NOT NULL DEFAULT 0,
  new_tutors_30d          integer NOT NULL DEFAULT 0,
  idle_supply_count       integer NOT NULL DEFAULT 0,   -- tutors with 0 bookings 90d
  dead_listings_count     integer NOT NULL DEFAULT 0,   -- listings with 0 views 30d
  -- Demand (from search events)
  marketplace_searches_30d integer NOT NULL DEFAULT 0,
  zero_result_pct         numeric(5,2),
  profile_views_30d       integer NOT NULL DEFAULT 0,
  listing_views_30d       integer NOT NULL DEFAULT 0,
  saved_searches_count    integer NOT NULL DEFAULT 0,
  -- Conversion
  search_to_listing_rate  numeric(5,4),
  listing_to_enquiry_rate numeric(5,4),
  -- Quality
  avg_listing_caas_score  numeric(5,2),
  pct_listings_above_70   numeric(5,2),
  avg_tutor_rating        numeric(4,2),
  pct_tutors_zero_reviews numeric(5,2),
  -- AI adoption
  ai_agent_sessions_30d   integer NOT NULL DEFAULT 0,
  ai_to_human_ratio       numeric(6,4),
  -- Supply/demand gap count
  subject_gaps_count      integer NOT NULL DEFAULT 0,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketplace_platform_metrics_daily_date
  ON marketplace_platform_metrics_daily (metric_date DESC);

ALTER TABLE marketplace_platform_metrics_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY mpm_admin ON marketplace_platform_metrics_daily FOR ALL USING (is_admin());

-- ============================================================
-- 3. Compute function
-- ============================================================

CREATE OR REPLACE FUNCTION compute_marketplace_platform_metrics()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO marketplace_platform_metrics_daily (
    metric_date, active_tutors, active_listings, active_ai_agents,
    new_tutors_30d, idle_supply_count, dead_listings_count,
    marketplace_searches_30d, zero_result_pct,
    avg_listing_caas_score, pct_listings_above_70, avg_tutor_rating,
    pct_tutors_zero_reviews, ai_agent_sessions_30d, subject_gaps_count
  )
  SELECT
    CURRENT_DATE,
    -- Supply
    (SELECT COUNT(*) FROM profiles WHERE role = 'tutor' AND status = 'active'),
    (SELECT COUNT(*) FROM listings WHERE status = 'active'),
    (SELECT COUNT(*) FROM ai_agents WHERE status = 'active'),
    (SELECT COUNT(*) FROM profiles WHERE role = 'tutor'
       AND created_at >= now() - interval '30 days'),
    (SELECT COUNT(DISTINCT tutor_profile_id) FROM profiles p
       WHERE p.role = 'tutor' AND p.status = 'active'
         AND NOT EXISTS (
           SELECT 1 FROM bookings b
           WHERE b.tutor_profile_id = p.id
             AND b.created_at >= now() - interval '90 days'
         )),
    (SELECT COUNT(*) FROM listings WHERE status = 'active' AND total_views = 0),
    -- Search events (from marketplace_search_events)
    (SELECT COUNT(*) FROM marketplace_search_events
       WHERE created_at >= now() - interval '30 days'),
    (SELECT ROUND(
       COUNT(*) FILTER (WHERE is_zero_result = true)::numeric
       / NULLIF(COUNT(*), 0) * 100, 2
     ) FROM marketplace_search_events WHERE created_at >= now() - interval '30 days'),
    -- Quality
    (SELECT ROUND(AVG(caas_score)::numeric, 2) FROM listings WHERE status = 'active'),
    (SELECT ROUND(
       COUNT(*) FILTER (WHERE caas_score >= 70)::numeric
       / NULLIF(COUNT(*), 0) * 100, 2
     ) FROM listings WHERE status = 'active'),
    (SELECT ROUND(AVG(average_rating)::numeric, 2) FROM profiles
       WHERE role = 'tutor' AND status = 'active' AND average_rating > 0),
    (SELECT ROUND(
       COUNT(*) FILTER (WHERE total_reviews = 0)::numeric
       / NULLIF(COUNT(*), 0) * 100, 2
     ) FROM profiles WHERE role = 'tutor' AND status = 'active'),
    -- AI adoption
    (SELECT COUNT(*) FROM virtualspace_sessions
       WHERE session_type = 'booking'
         AND created_at >= now() - interval '30 days'
         AND owner_id IN (SELECT id FROM ai_agents)),
    -- Subject gaps: subjects with demand but <3 active listings
    (SELECT COUNT(DISTINCT subject) FROM marketplace_search_events
       WHERE created_at >= now() - interval '30 days'
         AND subject IS NOT NULL
         AND subject NOT IN (
           SELECT subject FROM listings WHERE status = 'active'
           GROUP BY subject HAVING COUNT(*) >= 3
         ))
  ON CONFLICT (metric_date) DO UPDATE SET
    active_tutors            = EXCLUDED.active_tutors,
    active_listings          = EXCLUDED.active_listings,
    active_ai_agents         = EXCLUDED.active_ai_agents,
    new_tutors_30d           = EXCLUDED.new_tutors_30d,
    idle_supply_count        = EXCLUDED.idle_supply_count,
    dead_listings_count      = EXCLUDED.dead_listings_count,
    marketplace_searches_30d = EXCLUDED.marketplace_searches_30d,
    zero_result_pct          = EXCLUDED.zero_result_pct,
    avg_listing_caas_score   = EXCLUDED.avg_listing_caas_score,
    pct_listings_above_70    = EXCLUDED.pct_listings_above_70,
    avg_tutor_rating         = EXCLUDED.avg_tutor_rating,
    pct_tutors_zero_reviews  = EXCLUDED.pct_tutors_zero_reviews,
    ai_agent_sessions_30d    = EXCLUDED.ai_agent_sessions_30d,
    subject_gaps_count       = EXCLUDED.subject_gaps_count,
    created_at               = now();
END;
$$;

-- pg_cron: daily 06:00 UTC
SELECT cron.schedule(
  'compute-marketplace-platform-metrics',
  '0 6 * * *',
  'SELECT compute_marketplace_platform_metrics()'
);
