/*
 * Migration: 141_add_bookings_listings_reviews_metrics.sql
 * Purpose: Extend platform_statistics_daily with bookings, listings, and reviews metrics
 * Created: 2025-12-24
 * Phase: Admin Dashboard - Extended Platform Statistics
 *
 * This migration adds:
 * 1. Bookings metrics (total, completed, pending, cancelled, revenue)
 * 2. Listings metrics (total, active, inactive, avg_quality_score)
 * 3. Reviews metrics (total, avg_rating, tutors_with_reviews, clients_with_reviews)
 * 4. Updated aggregation function to include new metrics
 */

-- ============================================================================
-- 1. Extend platform_statistics_daily table with additional metrics
-- ============================================================================

-- Add Bookings metrics
ALTER TABLE platform_statistics_daily
  ADD COLUMN IF NOT EXISTS bookings_total INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bookings_completed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bookings_pending INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bookings_cancelled INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bookings_revenue NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bookings_hours_total NUMERIC(10,2) DEFAULT 0;

-- Add Listings metrics
ALTER TABLE platform_statistics_daily
  ADD COLUMN IF NOT EXISTS listings_total INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS listings_active INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS listings_inactive INTEGER DEFAULT 0;

-- Add Reviews metrics
ALTER TABLE platform_statistics_daily
  ADD COLUMN IF NOT EXISTS reviews_total INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviews_avg_rating NUMERIC(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviews_tutors_reviewed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviews_clients_reviewed INTEGER DEFAULT 0;

-- Add comments
COMMENT ON COLUMN platform_statistics_daily.bookings_total IS 'Total bookings (all statuses)';
COMMENT ON COLUMN platform_statistics_daily.bookings_completed IS 'Completed bookings';
COMMENT ON COLUMN platform_statistics_daily.bookings_pending IS 'Pending/upcoming bookings';
COMMENT ON COLUMN platform_statistics_daily.bookings_cancelled IS 'Cancelled bookings';
COMMENT ON COLUMN platform_statistics_daily.bookings_revenue IS 'Total revenue from completed bookings';
COMMENT ON COLUMN platform_statistics_daily.bookings_hours_total IS 'Total hours booked across all bookings';

COMMENT ON COLUMN platform_statistics_daily.listings_total IS 'Total listings (all statuses)';
COMMENT ON COLUMN platform_statistics_daily.listings_active IS 'Active listings';
COMMENT ON COLUMN platform_statistics_daily.listings_inactive IS 'Inactive/draft listings';

COMMENT ON COLUMN platform_statistics_daily.reviews_total IS 'Total reviews submitted';
COMMENT ON COLUMN platform_statistics_daily.reviews_avg_rating IS 'Average rating across all reviews';
COMMENT ON COLUMN platform_statistics_daily.reviews_tutors_reviewed IS 'Number of tutors with at least one review';
COMMENT ON COLUMN platform_statistics_daily.reviews_clients_reviewed IS 'Number of clients with at least one review';

-- ============================================================================
-- 2. Update aggregation function to include new metrics
-- ============================================================================

CREATE OR REPLACE FUNCTION aggregate_daily_statistics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_users INTEGER;
  v_active_users INTEGER;
  v_admin_users INTEGER;
  v_pending_onboarding INTEGER;
  v_seo_total_hubs INTEGER;
  v_seo_published_hubs INTEGER;
  v_seo_draft_hubs INTEGER;
  v_seo_total_spokes INTEGER;
  v_seo_published_spokes INTEGER;
  v_seo_total_citations INTEGER;
  v_seo_active_citations INTEGER;
  v_bookings_total INTEGER;
  v_bookings_completed INTEGER;
  v_bookings_pending INTEGER;
  v_bookings_cancelled INTEGER;
  v_bookings_revenue NUMERIC(10,2);
  v_bookings_hours_total NUMERIC(10,2);
  v_listings_total INTEGER;
  v_listings_active INTEGER;
  v_listings_inactive INTEGER;
  v_reviews_total INTEGER;
  v_reviews_avg_rating NUMERIC(3,2);
  v_reviews_tutors_reviewed INTEGER;
  v_reviews_clients_reviewed INTEGER;
BEGIN
  -- Aggregate user statistics
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE onboarding_completed <> '{}'::jsonb),
    COUNT(*) FILTER (WHERE is_admin = true),
    COUNT(*) FILTER (WHERE onboarding_completed = '{}'::jsonb OR onboarding_completed IS NULL)
  INTO
    v_total_users,
    v_active_users,
    v_admin_users,
    v_pending_onboarding
  FROM profiles;

  -- Aggregate SEO hub statistics
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'seo_hubs') THEN
    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'published'),
      COUNT(*) FILTER (WHERE status = 'draft')
    INTO
      v_seo_total_hubs,
      v_seo_published_hubs,
      v_seo_draft_hubs
    FROM seo_hubs;
  ELSE
    v_seo_total_hubs := 0;
    v_seo_published_hubs := 0;
    v_seo_draft_hubs := 0;
  END IF;

  -- Aggregate SEO spoke statistics
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'seo_spokes') THEN
    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'published')
    INTO
      v_seo_total_spokes,
      v_seo_published_spokes
    FROM seo_spokes;
  ELSE
    v_seo_total_spokes := 0;
    v_seo_published_spokes := 0;
  END IF;

  -- Aggregate SEO citation statistics
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'seo_citations') THEN
    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'active')
    INTO
      v_seo_total_citations,
      v_seo_active_citations
    FROM seo_citations;
  ELSE
    v_seo_total_citations := 0;
    v_seo_active_citations := 0;
  END IF;

  -- Aggregate bookings statistics
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bookings') THEN
    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'Completed'),
      COUNT(*) FILTER (WHERE status IN ('Pending', 'Confirmed')),
      COUNT(*) FILTER (WHERE status IN ('Cancelled', 'Declined')),
      COALESCE(SUM(amount) FILTER (WHERE status = 'Completed'), 0),
      COALESCE(SUM(duration_minutes / 60.0), 0)
    INTO
      v_bookings_total,
      v_bookings_completed,
      v_bookings_pending,
      v_bookings_cancelled,
      v_bookings_revenue,
      v_bookings_hours_total
    FROM bookings;
  ELSE
    v_bookings_total := 0;
    v_bookings_completed := 0;
    v_bookings_pending := 0;
    v_bookings_cancelled := 0;
    v_bookings_revenue := 0;
    v_bookings_hours_total := 0;
  END IF;

  -- Aggregate listings statistics
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'listings') THEN
    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'active'),
      COUNT(*) FILTER (WHERE status IN ('inactive', 'draft'))
    INTO
      v_listings_total,
      v_listings_active,
      v_listings_inactive
    FROM listings;
  ELSE
    v_listings_total := 0;
    v_listings_active := 0;
    v_listings_inactive := 0;
  END IF;

  -- Aggregate reviews statistics
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reviews') THEN
    SELECT
      COUNT(*),
      COALESCE(AVG(rating), 0),
      COUNT(DISTINCT tutor_id),
      COUNT(DISTINCT reviewer_id)
    INTO
      v_reviews_total,
      v_reviews_avg_rating,
      v_reviews_tutors_reviewed,
      v_reviews_clients_reviewed
    FROM reviews;
  ELSE
    v_reviews_total := 0;
    v_reviews_avg_rating := 0;
    v_reviews_tutors_reviewed := 0;
    v_reviews_clients_reviewed := 0;
  END IF;

  -- Insert or update statistics for the target date
  INSERT INTO platform_statistics_daily (
    date,
    total_users,
    active_users,
    admin_users,
    pending_onboarding_users,
    seo_total_hubs,
    seo_published_hubs,
    seo_draft_hubs,
    seo_total_spokes,
    seo_published_spokes,
    seo_total_citations,
    seo_active_citations,
    bookings_total,
    bookings_completed,
    bookings_pending,
    bookings_cancelled,
    bookings_revenue,
    bookings_hours_total,
    listings_total,
    listings_active,
    listings_inactive,
    reviews_total,
    reviews_avg_rating,
    reviews_tutors_reviewed,
    reviews_clients_reviewed
  ) VALUES (
    target_date,
    v_total_users,
    v_active_users,
    v_admin_users,
    v_pending_onboarding,
    v_seo_total_hubs,
    v_seo_published_hubs,
    v_seo_draft_hubs,
    v_seo_total_spokes,
    v_seo_published_spokes,
    v_seo_total_citations,
    v_seo_active_citations,
    v_bookings_total,
    v_bookings_completed,
    v_bookings_pending,
    v_bookings_cancelled,
    v_bookings_revenue,
    v_bookings_hours_total,
    v_listings_total,
    v_listings_active,
    v_listings_inactive,
    v_reviews_total,
    v_reviews_avg_rating,
    v_reviews_tutors_reviewed,
    v_reviews_clients_reviewed
  )
  ON CONFLICT (date)
  DO UPDATE SET
    total_users = EXCLUDED.total_users,
    active_users = EXCLUDED.active_users,
    admin_users = EXCLUDED.admin_users,
    pending_onboarding_users = EXCLUDED.pending_onboarding_users,
    seo_total_hubs = EXCLUDED.seo_total_hubs,
    seo_published_hubs = EXCLUDED.seo_published_hubs,
    seo_draft_hubs = EXCLUDED.seo_draft_hubs,
    seo_total_spokes = EXCLUDED.seo_total_spokes,
    seo_published_spokes = EXCLUDED.seo_published_spokes,
    seo_total_citations = EXCLUDED.seo_total_citations,
    seo_active_citations = EXCLUDED.seo_active_citations,
    bookings_total = EXCLUDED.bookings_total,
    bookings_completed = EXCLUDED.bookings_completed,
    bookings_pending = EXCLUDED.bookings_pending,
    bookings_cancelled = EXCLUDED.bookings_cancelled,
    bookings_revenue = EXCLUDED.bookings_revenue,
    bookings_hours_total = EXCLUDED.bookings_hours_total,
    listings_total = EXCLUDED.listings_total,
    listings_active = EXCLUDED.listings_active,
    listings_inactive = EXCLUDED.listings_inactive,
    reviews_total = EXCLUDED.reviews_total,
    reviews_avg_rating = EXCLUDED.reviews_avg_rating,
    reviews_tutors_reviewed = EXCLUDED.reviews_tutors_reviewed,
    reviews_clients_reviewed = EXCLUDED.reviews_clients_reviewed;

  RAISE NOTICE 'Daily statistics aggregated for %: % users, % bookings, % listings, % reviews',
    target_date, v_total_users, v_bookings_total, v_listings_total, v_reviews_total;
END;
$$;

-- ============================================================================
-- 3. Run initial aggregation for today with new metrics
-- ============================================================================

SELECT aggregate_daily_statistics(CURRENT_DATE);

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Migration 141_add_bookings_listings_reviews_metrics.sql completed';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Added 13 new columns to platform_statistics_daily table';
  RAISE NOTICE 'Updated aggregate_daily_statistics() function with new metrics';
  RAISE NOTICE 'Ran initial aggregation for today';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'New metrics tracked:';
  RAISE NOTICE '  - Bookings: total, completed, pending, cancelled, revenue, hours';
  RAISE NOTICE '  - Listings: total, active, inactive';
  RAISE NOTICE '  - Reviews: total, avg_rating, tutors_reviewed, clients_reviewed';
  RAISE NOTICE '=================================================================';
END$$;
