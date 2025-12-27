/*
 * Migration: 143_fix_listings_metrics_remove_deprecated_avg_rating.sql
 * Purpose: Fix migration 142 mistakes - remove listings_avg_rating (uses deprecated table)
 *          and replace with listings_draft_count
 * Created: 2025-12-27
 * Phase: Admin Dashboard - Listings Metrics Cleanup
 *
 * CONTEXT: Migration 142 incorrectly referenced the deprecated listing_reviews table.
 * Listing reviews were deprecated on 2025-11-08 (migration 043) in favor of
 * profile_reviews. This migration removes the incorrect metric and replaces it
 * with a useful one.
 *
 * This migration:
 * 1. Drops listings_avg_rating column (was using deprecated listing_reviews table)
 * 2. Adds listings_draft_count column (counts draft listings)
 * 3. Updates aggregation function to remove incorrect logic
 * 4. Adds clear deprecation warning to listing_reviews table
 */

-- ============================================================================
-- 1. Drop incorrect listings_avg_rating column
-- ============================================================================

ALTER TABLE platform_statistics_daily
  DROP COLUMN IF EXISTS listings_avg_rating;

-- ============================================================================
-- 2. Add listings_draft_count column
-- ============================================================================

ALTER TABLE platform_statistics_daily
  ADD COLUMN IF NOT EXISTS listings_draft_count INTEGER DEFAULT 0;

COMMENT ON COLUMN platform_statistics_daily.listings_draft_count IS
  'Number of listings with status = draft. Useful for tracking incomplete listings.';

-- ============================================================================
-- 3. Add strong deprecation warning to listing_reviews table
-- ============================================================================

COMMENT ON TABLE listing_reviews IS
  '⚠️ DEPRECATED (2025-11-08) - DO NOT USE ⚠️

  This table is from the OLD listing-centric review system (v4.1).
  It was deprecated in migration 043 on 2025-11-08.

  CURRENT SYSTEM (v4.5):
  - Use profile_reviews table for user-to-user reviews
  - Use booking_review_sessions for review workflow

  This table exists ONLY to preserve historical data.

  ❌ NO CODE should write to this table
  ❌ NO CODE should read from this table
  ❌ NO METRICS should reference this table

  If you need listing quality metrics, calculate from:
  - Tutor ratings (profiles.average_rating)
  - Booking completion rates
  - Client retention rates

  See: reviews-solution-design-v4.5.md';

-- ============================================================================
-- 4. Update aggregation function with correct logic
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
  v_listings_draft_count INTEGER;
  v_listings_published_rate NUMERIC(5,2);
  v_listings_views_total INTEGER;
  v_listings_bookings_total INTEGER;
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
      COUNT(*) FILTER (WHERE status IN ('inactive', 'draft')),
      COUNT(*) FILTER (WHERE status = 'draft')
    INTO
      v_listings_total,
      v_listings_active,
      v_listings_inactive,
      v_listings_draft_count;

    -- Calculate published/active rate (avoid division by zero)
    IF v_listings_total > 0 THEN
      v_listings_published_rate := ROUND((v_listings_active::NUMERIC / v_listings_total::NUMERIC) * 100, 2);
      v_listings_active_rate := v_listings_published_rate;
    ELSE
      v_listings_published_rate := 0;
      v_listings_active_rate := 0;
    END IF;

    -- Count bookings from listings
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

  ELSE
    v_listings_total := 0;
    v_listings_active := 0;
    v_listings_inactive := 0;
    v_listings_draft_count := 0;
    v_listings_published_rate := 0;
    v_listings_bookings_total := 0;
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

  -- Aggregate reviews statistics (profile_reviews only - the current system)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profile_reviews') THEN
    SELECT
      COUNT(*),
      COALESCE(AVG(rating), 0),
      COUNT(DISTINCT reviewee_id) FILTER (WHERE EXISTS (
        SELECT 1 FROM profiles WHERE id = reviewee_id AND active_role = 'tutor'
      )),
      COUNT(DISTINCT reviewer_id)
    INTO
      v_reviews_total,
      v_reviews_avg_rating,
      v_reviews_tutors_reviewed,
      v_reviews_clients_reviewed
    FROM profile_reviews;
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
    listings_draft_count,
    listings_published_rate,
    listings_views_total,
    listings_bookings_total,
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
    v_listings_draft_count,
    v_listings_published_rate,
    v_listings_views_total,
    v_listings_bookings_total,
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
    listings_draft_count = EXCLUDED.listings_draft_count,
    listings_published_rate = EXCLUDED.listings_published_rate,
    listings_views_total = EXCLUDED.listings_views_total,
    listings_bookings_total = EXCLUDED.listings_bookings_total,
    listings_active_rate = EXCLUDED.listings_active_rate,
    reviews_total = EXCLUDED.reviews_total,
    reviews_avg_rating = EXCLUDED.reviews_avg_rating,
    reviews_tutors_reviewed = EXCLUDED.reviews_tutors_reviewed,
    reviews_clients_reviewed = EXCLUDED.reviews_clients_reviewed;

  RAISE NOTICE 'Daily statistics aggregated for %: % users, % bookings, % listings (%.2f%% active, % drafts), % reviews',
    target_date, v_total_users, v_bookings_total, v_listings_total, v_listings_active_rate, v_listings_draft_count, v_reviews_total;
END;
$$;

-- ============================================================================
-- 5. Run aggregation for today and last 6 days
-- ============================================================================

SELECT aggregate_daily_statistics(CURRENT_DATE);
SELECT aggregate_daily_statistics((CURRENT_DATE - INTERVAL '1 day')::DATE);
SELECT aggregate_daily_statistics((CURRENT_DATE - INTERVAL '2 days')::DATE);
SELECT aggregate_daily_statistics((CURRENT_DATE - INTERVAL '3 days')::DATE);
SELECT aggregate_daily_statistics((CURRENT_DATE - INTERVAL '4 days')::DATE);
SELECT aggregate_daily_statistics((CURRENT_DATE - INTERVAL '5 days')::DATE);
SELECT aggregate_daily_statistics((CURRENT_DATE - INTERVAL '6 days')::DATE);

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Migration 143_fix_listings_metrics_remove_deprecated_avg_rating.sql';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'FIXED: Removed listings_avg_rating (was using deprecated table)';
  RAISE NOTICE 'ADDED: listings_draft_count metric';
  RAISE NOTICE 'UPDATED: aggregate_daily_statistics() function';
  RAISE NOTICE 'DOCUMENTED: Strong deprecation warning on listing_reviews table';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Metrics now tracked correctly:';
  RAISE NOTICE '  - listings_total, listings_active, listings_inactive';
  RAISE NOTICE '  - listings_draft_count (NEW - replaces avg_rating)';
  RAISE NOTICE '  - listings_published_rate, listings_active_rate';
  RAISE NOTICE '  - listings_views_total, listings_bookings_total';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'IMPORTANT: Update frontend to use listings_draft_count';
  RAISE NOTICE '           instead of listings_avg_rating';
  RAISE NOTICE '=================================================================';
END$$;
