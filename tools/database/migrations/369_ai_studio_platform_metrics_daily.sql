-- Migration 369: AI Studio Intelligence
-- Phase 3 Conductor Intelligence — Use Case 6
-- Creates: ai_studio_platform_metrics_daily,
--          compute_ai_studio_platform_metrics() pg_cron function
--
-- Schema adaptations vs spec:
--   ai_agents.owner_id (not tutor_id) — owner is the tutor profile
--   ai_agents.total_sessions, total_revenue, avg_rating are pre-computed columns
--   bookings has no ai_agent_id FK — use booking_type='ai_agent' + tutor_id=owner_id proxy
--   transactions table used for GMV (same as other intelligence functions)

CREATE TABLE IF NOT EXISTS ai_studio_platform_metrics_daily (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date  date    NOT NULL UNIQUE,

  -- Creator funnel
  agents_created_30d       integer     NOT NULL DEFAULT 0,
  agents_published_30d     integer     NOT NULL DEFAULT 0,
  publish_rate_pct         numeric(5,2),
  first_booking_rate_pct   numeric(5,2),
  avg_days_create_to_publish numeric(5,1),
  avg_days_publish_to_booking numeric(5,1),

  -- Creator cohorts
  stuck_in_draft          integer NOT NULL DEFAULT 0,
  published_zero_bookings integer NOT NULL DEFAULT 0,
  active_earning          integer NOT NULL DEFAULT 0,
  scaling                 integer NOT NULL DEFAULT 0,

  -- Quality
  avg_rating_all_agents           numeric(3,2),
  agents_below_quality_threshold  integer NOT NULL DEFAULT 0,
  agents_with_no_reviews          integer NOT NULL DEFAULT 0,

  -- Revenue
  total_ai_gmv_30d_pence          bigint  NOT NULL DEFAULT 0,
  avg_revenue_per_active_agent_pence bigint NOT NULL DEFAULT 0,
  top_10_pct_revenue_share_pct    numeric(5,2),

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_studio_metrics_date_idx
  ON ai_studio_platform_metrics_daily (metric_date DESC);

CREATE OR REPLACE FUNCTION compute_ai_studio_platform_metrics()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_date date := current_date;

  v_agents_created_30d         integer := 0;
  v_agents_published_30d       integer := 0;
  v_publish_rate_pct           numeric(5,2) := NULL;
  v_first_booking_rate_pct     numeric(5,2) := NULL;
  v_avg_days_create_to_publish numeric(5,1) := NULL;
  v_avg_days_publish_to_booking numeric(5,1) := NULL;

  v_stuck_in_draft          integer := 0;
  v_published_zero_bookings integer := 0;
  v_active_earning          integer := 0;
  v_scaling                 integer := 0;

  v_avg_rating_all            numeric(3,2) := NULL;
  v_agents_below_quality      integer := 0;
  v_agents_with_no_reviews    integer := 0;

  v_total_ai_gmv_30d_pence         bigint := 0;
  v_avg_revenue_per_active_agent   bigint := 0;
  v_top_10_pct_revenue_share_pct   numeric(5,2) := NULL;

  v_active_agent_count integer := 0;
BEGIN

  -- ── Creator funnel ─────────────────────────────────────────────────────────
  SELECT
    COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days'),
    COUNT(*) FILTER (
      WHERE status = 'active' AND published_at >= now() - interval '30 days'
    ),
    ROUND(AVG(
      EXTRACT(EPOCH FROM (published_at - created_at)) / 86400
    ) FILTER (WHERE status = 'active' AND published_at IS NOT NULL), 1)
    INTO v_agents_created_30d, v_agents_published_30d, v_avg_days_create_to_publish
  FROM ai_agents;

  IF v_agents_created_30d > 0 THEN
    v_publish_rate_pct := ROUND(
      v_agents_published_30d::numeric / v_agents_created_30d * 100, 1
    );
  END IF;

  -- ── Creator cohorts ────────────────────────────────────────────────────────
  -- Draft stall: in 'draft' for > 7 days
  SELECT COUNT(*) INTO v_stuck_in_draft
  FROM ai_agents
  WHERE status = 'draft'
    AND created_at < now() - interval '7 days';

  -- Published with zero bookings > 14d (using tutor_id=owner_id proxy)
  SELECT COUNT(*)
    INTO v_published_zero_bookings
  FROM ai_agents a
  WHERE a.status = 'active'
    AND a.published_at < now() - interval '14 days'
    AND NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.tutor_id = a.owner_id
        AND b.booking_type = 'ai_agent'
        AND b.created_at >= a.published_at
    );

  -- Active earning: at least 1 AI booking in last 30d
  SELECT COUNT(DISTINCT a.id)
    INTO v_active_earning
  FROM ai_agents a
  JOIN bookings b ON b.tutor_id = a.owner_id
    AND b.booking_type = 'ai_agent'
    AND b.created_at >= now() - interval '30 days'
  WHERE a.status = 'active';

  -- Scaling: 3+ AI bookings in last 30d or total_sessions >= 10
  SELECT COUNT(DISTINCT a.id)
    INTO v_scaling
  FROM ai_agents a
  WHERE a.status = 'active'
    AND (
      a.total_sessions >= 10
      OR (
        SELECT COUNT(*) FROM bookings b
        WHERE b.tutor_id = a.owner_id
          AND b.booking_type = 'ai_agent'
          AND b.created_at >= now() - interval '30 days'
      ) >= 3
    );

  -- ── Quality ────────────────────────────────────────────────────────────────
  SELECT
    ROUND(AVG(avg_rating) FILTER (WHERE avg_rating IS NOT NULL), 2),
    COUNT(*) FILTER (WHERE avg_rating < 4.0 AND total_reviews >= 3),
    COUNT(*) FILTER (WHERE avg_rating IS NULL OR total_reviews = 0)
    INTO v_avg_rating_all, v_agents_below_quality, v_agents_with_no_reviews
  FROM ai_agents
  WHERE status = 'active';

  -- ── Revenue ────────────────────────────────────────────────────────────────
  SELECT COALESCE(SUM(t.amount), 0)
    INTO v_total_ai_gmv_30d_pence
  FROM transactions t
  JOIN bookings b ON b.id = t.booking_id
  WHERE b.booking_type = 'ai_agent'
    AND t.type = 'Booking Payment'
    AND t.created_at >= now() - interval '30 days';

  SELECT COUNT(DISTINCT owner_id)
    INTO v_active_agent_count
  FROM ai_agents
  WHERE status = 'active';

  IF v_active_agent_count > 0 THEN
    v_avg_revenue_per_active_agent := v_total_ai_gmv_30d_pence / v_active_agent_count;
  END IF;

  -- ── Avg days publish to first booking ─────────────────────────────────────
  SELECT ROUND(AVG(days_to_first_booking), 1)
    INTO v_avg_days_publish_to_booking
  FROM (
    SELECT
      a.id,
      EXTRACT(EPOCH FROM (
        MIN(b.created_at) - a.published_at
      )) / 86400 AS days_to_first_booking
    FROM ai_agents a
    JOIN bookings b ON b.tutor_id = a.owner_id
      AND b.booking_type = 'ai_agent'
      AND b.created_at > a.published_at
    WHERE a.status = 'active' AND a.published_at IS NOT NULL
    GROUP BY a.id, a.published_at
  ) first_bookings;

  -- ── First booking rate (published in 30d who got first booking within 14d) ──
  SELECT ROUND(
    COUNT(CASE WHEN has_booking THEN 1 END)::numeric /
    NULLIF(COUNT(*), 0) * 100, 1
  )
    INTO v_first_booking_rate_pct
  FROM (
    SELECT
      a.id,
      EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.tutor_id = a.owner_id
          AND b.booking_type = 'ai_agent'
          AND b.created_at BETWEEN a.published_at AND a.published_at + interval '14 days'
      ) AS has_booking
    FROM ai_agents a
    WHERE a.status = 'active'
      AND a.published_at >= now() - interval '30 days'
      AND a.published_at IS NOT NULL
  ) sub;

  -- ── Top 10% revenue concentration ─────────────────────────────────────────
  -- Use pre-computed total_revenue on ai_agents for efficiency
  DECLARE
    v_total_revenue bigint := 0;
    v_top_10_revenue bigint := 0;
    v_top_n integer := 0;
  BEGIN
    SELECT COALESCE(SUM(total_revenue::bigint), 0),
           GREATEST(1, CEIL(COUNT(*) * 0.1)::integer)
      INTO v_total_revenue, v_top_n
    FROM ai_agents WHERE status = 'active';

    SELECT COALESCE(SUM(total_revenue::bigint), 0)
      INTO v_top_10_revenue
    FROM (
      SELECT total_revenue
      FROM ai_agents WHERE status = 'active'
      ORDER BY total_revenue DESC NULLS LAST
      LIMIT v_top_n
    ) top_agents;

    IF v_total_revenue > 0 THEN
      v_top_10_pct_revenue_share_pct := ROUND(
        v_top_10_revenue::numeric / v_total_revenue * 100, 1
      );
    END IF;
  END;

  -- ── Upsert ─────────────────────────────────────────────────────────────────
  INSERT INTO ai_studio_platform_metrics_daily (
    metric_date,
    agents_created_30d, agents_published_30d, publish_rate_pct,
    first_booking_rate_pct, avg_days_create_to_publish, avg_days_publish_to_booking,
    stuck_in_draft, published_zero_bookings, active_earning, scaling,
    avg_rating_all_agents, agents_below_quality_threshold, agents_with_no_reviews,
    total_ai_gmv_30d_pence, avg_revenue_per_active_agent_pence, top_10_pct_revenue_share_pct
  ) VALUES (
    v_date,
    v_agents_created_30d, v_agents_published_30d, v_publish_rate_pct,
    v_first_booking_rate_pct, v_avg_days_create_to_publish, v_avg_days_publish_to_booking,
    v_stuck_in_draft, v_published_zero_bookings, v_active_earning, v_scaling,
    v_avg_rating_all, v_agents_below_quality, v_agents_with_no_reviews,
    v_total_ai_gmv_30d_pence, v_avg_revenue_per_active_agent, v_top_10_pct_revenue_share_pct
  )
  ON CONFLICT (metric_date) DO UPDATE SET
    agents_created_30d                = EXCLUDED.agents_created_30d,
    agents_published_30d              = EXCLUDED.agents_published_30d,
    publish_rate_pct                  = EXCLUDED.publish_rate_pct,
    first_booking_rate_pct            = EXCLUDED.first_booking_rate_pct,
    avg_days_create_to_publish        = EXCLUDED.avg_days_create_to_publish,
    avg_days_publish_to_booking       = EXCLUDED.avg_days_publish_to_booking,
    stuck_in_draft                    = EXCLUDED.stuck_in_draft,
    published_zero_bookings           = EXCLUDED.published_zero_bookings,
    active_earning                    = EXCLUDED.active_earning,
    scaling                           = EXCLUDED.scaling,
    avg_rating_all_agents             = EXCLUDED.avg_rating_all_agents,
    agents_below_quality_threshold    = EXCLUDED.agents_below_quality_threshold,
    agents_with_no_reviews            = EXCLUDED.agents_with_no_reviews,
    total_ai_gmv_30d_pence            = EXCLUDED.total_ai_gmv_30d_pence,
    avg_revenue_per_active_agent_pence = EXCLUDED.avg_revenue_per_active_agent_pence,
    top_10_pct_revenue_share_pct      = EXCLUDED.top_10_pct_revenue_share_pct;

END;
$$;

SELECT cron.schedule(
  'compute-ai-studio-platform-metrics',
  '0 11 * * *',
  $$SELECT compute_ai_studio_platform_metrics();$$
);
