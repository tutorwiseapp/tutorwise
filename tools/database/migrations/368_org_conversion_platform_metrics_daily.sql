-- Migration 368: Organisation Conversion Intelligence
-- Phase 3 Conductor Intelligence — Use Case 5
-- Creates: org_conversion_platform_metrics_daily,
--          compute_org_conversion_platform_metrics() pg_cron function
--
-- Schema adaptations vs spec:
--   connection_groups.profile_id = org founder (not owner_id)
--   growth_scores table created in migration 366 (used here once populated)
--   profiles has NO organisation_id column — org membership not tracked there
--   platform_events table used for nudge/conversion tracking

CREATE TABLE IF NOT EXISTS org_conversion_platform_metrics_daily (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date  date    NOT NULL UNIQUE,

  -- Candidate pipeline
  tier_1_candidates        integer     NOT NULL DEFAULT 0,
  tier_2_candidates        integer     NOT NULL DEFAULT 0,
  tier_3_ready             integer     NOT NULL DEFAULT 0,
  candidates_nudged_30d    integer     NOT NULL DEFAULT 0,
  conversion_rate_pct      numeric(5,2),
  avg_days_nudge_to_conversion numeric(5,1),

  -- New org creation
  orgs_created_30d         integer     NOT NULL DEFAULT 0,
  orgs_from_conductor_nudge integer    NOT NULL DEFAULT 0,

  -- Org health
  total_active_orgs        integer     NOT NULL DEFAULT 0,
  new_org_onboarding_stall integer     NOT NULL DEFAULT 0,
  avg_members_per_org      numeric(4,1),
  avg_org_growth_score     numeric(5,2),
  orgs_below_threshold     integer     NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS org_conversion_metrics_date_idx
  ON org_conversion_platform_metrics_daily (metric_date DESC);

CREATE OR REPLACE FUNCTION compute_org_conversion_platform_metrics()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_date date := current_date;

  v_tier_1_candidates     integer := 0;
  v_tier_2_candidates     integer := 0;
  v_tier_3_ready          integer := 0;
  v_candidates_nudged_30d integer := 0;
  v_conversion_rate_pct   numeric(5,2) := NULL;
  v_avg_days_to_convert   numeric(5,1) := NULL;

  v_orgs_created_30d          integer := 0;
  v_orgs_from_conductor_nudge integer := 0;

  v_total_active_orgs       integer     := 0;
  v_new_org_onboarding_stall integer    := 0;
  v_avg_members_per_org     numeric(4,1) := NULL;
  v_avg_org_growth_score    numeric(5,2) := NULL;
  v_orgs_below_threshold    integer     := 0;
BEGIN

  -- ── Tier 1: agents managing 3+ tutors (bookings.agent_id) in last 30d ──────
  -- Tier 1: Growth Score >= 60, managing 3+ active tutors
  -- Tier 2: Growth Score >= 75, managing 5+ active tutors
  SELECT
    COUNT(CASE WHEN active_tutors >= 3 AND COALESCE(gs_score, 0) >= 60 THEN 1 END),
    COUNT(CASE WHEN active_tutors >= 5 AND COALESCE(gs_score, 0) >= 75 THEN 1 END)
    INTO v_tier_1_candidates, v_tier_2_candidates
  FROM (
    SELECT
      p.id,
      COUNT(DISTINCT b.tutor_id) FILTER (
        WHERE b.agent_id = p.id
          AND b.status IN ('Confirmed', 'Completed')
          AND b.created_at >= now() - interval '30 days'
      ) AS active_tutors,
      (SELECT gs.score FROM growth_scores gs
       WHERE gs.user_id = p.id LIMIT 1) AS gs_score
    FROM profiles p
    LEFT JOIN bookings b ON b.agent_id = p.id
    WHERE 'agent' = ANY(p.roles)
      AND p.status = 'active'
    GROUP BY p.id
  ) agent_stats;

  -- ── Tier 3: strong candidates for > 30d with no org created ───────────────
  -- Based on platform_events tracking (if not yet populated, returns 0)
  SELECT COUNT(DISTINCT pe.actor_id)
    INTO v_tier_3_ready
  FROM platform_events pe
  JOIN profiles p ON p.id = pe.actor_id
  LEFT JOIN growth_scores gs ON gs.user_id = p.id
  WHERE pe.event_type = 'conductor.org_candidate_identified'
    AND pe.created_at < now() - interval '30 days'
    AND COALESCE(gs.score, 0) >= 75
    AND p.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM connection_groups cg
      WHERE cg.profile_id = p.id AND cg.type = 'organisation'
    );

  -- ── Candidates nudged in last 30d ─────────────────────────────────────────
  SELECT COUNT(DISTINCT actor_id)
    INTO v_candidates_nudged_30d
  FROM platform_events
  WHERE event_type = 'conductor.org_candidate_nudge_sent'
    AND created_at >= now() - interval '30 days';

  -- ── Orgs created in last 30d ──────────────────────────────────────────────
  SELECT COUNT(*) INTO v_orgs_created_30d
  FROM connection_groups
  WHERE type = 'organisation'
    AND created_at >= now() - interval '30 days';

  -- ── Orgs created from a prior Conductor nudge ─────────────────────────────
  SELECT COUNT(DISTINCT cg.id)
    INTO v_orgs_from_conductor_nudge
  FROM connection_groups cg
  JOIN platform_events pe ON pe.actor_id = cg.profile_id
  WHERE cg.type = 'organisation'
    AND cg.created_at >= now() - interval '90 days'
    AND pe.event_type = 'conductor.org_candidate_nudge_sent'
    AND pe.created_at < cg.created_at;

  -- ── Conversion rate (nudged → org created in 30d window) ─────────────────
  SELECT
    ROUND(
      COUNT(DISTINCT cg.profile_id)::numeric /
      NULLIF(COUNT(DISTINCT pe.actor_id), 0) * 100, 1
    ),
    ROUND(
      AVG(EXTRACT(EPOCH FROM (cg.created_at - pe.created_at)) / 86400), 1
    )
    INTO v_conversion_rate_pct, v_avg_days_to_convert
  FROM platform_events pe
  LEFT JOIN connection_groups cg
    ON cg.profile_id = pe.actor_id
    AND cg.type = 'organisation'
    AND cg.created_at BETWEEN pe.created_at AND pe.created_at + interval '30 days'
  WHERE pe.event_type = 'conductor.org_candidate_nudge_sent'
    AND pe.created_at >= now() - interval '90 days';

  -- ── Total active orgs (at least 1 booking in last 30d from founder) ────────
  SELECT COUNT(DISTINCT cg.id)
    INTO v_total_active_orgs
  FROM connection_groups cg
  WHERE cg.type = 'organisation'
    AND EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.tutor_id = cg.profile_id
        AND b.status = 'Completed'
        AND b.updated_at >= now() - interval '30 days'
    );

  -- ── New org onboarding stall (created < 30d, founder has no agent bookings) ─
  SELECT COUNT(*)
    INTO v_new_org_onboarding_stall
  FROM connection_groups cg
  WHERE cg.type = 'organisation'
    AND cg.created_at >= now() - interval '30 days'
    AND cg.created_at < now() - interval '7 days'  -- give 7d grace period
    AND NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.agent_id = cg.profile_id
        AND b.created_at >= cg.created_at
    );

  -- ── Avg members per org (member_count column on connection_groups) ──────────
  SELECT ROUND(AVG(member_count), 1)
    INTO v_avg_members_per_org
  FROM connection_groups
  WHERE type = 'organisation' AND member_count > 0;

  -- ── Avg org growth score ───────────────────────────────────────────────────
  SELECT ROUND(AVG(gs.score), 2)
    INTO v_avg_org_growth_score
  FROM connection_groups cg
  JOIN growth_scores gs ON gs.user_id = cg.profile_id
  WHERE cg.type = 'organisation';

  -- ── Orgs below threshold (org growth score < 40) ───────────────────────────
  SELECT COUNT(DISTINCT cg.id)
    INTO v_orgs_below_threshold
  FROM connection_groups cg
  JOIN growth_scores gs ON gs.user_id = cg.profile_id
  WHERE cg.type = 'organisation' AND gs.score < 40;

  -- ── Upsert ─────────────────────────────────────────────────────────────────
  INSERT INTO org_conversion_platform_metrics_daily (
    metric_date,
    tier_1_candidates, tier_2_candidates, tier_3_ready,
    candidates_nudged_30d, conversion_rate_pct, avg_days_nudge_to_conversion,
    orgs_created_30d, orgs_from_conductor_nudge,
    total_active_orgs, new_org_onboarding_stall,
    avg_members_per_org, avg_org_growth_score, orgs_below_threshold
  ) VALUES (
    v_date,
    v_tier_1_candidates, v_tier_2_candidates, v_tier_3_ready,
    v_candidates_nudged_30d, v_conversion_rate_pct, v_avg_days_to_convert,
    v_orgs_created_30d, v_orgs_from_conductor_nudge,
    v_total_active_orgs, v_new_org_onboarding_stall,
    v_avg_members_per_org, v_avg_org_growth_score, v_orgs_below_threshold
  )
  ON CONFLICT (metric_date) DO UPDATE SET
    tier_1_candidates           = EXCLUDED.tier_1_candidates,
    tier_2_candidates           = EXCLUDED.tier_2_candidates,
    tier_3_ready                = EXCLUDED.tier_3_ready,
    candidates_nudged_30d       = EXCLUDED.candidates_nudged_30d,
    conversion_rate_pct         = EXCLUDED.conversion_rate_pct,
    avg_days_nudge_to_conversion = EXCLUDED.avg_days_nudge_to_conversion,
    orgs_created_30d            = EXCLUDED.orgs_created_30d,
    orgs_from_conductor_nudge   = EXCLUDED.orgs_from_conductor_nudge,
    total_active_orgs           = EXCLUDED.total_active_orgs,
    new_org_onboarding_stall    = EXCLUDED.new_org_onboarding_stall,
    avg_members_per_org         = EXCLUDED.avg_members_per_org,
    avg_org_growth_score        = EXCLUDED.avg_org_growth_score,
    orgs_below_threshold        = EXCLUDED.orgs_below_threshold;

END;
$$;

SELECT cron.schedule(
  'compute-org-conversion-platform-metrics',
  '30 10 * * *',
  $$SELECT compute_org_conversion_platform_metrics();$$
);
