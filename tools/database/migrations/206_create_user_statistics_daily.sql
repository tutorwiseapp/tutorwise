/**
 * Migration 206: Create User Statistics Daily Table
 *
 * Purpose:
 * - Create user_statistics_daily table for per-user metric snapshots
 * - Enable historical comparison in user dashboard (useUserMetric hook)
 * - Align with admin dashboard pattern (platform_statistics_daily)
 *
 * Phase: Dashboard Alignment Phase 1.2
 * Created: 2026-01-22
 * Pattern: Follows migration 135 (platform_statistics_daily) for consistency
 */

-- ================================================================
-- USER STATISTICS DAILY TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS user_statistics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Earnings metrics (tutors)
  total_earnings NUMERIC(10,2) DEFAULT 0,
  monthly_earnings NUMERIC(10,2) DEFAULT 0,
  pending_earnings NUMERIC(10,2) DEFAULT 0,

  -- Spending metrics (clients)
  total_spending NUMERIC(10,2) DEFAULT 0,
  monthly_spending NUMERIC(10,2) DEFAULT 0,

  -- Booking metrics
  total_sessions INTEGER DEFAULT 0,
  monthly_sessions INTEGER DEFAULT 0,
  upcoming_sessions INTEGER DEFAULT 0,
  cancelled_sessions INTEGER DEFAULT 0,
  hours_taught NUMERIC(10,2) DEFAULT 0,
  hours_learned NUMERIC(10,2) DEFAULT 0,

  -- Student/Client metrics
  total_students INTEGER DEFAULT 0,
  active_students INTEGER DEFAULT 0,
  new_students INTEGER DEFAULT 0,
  returning_students INTEGER DEFAULT 0,

  -- Rating metrics
  average_rating NUMERIC(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  five_star_reviews INTEGER DEFAULT 0,

  -- Listing metrics
  active_listings INTEGER DEFAULT 0,
  total_listings INTEGER DEFAULT 0,
  listing_views INTEGER DEFAULT 0,
  listing_bookings INTEGER DEFAULT 0,

  -- Message metrics
  unread_messages INTEGER DEFAULT 0,
  total_conversations INTEGER DEFAULT 0,

  -- Referral metrics
  referrals_made INTEGER DEFAULT 0,
  referrals_converted INTEGER DEFAULT 0,
  referral_earnings NUMERIC(10,2) DEFAULT 0,

  -- CaaS metrics
  caas_score INTEGER DEFAULT 0,
  profile_completeness INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one row per user per date
  UNIQUE(user_id, date)
);

-- ================================================================
-- INDEXES
-- ================================================================

-- Primary lookup: user_id + date (most recent first)
CREATE INDEX IF NOT EXISTS idx_user_stats_user_date
  ON user_statistics_daily(user_id, date DESC);

-- Fast user lookups
CREATE INDEX IF NOT EXISTS idx_user_stats_user
  ON user_statistics_daily(user_id);

-- Fast date lookups
CREATE INDEX IF NOT EXISTS idx_user_stats_date
  ON user_statistics_daily(date DESC);

-- ================================================================
-- COMMENTS
-- ================================================================

COMMENT ON TABLE user_statistics_daily IS
  'Daily snapshots of per-user statistics for historical comparison in dashboard';

COMMENT ON COLUMN user_statistics_daily.user_id IS
  'User (profile) this snapshot belongs to';

COMMENT ON COLUMN user_statistics_daily.date IS
  'Date of the snapshot (UTC)';

-- Earnings comments
COMMENT ON COLUMN user_statistics_daily.total_earnings IS
  'Total lifetime earnings for tutors';

COMMENT ON COLUMN user_statistics_daily.monthly_earnings IS
  'Earnings in current month';

COMMENT ON COLUMN user_statistics_daily.pending_earnings IS
  'Earnings not yet paid out';

-- Spending comments
COMMENT ON COLUMN user_statistics_daily.total_spending IS
  'Total lifetime spending for clients';

COMMENT ON COLUMN user_statistics_daily.monthly_spending IS
  'Spending in current month';

-- Booking comments
COMMENT ON COLUMN user_statistics_daily.total_sessions IS
  'Total completed sessions (all-time)';

COMMENT ON COLUMN user_statistics_daily.monthly_sessions IS
  'Completed sessions in current month';

COMMENT ON COLUMN user_statistics_daily.upcoming_sessions IS
  'Sessions scheduled in next 7 days';

COMMENT ON COLUMN user_statistics_daily.hours_taught IS
  'Total hours taught (tutors)';

COMMENT ON COLUMN user_statistics_daily.hours_learned IS
  'Total hours learned (clients)';

-- Student comments
COMMENT ON COLUMN user_statistics_daily.total_students IS
  'Total unique students taught (tutors)';

COMMENT ON COLUMN user_statistics_daily.active_students IS
  'Students with session in last 30 days';

COMMENT ON COLUMN user_statistics_daily.new_students IS
  'Students who started this month';

COMMENT ON COLUMN user_statistics_daily.returning_students IS
  'Students with more than 1 session';

-- Rating comments
COMMENT ON COLUMN user_statistics_daily.average_rating IS
  'Average rating received (0-5)';

COMMENT ON COLUMN user_statistics_daily.total_reviews IS
  'Total reviews received';

-- CaaS comments
COMMENT ON COLUMN user_statistics_daily.caas_score IS
  'Current CaaS credibility score (0-100)';

COMMENT ON COLUMN user_statistics_daily.profile_completeness IS
  'Profile completion percentage (0-100)';

-- ================================================================
-- VERIFICATION
-- ================================================================

DO $$
DECLARE
  v_table_exists BOOLEAN;
  v_index_count INT;
BEGIN
  -- Check table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_name = 'user_statistics_daily'
  ) INTO v_table_exists;

  -- Count indexes
  SELECT COUNT(*)
  INTO v_index_count
  FROM pg_indexes
  WHERE tablename = 'user_statistics_daily';

  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Migration 206: User Statistics Daily Table - COMPLETE';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Table created: %', CASE WHEN v_table_exists THEN '✓' ELSE '✗' END;
  RAISE NOTICE 'Indexes created: % (expected 3)', v_index_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Run migration 207 to create population job';
  RAISE NOTICE '  2. Backfill historical data for existing users';
  RAISE NOTICE '  3. Update dashboard to use useUserMetric hook';
  RAISE NOTICE '';
END $$;
