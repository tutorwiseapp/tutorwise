/**
 * Migration 207: Add User Statistics Daily Aggregation
 *
 * Purpose:
 * - Create function to aggregate user_statistics_daily for all users
 * - Schedule nightly cron job at 1am UTC (after platform stats at midnight)
 * - Support backfill for historical data
 *
 * Phase: Dashboard Alignment Phase 1.3
 * Created: 2026-01-22
 * Pattern: Follows migration 140 (platform statistics aggregation)
 */

-- ================================================================
-- 1. USER STATISTICS AGGREGATION FUNCTION
-- ================================================================

CREATE OR REPLACE FUNCTION aggregate_user_statistics(
  target_user_id UUID DEFAULT NULL,
  target_date DATE DEFAULT CURRENT_DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_user_count INTEGER := 0;
BEGIN
  -- If target_user_id is provided, process only that user
  -- Otherwise, process all users with roles
  IF target_user_id IS NOT NULL THEN
    -- Process single user
    PERFORM aggregate_single_user_statistics(target_user_id, target_date);
    v_user_count := 1;
  ELSE
    -- Process all users with roles
    FOR v_user IN
      SELECT id FROM profiles
      WHERE roles IS NOT NULL AND array_length(roles, 1) > 0
    LOOP
      PERFORM aggregate_single_user_statistics(v_user.id, target_date);
      v_user_count := v_user_count + 1;
    END LOOP;
  END IF;

  RAISE NOTICE 'Aggregated statistics for % users on %', v_user_count, target_date;
END;
$$;

COMMENT ON FUNCTION aggregate_user_statistics IS 'Aggregates user statistics for all users (or specific user) for a given date. Called by nightly cron job.';

-- ================================================================
-- 2. SINGLE USER AGGREGATION HELPER FUNCTION
-- ================================================================

CREATE OR REPLACE FUNCTION aggregate_single_user_statistics(
  target_user_id UUID,
  target_date DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile RECORD;
  v_roles TEXT[];
  v_is_tutor BOOLEAN;
  v_is_client BOOLEAN;

  -- Earnings metrics (tutors)
  v_total_earnings NUMERIC(10,2) := 0;
  v_monthly_earnings NUMERIC(10,2) := 0;
  v_pending_earnings NUMERIC(10,2) := 0;

  -- Spending metrics (clients)
  v_total_spending NUMERIC(10,2) := 0;
  v_monthly_spending NUMERIC(10,2) := 0;

  -- Booking metrics
  v_total_sessions INTEGER := 0;
  v_monthly_sessions INTEGER := 0;
  v_upcoming_sessions INTEGER := 0;
  v_cancelled_sessions INTEGER := 0;
  v_hours_taught NUMERIC(10,2) := 0;
  v_hours_learned NUMERIC(10,2) := 0;

  -- Student/Client metrics
  v_total_students INTEGER := 0;
  v_active_students INTEGER := 0;
  v_new_students INTEGER := 0;
  v_returning_students INTEGER := 0;

  -- Rating metrics
  v_average_rating NUMERIC(3,2) := 0;
  v_total_reviews INTEGER := 0;
  v_five_star_reviews INTEGER := 0;

  -- Listing metrics
  v_active_listings INTEGER := 0;
  v_total_listings INTEGER := 0;
  v_listing_views INTEGER := 0;
  v_listing_bookings INTEGER := 0;

  -- Message metrics
  v_unread_messages INTEGER := 0;
  v_total_conversations INTEGER := 0;

  -- Referral metrics
  v_referrals_made INTEGER := 0;
  v_referrals_converted INTEGER := 0;
  v_referral_earnings NUMERIC(10,2) := 0;

  -- CaaS metrics
  v_caas_score INTEGER := 0;
  v_profile_completeness INTEGER := 0;
BEGIN
  -- Get user profile and roles
  SELECT * INTO v_profile FROM profiles WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE NOTICE 'User % not found, skipping', target_user_id;
    RETURN;
  END IF;

  -- Extract roles as text array (roles is already text[], no conversion needed)
  v_roles := v_profile.roles;
  v_is_tutor := 'tutor' = ANY(v_roles);
  v_is_client := 'client' = ANY(v_roles);

  -- ============================================================
  -- EARNINGS METRICS (Tutors only)
  -- ============================================================
  IF v_is_tutor THEN
    -- Total earnings (all tutoring payouts)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_earnings
    FROM transactions
    WHERE profile_id = target_user_id
      AND type = 'Tutoring Payout'
      AND status = 'Paid';

    -- Monthly earnings (current month payouts)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_monthly_earnings
    FROM transactions
    WHERE profile_id = target_user_id
      AND type = 'Tutoring Payout'
      AND status = 'Paid'
      AND session_date >= DATE_TRUNC('month', target_date)
      AND session_date < DATE_TRUNC('month', target_date) + INTERVAL '1 month';

    -- Pending earnings (completed bookings not yet paid out)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_pending_earnings
    FROM transactions
    WHERE profile_id = target_user_id
      AND type = 'Tutoring Payout'
      AND status = 'Pending';
  END IF;

  -- ============================================================
  -- SPENDING METRICS (Clients only)
  -- ============================================================
  IF v_is_client THEN
    -- Total spending (all completed bookings as client)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_spending
    FROM bookings
    WHERE client_id = target_user_id
      AND status = 'Completed'
      AND payment_status = 'Paid';

    -- Monthly spending (current month)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_monthly_spending
    FROM bookings
    WHERE client_id = target_user_id
      AND status = 'Completed'
      AND payment_status = 'Paid'
      AND session_start_time >= DATE_TRUNC('month', target_date)
      AND session_start_time < DATE_TRUNC('month', target_date) + INTERVAL '1 month';
  END IF;

  -- ============================================================
  -- BOOKING METRICS (Both roles)
  -- ============================================================
  -- Total sessions (completed as tutor or client)
  SELECT COUNT(*)
  INTO v_total_sessions
  FROM bookings
  WHERE (tutor_id = target_user_id OR client_id = target_user_id)
    AND status = 'Completed';

  -- Monthly sessions (current month)
  SELECT COUNT(*)
  INTO v_monthly_sessions
  FROM bookings
  WHERE (tutor_id = target_user_id OR client_id = target_user_id)
    AND status = 'Completed'
    AND session_start_time >= DATE_TRUNC('month', target_date)
    AND session_start_time < DATE_TRUNC('month', target_date) + INTERVAL '1 month';

  -- Upcoming sessions (next 7 days from target_date)
  SELECT COUNT(*)
  INTO v_upcoming_sessions
  FROM bookings
  WHERE (tutor_id = target_user_id OR client_id = target_user_id)
    AND status IN ('Confirmed', 'Pending')
    AND session_start_time >= target_date
    AND session_start_time < target_date + INTERVAL '7 days';

  -- Cancelled sessions (all time)
  SELECT COUNT(*)
  INTO v_cancelled_sessions
  FROM bookings
  WHERE (tutor_id = target_user_id OR client_id = target_user_id)
    AND status = 'Cancelled';

  -- Hours taught (tutors)
  IF v_is_tutor THEN
    SELECT COALESCE(SUM(duration_minutes / 60.0), 0)
    INTO v_hours_taught
    FROM bookings
    WHERE tutor_id = target_user_id
      AND status = 'Completed';
  END IF;

  -- Hours learned (clients)
  IF v_is_client THEN
    SELECT COALESCE(SUM(duration_minutes / 60.0), 0)
    INTO v_hours_learned
    FROM bookings
    WHERE client_id = target_user_id
      AND status = 'Completed';
  END IF;

  -- ============================================================
  -- STUDENT METRICS (Tutors only)
  -- ============================================================
  IF v_is_tutor THEN
    -- Total unique students
    SELECT COUNT(DISTINCT client_id)
    INTO v_total_students
    FROM bookings
    WHERE tutor_id = target_user_id
      AND status = 'Completed';

    -- Active students (session in last 30 days from target_date)
    SELECT COUNT(DISTINCT client_id)
    INTO v_active_students
    FROM bookings
    WHERE tutor_id = target_user_id
      AND status = 'Completed'
      AND session_start_time >= target_date - INTERVAL '30 days'
      AND session_start_time <= target_date;

    -- New students (first session in current month)
    SELECT COUNT(DISTINCT b1.client_id)
    INTO v_new_students
    FROM bookings b1
    WHERE b1.tutor_id = target_user_id
      AND b1.status = 'Completed'
      AND b1.session_start_time >= DATE_TRUNC('month', target_date)
      AND b1.session_start_time < DATE_TRUNC('month', target_date) + INTERVAL '1 month'
      AND NOT EXISTS (
        SELECT 1 FROM bookings b2
        WHERE b2.tutor_id = target_user_id
          AND b2.client_id = b1.client_id
          AND b2.status = 'Completed'
          AND b2.session_start_time < DATE_TRUNC('month', target_date)
      );

    -- Returning students (more than 1 completed session)
    SELECT COUNT(DISTINCT client_id)
    INTO v_returning_students
    FROM (
      SELECT client_id, COUNT(*) as session_count
      FROM bookings
      WHERE tutor_id = target_user_id
        AND status = 'Completed'
      GROUP BY client_id
      HAVING COUNT(*) > 1
    ) subquery;
  END IF;

  -- ============================================================
  -- RATING METRICS (Tutors only)
  -- ============================================================
  IF v_is_tutor THEN
    -- Average rating
    SELECT COALESCE(AVG(rating), 0)
    INTO v_average_rating
    FROM profile_reviews
    WHERE reviewee_id = target_user_id;

    -- Total reviews
    SELECT COUNT(*)
    INTO v_total_reviews
    FROM profile_reviews
    WHERE reviewee_id = target_user_id;

    -- Five star reviews
    SELECT COUNT(*)
    INTO v_five_star_reviews
    FROM profile_reviews
    WHERE reviewee_id = target_user_id
      AND rating = 5;
  END IF;

  -- ============================================================
  -- LISTING METRICS (Tutors only)
  -- ============================================================
  IF v_is_tutor THEN
    -- Active listings (status = active)
    SELECT COUNT(*)
    INTO v_active_listings
    FROM listings
    WHERE profile_id = target_user_id
      AND status = 'published';

    -- Total listings (all statuses)
    SELECT COUNT(*)
    INTO v_total_listings
    FROM listings
    WHERE profile_id = target_user_id;

    -- Listing views (if view tracking exists)
    -- TODO: Implement when listing views tracking is added
    v_listing_views := 0;

    -- Listing bookings (bookings created from listings)
    -- TODO: Add listing_id to bookings table to track this
    v_listing_bookings := 0;
  END IF;

  -- ============================================================
  -- MESSAGE METRICS (All users)
  -- ============================================================
  -- Unread messages
  -- TODO: Implement when message system is built
  v_unread_messages := 0;

  -- Total conversations
  -- TODO: Implement when message system is built
  v_total_conversations := 0;

  -- ============================================================
  -- REFERRAL METRICS (All users)
  -- ============================================================
  -- REFERRAL METRICS (using correct tables based on referral documentation)
  -- ============================================================

  -- Referrals made: count of people recruited by this user (permanent attribution)
  SELECT COUNT(*)
  INTO v_referrals_made
  FROM profiles
  WHERE referred_by_profile_id = target_user_id;

  -- Referrals converted: people recruited who have made at least one completed booking
  SELECT COUNT(DISTINCT p.id)
  INTO v_referrals_converted
  FROM profiles p
  INNER JOIN bookings b ON (b.tutor_id = p.id OR b.client_id = p.id)
  WHERE p.referred_by_profile_id = target_user_id
    AND b.status = 'Completed';

  -- Referral earnings: sum of referral commissions from transactions table
  SELECT COALESCE(SUM(amount), 0)
  INTO v_referral_earnings
  FROM transactions
  WHERE profile_id = target_user_id
    AND type = 'Referral Commission';

  -- ============================================================
  -- CAAS METRICS (All users with roles)
  -- ============================================================
  -- CaaS score (from caas_scores table)
  SELECT COALESCE(total_score, 0)
  INTO v_caas_score
  FROM caas_scores
  WHERE profile_id = target_user_id
  ORDER BY calculated_at DESC
  LIMIT 1;

  -- Profile completeness (basic calculation)
  -- TODO: Implement proper profile completeness calculation
  v_profile_completeness := CASE
    WHEN v_profile.identity_verified THEN 100
    WHEN v_profile.onboarding_completed IS NOT NULL AND v_profile.onboarding_completed != '{}'::jsonb THEN 70
    ELSE 30
  END;

  -- ============================================================
  -- INSERT OR UPDATE USER STATISTICS
  -- ============================================================
  INSERT INTO user_statistics_daily (
    user_id,
    date,
    total_earnings,
    monthly_earnings,
    pending_earnings,
    total_spending,
    monthly_spending,
    total_sessions,
    monthly_sessions,
    upcoming_sessions,
    cancelled_sessions,
    hours_taught,
    hours_learned,
    total_students,
    active_students,
    new_students,
    returning_students,
    average_rating,
    total_reviews,
    five_star_reviews,
    active_listings,
    total_listings,
    listing_views,
    listing_bookings,
    unread_messages,
    total_conversations,
    referrals_made,
    referrals_converted,
    referral_earnings,
    caas_score,
    profile_completeness
  ) VALUES (
    target_user_id,
    target_date,
    v_total_earnings,
    v_monthly_earnings,
    v_pending_earnings,
    v_total_spending,
    v_monthly_spending,
    v_total_sessions,
    v_monthly_sessions,
    v_upcoming_sessions,
    v_cancelled_sessions,
    v_hours_taught,
    v_hours_learned,
    v_total_students,
    v_active_students,
    v_new_students,
    v_returning_students,
    v_average_rating,
    v_total_reviews,
    v_five_star_reviews,
    v_active_listings,
    v_total_listings,
    v_listing_views,
    v_listing_bookings,
    v_unread_messages,
    v_total_conversations,
    v_referrals_made,
    v_referrals_converted,
    v_referral_earnings,
    v_caas_score,
    v_profile_completeness
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    total_earnings = EXCLUDED.total_earnings,
    monthly_earnings = EXCLUDED.monthly_earnings,
    pending_earnings = EXCLUDED.pending_earnings,
    total_spending = EXCLUDED.total_spending,
    monthly_spending = EXCLUDED.monthly_spending,
    total_sessions = EXCLUDED.total_sessions,
    monthly_sessions = EXCLUDED.monthly_sessions,
    upcoming_sessions = EXCLUDED.upcoming_sessions,
    cancelled_sessions = EXCLUDED.cancelled_sessions,
    hours_taught = EXCLUDED.hours_taught,
    hours_learned = EXCLUDED.hours_learned,
    total_students = EXCLUDED.total_students,
    active_students = EXCLUDED.active_students,
    new_students = EXCLUDED.new_students,
    returning_students = EXCLUDED.returning_students,
    average_rating = EXCLUDED.average_rating,
    total_reviews = EXCLUDED.total_reviews,
    five_star_reviews = EXCLUDED.five_star_reviews,
    active_listings = EXCLUDED.active_listings,
    total_listings = EXCLUDED.total_listings,
    listing_views = EXCLUDED.listing_views,
    listing_bookings = EXCLUDED.listing_bookings,
    unread_messages = EXCLUDED.unread_messages,
    total_conversations = EXCLUDED.total_conversations,
    referrals_made = EXCLUDED.referrals_made,
    referrals_converted = EXCLUDED.referrals_converted,
    referral_earnings = EXCLUDED.referral_earnings,
    caas_score = EXCLUDED.caas_score,
    profile_completeness = EXCLUDED.profile_completeness;
END;
$$;

COMMENT ON FUNCTION aggregate_single_user_statistics IS 'Aggregates statistics for a single user on a specific date. Called by aggregate_user_statistics().';

-- ================================================================
-- 3. SCHEDULE NIGHTLY CRON JOB
-- ================================================================

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule user statistics aggregation at 1am UTC (after platform stats)
-- Note: Runs after platform stats (midnight) to avoid contention
SELECT cron.schedule(
  'aggregate-user-statistics',      -- job name
  '0 1 * * *',                      -- cron expression: 1am UTC daily
  $$SELECT aggregate_user_statistics(NULL, CURRENT_DATE);$$
);

-- ================================================================
-- 4. RUN INITIAL AGGREGATION FOR TODAY
-- ================================================================

-- Aggregate statistics for today immediately
SELECT aggregate_user_statistics(NULL, CURRENT_DATE);

-- ================================================================
-- VERIFICATION
-- ================================================================

DO $$
DECLARE
  v_function_exists BOOLEAN;
  v_cron_job_exists BOOLEAN;
  v_stats_count INT;
BEGIN
  -- Check functions exist
  SELECT EXISTS (
    SELECT FROM pg_proc WHERE proname = 'aggregate_user_statistics'
  ) INTO v_function_exists;

  -- Check cron job exists
  SELECT EXISTS (
    SELECT FROM cron.job WHERE jobname = 'aggregate-user-statistics'
  ) INTO v_cron_job_exists;

  -- Count statistics rows created
  SELECT COUNT(*) INTO v_stats_count
  FROM user_statistics_daily
  WHERE date = CURRENT_DATE;

  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Migration 207: User Statistics Aggregation - COMPLETE';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created: %', CASE WHEN v_function_exists THEN '✓' ELSE '✗' END;
  RAISE NOTICE 'Cron job scheduled: %', CASE WHEN v_cron_job_exists THEN '✓' ELSE '✗' END;
  RAISE NOTICE 'Statistics rows created: % (for today)', v_stats_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Cron Schedule:';
  RAISE NOTICE '  Job: aggregate-user-statistics';
  RAISE NOTICE '  Schedule: 1am UTC daily (0 1 * * *)';
  RAISE NOTICE '  Command: aggregate_user_statistics(NULL, CURRENT_DATE)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Run backfill script to populate historical data';
  RAISE NOTICE '  2. Verify cron job: SELECT * FROM cron.job WHERE jobname = ''aggregate-user-statistics'';';
  RAISE NOTICE '  3. Check statistics: SELECT * FROM user_statistics_daily ORDER BY date DESC, user_id LIMIT 10;';
  RAISE NOTICE '  4. Test single user: SELECT aggregate_single_user_statistics(''<user_id>'', CURRENT_DATE);';
  RAISE NOTICE '';
END $$;
