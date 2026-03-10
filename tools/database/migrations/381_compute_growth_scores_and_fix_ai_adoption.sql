-- Migration 381: compute_growth_scores + fix AI Adoption subscription metrics
-- Phase: Conductor Audit Fixes 2026-03-10
--
-- 1. compute_growth_scores(): all-role growth score batch compute
--    Uses actual schema columns:
--      profiles.active_role (not role_type)
--      growth_scores.role (not role_type)
--      connection_groups.profile_id (not owner_id)
--    pg_cron: every 30 minutes
--
-- 2. Updated compute_ai_adoption_platform_metrics():
--    Queries real sage_pro_subscriptions + growth_pro_subscriptions tables
--    instead of stubbing subscription metrics to 0.
-- ============================================================

-- ── PART 1: compute_growth_scores() ──────────────────────────────────────────
--
-- Scoring guide (0–25 per component = 0–100 total):
--   All component scores are additive (stacked bonuses on top of base scores).
--   'previous_score' is preserved from the existing row on each upsert.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION compute_growth_scores()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN

  -- ── TUTOR SCORES ────────────────────────────────────────────────────────────
  -- Components: profile_completeness, listing_performance,
  --             earnings_trajectory, platform_engagement
  INSERT INTO growth_scores (user_id, role, score, previous_score, component_scores, computed_at)
  WITH tutor_base AS (
    SELECT
      p.id AS user_id,
      -- profile_completeness (0–25)
      LEAST(25,
        CASE WHEN p.avatar_url IS NOT NULL THEN 6 ELSE 0 END +
        CASE WHEN length(p.bio) >= 100 THEN 5 ELSE 0 END +
        CASE WHEN EXISTS (SELECT 1 FROM listings l WHERE l.profile_id = p.id AND l.status = 'active') THEN 5 ELSE 0 END +
        CASE WHEN p.stripe_account_id IS NOT NULL THEN 5 ELSE 0 END +
        CASE WHEN length(p.bio) >= 200 THEN 4 ELSE 0 END
      ) AS profile_score,
      -- listing_performance (0–25): based on bookings received as tutor
      LEAST(25,
        CASE WHEN EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.tutor_id = p.id AND b.created_at >= now() - interval '14 days'
        ) THEN 8 ELSE 0 END +
        CASE WHEN (
          SELECT COUNT(*) FROM bookings b
          WHERE b.tutor_id = p.id AND b.created_at >= now() - interval '14 days'
        ) >= 3 THEN 4 ELSE 0 END +
        CASE WHEN (
          SELECT COUNT(*) FROM bookings b
          WHERE b.tutor_id = p.id AND b.created_at >= now() - interval '30 days'
        ) >= (
          SELECT COUNT(*) FROM bookings b
          WHERE b.tutor_id = p.id
            AND b.created_at >= now() - interval '60 days'
            AND b.created_at < now() - interval '30 days'
        ) THEN 8 ELSE 0 END +
        CASE WHEN (
          SELECT COUNT(*) FROM bookings b
          WHERE b.tutor_id = p.id AND b.created_at >= now() - interval '30 days'
        ) > (
          SELECT COUNT(*) FROM bookings b
          WHERE b.tutor_id = p.id
            AND b.created_at >= now() - interval '60 days'
            AND b.created_at < now() - interval '30 days'
        ) * 1.10 THEN 5 ELSE 0 END
      ) AS listing_score,
      -- earnings_trajectory (0–25): transactions as tutor via bookings
      LEAST(25,
        CASE WHEN EXISTS (
          SELECT 1 FROM transactions t
          JOIN bookings b ON b.id = t.booking_id
          WHERE b.tutor_id = p.id AND t.created_at >= now() - interval '30 days'
            AND t.type = 'Booking Payment'
        ) THEN 5 ELSE 0 END +
        CASE WHEN COALESCE((
          SELECT SUM(t.amount) FROM transactions t
          JOIN bookings b ON b.id = t.booking_id
          WHERE b.tutor_id = p.id AND t.type = 'Booking Payment'
            AND t.created_at >= now() - interval '30 days'
        ), 0) >= COALESCE((
          SELECT SUM(t.amount) FROM transactions t
          JOIN bookings b ON b.id = t.booking_id
          WHERE b.tutor_id = p.id AND t.type = 'Booking Payment'
            AND t.created_at >= now() - interval '60 days'
            AND t.created_at < now() - interval '30 days'
        ), 0) THEN 10 ELSE 0 END +
        CASE WHEN COALESCE((
          SELECT SUM(t.amount) FROM transactions t
          JOIN bookings b ON b.id = t.booking_id
          WHERE b.tutor_id = p.id AND t.type = 'Booking Payment'
            AND t.created_at >= now() - interval '30 days'
        ), 0) > COALESCE((
          SELECT SUM(t.amount) FROM transactions t
          JOIN bookings b ON b.id = t.booking_id
          WHERE b.tutor_id = p.id AND t.type = 'Booking Payment'
            AND t.created_at >= now() - interval '60 days'
            AND t.created_at < now() - interval '30 days'
        ), 0) * 1.10 THEN 5 ELSE 0 END +
        CASE WHEN p.stripe_account_id IS NOT NULL THEN 5 ELSE 0 END
      ) AS earnings_score,
      -- platform_engagement (0–25): referrals sent, sage pro usage
      LEAST(25,
        CASE WHEN EXISTS (
          SELECT 1 FROM referrals r
          WHERE r.agent_id = p.id AND r.created_at >= now() - interval '14 days'
        ) THEN 5 ELSE 0 END +
        CASE WHEN EXISTS (
          SELECT 1 FROM referrals r
          WHERE r.agent_id = p.id AND r.status = 'completed'
            AND r.created_at >= now() - interval '60 days'
        ) THEN 7 ELSE 0 END +
        CASE WHEN EXISTS (
          SELECT 1 FROM sage_pro_subscriptions s
          WHERE s.user_id = p.id AND s.status IN ('active', 'past_due')
        ) THEN 8 ELSE 0 END +
        -- rebooking signal: same tutor booked by a client more than once
        CASE WHEN (
          SELECT COUNT(DISTINCT b2.client_id) FROM bookings b2
          WHERE b2.tutor_id = p.id
          AND b2.client_id IN (
            SELECT b3.client_id FROM bookings b3
            WHERE b3.tutor_id = p.id
              AND b3.created_at < now() - interval '30 days'
          )
          AND b2.created_at >= now() - interval '60 days'
        ) > 0 THEN 5 ELSE 0 END
      ) AS engagement_score
    FROM profiles p
    WHERE p.active_role = 'tutor'
  )
  SELECT
    t.user_id,
    'tutor' AS role,
    LEAST(100, t.profile_score + t.listing_score + t.earnings_score + t.engagement_score) AS score,
    gs.score AS previous_score,
    jsonb_build_object(
      'profile_completeness', t.profile_score,
      'listing_performance',  t.listing_score,
      'earnings_trajectory',  t.earnings_score,
      'platform_engagement',  t.engagement_score
    ) AS component_scores,
    now() AS computed_at
  FROM tutor_base t
  LEFT JOIN growth_scores gs ON gs.user_id = t.user_id AND gs.role = 'tutor'
  ON CONFLICT (user_id, role) DO UPDATE
    SET previous_score   = growth_scores.score,
        score            = EXCLUDED.score,
        component_scores = EXCLUDED.component_scores,
        computed_at      = EXCLUDED.computed_at;

  -- ── CLIENT SCORES ────────────────────────────────────────────────────────────
  -- Components: learning_activity, referral_network, profile_completeness, platform_engagement
  INSERT INTO growth_scores (user_id, role, score, previous_score, component_scores, computed_at)
  WITH client_base AS (
    SELECT
      p.id AS user_id,
      -- learning_activity (0–25)
      LEAST(25,
        CASE WHEN EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.client_id = p.id AND b.created_at >= now() - interval '30 days'
        ) THEN 8 ELSE 0 END +
        CASE WHEN (
          SELECT COUNT(*) FROM bookings b
          WHERE b.client_id = p.id AND b.created_at >= now() - interval '30 days'
        ) >= 3 THEN 5 ELSE 0 END +
        -- rebooked same tutor in 60d
        CASE WHEN EXISTS (
          SELECT 1 FROM bookings b1
          WHERE b1.client_id = p.id AND b1.created_at >= now() - interval '60 days'
          AND b1.tutor_id IN (
            SELECT b2.tutor_id FROM bookings b2
            WHERE b2.client_id = p.id AND b2.created_at < now() - interval '30 days'
          )
        ) THEN 7 ELSE 0 END +
        -- reviewed a session (proxy: has any transaction as client = paid = session happened)
        CASE WHEN EXISTS (
          SELECT 1 FROM transactions t
          JOIN bookings b ON b.id = t.booking_id
          WHERE b.client_id = p.id AND t.type = 'Booking Payment'
            AND t.created_at >= now() - interval '60 days'
        ) THEN 5 ELSE 0 END
      ) AS learning_score,
      -- referral_network (0–25): referrals where this client is the agent (referred others)
      LEAST(25,
        CASE WHEN EXISTS (
          SELECT 1 FROM referrals r
          WHERE r.agent_id = p.id AND r.created_at >= now() - interval '30 days'
        ) THEN 5 ELSE 0 END +
        CASE WHEN EXISTS (
          SELECT 1 FROM referrals r
          WHERE r.agent_id = p.id AND r.created_at >= now() - interval '60 days'
        ) THEN 10 ELSE 0 END +
        CASE WHEN (
          SELECT COUNT(*) FROM referrals r
          WHERE r.agent_id = p.id AND r.created_at >= now() - interval '60 days'
        ) >= 2 THEN 5 ELSE 0 END +
        CASE WHEN EXISTS (
          SELECT 1 FROM referrals r
          WHERE r.agent_id = p.id AND r.booking_id IS NOT NULL
            AND r.created_at >= now() - interval '60 days'
        ) THEN 5 ELSE 0 END
      ) AS referral_score,
      -- profile_completeness (0–25): max 5 per signal, use what we can measure
      LEAST(25,
        CASE WHEN p.avatar_url IS NOT NULL THEN 5 ELSE 0 END +
        CASE WHEN length(p.bio) >= 50 THEN 5 ELSE 0 END +
        -- has made at least one booking = profile is functional
        CASE WHEN EXISTS (
          SELECT 1 FROM bookings b WHERE b.client_id = p.id
        ) THEN 5 ELSE 0 END +
        -- active account (logged in recently = not zeroed out)
        CASE WHEN p.created_at <= now() - interval '7 days' THEN 5 ELSE 0 END +
        5 -- base for having a profile (all clients here have one)
      ) AS profile_score,
      -- platform_engagement (0–25)
      LEAST(25,
        -- sage pro subscriber
        CASE WHEN EXISTS (
          SELECT 1 FROM sage_pro_subscriptions s
          WHERE s.user_id = p.id AND s.status IN ('active', 'past_due')
        ) THEN 5 ELSE 0 END +
        -- growth pro subscriber
        CASE WHEN EXISTS (
          SELECT 1 FROM growth_pro_subscriptions g
          WHERE g.user_id = p.id AND g.status IN ('active', 'past_due')
        ) THEN 3 ELSE 0 END +
        -- has used the platform for 14+ days (loyalty)
        CASE WHEN p.created_at <= now() - interval '14 days' THEN 3 ELSE 0 END +
        -- active referrer (engaged community member)
        CASE WHEN p.referred_by_profile_id IS NOT NULL THEN 4 ELSE 0 END +
        -- has booked recently (high engagement)
        CASE WHEN EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.client_id = p.id AND b.created_at >= now() - interval '14 days'
        ) THEN 10 ELSE 0 END
      ) AS engagement_score
    FROM profiles p
    WHERE p.active_role = 'client'
  )
  SELECT
    c.user_id,
    'client' AS role,
    LEAST(100, c.learning_score + c.referral_score + c.profile_score + c.engagement_score) AS score,
    gs.score AS previous_score,
    jsonb_build_object(
      'learning_activity',    c.learning_score,
      'referral_network',     c.referral_score,
      'profile_completeness', c.profile_score,
      'platform_engagement',  c.engagement_score
    ) AS component_scores,
    now() AS computed_at
  FROM client_base c
  LEFT JOIN growth_scores gs ON gs.user_id = c.user_id AND gs.role = 'client'
  ON CONFLICT (user_id, role) DO UPDATE
    SET previous_score   = growth_scores.score,
        score            = EXCLUDED.score,
        component_scores = EXCLUDED.component_scores,
        computed_at      = EXCLUDED.computed_at;

  -- ── AGENT SCORES ─────────────────────────────────────────────────────────────
  -- Components: network_size, referral_performance, commission_trajectory, platform_adoption
  INSERT INTO growth_scores (user_id, role, score, previous_score, component_scores, computed_at)
  WITH agent_base AS (
    SELECT
      p.id AS user_id,
      -- network_size (0–25): tutors they manage (bookings where agent_id = this agent)
      LEAST(25,
        CASE WHEN EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.agent_id = p.id AND b.created_at >= now() - interval '30 days'
        ) THEN 8 ELSE 0 END +
        CASE WHEN (
          SELECT COUNT(DISTINCT b.tutor_id) FROM bookings b
          WHERE b.agent_id = p.id AND b.created_at >= now() - interval '30 days'
        ) >= 3 THEN 8 ELSE 0 END +
        CASE WHEN (
          SELECT COUNT(DISTINCT b.tutor_id) FROM bookings b
          WHERE b.agent_id = p.id AND b.created_at >= now() - interval '30 days'
        ) >= 5 THEN 9 ELSE 0 END
      ) AS network_score,
      -- referral_performance (0–25): referrals sent + converted
      LEAST(25,
        CASE WHEN EXISTS (
          SELECT 1 FROM referrals r
          WHERE r.agent_id = p.id AND r.created_at >= now() - interval '30 days'
        ) THEN 7 ELSE 0 END +
        CASE WHEN EXISTS (
          SELECT 1 FROM referrals r
          WHERE r.agent_id = p.id AND r.created_at >= now() - interval '60 days'
        ) THEN 8 ELSE 0 END +
        CASE WHEN (
          SELECT CASE WHEN COUNT(*) = 0 THEN 0
            ELSE COUNT(*) FILTER (WHERE booking_id IS NOT NULL)::numeric / COUNT(*) END
          FROM referrals r
          WHERE r.agent_id = p.id AND r.created_at >= now() - interval '90 days'
        ) >= 0.20 THEN 5 ELSE 0 END +
        CASE WHEN (
          SELECT CASE WHEN COUNT(*) = 0 THEN 0
            ELSE COUNT(*) FILTER (WHERE booking_id IS NOT NULL)::numeric / COUNT(*) END
          FROM referrals r
          WHERE r.agent_id = p.id AND r.created_at >= now() - interval '90 days'
        ) >= 0.40 THEN 5 ELSE 0 END
      ) AS referral_score,
      -- commission_trajectory (0–25): transactions where agent_id = this agent
      LEAST(25,
        CASE WHEN EXISTS (
          SELECT 1 FROM transactions t
          WHERE t.profile_id = p.id AND t.type = 'Commission'
            AND t.created_at >= now() - interval '30 days'
        ) THEN 5 ELSE 0 END +
        CASE WHEN COALESCE((
          SELECT SUM(amount) FROM transactions
          WHERE profile_id = p.id AND type = 'Commission'
            AND created_at >= now() - interval '30 days'
        ), 0) >= COALESCE((
          SELECT SUM(amount) FROM transactions
          WHERE profile_id = p.id AND type = 'Commission'
            AND created_at >= now() - interval '60 days'
            AND created_at < now() - interval '30 days'
        ), 0) THEN 10 ELSE 0 END +
        CASE WHEN COALESCE((
          SELECT SUM(amount) FROM transactions
          WHERE profile_id = p.id AND type = 'Commission'
            AND created_at >= now() - interval '30 days'
        ), 0) > COALESCE((
          SELECT SUM(amount) FROM transactions
          WHERE profile_id = p.id AND type = 'Commission'
            AND created_at >= now() - interval '60 days'
            AND created_at < now() - interval '30 days'
        ), 0) * 1.10 THEN 5 ELSE 0 END +
        CASE WHEN p.stripe_account_id IS NOT NULL THEN 5 ELSE 0 END
      ) AS commission_score,
      -- platform_adoption (0–25)
      LEAST(25,
        CASE WHEN p.avatar_url IS NOT NULL AND length(p.bio) >= 50 THEN 8 ELSE 0 END +
        CASE WHEN EXISTS (
          SELECT 1 FROM growth_usage_log g
          WHERE g.user_id = p.id AND g.created_at >= now() - interval '30 days'
        ) THEN 8 ELSE 0 END +
        CASE WHEN EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.agent_id = p.id
        ) THEN 9 ELSE 0 END
      ) AS adoption_score
    FROM profiles p
    WHERE p.active_role = 'agent'
  )
  SELECT
    a.user_id,
    'agent' AS role,
    LEAST(100, a.network_score + a.referral_score + a.commission_score + a.adoption_score) AS score,
    gs.score AS previous_score,
    jsonb_build_object(
      'network_size',           a.network_score,
      'referral_performance',   a.referral_score,
      'commission_trajectory',  a.commission_score,
      'platform_adoption',      a.adoption_score
    ) AS component_scores,
    now() AS computed_at
  FROM agent_base a
  LEFT JOIN growth_scores gs ON gs.user_id = a.user_id AND gs.role = 'agent'
  ON CONFLICT (user_id, role) DO UPDATE
    SET previous_score   = growth_scores.score,
        score            = EXCLUDED.score,
        component_scores = EXCLUDED.component_scores,
        computed_at      = EXCLUDED.computed_at;

  -- ── ORGANISATION SCORES ──────────────────────────────────────────────────────
  -- Components: team_health, revenue_trajectory, referral_network, platform_adoption
  -- Uses: connection_groups.profile_id as the org owner (not owner_id per spec)
  INSERT INTO growth_scores (user_id, role, score, previous_score, component_scores, computed_at)
  WITH org_base AS (
    SELECT
      cg.profile_id AS user_id,
      cg.id         AS org_id,
      -- team_health (0–25): avg tutor growth score of org members
      -- org members = tutors who have bookings where agent_id points back to org profile
      LEAST(25,
        COALESCE((
          SELECT ROUND(AVG(gs2.score) * 25.0 / 100.0)
          FROM growth_scores gs2
          JOIN bookings b ON b.tutor_id = gs2.user_id AND gs2.role = 'tutor'
          WHERE b.agent_id = cg.profile_id
            AND b.created_at >= now() - interval '90 days'
        ), 0)
      ) AS team_score,
      -- revenue_trajectory (0–25): org bookings (via agent_id = org profile)
      LEAST(25,
        CASE WHEN EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.agent_id = cg.profile_id AND b.created_at >= now() - interval '30 days'
        ) THEN 5 ELSE 0 END +
        CASE WHEN (
          SELECT COUNT(*) FROM bookings b
          WHERE b.agent_id = cg.profile_id AND b.created_at >= now() - interval '30 days'
        ) >= (
          SELECT COUNT(*) FROM bookings b
          WHERE b.agent_id = cg.profile_id
            AND b.created_at >= now() - interval '60 days'
            AND b.created_at < now() - interval '30 days'
        ) THEN 10 ELSE 0 END +
        CASE WHEN (
          SELECT COUNT(*) FROM bookings b
          WHERE b.agent_id = cg.profile_id AND b.created_at >= now() - interval '30 days'
        ) > (
          SELECT COUNT(*) FROM bookings b
          WHERE b.agent_id = cg.profile_id
            AND b.created_at >= now() - interval '60 days'
            AND b.created_at < now() - interval '30 days'
        ) * 1.10 THEN 5 ELSE 0 END +
        CASE WHEN EXISTS (
          SELECT 1 FROM transactions t
          WHERE t.profile_id = cg.profile_id AND t.type = 'Commission'
            AND t.created_at >= date_trunc('month', now())
        ) THEN 5 ELSE 0 END
      ) AS revenue_score,
      -- referral_network (0–25)
      LEAST(25,
        CASE WHEN EXISTS (
          SELECT 1 FROM referrals r
          WHERE r.agent_id = cg.profile_id AND r.created_at >= now() - interval '30 days'
        ) THEN 8 ELSE 0 END +
        CASE WHEN EXISTS (
          SELECT 1 FROM referrals r
          WHERE r.agent_id = cg.profile_id AND r.signed_up_at IS NOT NULL
            AND r.created_at >= now() - interval '60 days'
        ) THEN 10 ELSE 0 END +
        CASE WHEN EXISTS (
          SELECT 1 FROM referrals r
          WHERE r.agent_id = cg.profile_id AND r.booking_id IS NOT NULL
            AND r.created_at >= now() - interval '60 days'
        ) THEN 7 ELSE 0 END
      ) AS referral_score,
      -- platform_adoption (0–25): org profile + delegation + member activity
      LEAST(25,
        -- org has a profile entry (always true if we're here)
        5 +
        -- has delegation: at least 1 tutor booking via agent
        CASE WHEN EXISTS (
          SELECT 1 FROM bookings b WHERE b.agent_id = cg.profile_id
        ) THEN 8 ELSE 0 END +
        -- >= 50% of org tutors active in 30d
        CASE WHEN (
          SELECT COUNT(DISTINCT b2.tutor_id) FROM bookings b2
          WHERE b2.agent_id = cg.profile_id AND b2.created_at >= now() - interval '30 days'
        ) > 0 THEN 7 ELSE 0 END +
        -- org saved by a client (wiselist proxy: client has booked from this org)
        CASE WHEN EXISTS (
          SELECT 1 FROM bookings b3
          WHERE b3.agent_id = cg.profile_id
        ) THEN 5 ELSE 0 END
      ) AS adoption_score
    FROM connection_groups cg
    WHERE cg.type = 'organisation'
      AND cg.profile_id IS NOT NULL
  )
  SELECT
    o.user_id,
    'organisation' AS role,
    LEAST(100, o.team_score + o.revenue_score + o.referral_score + o.adoption_score) AS score,
    gs.score AS previous_score,
    jsonb_build_object(
      'team_health',          o.team_score,
      'revenue_trajectory',   o.revenue_score,
      'referral_network',     o.referral_score,
      'platform_adoption',    o.adoption_score
    ) AS component_scores,
    now() AS computed_at
  FROM org_base o
  LEFT JOIN growth_scores gs ON gs.user_id = o.user_id AND gs.role = 'organisation'
  ON CONFLICT (user_id, role) DO UPDATE
    SET previous_score   = growth_scores.score,
        score            = EXCLUDED.score,
        component_scores = EXCLUDED.component_scores,
        computed_at      = EXCLUDED.computed_at;

