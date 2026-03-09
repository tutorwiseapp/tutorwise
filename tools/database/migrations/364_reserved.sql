-- Migration 364: Referral Metrics Daily
-- Phase: Conductor Phase 3 — Referral Intelligence
-- Table: referral_metrics_daily + compute_referral_metrics()
-- Spec: conductor/referral-intelligence-spec.md
-- Agent: Retention Monitor (query_referral_funnel tool)
-- pg_cron: daily 09:00 UTC

CREATE TABLE IF NOT EXISTS referral_metrics_daily (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  computed_date        date NOT NULL,
  segment              text NOT NULL,    -- 'platform' | 'role:tutor' | 'role:agent' | 'role:client' | 'type:supply' | 'type:demand'
  invitations_per_user numeric(8,4),    -- I (avg referrals sent per active user)
  signup_rate          numeric(8,4),    -- C1 (share → signup conversion)
  booking_rate         numeric(8,4),    -- C2 (signup → first booking conversion)
  k_coefficient        numeric(8,4),    -- K = I × C1 × C2
  active_users         integer,
  referrals_sent       integer,
  signups              integer,
  conversions          integer,
  created_at           timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS referral_metrics_daily_date_segment
  ON referral_metrics_daily (computed_date, segment);
CREATE INDEX IF NOT EXISTS referral_metrics_daily_date
  ON referral_metrics_daily (computed_date DESC);

ALTER TABLE referral_metrics_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY rmd_admin ON referral_metrics_daily FOR ALL USING (is_admin());

-- Compute function: K coefficient at platform + segment level
CREATE OR REPLACE FUNCTION compute_referral_metrics()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  seg text;
  v_active_users   integer;
  v_referrals_sent integer;
  v_signups        integer;
  v_conversions    integer;
  v_I  numeric(8,4);
  v_C1 numeric(8,4);
  v_C2 numeric(8,4);
  v_K  numeric(8,4);
BEGIN
  FOREACH seg IN ARRAY ARRAY['platform', 'role:tutor', 'role:agent', 'role:client', 'type:supply', 'type:demand'] LOOP

    -- Active users in last 30d (had a booking or sent a referral)
    SELECT COUNT(DISTINCT p.id) INTO v_active_users
    FROM profiles p
    WHERE (
      EXISTS (
        SELECT 1 FROM bookings b
        WHERE (b.tutor_profile_id = p.id OR b.client_profile_id = p.id)
          AND b.created_at > now() - interval '30 days'
      ) OR EXISTS (
        SELECT 1 FROM referrals r
        WHERE r.agent_id = p.id AND r.created_at > now() - interval '30 days'
      )
    )
    AND (
      seg = 'platform'
      OR (seg = 'role:tutor'  AND p.role = 'tutor')
      OR (seg = 'role:agent'  AND p.role = 'agent')
      OR (seg = 'role:client' AND p.role = 'client')
      OR seg IN ('type:supply', 'type:demand')
    );

    -- Referrals sent in last 30d
    SELECT COUNT(*) INTO v_referrals_sent
    FROM referrals r
    JOIN profiles p ON r.agent_id = p.id
    WHERE r.created_at > now() - interval '30 days'
      AND r.status != 'Expired'
      AND (
        seg = 'platform'
        OR (seg = 'role:tutor'  AND p.role = 'tutor')
        OR (seg = 'role:agent'  AND p.role = 'agent')
        OR (seg = 'role:client' AND p.role = 'client')
        OR (seg = 'type:supply' AND r.referral_target_type = 'tutor')
        OR (seg = 'type:demand' AND r.referral_target_type = 'client')
      );

    -- Signups from referrals in last 30d
    SELECT COUNT(*) INTO v_signups
    FROM referrals r
    JOIN profiles p ON r.agent_id = p.id
    WHERE r.created_at > now() - interval '30 days'
      AND r.status IN ('Signed Up', 'Converted')
      AND (
        seg = 'platform'
        OR (seg = 'role:tutor'  AND p.role = 'tutor')
        OR (seg = 'role:agent'  AND p.role = 'agent')
        OR (seg = 'role:client' AND p.role = 'client')
        OR (seg = 'type:supply' AND r.referral_target_type = 'tutor')
        OR (seg = 'type:demand' AND r.referral_target_type = 'client')
      );

    -- First-booking conversions from referrals in last 30d
    SELECT COUNT(*) INTO v_conversions
    FROM referrals r
    JOIN profiles p ON r.agent_id = p.id
    WHERE r.created_at > now() - interval '30 days'
      AND r.status = 'Converted'
      AND (
        seg = 'platform'
        OR (seg = 'role:tutor'  AND p.role = 'tutor')
        OR (seg = 'role:agent'  AND p.role = 'agent')
        OR (seg = 'role:client' AND p.role = 'client')
        OR (seg = 'type:supply' AND r.referral_target_type = 'tutor')
        OR (seg = 'type:demand' AND r.referral_target_type = 'client')
      );

    -- K = I × C1 × C2
    v_I  := ROUND(COALESCE(v_referrals_sent::numeric / NULLIF(v_active_users, 0), 0), 4);
    v_C1 := ROUND(COALESCE(v_signups::numeric    / NULLIF(v_referrals_sent, 0), 0), 4);
    v_C2 := ROUND(COALESCE(v_conversions::numeric / NULLIF(v_signups, 0), 0), 4);
    v_K  := ROUND(v_I * v_C1 * v_C2, 4);

    INSERT INTO referral_metrics_daily (
      computed_date, segment, invitations_per_user, signup_rate, booking_rate,
      k_coefficient, active_users, referrals_sent, signups, conversions
    ) VALUES (
      CURRENT_DATE, seg, v_I, v_C1, v_C2, v_K,
      v_active_users, v_referrals_sent, v_signups, v_conversions
    )
    ON CONFLICT (computed_date, segment) DO UPDATE SET
      invitations_per_user = EXCLUDED.invitations_per_user,
      signup_rate          = EXCLUDED.signup_rate,
      booking_rate         = EXCLUDED.booking_rate,
      k_coefficient        = EXCLUDED.k_coefficient,
      active_users         = EXCLUDED.active_users,
      referrals_sent       = EXCLUDED.referrals_sent,
      signups              = EXCLUDED.signups,
      conversions          = EXCLUDED.conversions,
      created_at           = now();
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- pg_cron: daily 09:00 UTC (last in the intelligence pipeline)
SELECT cron.schedule(
  'compute-referral-metrics',
  '0 9 * * *',
  'SELECT compute_referral_metrics()'
);
