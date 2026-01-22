/**
 * Migration 209: Add Organisation Statistics Aggregation Function
 *
 * Purpose:
 * - Create function to aggregate organisation stats into organisation_statistics_daily
 * - Schedule nightly cron job to run aggregation at 1:30am UTC
 * - Add public RPC wrapper for safe public access
 *
 * Phase: Public Pages Alignment - Phase 2
 * Created: 2026-01-22
 * Pattern: Follows migration 207 (user statistics aggregation) for consistency
 *
 * Related Migrations:
 * - Migration 208: organisation_statistics_daily table
 * - Migration 207: aggregate_user_statistics() (similar pattern)
 * - Migration 154: get_organisation_public_stats() RPC (on-demand, to be phased out)
 */

-- ================================================================
-- AGGREGATION FUNCTION
-- ================================================================

CREATE OR REPLACE FUNCTION aggregate_organisation_statistics(
  p_organisation_id UUID DEFAULT NULL,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id UUID;
  v_org_record RECORD;
  v_stats RECORD;
BEGIN
  -- If organisation_id specified, aggregate for that organisation only
  -- Otherwise, aggregate for all public organisations
  FOR v_org_record IN
    SELECT id, established_date, caas_score, business_verified,
           safeguarding_certified, professional_insurance
    FROM connection_groups
    WHERE type = 'organisation'
      AND public_visible = true
      AND (p_organisation_id IS NULL OR id = p_organisation_id)
  LOOP
    v_org_id := v_org_record.id;

    -- Aggregate statistics from team members and their bookings
    SELECT
      -- Team metrics
      COUNT(DISTINCT ngm.profile_id) as total_tutors,
      COUNT(DISTINCT ngm.profile_id) FILTER (
        WHERE EXISTS (
          SELECT 1 FROM bookings b2
          WHERE b2.tutor_id = ngm.profile_id
            AND b2.status = 'Completed'
            AND b2.session_start_time >= p_date - INTERVAL '30 days'
        )
      ) as active_tutors,
      COUNT(DISTINCT ngm.profile_id) FILTER (WHERE p.dbs_verified = true) as dbs_verified_tutors,
      COUNT(DISTINCT ngm.profile_id) FILTER (WHERE p.identity_verified = true) as identity_verified_tutors,

      -- Session metrics (lifetime)
      COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'Completed') as total_sessions,
      COUNT(DISTINCT b.id) FILTER (
        WHERE b.status = 'Completed'
          AND b.session_start_time >= DATE_TRUNC('month', p_date)
          AND b.session_start_time < DATE_TRUNC('month', p_date) + INTERVAL '1 month'
      ) as monthly_sessions,
      COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'Completed') as completed_sessions,
      COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'Cancelled') as cancelled_sessions,
      COALESCE(SUM(b.duration_minutes) FILTER (WHERE b.status = 'Completed'), 0) / 60.0 as hours_taught,

      -- Client metrics
      COUNT(DISTINCT b.client_id) FILTER (WHERE b.status IN ('Completed', 'Confirmed')) as total_clients,
      COUNT(DISTINCT b.client_id) FILTER (
        WHERE b.status IN ('Completed', 'Confirmed')
          AND b.session_start_time >= p_date - INTERVAL '30 days'
      ) as active_clients,
      COUNT(DISTINCT b.client_id) FILTER (
        WHERE b.status IN ('Completed', 'Confirmed')
          AND b.created_at >= DATE_TRUNC('month', p_date)
          AND b.created_at < DATE_TRUNC('month', p_date) + INTERVAL '1 month'
      ) as new_clients,
      COUNT(DISTINCT b.client_id) FILTER (
        WHERE b.status = 'Completed'
          AND b.client_id IN (
            SELECT b2.client_id FROM bookings b2
            WHERE b2.tutor_id = b.tutor_id
              AND b2.status = 'Completed'
              AND b2.id != b.id
          )
      ) as returning_clients,

      -- Rating metrics
      ROUND(AVG(pr.rating), 2) as average_rating,
      COUNT(DISTINCT pr.id) as total_reviews,
      COUNT(DISTINCT pr.id) FILTER (WHERE pr.rating = 5) as five_star_reviews,
      COUNT(DISTINCT pr.id) FILTER (WHERE pr.rating = 4) as four_star_reviews,
      COUNT(DISTINCT pr.id) FILTER (WHERE pr.rating = 3) as three_star_reviews,

      -- Financial metrics
      COALESCE(SUM(t.amount) FILTER (
        WHERE t.type = 'Tutoring Payout'
          AND t.status = 'Completed'
      ), 0) as total_earnings,
      COALESCE(SUM(t.amount) FILTER (
        WHERE t.type = 'Tutoring Payout'
          AND t.status = 'Completed'
          AND t.created_at >= DATE_TRUNC('month', p_date)
          AND t.created_at < DATE_TRUNC('month', p_date) + INTERVAL '1 month'
      ), 0) as monthly_earnings,

      -- Service offerings
      ARRAY_AGG(DISTINCT l.subjects[1]) FILTER (
        WHERE l.subjects IS NOT NULL
          AND array_length(l.subjects, 1) > 0
          AND l.status = 'published'
      ) as unique_subjects,
      COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'published') as active_listings

    INTO v_stats
    FROM connection_groups cg
    LEFT JOIN network_group_members ngm ON cg.id = ngm.group_id
    LEFT JOIN profiles p ON ngm.profile_id = p.id
    LEFT JOIN bookings b ON p.id = b.tutor_id
    LEFT JOIN profile_reviews pr ON b.id = pr.booking_id
    LEFT JOIN transactions t ON p.id = t.user_id
    LEFT JOIN listings l ON p.id = l.profile_id
    WHERE cg.id = v_org_id;

    -- Get profile views from materialized view
    DECLARE
      v_profile_views BIGINT := 0;
      v_daily_views BIGINT := 0;
    BEGIN
      SELECT COALESCE(total_views, 0)
      INTO v_profile_views
      FROM organisation_view_counts
      WHERE organisation_id = v_org_id;

      SELECT COUNT(*)
      INTO v_daily_views
      FROM organisation_views
      WHERE organisation_id = v_org_id
        AND DATE(viewed_at) = p_date;
    EXCEPTION WHEN OTHERS THEN
      -- If view tracking not available, default to 0
      v_profile_views := 0;
      v_daily_views := 0;
    END;

    -- Extract unique education levels from professional_details
    DECLARE
      v_unique_levels TEXT[];
    BEGIN
      SELECT ARRAY_AGG(DISTINCT lvl)
      INTO v_unique_levels
      FROM network_group_members ngm
      JOIN profiles p ON ngm.profile_id = p.id,
      LATERAL unnest(
        COALESCE(
          (p.professional_details->>'levels')::TEXT[],
          '{}'::TEXT[]
        )
      ) AS lvl
      WHERE ngm.group_id = v_org_id;
    EXCEPTION WHEN OTHERS THEN
      v_unique_levels := '{}';
    END;

    -- Upsert into organisation_statistics_daily
    INSERT INTO organisation_statistics_daily (
      organisation_id,
      date,
      total_tutors,
      active_tutors,
      dbs_verified_tutors,
      identity_verified_tutors,
      total_sessions,
      monthly_sessions,
      completed_sessions,
      cancelled_sessions,
      hours_taught,
      total_clients,
      active_clients,
      new_clients,
      returning_clients,
      average_rating,
      total_reviews,
      five_star_reviews,
      four_star_reviews,
      three_star_reviews,
      profile_views,
      daily_profile_views,
      unique_subjects,
      unique_levels,
      active_listings,
      total_earnings,
      monthly_earnings,
      caas_score,
      business_verified,
      safeguarding_certified,
      professional_insurance
    )
    VALUES (
      v_org_id,
      p_date,
      COALESCE(v_stats.total_tutors, 0),
      COALESCE(v_stats.active_tutors, 0),
      COALESCE(v_stats.dbs_verified_tutors, 0),
      COALESCE(v_stats.identity_verified_tutors, 0),
      COALESCE(v_stats.total_sessions, 0),
      COALESCE(v_stats.monthly_sessions, 0),
      COALESCE(v_stats.completed_sessions, 0),
      COALESCE(v_stats.cancelled_sessions, 0),
      COALESCE(v_stats.hours_taught, 0),
      COALESCE(v_stats.total_clients, 0),
      COALESCE(v_stats.active_clients, 0),
      COALESCE(v_stats.new_clients, 0),
      COALESCE(v_stats.returning_clients, 0),
      COALESCE(v_stats.average_rating, 0),
      COALESCE(v_stats.total_reviews, 0),
      COALESCE(v_stats.five_star_reviews, 0),
      COALESCE(v_stats.four_star_reviews, 0),
      COALESCE(v_stats.three_star_reviews, 0),
      v_profile_views,
      v_daily_views,
      COALESCE(v_stats.unique_subjects, '{}'),
      COALESCE(v_unique_levels, '{}'),
      COALESCE(v_stats.active_listings, 0),
      COALESCE(v_stats.total_earnings, 0),
      COALESCE(v_stats.monthly_earnings, 0),
      COALESCE(v_org_record.caas_score, 0),
      COALESCE(v_org_record.business_verified, false),
      COALESCE(v_org_record.safeguarding_certified, false),
      COALESCE(v_org_record.professional_insurance, false)
    )
    ON CONFLICT (organisation_id, date)
    DO UPDATE SET
      total_tutors = EXCLUDED.total_tutors,
      active_tutors = EXCLUDED.active_tutors,
      dbs_verified_tutors = EXCLUDED.dbs_verified_tutors,
      identity_verified_tutors = EXCLUDED.identity_verified_tutors,
      total_sessions = EXCLUDED.total_sessions,
      monthly_sessions = EXCLUDED.monthly_sessions,
      completed_sessions = EXCLUDED.completed_sessions,
      cancelled_sessions = EXCLUDED.cancelled_sessions,
      hours_taught = EXCLUDED.hours_taught,
      total_clients = EXCLUDED.total_clients,
      active_clients = EXCLUDED.active_clients,
      new_clients = EXCLUDED.new_clients,
      returning_clients = EXCLUDED.returning_clients,
      average_rating = EXCLUDED.average_rating,
      total_reviews = EXCLUDED.total_reviews,
      five_star_reviews = EXCLUDED.five_star_reviews,
      four_star_reviews = EXCLUDED.four_star_reviews,
      three_star_reviews = EXCLUDED.three_star_reviews,
      profile_views = EXCLUDED.profile_views,
      daily_profile_views = EXCLUDED.daily_profile_views,
      unique_subjects = EXCLUDED.unique_subjects,
      unique_levels = EXCLUDED.unique_levels,
      active_listings = EXCLUDED.active_listings,
      total_earnings = EXCLUDED.total_earnings,
      monthly_earnings = EXCLUDED.monthly_earnings,
      caas_score = EXCLUDED.caas_score,
      business_verified = EXCLUDED.business_verified,
      safeguarding_certified = EXCLUDED.safeguarding_certified,
      professional_insurance = EXCLUDED.professional_insurance,
      updated_at = NOW();

  END LOOP;

  RAISE NOTICE 'Organisation statistics aggregation completed for date: %', p_date;