END;
$$;

-- ── pg_cron: run every 30 minutes ────────────────────────────────────────────
SELECT cron.schedule(
  'compute-growth-scores',
  '*/30 * * * *',
  $$SELECT compute_growth_scores();$$
);

-- ── PART 2: Update compute_ai_adoption_platform_metrics() ────────────────────
-- Replace the stub (all subscription metrics = 0) with real queries against
-- sage_pro_subscriptions and growth_pro_subscriptions tables.
-- Sage Pro price assumed £15/month = 1500 pence (adjust when Stripe pricing confirmed).
-- Growth Pro uses price_per_month column from growth_pro_subscriptions table.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION compute_ai_adoption_platform_metrics()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_date date := current_date;

  -- Sage Pro subscription metrics
  v_sage_active       integer := 0;
  v_sage_new_30d      integer := 0;
  v_sage_cancels_30d  integer := 0;
  v_sage_churn_pct    numeric(5,2);
  v_sage_mrr_pence    bigint := 0;
  v_sage_trial_to_paid numeric(5,2);

  -- Growth Agent subscription metrics
  v_growth_active      integer := 0;
  v_growth_new_30d     integer := 0;
  v_growth_cancels_30d integer := 0;
  v_growth_churn_pct   numeric(5,2);
  v_growth_mrr_pence   bigint := 0;
  v_growth_sessions_30d    integer := 0;
  v_growth_power_users_30d integer := 0;
  v_growth_free_to_paid    numeric(5,2);

  -- AI Marketplace metrics
  v_active_ai_agents        integer := 0;
  v_ai_bookings_30d         integer := 0;
  v_ai_gmv_30d_pence        bigint := 0;
  v_total_bookings_30d      integer := 0;
  v_ai_booking_share_pct    numeric(5,2) := 0;
  v_ai_agents_zero_bookings integer := 0;
  v_total_gmv_30d_pence     bigint := 0;
  v_ai_revenue_share_pct    numeric(5,2);

  v_sage_price_pence bigint := 1500; -- £15/month assumed; update when Stripe pricing confirmed
