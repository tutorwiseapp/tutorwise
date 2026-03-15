-- Migration 404: onboarding_platform_metrics_daily
-- Creates the daily onboarding metrics table and pg_cron compute function.
-- Schedule: daily at 04:00 UTC (before other intelligence tables).

-- ── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS onboarding_platform_metrics_daily (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date       DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Per-role funnel columns (30-day rolling window)
  -- Tutor funnel
  tutor_signups_30d             INTEGER DEFAULT 0,
  tutor_verified_30d            INTEGER DEFAULT 0,
  tutor_role_selected_30d       INTEGER DEFAULT 0,
  tutor_profile_complete_30d    INTEGER DEFAULT 0,
  tutor_value_setup_30d         INTEGER DEFAULT 0,
  tutor_activated_30d           INTEGER DEFAULT 0,
  tutor_conversion_pct          NUMERIC(5,1),
  tutor_biggest_dropoff_stage   TEXT,

  -- Client funnel
  client_signups_30d            INTEGER DEFAULT 0,
  client_verified_30d           INTEGER DEFAULT 0,
  client_role_selected_30d      INTEGER DEFAULT 0,
  client_profile_complete_30d   INTEGER DEFAULT 0,
  client_value_setup_30d        INTEGER DEFAULT 0,
  client_activated_30d          INTEGER DEFAULT 0,
  client_conversion_pct         NUMERIC(5,1),
  client_biggest_dropoff_stage  TEXT,

  -- Agent funnel
  agent_signups_30d             INTEGER DEFAULT 0,
  agent_verified_30d            INTEGER DEFAULT 0,
  agent_role_selected_30d       INTEGER DEFAULT 0,
  agent_profile_complete_30d    INTEGER DEFAULT 0,
  agent_value_setup_30d         INTEGER DEFAULT 0,
  agent_activated_30d           INTEGER DEFAULT 0,
  agent_conversion_pct          NUMERIC(5,1),

  -- Organisation funnel
  org_signups_30d               INTEGER DEFAULT 0,
  org_verified_30d              INTEGER DEFAULT 0,
  org_role_selected_30d         INTEGER DEFAULT 0,
  org_profile_complete_30d      INTEGER DEFAULT 0,
  org_value_setup_30d           INTEGER DEFAULT 0,
  org_activated_30d             INTEGER DEFAULT 0,
  org_conversion_pct            NUMERIC(5,1),

  -- Approval pipeline (point-in-time)
  approval_pending              INTEGER DEFAULT 0,
  approval_under_review         INTEGER DEFAULT 0,
  approval_approved_30d         INTEGER DEFAULT 0,
  approval_rejected_30d         INTEGER DEFAULT 0,
  approval_median_hours         NUMERIC(6,1),

  -- Time-to-activate (median days from signup to first meaningful action)
  tutor_time_to_activate_median_days   NUMERIC(5,1),
  client_time_to_activate_median_days  NUMERIC(5,1),

  -- Abandonment signals (point-in-time counts)
  mid_onboarding_abandoned      INTEGER DEFAULT 0,
  post_onboarding_no_setup      INTEGER DEFAULT 0,
  verified_no_role              INTEGER DEFAULT 0,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(metric_date)
);

ALTER TABLE onboarding_platform_metrics_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read onboarding metrics" ON onboarding_platform_metrics_daily
  FOR SELECT USING (is_admin());

CREATE INDEX idx_onboarding_metrics_date ON onboarding_platform_metrics_daily(metric_date DESC);

