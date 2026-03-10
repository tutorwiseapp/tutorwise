-- Migration 366: Retention & LTV Intelligence
-- Phase 3 Conductor Intelligence — Use Case 3
-- Creates: growth_scores table, retention_platform_metrics_daily,
--          compute_retention_platform_metrics() pg_cron function
--
-- Schema adaptations vs spec:
--   profiles.active_role (not role_type)
--   bookings.tutor_id / bookings.client_id (not tutor_profile_id)
--   bookings.updated_at WHERE status='Completed' (proxy for completed_at)
--   connection_groups.profile_id = org founder (not owner_id)
--   referrals.agent_id = the referring agent

-- ── 1. growth_scores table (spec migration 345 was a placeholder) ─────────────

CREATE TABLE IF NOT EXISTS growth_scores (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role           text        NOT NULL,
  score          integer     NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  previous_score integer,
  component_scores jsonb,
  computed_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS growth_scores_user_id_idx     ON growth_scores (user_id);
CREATE INDEX IF NOT EXISTS growth_scores_role_score_idx  ON growth_scores (role, score DESC);
CREATE INDEX IF NOT EXISTS growth_scores_computed_at_idx ON growth_scores (computed_at DESC);

-- ── 2. retention_platform_metrics_daily table ────────────────────────────────

CREATE TABLE IF NOT EXISTS retention_platform_metrics_daily (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date  date    NOT NULL UNIQUE,

  tutor_onboarding    integer NOT NULL DEFAULT 0,
  tutor_activated     integer NOT NULL DEFAULT 0,
  tutor_retained      integer NOT NULL DEFAULT 0,
  tutor_re_engagement integer NOT NULL DEFAULT 0,
  tutor_win_back      integer NOT NULL DEFAULT 0,

  client_onboarding    integer NOT NULL DEFAULT 0,
  client_activated     integer NOT NULL DEFAULT 0,
  client_retained      integer NOT NULL DEFAULT 0,
  client_re_engagement integer NOT NULL DEFAULT 0,
  client_win_back      integer NOT NULL DEFAULT 0,

  agent_onboarding    integer NOT NULL DEFAULT 0,
  agent_activated     integer NOT NULL DEFAULT 0,
  agent_retained      integer NOT NULL DEFAULT 0,
  agent_re_engagement integer NOT NULL DEFAULT 0,
  agent_win_back      integer NOT NULL DEFAULT 0,

  org_onboarding    integer NOT NULL DEFAULT 0,
  org_activated     integer NOT NULL DEFAULT 0,
  org_retained      integer NOT NULL DEFAULT 0,
  org_re_engagement integer NOT NULL DEFAULT 0,
  org_win_back      integer NOT NULL DEFAULT 0,

  score_drop_alerts_7d integer NOT NULL DEFAULT 0,
  high_value_at_risk   integer NOT NULL DEFAULT 0,

  stuck_tutors_14d     integer     NOT NULL DEFAULT 0,
  stuck_clients_14d    integer     NOT NULL DEFAULT 0,
  activation_rate_30d_pct numeric(5,2),

  avg_client_lifetime_bookings  numeric(6,2),
  referral_vs_organic_ltv_ratio numeric(5,2),

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS retention_metrics_date_idx
  ON retention_platform_metrics_daily (metric_date DESC);

-- ── 3. compute_retention_platform_metrics() ──────────────────────────────────

CREATE OR REPLACE FUNCTION compute_retention_platform_metrics()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_date date := current_date;

  v_tutor_onboarding    integer := 0;
  v_tutor_activated     integer := 0;
  v_tutor_retained      integer := 0;
  v_tutor_re_engagement integer := 0;
  v_tutor_win_back      integer := 0;

  v_client_onboarding    integer := 0;
  v_client_activated     integer := 0;
  v_client_retained      integer := 0;
  v_client_re_engagement integer := 0;
  v_client_win_back      integer := 0;

  v_agent_onboarding    integer := 0;
  v_agent_activated     integer := 0;
  v_agent_retained      integer := 0;
  v_agent_re_engagement integer := 0;
  v_agent_win_back      integer := 0;

  v_org_onboarding    integer := 0;
  v_org_activated     integer := 0;
  v_org_retained      integer := 0;
  v_org_re_engagement integer := 0;
  v_org_win_back      integer := 0;

  v_score_drop_alerts_7d integer := 0;
  v_high_value_at_risk   integer := 0;

  v_stuck_tutors_14d    integer := 0;
  v_stuck_clients_14d   integer := 0;
  v_activation_rate_pct numeric(5,2) := NULL;

  v_avg_client_lifetime_bookings  numeric(6,2) := NULL;
  v_referral_avg  numeric := 0;
  v_organic_avg   numeric := 0;
  v_referral_vs_organic_ratio numeric(5,2) := NULL;
BEGIN

  -- ── Tutor cohorts ──────────────────────────────────────────────────────────
  SELECT
    COALESCE(SUM(CASE WHEN total_completed = 0 THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE
      WHEN total_completed >= 1
        AND last_booking >= now() - interval '30 days'
        AND bookings_30d < 3
        AND COALESCE(gs_score, 0) < 70
      THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE
      WHEN bookings_30d >= 3 OR COALESCE(gs_score, 0) >= 70
      THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE
      WHEN total_completed >= 1
        AND last_booking BETWEEN now() - interval '60 days' AND now() - interval '31 days'
      THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE
      WHEN total_completed >= 1
        AND last_booking < now() - interval '61 days'
      THEN 1 ELSE 0 END), 0)
    INTO v_tutor_onboarding, v_tutor_activated, v_tutor_retained,
         v_tutor_re_engagement, v_tutor_win_back
  FROM (
    SELECT
      p.id,
      COUNT(b.id) FILTER (WHERE b.status = 'Completed')                        AS total_completed,
      MAX(b.updated_at) FILTER (WHERE b.status = 'Completed')                   AS last_booking,
      COUNT(b.id) FILTER (
        WHERE b.status = 'Completed' AND b.updated_at >= now() - interval '30 days'
      )                                                                          AS bookings_30d,
      (SELECT gs.score FROM growth_scores gs
       WHERE gs.user_id = p.id AND gs.role = 'tutor' LIMIT 1)                  AS gs_score
    FROM profiles p
    LEFT JOIN bookings b ON b.tutor_id = p.id
    WHERE p.active_role = 'tutor' AND p.status = 'active'
    GROUP BY p.id
  ) t;

  -- ── Client cohorts ─────────────────────────────────────────────────────────
  SELECT
    COALESCE(SUM(CASE WHEN total_completed = 0 THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE
      WHEN total_completed >= 1
        AND last_booking >= now() - interval '30 days'
        AND NOT (bookings_60d >= 2 AND distinct_tutors_60d < bookings_60d)
      THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE
      WHEN bookings_60d >= 2 AND distinct_tutors_60d < bookings_60d
      THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE
      WHEN total_completed >= 1
        AND last_booking BETWEEN now() - interval '90 days' AND now() - interval '31 days'
      THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE
      WHEN total_completed >= 1
        AND last_booking < now() - interval '91 days'
      THEN 1 ELSE 0 END), 0)
    INTO v_client_onboarding, v_client_activated, v_client_retained,
         v_client_re_engagement, v_client_win_back
  FROM (
    SELECT
      p.id,
      COUNT(b.id) FILTER (WHERE b.status = 'Completed')                           AS total_completed,
      MAX(b.updated_at) FILTER (WHERE b.status = 'Completed')                      AS last_booking,
      COUNT(DISTINCT b.tutor_id) FILTER (
        WHERE b.status = 'Completed' AND b.updated_at >= now() - interval '60 days'
      )                                                                             AS distinct_tutors_60d,
      COUNT(b.id) FILTER (
        WHERE b.status = 'Completed' AND b.updated_at >= now() - interval '60 days'
      )                                                                             AS bookings_60d
    FROM profiles p
    LEFT JOIN bookings b ON b.client_id = p.id
    WHERE p.active_role = 'client' AND p.status = 'active'
    GROUP BY p.id
  ) c;

  -- ── Agent cohorts (referral activity as proxy) ─────────────────────────────
  SELECT
    COALESCE(SUM(CASE WHEN total_referrals = 0 THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE
      WHEN total_referrals >= 1 AND referrals_30d >= 1 THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE
      WHEN total_referrals >= 1
        AND last_referral >= now() - interval '30 days'
        AND referrals_30d = 0 THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE
      WHEN total_referrals >= 1
        AND last_referral BETWEEN now() - interval '60 days' AND now() - interval '31 days'
      THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE
      WHEN total_referrals >= 1
        AND last_referral < now() - interval '61 days'
      THEN 1 ELSE 0 END), 0)
    INTO v_agent_onboarding, v_agent_retained, v_agent_activated,
         v_agent_re_engagement, v_agent_win_back
  FROM (
    SELECT
      p.id,
      COUNT(r.id)                                                                   AS total_referrals,
      COUNT(r.id) FILTER (WHERE r.created_at >= now() - interval '30 days')        AS referrals_30d,
      MAX(r.created_at)                                                             AS last_referral
    FROM profiles p
    LEFT JOIN referrals r ON r.agent_id = p.id
    WHERE 'agent' = ANY(p.roles) AND p.status = 'active'
    GROUP BY p.id
  ) a;

  -- ── Org cohorts (connection_groups type='organisation') ────────────────────
  SELECT
    COALESCE(SUM(CASE WHEN total_bookings = 0 THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE
      WHEN total_bookings >= 1 AND bookings_30d >= 1 AND bookings_30d < 3 THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN bookings_30d >= 3 THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE
      WHEN total_bookings >= 1
        AND last_booking BETWEEN now() - interval '60 days' AND now() - interval '31 days'
      THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE
      WHEN total_bookings >= 1
        AND last_booking < now() - interval '61 days'
      THEN 1 ELSE 0 END), 0)
    INTO v_org_onboarding, v_org_activated, v_org_retained,
         v_org_re_engagement, v_org_win_back
  FROM (
    SELECT
      cg.id,
      COUNT(b.id) FILTER (WHERE b.status = 'Completed')                            AS total_bookings,
      COUNT(b.id) FILTER (
        WHERE b.status = 'Completed' AND b.updated_at >= now() - interval '30 days'
      )                                                                             AS bookings_30d,
      MAX(b.updated_at) FILTER (WHERE b.status = 'Completed')                      AS last_booking
    FROM connection_groups cg
    LEFT JOIN bookings b ON b.tutor_id = cg.profile_id
    WHERE cg.type = 'organisation'
    GROUP BY cg.id, cg.profile_id
  ) o;

  -- ── Growth Score drop alerts ───────────────────────────────────────────────
  SELECT
    COALESCE(SUM(CASE
      WHEN previous_score IS NOT NULL
        AND (score - previous_score) <= -5
        AND computed_at >= now() - interval '7 days'
      THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE
      WHEN previous_score IS NOT NULL
        AND (score - previous_score) <= -10
        AND score >= 60
        AND computed_at >= now() - interval '7 days'
      THEN 1 ELSE 0 END), 0)
    INTO v_score_drop_alerts_7d, v_high_value_at_risk
  FROM growth_scores;

  -- ── Onboarding stall (>14d, no completed booking) ─────────────────────────
  SELECT
    COALESCE(SUM(CASE WHEN p.active_role = 'tutor'  THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN p.active_role = 'client' THEN 1 ELSE 0 END), 0)
    INTO v_stuck_tutors_14d, v_stuck_clients_14d
  FROM profiles p
  WHERE p.status = 'active'
    AND p.active_role IN ('tutor', 'client')
    AND p.created_at < now() - interval '14 days'
    AND NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE (b.tutor_id = p.id OR b.client_id = p.id)
        AND b.status = 'Completed'
    );

  -- ── Activation rate (new in 30d who reached first booking) ────────────────
  SELECT ROUND(
    COUNT(CASE WHEN has_booking THEN 1 END)::numeric /
    NULLIF(COUNT(*), 0) * 100, 2
  )
    INTO v_activation_rate_pct
  FROM (
    SELECT
      p.id,
      EXISTS (
        SELECT 1 FROM bookings b
        WHERE (b.tutor_id = p.id OR b.client_id = p.id)
          AND b.status = 'Completed'
      ) AS has_booking
    FROM profiles p
    WHERE p.status = 'active'
      AND p.active_role IN ('tutor', 'client')
      AND p.created_at >= now() - interval '30 days'
  ) sub;

  -- ── LTV: avg client lifetime bookings ─────────────────────────────────────
  SELECT ROUND(
    COUNT(b.id) FILTER (WHERE b.status = 'Completed')::numeric /
    NULLIF(COUNT(DISTINCT p.id), 0), 2
  )
    INTO v_avg_client_lifetime_bookings
  FROM profiles p
  LEFT JOIN bookings b ON b.client_id = p.id
  WHERE p.active_role = 'client';

  -- ── LTV: referral vs organic ratio ────────────────────────────────────────
  SELECT ROUND(
    COUNT(b.id) FILTER (WHERE b.status = 'Completed')::numeric /
    NULLIF(COUNT(DISTINCT p.id), 0), 2
  )
    INTO v_referral_avg
  FROM profiles p
  LEFT JOIN bookings b ON b.client_id = p.id
  WHERE p.active_role = 'client' AND p.referred_by_profile_id IS NOT NULL;

  SELECT ROUND(
    COUNT(b.id) FILTER (WHERE b.status = 'Completed')::numeric /
    NULLIF(COUNT(DISTINCT p.id), 0), 2
  )
    INTO v_organic_avg
  FROM profiles p
  LEFT JOIN bookings b ON b.client_id = p.id
  WHERE p.active_role = 'client' AND p.referred_by_profile_id IS NULL;

  IF COALESCE(v_organic_avg, 0) > 0 THEN
    v_referral_vs_organic_ratio := ROUND(v_referral_avg / v_organic_avg, 2);
  END IF;

  -- ── Upsert ────────────────────────────────────────────────────────────────
  INSERT INTO retention_platform_metrics_daily (
    metric_date,
    tutor_onboarding, tutor_activated, tutor_retained, tutor_re_engagement, tutor_win_back,
    client_onboarding, client_activated, client_retained, client_re_engagement, client_win_back,
    agent_onboarding, agent_activated, agent_retained, agent_re_engagement, agent_win_back,
    org_onboarding, org_activated, org_retained, org_re_engagement, org_win_back,
    score_drop_alerts_7d, high_value_at_risk,
    stuck_tutors_14d, stuck_clients_14d, activation_rate_30d_pct,
    avg_client_lifetime_bookings, referral_vs_organic_ltv_ratio
  ) VALUES (
    v_date,
    v_tutor_onboarding, v_tutor_activated, v_tutor_retained, v_tutor_re_engagement, v_tutor_win_back,
    v_client_onboarding, v_client_activated, v_client_retained, v_client_re_engagement, v_client_win_back,
    v_agent_onboarding, v_agent_activated, v_agent_retained, v_agent_re_engagement, v_agent_win_back,
    v_org_onboarding, v_org_activated, v_org_retained, v_org_re_engagement, v_org_win_back,
    v_score_drop_alerts_7d, v_high_value_at_risk,
    v_stuck_tutors_14d, v_stuck_clients_14d, v_activation_rate_pct,
    v_avg_client_lifetime_bookings, v_referral_vs_organic_ratio
  )
  ON CONFLICT (metric_date) DO UPDATE SET
    tutor_onboarding              = EXCLUDED.tutor_onboarding,
    tutor_activated               = EXCLUDED.tutor_activated,
    tutor_retained                = EXCLUDED.tutor_retained,
    tutor_re_engagement           = EXCLUDED.tutor_re_engagement,
    tutor_win_back                = EXCLUDED.tutor_win_back,
    client_onboarding             = EXCLUDED.client_onboarding,
    client_activated              = EXCLUDED.client_activated,
    client_retained               = EXCLUDED.client_retained,
    client_re_engagement          = EXCLUDED.client_re_engagement,
    client_win_back               = EXCLUDED.client_win_back,
    agent_onboarding              = EXCLUDED.agent_onboarding,
    agent_activated               = EXCLUDED.agent_activated,
    agent_retained                = EXCLUDED.agent_retained,
    agent_re_engagement           = EXCLUDED.agent_re_engagement,
    agent_win_back                = EXCLUDED.agent_win_back,
    org_onboarding                = EXCLUDED.org_onboarding,
    org_activated                 = EXCLUDED.org_activated,
    org_retained                  = EXCLUDED.org_retained,
    org_re_engagement             = EXCLUDED.org_re_engagement,
    org_win_back                  = EXCLUDED.org_win_back,
    score_drop_alerts_7d          = EXCLUDED.score_drop_alerts_7d,
    high_value_at_risk            = EXCLUDED.high_value_at_risk,
    stuck_tutors_14d              = EXCLUDED.stuck_tutors_14d,
    stuck_clients_14d             = EXCLUDED.stuck_clients_14d,
    activation_rate_30d_pct       = EXCLUDED.activation_rate_30d_pct,
    avg_client_lifetime_bookings  = EXCLUDED.avg_client_lifetime_bookings,
    referral_vs_organic_ltv_ratio = EXCLUDED.referral_vs_organic_ltv_ratio;

END;
$$;

-- ── 4. pg_cron — daily at 09:30 UTC ─────────────────────────────────────────

SELECT cron.schedule(
  'compute-retention-platform-metrics',
  '30 9 * * *',
  $$SELECT compute_retention_platform_metrics();$$
);
