-- Migration 367: AI Product Adoption Intelligence
-- Phase 3 Conductor Intelligence — Use Case 4
-- Creates: ai_adoption_platform_metrics_daily,
--          compute_ai_adoption_platform_metrics() pg_cron function
--
-- Schema adaptations vs spec:
--   subscriptions table does not exist — subscription metrics return 0
--   ai_agents.owner_id (not tutor_id) — owner is the tutor/profile
--   bookings.booking_type = 'ai_agent' for AI bookings (no ai_agent_id FK column)
--   growth_agent_sessions table may not exist — sessions metrics return 0
--   ai_agents.total_sessions, total_revenue, avg_rating are pre-computed columns

CREATE TABLE IF NOT EXISTS ai_adoption_platform_metrics_daily (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date  date    NOT NULL UNIQUE,

  -- Sage Pro (subscriptions table not implemented; reserved at 0)
  sage_active_subscribers  integer NOT NULL DEFAULT 0,
  sage_new_30d             integer NOT NULL DEFAULT 0,
  sage_cancellations_30d   integer NOT NULL DEFAULT 0,
  sage_churn_rate_pct      numeric(5,2),
  sage_mrr_pence           bigint  NOT NULL DEFAULT 0,
  sage_trial_to_paid_rate_pct numeric(5,2),

  -- Growth Agent (subscriptions table not implemented; sessions estimated from events)
  growth_active_subscribers  integer NOT NULL DEFAULT 0,
  growth_new_30d             integer NOT NULL DEFAULT 0,
  growth_cancellations_30d   integer NOT NULL DEFAULT 0,
  growth_churn_rate_pct      numeric(5,2),
  growth_mrr_pence           bigint  NOT NULL DEFAULT 0,
  growth_sessions_30d        integer NOT NULL DEFAULT 0,
  growth_power_users_30d     integer NOT NULL DEFAULT 0,
  growth_free_to_paid_rate_pct numeric(5,2),

  -- AI Marketplace
  active_ai_agents           integer NOT NULL DEFAULT 0,
  ai_bookings_30d            integer NOT NULL DEFAULT 0,
  ai_gmv_30d_pence           bigint  NOT NULL DEFAULT 0,
  ai_booking_share_pct       numeric(5,2),
  ai_agents_zero_bookings    integer NOT NULL DEFAULT 0,

  -- Combined
  total_ai_mrr_pence         bigint  NOT NULL DEFAULT 0,
  ai_revenue_share_pct       numeric(5,2),

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_adoption_metrics_date_idx
  ON ai_adoption_platform_metrics_daily (metric_date DESC);

CREATE OR REPLACE FUNCTION compute_ai_adoption_platform_metrics()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_date date := current_date;

  -- AI Marketplace metrics (computable)
  v_active_ai_agents        integer := 0;
  v_ai_bookings_30d         integer := 0;
  v_ai_gmv_30d_pence        bigint  := 0;
  v_total_bookings_30d      integer := 0;
  v_ai_booking_share_pct    numeric(5,2) := 0;
  v_ai_agents_zero_bookings integer := 0;

  -- Revenue share
  v_total_gmv_30d_pence     bigint  := 0;
  v_ai_revenue_share_pct    numeric(5,2) := NULL;
BEGIN

  -- ── Active AI agents ───────────────────────────────────────────────────────
  SELECT COUNT(*) INTO v_active_ai_agents
  FROM ai_agents WHERE status = 'active';

  -- ── AI marketplace bookings 30d ────────────────────────────────────────────
  SELECT
    COUNT(*) FILTER (WHERE booking_type = 'ai_agent'),
    COUNT(*)
    INTO v_ai_bookings_30d, v_total_bookings_30d
  FROM bookings
  WHERE created_at >= now() - interval '30 days';

  IF v_total_bookings_30d > 0 THEN
    v_ai_booking_share_pct := ROUND(
      v_ai_bookings_30d::numeric / v_total_bookings_30d * 100, 1
    );
  END IF;

  -- ── AI GMV 30d (via transactions) ─────────────────────────────────────────
  SELECT COALESCE(SUM(t.amount), 0)
    INTO v_ai_gmv_30d_pence
  FROM transactions t
  JOIN bookings b ON b.id = t.booking_id
  WHERE b.booking_type = 'ai_agent'
    AND t.type = 'Booking Payment'
    AND t.created_at >= now() - interval '30 days';

  -- ── Total GMV 30d (for revenue share) ─────────────────────────────────────
  SELECT COALESCE(SUM(amount), 0)
    INTO v_total_gmv_30d_pence
  FROM transactions
  WHERE type = 'Booking Payment'
    AND created_at >= now() - interval '30 days';

  IF v_total_gmv_30d_pence > 0 THEN
    v_ai_revenue_share_pct := ROUND(
      v_ai_gmv_30d_pence::numeric / v_total_gmv_30d_pence * 100, 1
    );
  END IF;

  -- ── AI agents with zero bookings in last 30d ───────────────────────────────
  -- ai_agents with status='active' but their owner_id had no ai_agent bookings in 30d
  SELECT COUNT(*)
    INTO v_ai_agents_zero_bookings
  FROM ai_agents a
  WHERE a.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.tutor_id = a.owner_id
        AND b.booking_type = 'ai_agent'
        AND b.created_at >= now() - interval '30 days'
    );

  -- ── Upsert ─────────────────────────────────────────────────────────────────
  -- Note: subscription metrics (sage_*, growth_*) remain 0 until subscriptions
  -- table is implemented. ai_mrr_pence uses ai_gmv_30d as a proxy for now.
  INSERT INTO ai_adoption_platform_metrics_daily (
    metric_date,
    sage_active_subscribers, sage_new_30d, sage_cancellations_30d,
    sage_churn_rate_pct, sage_mrr_pence, sage_trial_to_paid_rate_pct,
    growth_active_subscribers, growth_new_30d, growth_cancellations_30d,
    growth_churn_rate_pct, growth_mrr_pence,
    growth_sessions_30d, growth_power_users_30d, growth_free_to_paid_rate_pct,
    active_ai_agents, ai_bookings_30d, ai_gmv_30d_pence,
    ai_booking_share_pct, ai_agents_zero_bookings,
    total_ai_mrr_pence, ai_revenue_share_pct
  ) VALUES (
    v_date,
    0, 0, 0, NULL, 0, NULL,
    0, 0, 0, NULL, 0, 0, 0, NULL,
    v_active_ai_agents, v_ai_bookings_30d, v_ai_gmv_30d_pence,
    v_ai_booking_share_pct, v_ai_agents_zero_bookings,
    v_ai_gmv_30d_pence, v_ai_revenue_share_pct
  )
  ON CONFLICT (metric_date) DO UPDATE SET
    active_ai_agents        = EXCLUDED.active_ai_agents,
    ai_bookings_30d         = EXCLUDED.ai_bookings_30d,
    ai_gmv_30d_pence        = EXCLUDED.ai_gmv_30d_pence,
    ai_booking_share_pct    = EXCLUDED.ai_booking_share_pct,
    ai_agents_zero_bookings = EXCLUDED.ai_agents_zero_bookings,
    total_ai_mrr_pence      = EXCLUDED.total_ai_mrr_pence,
    ai_revenue_share_pct    = EXCLUDED.ai_revenue_share_pct;

END;
$$;

SELECT cron.schedule(
  'compute-ai-adoption-platform-metrics',
  '0 10 * * *',
  $$SELECT compute_ai_adoption_platform_metrics();$$
);