-- ── Compute function ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION compute_onboarding_platform_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_date DATE := CURRENT_DATE;
  v_since TIMESTAMPTZ := now() - INTERVAL '30 days';
  v_signups INTEGER; v_verified INTEGER; v_role_selected INTEGER;
  v_profile_complete INTEGER; v_value_setup INTEGER; v_activated INTEGER;
  v_conv_pct NUMERIC(5,1); v_dropoff TEXT;
  v_pending INTEGER; v_under_review INTEGER; v_approved INTEGER; v_rejected INTEGER;
  v_median_hrs NUMERIC(6,1);
  v_tutor_tta NUMERIC(5,1); v_client_tta NUMERIC(5,1);
  v_mid_abandoned INTEGER; v_post_no_setup INTEGER; v_no_role INTEGER;
  c_signups INTEGER; c_verified INTEGER; c_role_selected INTEGER;
  c_profile_complete INTEGER; c_value_setup INTEGER; c_activated INTEGER;
  c_conv_pct NUMERIC(5,1); c_dropoff TEXT;
  a_signups INTEGER; a_verified INTEGER; a_role_selected INTEGER;
  a_profile_complete INTEGER; a_value_setup INTEGER; a_activated INTEGER;
  a_conv_pct NUMERIC(5,1);
  o_signups INTEGER; o_verified INTEGER; o_role_selected INTEGER;
  o_profile_complete INTEGER; o_value_setup INTEGER; o_activated INTEGER;
  o_conv_pct NUMERIC(5,1);