END;
$$;

-- ================================================================
-- PUBLIC RPC WRAPPER (replaces get_organisation_public_stats)
-- ================================================================

CREATE OR REPLACE FUNCTION get_organisation_stats_for_date(
  p_org_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_sessions BIGINT,
  total_reviews BIGINT,
  avg_rating NUMERIC,
  total_tutors BIGINT,
  profile_views BIGINT,
  unique_subjects TEXT[],
  unique_levels TEXT[],
  dbs_verified_tutors BIGINT,
  established_date DATE,
  total_clients BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    osd.total_sessions::BIGINT,
    osd.total_reviews::BIGINT,
    osd.average_rating,
    osd.total_tutors::BIGINT,
    osd.profile_views::BIGINT,
    osd.unique_subjects,
    osd.unique_levels,
    osd.dbs_verified_tutors::BIGINT,
    cg.established_date,
    osd.total_clients::BIGINT
  FROM organisation_statistics_daily osd
  JOIN connection_groups cg ON osd.organisation_id = cg.id
  WHERE osd.organisation_id = p_org_id
    AND osd.date = p_date
    AND cg.type = 'organisation'
    AND cg.public_visible = true
  LIMIT 1;
END;
$$;

-- ================================================================
-- PUBLIC PROFILE STATS RPC (exposes user_statistics_daily safely)
-- ================================================================

CREATE OR REPLACE FUNCTION get_public_profile_stats(
  p_user_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_sessions INTEGER,
  average_rating NUMERIC,
  total_reviews INTEGER,
  profile_views INTEGER,
  total_students INTEGER,
  hours_taught NUMERIC,
  hours_learned NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    usd.total_sessions,
    usd.average_rating,
    usd.total_reviews,
    usd.profile_views,
    usd.total_students,
    usd.hours_taught,
    usd.hours_learned
  FROM user_statistics_daily usd
  WHERE usd.user_id = p_user_id
    AND usd.date = p_date
  LIMIT 1;
END;
$$;

-- ================================================================
-- SCHEDULE NIGHTLY CRON JOB (runs at 1:30am UTC)
-- ================================================================

-- Note: This requires pg_cron extension (already enabled in migration 207)
SELECT cron.schedule(
  'aggregate-organisation-statistics-nightly',
  '30 1 * * *', -- 1:30am UTC (after user stats at 1:00am)
  $$SELECT aggregate_organisation_statistics(NULL, CURRENT_DATE);$$
);

-- ================================================================
-- COMMENTS FOR DOCUMENTATION
-- ================================================================

COMMENT ON FUNCTION aggregate_organisation_statistics(UUID, DATE) IS
  'Aggregates organisation statistics from team members bookings, reviews, and profile data. Runs nightly via cron at 1:30am UTC. Can be called manually for specific organisation or date.';

COMMENT ON FUNCTION get_organisation_stats_for_date(UUID, DATE) IS
  'Public RPC function to retrieve pre-aggregated organisation statistics for a given date. Replaces get_organisation_public_stats() for better performance.';

COMMENT ON FUNCTION get_public_profile_stats(UUID, DATE) IS
  'Public RPC function to safely expose user_statistics_daily data for public profile pages. Returns only public-safe metrics.';
