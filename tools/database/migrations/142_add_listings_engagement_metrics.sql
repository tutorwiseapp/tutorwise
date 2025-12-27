/*
 * Migration: 142_add_listings_engagement_metrics.sql
 * Purpose: Add engagement and quality metrics for listings
 * Created: 2025-12-27
 * Phase: Admin Dashboard - Listings Detailed Metrics
 *
 * This migration adds:
 * 1. Published rate (percentage of active vs total listings)
 * 2. Views total (requires listings_views table if exists)
 * 3. Bookings total (count of bookings originating from listings)
 * 4. Average rating (aggregate rating from reviews)
 * 5. Active rate (percentage of active listings)
 */

-- ============================================================================
-- 1. Extend platform_statistics_daily table with listings engagement metrics
-- ============================================================================

-- Add Listings engagement metrics
ALTER TABLE platform_statistics_daily
  ADD COLUMN IF NOT EXISTS listings_published_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS listings_views_total INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS listings_bookings_total INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS listings_avg_rating NUMERIC(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS listings_active_rate NUMERIC(5,2) DEFAULT 0;

-- Add comments
COMMENT ON COLUMN platform_statistics_daily.listings_published_rate IS 'Percentage of active listings out of total (active/total * 100)';
COMMENT ON COLUMN platform_statistics_daily.listings_views_total IS 'Total views across all listings (if views tracking exists)';
COMMENT ON COLUMN platform_statistics_daily.listings_bookings_total IS 'Total bookings originated from listings';
COMMENT ON COLUMN platform_statistics_daily.listings_avg_rating IS 'Average rating across all listing reviews';
COMMENT ON COLUMN platform_statistics_daily.listings_active_rate IS 'Percentage of active listings out of total (same as published_rate)';

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
  v_listings_published_rate NUMERIC(5,2);
  v_listings_views_total INTEGER;
  v_listings_bookings_total INTEGER;
  v_listings_avg_rating NUMERIC(3,2);
  v_listings_active_rate NUMERIC(5,2);
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

    -- Calculate published/active rate (avoid division by zero)
    IF v_listings_total > 0 THEN
      v_listings_published_rate := ROUND((v_listings_active::NUMERIC / v_listings_total::NUMERIC) * 100, 2);
      v_listings_active_rate := v_listings_published_rate; -- Same calculation
    ELSE
      v_listings_published_rate := 0;
      v_listings_active_rate := 0;
    END IF;

    -- Count bookings from listings (if listing_id exists in bookings)
    IF EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = 'bookings' AND column_name = 'listing_id'
    ) THEN
      SELECT COUNT(*)
      INTO v_listings_bookings_total
      FROM bookings
      WHERE listing_id IS NOT NULL;
    ELSE
      v_listings_bookings_total := 0;
    END IF;

    -- Calculate average rating from reviews (if reviews table has listing_id)
    IF EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = 'reviews' AND column_name = 'listing_id'
    ) THEN
      SELECT COALESCE(AVG(rating), 0)
      INTO v_listings_avg_rating
      FROM reviews
      WHERE listing_id IS NOT NULL;
    ELSE
      -- Fallback: use reviewee ratings for tutors with listings
      SELECT COALESCE(AVG(r.rating), 0)
      INTO v_listings_avg_rating
      FROM reviews r
      INNER JOIN listings l ON l.profile_id = r.reviewee_id
      WHERE r.rating IS NOT NULL;
    END IF;

  ELSE
    v_listings_total := 0;
    v_listings_active := 0;
    v_listings_inactive := 0;
    v_listings_published_rate := 0;
    v_listings_bookings_total := 0;
    v_listings_avg_rating := 0;
    v_listings_active_rate := 0;
  END IF;

  -- Aggregate views statistics (if listings_views table exists)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'listings_views') THEN
    SELECT COUNT(*)
    INTO v_listings_views_total
    FROM listings_views;
  ELSIF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'listing_views') THEN
    SELECT COUNT(*)
    INTO v_listings_views_total
    FROM listing_views;
  ELSE
    v_listings_views_total := 0;
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
    listings_published_rate,
    listings_views_total,
    listings_bookings_total,
    listings_avg_rating,
    listings_active_rate,
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
    v_listings_published_rate,
    v_listings_views_total,
    v_listings_bookings_total,
    v_listings_avg_rating,
    v_listings_active_rate,
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
    listings_published_rate = EXCLUDED.listings_published_rate,
    listings_views_total = EXCLUDED.listings_views_total,
    listings_bookings_total = EXCLUDED.listings_bookings_total,
    listings_avg_rating = EXCLUDED.listings_avg_rating,
    listings_active_rate = EXCLUDED.listings_active_rate,
    reviews_total = EXCLUDED.reviews_total,
    reviews_avg_rating = EXCLUDED.reviews_avg_rating,
    reviews_tutors_reviewed = EXCLUDED.reviews_tutors_reviewed,
    reviews_clients_reviewed = EXCLUDED.reviews_clients_reviewed;

  RAISE NOTICE 'Daily statistics aggregated for %: % users, % bookings, % listings (%.2f%% active), % reviews',
    target_date, v_total_users, v_bookings_total, v_listings_total, v_listings_active_rate, v_reviews_total;
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
  RAISE NOTICE 'Migration 142_add_listings_engagement_metrics.sql completed';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Added 5 new columns to platform_statistics_daily table';
  RAISE NOTICE 'Updated aggregate_daily_statistics() function with new metrics';
  RAISE NOTICE 'Ran initial aggregation for today';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'New metrics tracked:';
  RAISE NOTICE '  - listings_published_rate: Active listings percentage';
  RAISE NOTICE '  - listings_views_total: Total listing views (if tracking exists)';
  RAISE NOTICE '  - listings_bookings_total: Bookings from listings';
  RAISE NOTICE '  - listings_avg_rating: Average rating for listings';
  RAISE NOTICE '  - listings_active_rate: Active rate (same as published rate)';
  RAISE NOTICE '=================================================================';
END$$;
