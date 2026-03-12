-- Migration 391: User Onboarding Intelligence
-- Phase 3 Conductor Intelligence — Use Case 7 (15th spec)
-- Creates: onboarding_platform_metrics_daily table + compute function + pg_cron (04:00 UTC)
--
-- Schema notes:
--   profiles.primary_role ('tutor' | 'student' | 'agent' | 'organisation')
--   profiles.email_verified (boolean)
--   profiles.status ('pending' | 'under_review' | 'active' | 'rejected' | 'suspended')
--   onboarding_sessions.profile_id / role_type / current_step / completed_at / last_active
--   role_details.profile_id / role_type / subjects / completed_at
--   bookings.tutor_id / client_id / status='Completed' / updated_at as completion proxy

-- ── 1. onboarding_platform_metrics_daily table ────────────────────────────────

CREATE TABLE IF NOT EXISTS onboarding_platform_metrics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL UNIQUE,

  -- Tutor funnel (30-day rolling window ending on metric_date)
  tutor_signups_30d        integer NOT NULL DEFAULT 0,
  tutor_verified_30d       integer NOT NULL DEFAULT 0,
  tutor_role_selected_30d  integer NOT NULL DEFAULT 0,
  tutor_profile_complete_30d integer NOT NULL DEFAULT 0,
  tutor_value_setup_30d    integer NOT NULL DEFAULT 0,
  tutor_activated_30d      integer NOT NULL DEFAULT 0,
  tutor_conversion_pct     numeric(5,2),

  -- Client funnel
  client_signups_30d        integer NOT NULL DEFAULT 0,
  client_verified_30d       integer NOT NULL DEFAULT 0,
  client_role_selected_30d  integer NOT NULL DEFAULT 0,
  client_profile_complete_30d integer NOT NULL DEFAULT 0,
  client_value_setup_30d    integer NOT NULL DEFAULT 0,
  client_activated_30d      integer NOT NULL DEFAULT 0,
  client_conversion_pct     numeric(5,2),

  -- Agent funnel
  agent_signups_30d        integer NOT NULL DEFAULT 0,
  agent_verified_30d       integer NOT NULL DEFAULT 0,
  agent_role_selected_30d  integer NOT NULL DEFAULT 0,
  agent_profile_complete_30d integer NOT NULL DEFAULT 0,
  agent_value_setup_30d    integer NOT NULL DEFAULT 0,
  agent_activated_30d      integer NOT NULL DEFAULT 0,
  agent_conversion_pct     numeric(5,2),

  -- Organisation funnel
  org_signups_30d        integer NOT NULL DEFAULT 0,
  org_verified_30d       integer NOT NULL DEFAULT 0,
  org_role_selected_30d  integer NOT NULL DEFAULT 0,
  org_profile_complete_30d integer NOT NULL DEFAULT 0,
  org_value_setup_30d    integer NOT NULL DEFAULT 0,
  org_activated_30d      integer NOT NULL DEFAULT 0,
  org_conversion_pct     numeric(5,2),

  -- Tutor approval pipeline (point-in-time snapshot)
  approval_pending         integer NOT NULL DEFAULT 0,
  approval_under_review    integer NOT NULL DEFAULT 0,
  approval_approved_30d    integer NOT NULL DEFAULT 0,
  approval_rejected_30d    integer NOT NULL DEFAULT 0,
  approval_median_hours    numeric(8,2),

  -- Time-to-activation (medians in days, 90-day lookback)
  tutor_time_to_activate_median_days  numeric(6,2),
  client_time_to_activate_median_days numeric(6,2),

  -- Abandonment (point-in-time)
  mid_onboarding_abandoned   integer NOT NULL DEFAULT 0,
  post_onboarding_no_setup   integer NOT NULL DEFAULT 0,
  verified_no_role           integer NOT NULL DEFAULT 0,

  -- Biggest drop-off stage per role
  tutor_biggest_dropoff_stage  text,
  client_biggest_dropoff_stage text,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON onboarding_platform_metrics_daily (metric_date DESC);