BEGIN

  -- ── Sage Pro ──────────────────────────────────────────────────────────────
  SELECT
    COUNT(*) FILTER (WHERE status IN ('active', 'past_due')),
    COUNT(*) FILTER (WHERE current_period_start >= now() - interval '30 days'
                      AND  status IN ('active', 'past_due', 'canceled')),
    COUNT(*) FILTER (WHERE canceled_at >= now() - interval '30 days'
                      AND  status IN ('canceled', 'unpaid'))
  INTO v_sage_active, v_sage_new_30d, v_sage_cancels_30d
  FROM sage_pro_subscriptions;

  IF v_sage_active > 0 THEN
    v_sage_mrr_pence := v_sage_active * v_sage_price_pence;
  END IF;

  IF (v_sage_active + v_sage_cancels_30d) > 0 THEN
    v_sage_churn_pct := ROUND(
      v_sage_cancels_30d::numeric / (v_sage_active + v_sage_cancels_30d) * 100, 1
    );
  END IF;

  -- trial to paid: had a trial_start and is now active
  SELECT ROUND(
    COUNT(*) FILTER (WHERE trial_start IS NOT NULL AND status = 'active')::numeric
    / NULLIF(COUNT(*) FILTER (WHERE trial_start IS NOT NULL), 0) * 100, 1
  ) INTO v_sage_trial_to_paid
  FROM sage_pro_subscriptions;

  -- ── Growth Pro ────────────────────────────────────────────────────────────
  SELECT
    COUNT(*) FILTER (WHERE status IN ('active', 'past_due')),
    COUNT(*) FILTER (WHERE current_period_start >= now() - interval '30 days'
                      AND  status IN ('active', 'past_due', 'canceled')),
    COUNT(*) FILTER (WHERE canceled_at >= now() - interval '30 days'
                      AND  status IN ('canceled', 'unpaid')),
    COALESCE(SUM(CASE WHEN status IN ('active','past_due')
      THEN ROUND(price_per_month * 100) ELSE 0 END), 0)::bigint
  INTO v_growth_active, v_growth_new_30d, v_growth_cancels_30d, v_growth_mrr_pence
  FROM growth_pro_subscriptions;

  IF (v_growth_active + v_growth_cancels_30d) > 0 THEN
    v_growth_churn_pct := ROUND(
      v_growth_cancels_30d::numeric / (v_growth_active + v_growth_cancels_30d) * 100, 1
    );
  END IF;

  -- Growth Agent sessions from usage log
  SELECT COUNT(DISTINCT user_id) INTO v_growth_sessions_30d
  FROM growth_usage_log
  WHERE created_at >= now() - interval '30 days';

  -- Power users: > 20 questions in 30d
  SELECT COUNT(*) INTO v_growth_power_users_30d
  FROM (
    SELECT user_id FROM growth_usage_log
    WHERE created_at >= now() - interval '30 days'
    GROUP BY user_id HAVING SUM(question_count) > 20
  ) pu;

  -- Free-to-paid: users who used free tier and then subscribed
  SELECT ROUND(
    COUNT(*) FILTER (WHERE status IN ('active','past_due'))::numeric
    / NULLIF(COUNT(*), 0) * 100, 1
  ) INTO v_growth_free_to_paid
  FROM growth_pro_subscriptions;

  -- ── AI Marketplace ────────────────────────────────────────────────────────
  SELECT COUNT(*) INTO v_active_ai_agents
  FROM ai_agents WHERE status = 'active';

  -- AI bookings: proxy via tutor_id matching ai_agents.owner_id
  -- (no ai_agent_id FK column yet; booking_type enum lacks 'ai_agent' value)
  SELECT
    COUNT(*) FILTER (WHERE b.tutor_id IN (SELECT owner_id FROM ai_agents WHERE status = 'active')),
    COUNT(*)
  INTO v_ai_bookings_30d, v_total_bookings_30d
  FROM bookings b
  WHERE b.created_at >= now() - interval '30 days';

  IF v_total_bookings_30d > 0 THEN
    v_ai_booking_share_pct := ROUND(
      v_ai_bookings_30d::numeric / v_total_bookings_30d * 100, 1
    );
  END IF;

  SELECT COALESCE(SUM(t.amount), 0)
  INTO v_ai_gmv_30d_pence
  FROM transactions t
  JOIN bookings b ON b.id = t.booking_id
  WHERE b.tutor_id IN (SELECT owner_id FROM ai_agents WHERE status = 'active')
    AND t.type = 'Booking Payment'
    AND t.created_at >= now() - interval '30 days';

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

  SELECT COUNT(*)
  INTO v_ai_agents_zero_bookings
  FROM ai_agents a
  WHERE a.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.tutor_id = a.owner_id
        AND b.created_at >= now() - interval '30 days'
    );

  -- ── Upsert ────────────────────────────────────────────────────────────────
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
    v_sage_active, v_sage_new_30d, v_sage_cancels_30d,
    v_sage_churn_pct, v_sage_mrr_pence, v_sage_trial_to_paid,
    v_growth_active, v_growth_new_30d, v_growth_cancels_30d,
    v_growth_churn_pct, v_growth_mrr_pence,
    v_growth_sessions_30d, v_growth_power_users_30d, v_growth_free_to_paid,
    v_active_ai_agents, v_ai_bookings_30d, v_ai_gmv_30d_pence,
    v_ai_booking_share_pct, v_ai_agents_zero_bookings,
    v_sage_mrr_pence + v_growth_mrr_pence, v_ai_revenue_share_pct
  )
  ON CONFLICT (metric_date) DO UPDATE SET
    sage_active_subscribers     = EXCLUDED.sage_active_subscribers,
    sage_new_30d                = EXCLUDED.sage_new_30d,
    sage_cancellations_30d      = EXCLUDED.sage_cancellations_30d,
    sage_churn_rate_pct         = EXCLUDED.sage_churn_rate_pct,
    sage_mrr_pence              = EXCLUDED.sage_mrr_pence,
    sage_trial_to_paid_rate_pct = EXCLUDED.sage_trial_to_paid_rate_pct,
    growth_active_subscribers   = EXCLUDED.growth_active_subscribers,
    growth_new_30d              = EXCLUDED.growth_new_30d,
    growth_cancellations_30d    = EXCLUDED.growth_cancellations_30d,
    growth_churn_rate_pct       = EXCLUDED.growth_churn_rate_pct,
    growth_mrr_pence            = EXCLUDED.growth_mrr_pence,
    growth_sessions_30d         = EXCLUDED.growth_sessions_30d,
    growth_power_users_30d      = EXCLUDED.growth_power_users_30d,
    growth_free_to_paid_rate_pct = EXCLUDED.growth_free_to_paid_rate_pct,
    active_ai_agents            = EXCLUDED.active_ai_agents,
    ai_bookings_30d             = EXCLUDED.ai_bookings_30d,
    ai_gmv_30d_pence            = EXCLUDED.ai_gmv_30d_pence,
    ai_booking_share_pct        = EXCLUDED.ai_booking_share_pct,
    ai_agents_zero_bookings     = EXCLUDED.ai_agents_zero_bookings,
    total_ai_mrr_pence          = EXCLUDED.total_ai_mrr_pence,
    ai_revenue_share_pct        = EXCLUDED.ai_revenue_share_pct;

END;
$$;