BEGIN
  DELETE FROM onboarding_platform_metrics_daily WHERE metric_date = v_date;

  -- Tutor funnel
  SELECT COUNT(*) INTO v_signups FROM profiles WHERE 'tutor' = ANY(roles) AND created_at >= v_since;
  SELECT COUNT(*) INTO v_verified FROM profiles WHERE 'tutor' = ANY(roles) AND created_at >= v_since AND status != 'pending';
  SELECT COUNT(*) INTO v_role_selected FROM profiles WHERE 'tutor' = ANY(roles) AND created_at >= v_since AND active_role IS NOT NULL;
  SELECT COUNT(*) INTO v_profile_complete FROM profiles WHERE 'tutor' = ANY(roles) AND created_at >= v_since AND onboarding_completed = 'true'::jsonb;
  SELECT COUNT(*) INTO v_value_setup FROM profiles p
    WHERE 'tutor' = ANY(p.roles) AND p.created_at >= v_since AND p.onboarding_completed = 'true'::jsonb
    AND EXISTS (SELECT 1 FROM listings l WHERE l.profile_id = p.id);
  SELECT COUNT(*) INTO v_activated FROM profiles WHERE 'tutor' = ANY(roles) AND created_at >= v_since AND status = 'active';
  v_conv_pct := CASE WHEN v_signups > 0 THEN ROUND((v_activated::NUMERIC / v_signups) * 100, 1) ELSE NULL END;
  v_dropoff := CASE
    WHEN v_signups - v_verified > GREATEST(v_verified - v_role_selected, v_role_selected - v_profile_complete, v_profile_complete - v_value_setup, v_value_setup - v_activated) THEN 'signup → verified'
    WHEN v_verified - v_role_selected > GREATEST(v_role_selected - v_profile_complete, v_profile_complete - v_value_setup, v_value_setup - v_activated) THEN 'verified → role'
    WHEN v_role_selected - v_profile_complete > GREATEST(v_profile_complete - v_value_setup, v_value_setup - v_activated) THEN 'role → profile'
    WHEN v_profile_complete - v_value_setup > (v_value_setup - v_activated) THEN 'profile → setup'
    ELSE 'setup → active'
  END;

  -- Client funnel
  SELECT COUNT(*) INTO c_signups FROM profiles WHERE 'client' = ANY(roles) AND created_at >= v_since;
  SELECT COUNT(*) INTO c_verified FROM profiles WHERE 'client' = ANY(roles) AND created_at >= v_since AND status != 'pending';
  SELECT COUNT(*) INTO c_role_selected FROM profiles WHERE 'client' = ANY(roles) AND created_at >= v_since AND active_role IS NOT NULL;
  SELECT COUNT(*) INTO c_profile_complete FROM profiles WHERE 'client' = ANY(roles) AND created_at >= v_since AND onboarding_completed = 'true'::jsonb;
  SELECT COUNT(*) INTO c_value_setup FROM profiles p
    WHERE 'client' = ANY(p.roles) AND p.created_at >= v_since AND p.onboarding_completed = 'true'::jsonb
    AND EXISTS (SELECT 1 FROM bookings b WHERE b.client_id = p.id);
  SELECT COUNT(*) INTO c_activated FROM profiles WHERE 'client' = ANY(roles) AND created_at >= v_since AND status = 'active';
  c_conv_pct := CASE WHEN c_signups > 0 THEN ROUND((c_activated::NUMERIC / c_signups) * 100, 1) ELSE NULL END;
  c_dropoff := CASE
    WHEN c_signups - c_verified > GREATEST(c_verified - c_role_selected, c_role_selected - c_profile_complete, c_profile_complete - c_value_setup, c_value_setup - c_activated) THEN 'signup → verified'
    WHEN c_verified - c_role_selected > GREATEST(c_role_selected - c_profile_complete, c_profile_complete - c_value_setup, c_value_setup - c_activated) THEN 'verified → role'
    WHEN c_role_selected - c_profile_complete > GREATEST(c_profile_complete - c_value_setup, c_value_setup - c_activated) THEN 'role → profile'
    WHEN c_profile_complete - c_value_setup > (c_value_setup - c_activated) THEN 'profile → setup'
    ELSE 'setup → active'
  END;

  -- Agent funnel
  SELECT COUNT(*) INTO a_signups FROM profiles WHERE 'agent' = ANY(roles) AND created_at >= v_since;
  SELECT COUNT(*) INTO a_verified FROM profiles WHERE 'agent' = ANY(roles) AND created_at >= v_since AND status != 'pending';
  SELECT COUNT(*) INTO a_role_selected FROM profiles WHERE 'agent' = ANY(roles) AND created_at >= v_since AND active_role IS NOT NULL;
  SELECT COUNT(*) INTO a_profile_complete FROM profiles WHERE 'agent' = ANY(roles) AND created_at >= v_since AND onboarding_completed = 'true'::jsonb;
  SELECT COUNT(*) INTO a_value_setup FROM profiles WHERE 'agent' = ANY(roles) AND created_at >= v_since AND onboarding_completed = 'true'::jsonb AND status = 'active';
  SELECT COUNT(*) INTO a_activated FROM profiles WHERE 'agent' = ANY(roles) AND created_at >= v_since AND status = 'active';
  a_conv_pct := CASE WHEN a_signups > 0 THEN ROUND((a_activated::NUMERIC / a_signups) * 100, 1) ELSE NULL END;

  -- Organisation funnel
  SELECT COUNT(*) INTO o_signups FROM profiles WHERE 'organisation' = ANY(roles) AND created_at >= v_since;
  SELECT COUNT(*) INTO o_verified FROM profiles WHERE 'organisation' = ANY(roles) AND created_at >= v_since AND status != 'pending';
  SELECT COUNT(*) INTO o_role_selected FROM profiles WHERE 'organisation' = ANY(roles) AND created_at >= v_since AND active_role IS NOT NULL;
  SELECT COUNT(*) INTO o_profile_complete FROM profiles WHERE 'organisation' = ANY(roles) AND created_at >= v_since AND onboarding_completed = 'true'::jsonb;
  SELECT COUNT(*) INTO o_value_setup FROM profiles WHERE 'organisation' = ANY(roles) AND created_at >= v_since AND onboarding_completed = 'true'::jsonb AND status = 'active';
  SELECT COUNT(*) INTO o_activated FROM profiles WHERE 'organisation' = ANY(roles) AND created_at >= v_since AND status = 'active';
  o_conv_pct := CASE WHEN o_signups > 0 THEN ROUND((o_activated::NUMERIC / o_signups) * 100, 1) ELSE NULL END;

  -- Approval pipeline
  SELECT COUNT(*) INTO v_pending FROM profiles WHERE 'tutor' = ANY(roles) AND status = 'pending';
  SELECT COUNT(*) INTO v_under_review FROM profiles WHERE 'tutor' = ANY(roles) AND status = 'under_review';
  SELECT COUNT(*) INTO v_approved FROM profiles WHERE 'tutor' = ANY(roles) AND status = 'active' AND updated_at >= v_since;
  SELECT COUNT(*) INTO v_rejected FROM profiles WHERE 'tutor' = ANY(roles) AND status = 'rejected' AND updated_at >= v_since;
  SELECT EXTRACT(EPOCH FROM PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY updated_at - created_at)) / 3600
    INTO v_median_hrs FROM profiles
    WHERE 'tutor' = ANY(roles) AND status = 'active' AND updated_at >= v_since AND updated_at > created_at;

  -- Time-to-activate
  SELECT EXTRACT(EPOCH FROM PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY o.completed_at - p.created_at)) / 86400
    INTO v_tutor_tta FROM profiles p JOIN onboarding_sessions o ON o.profile_id = p.id
    WHERE 'tutor' = ANY(p.roles) AND o.completed_at IS NOT NULL AND p.created_at >= v_since;
  SELECT EXTRACT(EPOCH FROM PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY o.completed_at - p.created_at)) / 86400
    INTO v_client_tta FROM profiles p JOIN onboarding_sessions o ON o.profile_id = p.id
    WHERE 'client' = ANY(p.roles) AND o.completed_at IS NOT NULL AND p.created_at >= v_since;

  -- Abandonment
  SELECT COUNT(*) INTO v_mid_abandoned FROM onboarding_sessions
    WHERE completed_at IS NULL AND current_step > 0 AND last_active < now() - INTERVAL '3 days';
  SELECT COUNT(*) INTO v_post_no_setup FROM profiles p
    WHERE p.onboarding_completed = 'true'::jsonb AND p.created_at >= v_since
    AND p.created_at < now() - INTERVAL '7 days'
    AND NOT EXISTS (SELECT 1 FROM listings l WHERE l.profile_id = p.id)
    AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.client_id = p.id);
  SELECT COUNT(*) INTO v_no_role FROM profiles
    WHERE active_role IS NULL AND status != 'pending' AND created_at < now() - INTERVAL '7 days';

  INSERT INTO onboarding_platform_metrics_daily (
    metric_date,
    tutor_signups_30d, tutor_verified_30d, tutor_role_selected_30d,
    tutor_profile_complete_30d, tutor_value_setup_30d, tutor_activated_30d,
    tutor_conversion_pct, tutor_biggest_dropoff_stage,
    client_signups_30d, client_verified_30d, client_role_selected_30d,
    client_profile_complete_30d, client_value_setup_30d, client_activated_30d,
    client_conversion_pct, client_biggest_dropoff_stage,
    agent_signups_30d, agent_verified_30d, agent_role_selected_30d,
    agent_profile_complete_30d, agent_value_setup_30d, agent_activated_30d, agent_conversion_pct,
    org_signups_30d, org_verified_30d, org_role_selected_30d,
    org_profile_complete_30d, org_value_setup_30d, org_activated_30d, org_conversion_pct,
    approval_pending, approval_under_review, approval_approved_30d, approval_rejected_30d, approval_median_hours,
    tutor_time_to_activate_median_days, client_time_to_activate_median_days,
    mid_onboarding_abandoned, post_onboarding_no_setup, verified_no_role
  ) VALUES (
    v_date,
    v_signups, v_verified, v_role_selected, v_profile_complete, v_value_setup, v_activated, v_conv_pct, v_dropoff,
    c_signups, c_verified, c_role_selected, c_profile_complete, c_value_setup, c_activated, c_conv_pct, c_dropoff,
    a_signups, a_verified, a_role_selected, a_profile_complete, a_value_setup, a_activated, a_conv_pct,
    o_signups, o_verified, o_role_selected, o_profile_complete, o_value_setup, o_activated, o_conv_pct,
    v_pending, v_under_review, v_approved, v_rejected, v_median_hrs,
    v_tutor_tta, v_client_tta,
    v_mid_abandoned, v_post_no_setup, v_no_role
  );
END;
$fn$;

-- ── pg_cron schedule: daily at 04:00 UTC ─────────────────────────────────────

SELECT cron.schedule(
  'compute-onboarding-platform-metrics',
  '0 4 * * *',
  $$SELECT compute_onboarding_platform_metrics()$$
);