-- ── 2. compute function ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION compute_onboarding_platform_metrics()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_date date := CURRENT_DATE;
  v_start timestamptz := (CURRENT_DATE - interval '30 days')::timestamptz;

  -- Tutor funnel
  v_t_signups int; v_t_verified int; v_t_role int; v_t_profile int; v_t_setup int; v_t_activated int;
  -- Client funnel
  v_c_signups int; v_c_verified int; v_c_role int; v_c_profile int; v_c_setup int; v_c_activated int;
  -- Agent funnel
  v_a_signups int; v_a_verified int; v_a_role int; v_a_profile int; v_a_setup int; v_a_activated int;
  -- Org funnel
  v_o_signups int; v_o_verified int; v_o_role int; v_o_profile int; v_o_setup int; v_o_activated int;

  -- Approval pipeline
  v_ap_pending int; v_ap_review int; v_ap_approved int; v_ap_rejected int; v_ap_median numeric;

  -- Time-to-activate
  v_tta_tutor numeric; v_tta_client numeric;

  -- Abandonment
  v_mid_abandoned int; v_post_no_setup int; v_verified_no_role int;

  -- Drop-off
  v_t_dropoff text; v_c_dropoff text;
BEGIN
  -- ── Tutor funnel ──
  SELECT COUNT(*) INTO v_t_signups
  FROM profiles WHERE created_at >= v_start AND (primary_role = 'tutor' OR primary_role IS NULL);

  SELECT COUNT(*) INTO v_t_verified
  FROM profiles WHERE created_at >= v_start AND email_verified = true
    AND (primary_role = 'tutor' OR primary_role IS NULL);

  SELECT COUNT(*) INTO v_t_role
  FROM profiles WHERE created_at >= v_start AND primary_role = 'tutor';

  SELECT COUNT(*) INTO v_t_profile
  FROM profiles p
  JOIN onboarding_sessions os ON os.profile_id = p.id AND os.role_type = 'tutor'
  WHERE p.created_at >= v_start AND os.completed_at IS NOT NULL;

  SELECT COUNT(DISTINCT l.user_id) INTO v_t_setup
  FROM listings l
  JOIN profiles p ON p.id = l.user_id
  WHERE p.created_at >= v_start AND p.primary_role = 'tutor' AND l.status = 'active';

  SELECT COUNT(DISTINCT b.tutor_id) INTO v_t_activated
  FROM bookings b
  JOIN profiles p ON p.id = b.tutor_id
  WHERE p.created_at >= v_start AND b.status = 'Completed';

  -- ── Client funnel ──
  SELECT COUNT(*) INTO v_c_signups
  FROM profiles WHERE created_at >= v_start AND (primary_role = 'student' OR primary_role IS NULL);

  SELECT COUNT(*) INTO v_c_verified
  FROM profiles WHERE created_at >= v_start AND email_verified = true
    AND (primary_role = 'student' OR primary_role IS NULL);

  SELECT COUNT(*) INTO v_c_role
  FROM profiles WHERE created_at >= v_start AND primary_role = 'student';

  SELECT COUNT(*) INTO v_c_profile
  FROM profiles p
  JOIN onboarding_sessions os ON os.profile_id = p.id AND os.role_type = 'student'
  WHERE p.created_at >= v_start AND os.completed_at IS NOT NULL;

  SELECT COUNT(DISTINCT rd.profile_id) INTO v_c_setup
  FROM role_details rd
  JOIN profiles p ON p.id = rd.profile_id
  WHERE p.created_at >= v_start AND rd.role_type = 'student' AND rd.subjects IS NOT NULL;

  SELECT COUNT(DISTINCT b.client_id) INTO v_c_activated
  FROM bookings b
  JOIN profiles p ON p.id = b.client_id
  WHERE p.created_at >= v_start AND b.status = 'Completed';

  -- ── Agent funnel ──
  SELECT COUNT(*) INTO v_a_signups
  FROM profiles WHERE created_at >= v_start AND primary_role = 'agent';

  SELECT COUNT(*) INTO v_a_verified
  FROM profiles WHERE created_at >= v_start AND email_verified = true AND primary_role = 'agent';

  v_a_role := v_a_signups; -- agents must select role at signup

  SELECT COUNT(*) INTO v_a_profile
  FROM profiles p
  JOIN onboarding_sessions os ON os.profile_id = p.id AND os.role_type = 'agent'
  WHERE p.created_at >= v_start AND os.completed_at IS NOT NULL;

  -- Agent value setup: manages at least 1 tutor listing
  SELECT COUNT(DISTINCT l.agent_id) INTO v_a_setup
  FROM listings l
  JOIN profiles p ON p.id = l.agent_id
  WHERE p.created_at >= v_start AND p.primary_role = 'agent' AND l.agent_id IS NOT NULL;

  -- Agent activated: a referred signup made a booking
  SELECT COUNT(DISTINCT r.agent_id) INTO v_a_activated
  FROM referrals r
  JOIN profiles rp ON rp.id = r.referred_id
  JOIN bookings b ON (b.tutor_id = rp.id OR b.client_id = rp.id) AND b.status = 'Completed'
  JOIN profiles ap ON ap.id = r.agent_id
  WHERE ap.created_at >= v_start AND ap.primary_role = 'agent';

  -- ── Organisation funnel ──
  SELECT COUNT(*) INTO v_o_signups
  FROM profiles WHERE created_at >= v_start AND primary_role = 'organisation';

  SELECT COUNT(*) INTO v_o_verified
  FROM profiles WHERE created_at >= v_start AND email_verified = true AND primary_role = 'organisation';

  v_o_role := v_o_signups;

  SELECT COUNT(*) INTO v_o_profile
  FROM profiles p
  JOIN onboarding_sessions os ON os.profile_id = p.id AND os.role_type = 'organisation'
  WHERE p.created_at >= v_start AND os.completed_at IS NOT NULL;

  -- Org value setup: at least 1 member added
  SELECT COUNT(DISTINCT cg.id) INTO v_o_setup
  FROM connection_groups cg
  JOIN profiles founder ON founder.id = cg.profile_id
  WHERE cg.type = 'organisation' AND founder.created_at >= v_start
    AND EXISTS (
      SELECT 1 FROM profiles m WHERE m.organisation_id = cg.id AND m.id != cg.profile_id
    );

  -- Org activated: at least 1 member with completed booking
  SELECT COUNT(DISTINCT cg.id) INTO v_o_activated
  FROM connection_groups cg
  JOIN profiles founder ON founder.id = cg.profile_id
  WHERE cg.type = 'organisation' AND founder.created_at >= v_start
    AND EXISTS (
      SELECT 1 FROM profiles m
      JOIN bookings b ON (b.tutor_id = m.id OR b.client_id = m.id) AND b.status = 'Completed'
      WHERE m.organisation_id = cg.id
    );

  -- ── Tutor approval pipeline ──
  SELECT COUNT(*) INTO v_ap_pending FROM profiles WHERE primary_role = 'tutor' AND status = 'pending';
  SELECT COUNT(*) INTO v_ap_review FROM profiles WHERE primary_role = 'tutor' AND status = 'under_review';
  SELECT COUNT(*) INTO v_ap_approved FROM profiles
    WHERE primary_role = 'tutor' AND status = 'active' AND updated_at >= v_start;
  SELECT COUNT(*) INTO v_ap_rejected FROM profiles
    WHERE primary_role = 'tutor' AND status = 'rejected' AND updated_at >= v_start;

  -- Median approval time from workflow executions
  SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (we.completed_at - we.started_at)) / 3600
  ) INTO v_ap_median
  FROM workflow_executions we
  JOIN workflow_processes wp ON wp.id = we.process_id
  WHERE wp.name ILIKE '%tutor%approval%'
    AND we.status = 'completed'
    AND we.started_at >= v_start;

  -- ── Time-to-activate ──
  SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (MIN(b.updated_at) - p.created_at)) / 86400
  ) INTO v_tta_tutor
  FROM profiles p
  JOIN bookings b ON b.tutor_id = p.id AND b.status = 'Completed'
  WHERE p.primary_role = 'tutor' AND p.created_at >= (CURRENT_DATE - interval '90 days')::timestamptz
  GROUP BY p.id, p.created_at;

  SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (MIN(b.updated_at) - p.created_at)) / 86400
  ) INTO v_tta_client
  FROM profiles p
  JOIN bookings b ON b.client_id = p.id AND b.status = 'Completed'
  WHERE p.primary_role = 'student' AND p.created_at >= (CURRENT_DATE - interval '90 days')::timestamptz
  GROUP BY p.id, p.created_at;

  -- ── Abandonment ──
  SELECT COUNT(*) INTO v_mid_abandoned
  FROM onboarding_sessions
  WHERE completed_at IS NULL AND current_step > 0 AND last_active < now() - interval '3 days';

  SELECT COUNT(*) INTO v_post_no_setup
  FROM profiles p
  JOIN onboarding_sessions os ON os.profile_id = p.id
  WHERE os.completed_at IS NOT NULL
    AND os.completed_at < now() - interval '7 days'
    AND p.primary_role = 'tutor'
    AND NOT EXISTS (SELECT 1 FROM listings l WHERE l.user_id = p.id AND l.status = 'active');

  SELECT COUNT(*) INTO v_verified_no_role
  FROM profiles
  WHERE email_verified = true AND primary_role IS NULL AND created_at < now() - interval '7 days';

  -- ── Biggest drop-off detection ──
  -- Find stage with largest absolute drop for tutors
  SELECT stage INTO v_t_dropoff FROM (
    VALUES
      ('verified', v_t_signups - v_t_verified),
      ('role_selected', v_t_verified - v_t_role),
      ('profile_complete', v_t_role - v_t_profile),
      ('value_setup', v_t_profile - v_t_setup),
      ('activated', v_t_setup - v_t_activated)
  ) AS t(stage, drop_count)
  ORDER BY drop_count DESC LIMIT 1;

  SELECT stage INTO v_c_dropoff FROM (
    VALUES
      ('verified', v_c_signups - v_c_verified),
      ('role_selected', v_c_verified - v_c_role),
      ('profile_complete', v_c_role - v_c_profile),
      ('value_setup', v_c_profile - v_c_setup),
      ('activated', v_c_setup - v_c_activated)
  ) AS t(stage, drop_count)
  ORDER BY drop_count DESC LIMIT 1;

  -- ── Upsert ──
  INSERT INTO onboarding_platform_metrics_daily (
    metric_date,
    tutor_signups_30d, tutor_verified_30d, tutor_role_selected_30d,
    tutor_profile_complete_30d, tutor_value_setup_30d, tutor_activated_30d, tutor_conversion_pct,
    client_signups_30d, client_verified_30d, client_role_selected_30d,
    client_profile_complete_30d, client_value_setup_30d, client_activated_30d, client_conversion_pct,
    agent_signups_30d, agent_verified_30d, agent_role_selected_30d,
    agent_profile_complete_30d, agent_value_setup_30d, agent_activated_30d, agent_conversion_pct,
    org_signups_30d, org_verified_30d, org_role_selected_30d,
    org_profile_complete_30d, org_value_setup_30d, org_activated_30d, org_conversion_pct,
    approval_pending, approval_under_review, approval_approved_30d, approval_rejected_30d,
    approval_median_hours,
    tutor_time_to_activate_median_days, client_time_to_activate_median_days,
    mid_onboarding_abandoned, post_onboarding_no_setup, verified_no_role,
    tutor_biggest_dropoff_stage, client_biggest_dropoff_stage
  ) VALUES (
    v_date,
    v_t_signups, v_t_verified, v_t_role, v_t_profile, v_t_setup, v_t_activated,
    CASE WHEN v_t_signups > 0 THEN ROUND((v_t_activated::numeric / v_t_signups) * 100, 2) END,
    v_c_signups, v_c_verified, v_c_role, v_c_profile, v_c_setup, v_c_activated,
    CASE WHEN v_c_signups > 0 THEN ROUND((v_c_activated::numeric / v_c_signups) * 100, 2) END,
    v_a_signups, v_a_verified, v_a_role, v_a_profile, v_a_setup, v_a_activated,
    CASE WHEN v_a_signups > 0 THEN ROUND((v_a_activated::numeric / v_a_signups) * 100, 2) END,
    v_o_signups, v_o_verified, v_o_role, v_o_profile, v_o_setup, v_o_activated,
    CASE WHEN v_o_signups > 0 THEN ROUND((v_o_activated::numeric / v_o_signups) * 100, 2) END,
    v_ap_pending, v_ap_review, v_ap_approved, v_ap_rejected, v_ap_median,
    v_tta_tutor, v_tta_client,
    v_mid_abandoned, v_post_no_setup, v_verified_no_role,
    v_t_dropoff, v_c_dropoff
  )
  ON CONFLICT (metric_date) DO UPDATE SET
    tutor_signups_30d = EXCLUDED.tutor_signups_30d,
    tutor_verified_30d = EXCLUDED.tutor_verified_30d,
    tutor_role_selected_30d = EXCLUDED.tutor_role_selected_30d,
    tutor_profile_complete_30d = EXCLUDED.tutor_profile_complete_30d,
    tutor_value_setup_30d = EXCLUDED.tutor_value_setup_30d,
    tutor_activated_30d = EXCLUDED.tutor_activated_30d,
    tutor_conversion_pct = EXCLUDED.tutor_conversion_pct,
    client_signups_30d = EXCLUDED.client_signups_30d,
    client_verified_30d = EXCLUDED.client_verified_30d,
    client_role_selected_30d = EXCLUDED.client_role_selected_30d,
    client_profile_complete_30d = EXCLUDED.client_profile_complete_30d,
    client_value_setup_30d = EXCLUDED.client_value_setup_30d,
    client_activated_30d = EXCLUDED.client_activated_30d,
    client_conversion_pct = EXCLUDED.client_conversion_pct,
    agent_signups_30d = EXCLUDED.agent_signups_30d,
    agent_verified_30d = EXCLUDED.agent_verified_30d,
    agent_role_selected_30d = EXCLUDED.agent_role_selected_30d,
    agent_profile_complete_30d = EXCLUDED.agent_profile_complete_30d,
    agent_value_setup_30d = EXCLUDED.agent_value_setup_30d,
    agent_activated_30d = EXCLUDED.agent_activated_30d,
    agent_conversion_pct = EXCLUDED.agent_conversion_pct,
    org_signups_30d = EXCLUDED.org_signups_30d,
    org_verified_30d = EXCLUDED.org_verified_30d,
    org_role_selected_30d = EXCLUDED.org_role_selected_30d,
    org_profile_complete_30d = EXCLUDED.org_profile_complete_30d,
    org_value_setup_30d = EXCLUDED.org_value_setup_30d,
    org_activated_30d = EXCLUDED.org_activated_30d,
    org_conversion_pct = EXCLUDED.org_conversion_pct,
    approval_pending = EXCLUDED.approval_pending,
    approval_under_review = EXCLUDED.approval_under_review,
    approval_approved_30d = EXCLUDED.approval_approved_30d,
    approval_rejected_30d = EXCLUDED.approval_rejected_30d,
    approval_median_hours = EXCLUDED.approval_median_hours,
    tutor_time_to_activate_median_days = EXCLUDED.tutor_time_to_activate_median_days,
    client_time_to_activate_median_days = EXCLUDED.client_time_to_activate_median_days,
    mid_onboarding_abandoned = EXCLUDED.mid_onboarding_abandoned,
    post_onboarding_no_setup = EXCLUDED.post_onboarding_no_setup,
    verified_no_role = EXCLUDED.verified_no_role,
    tutor_biggest_dropoff_stage = EXCLUDED.tutor_biggest_dropoff_stage,
    client_biggest_dropoff_stage = EXCLUDED.client_biggest_dropoff_stage;
END;
$$;

-- ── 3. pg_cron: daily at 04:00 UTC ───────────────────────────────────────────
SELECT cron.schedule(
  'compute-onboarding-platform-metrics',
  '0 4 * * *',
  $$SELECT compute_onboarding_platform_metrics();$$
);

-- ── 4. RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE onboarding_platform_metrics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read onboarding metrics"
  ON onboarding_platform_metrics_daily
  FOR SELECT USING (is_admin());
