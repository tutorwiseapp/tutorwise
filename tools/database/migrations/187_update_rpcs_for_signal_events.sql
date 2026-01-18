/**
 * Filename: tools/database/migrations/187_update_rpcs_for_signal_events.sql
 * Purpose: Week 3 - Update Blog Orchestrator RPCs to use signal_events table
 * Created: 2026-01-17
 *
 * WEEK 3 SCOPE: Update all RPCs from Migration 182 to use signal_events table
 * - Replace blog_attribution_events → signal_events
 * - Replace blog_article_metrics → signal_metrics
 * - Add signal_id support for journey tracking
 * - Add new RPC for signal journey visualization
 * - Maintain backward compatibility (views ensure old queries still work)
 *
 * STRATEGY: Drop and recreate all RPCs with updated table references
 */

-- ============================================================================
-- RPC 1: get_article_performance_summary (UPDATED)
-- ============================================================================

/**
 * Returns performance metrics for all articles over specified period.
 * Used for: Article Performance Table in dashboard
 *
 * UPDATED: Now reads from signal_events and signal_metrics tables
 *
 * @param p_days INTEGER - Number of days to look back
 * @param p_attribution_window_days INTEGER - Attribution window for bookings (default: 7)
 *
 * Returns:
 * - article_id: UUID of article
 * - article_title: Article title
 * - article_slug: Article slug
 * - category: Article category
 * - published_at: Publish date
 * - views_count: Total article views
 * - interaction_count: Marketplace interactions (clicks/saves)
 * - wiselist_save_count: Items saved to wiselists
 * - booking_count: Blog-assisted bookings
 * - booking_revenue: Total revenue from blog-assisted bookings (£)
 * - conversion_rate: (bookings / views) percentage
 * - signal_count: Number of unique signals (journeys) ← NEW
 */
DROP FUNCTION IF EXISTS get_article_performance_summary(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_article_performance_summary(
  p_days INTEGER DEFAULT 30,
  p_attribution_window_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  article_id UUID,
  article_title TEXT,
  article_slug TEXT,
  category TEXT,
  published_at TIMESTAMPTZ,
  views_count BIGINT,
  interaction_count BIGINT,
  wiselist_save_count BIGINT,
  booking_count BIGINT,
  booking_revenue NUMERIC,
  conversion_rate NUMERIC,
  signal_count BIGINT  -- NEW: Unique signals (journeys)
) AS $$
BEGIN
  RETURN QUERY
  WITH article_views AS (
    -- Get article views from signal_metrics (summed across all days)
    SELECT
      ba.id AS article_id,
      ba.title AS article_title,
      ba.slug AS article_slug,
      ba.category,
      ba.published_at,
      COALESCE(SUM(sm.impressions), 0) AS views
    FROM blog_articles ba
    LEFT JOIN signal_metrics sm
      ON ba.id = sm.content_id
      AND sm.content_type = 'article'
      AND sm.date >= CURRENT_DATE - p_days
    WHERE ba.published_at IS NOT NULL
    GROUP BY ba.id, ba.title, ba.slug, ba.category, ba.published_at
  ),
  article_interactions AS (
    -- Count marketplace interactions (clicks/saves on tutors/listings)
    SELECT
      se.content_id AS article_id,
      COUNT(*) AS interaction_count
    FROM signal_events se
    WHERE se.content_type = 'article'
      AND se.event_type IN ('click', 'save')
      AND se.target_type IN ('tutor', 'listing')
      AND se.created_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY se.content_id
  ),
  article_wiselist_saves AS (
    -- Count wiselist saves
    SELECT
      se.content_id AS article_id,
      COUNT(*) AS save_count
    FROM signal_events se
    WHERE se.content_type = 'article'
      AND se.event_type = 'save'
      AND se.target_type IN ('article', 'tutor', 'listing', 'wiselist_item')
      AND se.created_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY se.content_id
  ),
  article_bookings AS (
    -- Count blog-assisted bookings within attribution window
    SELECT
      se.content_id AS article_id,
      COUNT(DISTINCT b.id) AS booking_count,
      SUM(b.amount) AS booking_revenue
    FROM signal_events se
    INNER JOIN bookings b
      ON se.event_type = 'convert'
      AND se.target_type = 'booking'
      AND se.target_id::TEXT = b.id::TEXT
      AND b.created_at >= se.created_at
      AND b.created_at <= se.created_at + (p_attribution_window_days || ' days')::INTERVAL
    WHERE se.content_type = 'article'
      AND se.created_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY se.content_id
  ),
  article_signals AS (
    -- NEW: Count unique signals (journeys) per article
    SELECT
      se.content_id AS article_id,
      COUNT(DISTINCT se.signal_id) AS signal_count
    FROM signal_events se
    WHERE se.content_type = 'article'
      AND se.signal_id IS NOT NULL
      AND se.created_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY se.content_id
  )
  SELECT
    av.article_id,
    av.article_title,
    av.article_slug,
    av.category,
    av.published_at,
    av.views AS views_count,
    COALESCE(ai.interaction_count, 0) AS interaction_count,
    COALESCE(aws.save_count, 0) AS wiselist_save_count,
    COALESCE(ab.booking_count, 0) AS booking_count,
    COALESCE(ab.booking_revenue, 0) AS booking_revenue,
    CASE
      WHEN av.views > 0 THEN ROUND((COALESCE(ab.booking_count, 0)::NUMERIC / av.views) * 100, 2)
      ELSE 0
    END AS conversion_rate,
    COALESCE(asig.signal_count, 0) AS signal_count  -- NEW
  FROM article_views av
  LEFT JOIN article_interactions ai ON av.article_id = ai.article_id
  LEFT JOIN article_wiselist_saves aws ON av.article_id = aws.article_id
  LEFT JOIN article_bookings ab ON av.article_id = ab.article_id
  LEFT JOIN article_signals asig ON av.article_id = asig.article_id  -- NEW
  ORDER BY booking_revenue DESC NULLS LAST, views_count DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RPC 2: get_conversion_funnel (UPDATED)
-- ============================================================================

/**
 * Returns conversion funnel metrics for all articles.
 * Used for: Conversion Funnel visualization
 *
 * UPDATED: Now reads from signal_events table
 *
 * @param p_days INTEGER - Number of days to look back
 * @param p_attribution_window_days INTEGER - Attribution window for bookings (default: 7)
 *
 * Returns:
 * - article_id: UUID of article
 * - article_title: Article title
 * - views: Article views (top of funnel)
 * - interactions: Marketplace interactions (click/save)
 * - wiselist_saves: Wiselist saves
 * - bookings: Blog-assisted bookings (bottom of funnel)
 * - view_to_interaction_rate: % of views that interacted
 * - interaction_to_save_rate: % of interactions that saved
 * - save_to_booking_rate: % of saves that converted
 * - overall_conversion_rate: % of views that booked
 */
DROP FUNCTION IF EXISTS get_conversion_funnel(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_conversion_funnel(
  p_days INTEGER DEFAULT 30,
  p_attribution_window_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  article_id UUID,
  article_title TEXT,
  views BIGINT,
  interactions BIGINT,
  wiselist_saves BIGINT,
  bookings BIGINT,
  view_to_interaction_rate NUMERIC,
  interaction_to_save_rate NUMERIC,
  save_to_booking_rate NUMERIC,
  overall_conversion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH article_views AS (
    SELECT
      ba.id AS article_id,
      ba.title AS article_title,
      COALESCE(SUM(sm.impressions), 0) AS views
    FROM blog_articles ba
    LEFT JOIN signal_metrics sm
      ON ba.id = sm.content_id
      AND sm.content_type = 'article'
      AND sm.date >= CURRENT_DATE - p_days
    WHERE ba.published_at IS NOT NULL
    GROUP BY ba.id, ba.title
  ),
  article_interactions AS (
    SELECT
      se.content_id AS article_id,
      COUNT(*) AS interaction_count
    FROM signal_events se
    WHERE se.content_type = 'article'
      AND se.event_type IN ('click', 'save')
      AND se.target_type IN ('tutor', 'listing')
      AND se.created_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY se.content_id
  ),
  article_wiselist_saves AS (
    SELECT
      se.content_id AS article_id,
      COUNT(*) AS save_count
    FROM signal_events se
    WHERE se.content_type = 'article'
      AND se.event_type = 'save'
      AND se.target_type IN ('article', 'tutor', 'listing', 'wiselist_item')
      AND se.created_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY se.content_id
  ),
  article_bookings AS (
    SELECT
      se.content_id AS article_id,
      COUNT(DISTINCT b.id) AS booking_count
    FROM signal_events se
    INNER JOIN bookings b
      ON se.event_type = 'convert'
      AND se.target_type = 'booking'
      AND se.target_id::TEXT = b.id::TEXT
      AND b.created_at >= se.created_at
      AND b.created_at <= se.created_at + (p_attribution_window_days || ' days')::INTERVAL
    WHERE se.content_type = 'article'
      AND se.created_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY se.content_id
  )
  SELECT
    av.article_id,
    av.article_title,
    av.views,
    COALESCE(ai.interaction_count, 0) AS interactions,
    COALESCE(aws.save_count, 0) AS wiselist_saves,
    COALESCE(ab.booking_count, 0) AS bookings,
    CASE
      WHEN av.views > 0 THEN ROUND((COALESCE(ai.interaction_count, 0)::NUMERIC / av.views) * 100, 2)
      ELSE 0
    END AS view_to_interaction_rate,
    CASE
      WHEN COALESCE(ai.interaction_count, 0) > 0 THEN ROUND((COALESCE(aws.save_count, 0)::NUMERIC / ai.interaction_count) * 100, 2)
      ELSE 0
    END AS interaction_to_save_rate,
    CASE
      WHEN COALESCE(aws.save_count, 0) > 0 THEN ROUND((COALESCE(ab.booking_count, 0)::NUMERIC / aws.save_count) * 100, 2)
      ELSE 0
    END AS save_to_booking_rate,
    CASE
      WHEN av.views > 0 THEN ROUND((COALESCE(ab.booking_count, 0)::NUMERIC / av.views) * 100, 2)
      ELSE 0
    END AS overall_conversion_rate
  FROM article_views av
  LEFT JOIN article_interactions ai ON av.article_id = ai.article_id
  LEFT JOIN article_wiselist_saves aws ON av.article_id = aws.article_id
  LEFT JOIN article_bookings ab ON av.article_id = ab.article_id
  WHERE av.views > 0  -- Only show articles with views
  ORDER BY bookings DESC NULLS LAST, views DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RPC 3: get_blog_assisted_listings (UPDATED)
-- ============================================================================

/**
 * Returns listings that received visibility from blog articles.
 * Used for: Listing Visibility Table
 *
 * UPDATED: Now reads from signal_events table
 *
 * @param p_days INTEGER - Number of days to look back
 * @param p_attribution_window_days INTEGER - Attribution window for bookings (default: 7)
 *
 * Returns:
 * - listing_id: UUID of listing
 * - listing_title: Listing title
 * - tutor_name: Tutor name
 * - subject: Subject
 * - level: Level
 * - article_count: Number of articles that mentioned this listing
 * - view_count: Times listing was viewed from blog
 * - click_count: Times listing was clicked from blog
 * - booking_count: Bookings from blog traffic
 * - booking_revenue: Revenue from blog-assisted bookings
 */
DROP FUNCTION IF EXISTS get_blog_assisted_listings(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_blog_assisted_listings(
  p_days INTEGER DEFAULT 30,
  p_attribution_window_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  listing_id UUID,
  listing_title TEXT,
  tutor_name TEXT,
  subject TEXT,
  level TEXT,
  article_count BIGINT,
  view_count BIGINT,
  click_count BIGINT,
  booking_count BIGINT,
  booking_revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH listing_views AS (
    SELECT
      se.target_id AS listing_id,
      COUNT(*) AS view_count
    FROM signal_events se
    WHERE se.content_type = 'article'
      AND se.event_type = 'impression'
      AND se.target_type = 'listing'
      AND se.created_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY se.target_id
  ),
  listing_clicks AS (
    SELECT
      se.target_id AS listing_id,
      COUNT(*) AS click_count
    FROM signal_events se
    WHERE se.content_type = 'article'
      AND se.event_type = 'click'
      AND se.target_type = 'listing'
      AND se.created_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY se.target_id
  ),
  listing_articles AS (
    SELECT
      se.target_id AS listing_id,
      COUNT(DISTINCT se.content_id) AS article_count
    FROM signal_events se
    WHERE se.content_type = 'article'
      AND se.target_type = 'listing'
      AND se.created_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY se.target_id
  ),
  listing_bookings AS (
    SELECT
      se.target_id AS listing_id,
      COUNT(DISTINCT b.id) AS booking_count,
      SUM(b.amount) AS booking_revenue
    FROM signal_events se
    INNER JOIN bookings b
      ON se.event_type = 'convert'
      AND se.target_type = 'booking'
      AND se.target_id::TEXT = b.id::TEXT
      AND b.created_at >= se.created_at
      AND b.created_at <= se.created_at + (p_attribution_window_days || ' days')::INTERVAL
    INNER JOIN listings l ON b.listing_id = l.id
    WHERE se.content_type = 'article'
      AND se.created_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY se.target_id
  )
  SELECT
    l.id AS listing_id,
    l.title AS listing_title,
    p.full_name AS tutor_name,
    l.subject,
    l.level,
    COALESCE(la.article_count, 0) AS article_count,
    COALESCE(lv.view_count, 0) AS view_count,
    COALESCE(lc.click_count, 0) AS click_count,
    COALESCE(lb.booking_count, 0) AS booking_count,
    COALESCE(lb.booking_revenue, 0) AS booking_revenue
  FROM listings l
  INNER JOIN profiles p ON l.profile_id = p.id
  LEFT JOIN listing_views lv ON l.id = lv.listing_id
  LEFT JOIN listing_clicks lc ON l.id = lc.listing_id
  LEFT JOIN listing_articles la ON l.id = la.listing_id
  LEFT JOIN listing_bookings lb ON l.id = lb.listing_id
  WHERE la.article_count > 0  -- Only show listings mentioned in blog
  ORDER BY booking_revenue DESC NULLS LAST, click_count DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RPC 4: get_time_to_conversion_distribution (UPDATED)
-- ============================================================================

/**
 * Returns distribution of time between first blog interaction and booking.
 * Used for: Understanding conversion timing patterns
 *
 * UPDATED: Now reads from signal_events table with signal_id tracking
 *
 * @param p_days INTEGER - Number of days to look back
 * @param p_attribution_window_days INTEGER - Attribution window for bookings (default: 7)
 *
 * Returns:
 * - time_bucket: Time range (e.g., "0-1 hours", "1-6 hours", "6-24 hours", "1-3 days", "3-7 days")
 * - booking_count: Number of bookings in this time bucket
 * - percentage: Percentage of total bookings
 */
DROP FUNCTION IF EXISTS get_time_to_conversion_distribution(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_time_to_conversion_distribution(
  p_days INTEGER DEFAULT 30,
  p_attribution_window_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  time_bucket TEXT,
  booking_count BIGINT,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH booking_times AS (
    SELECT
      b.id AS booking_id,
      MIN(se.created_at) AS first_interaction,
      MAX(b.created_at) AS booking_time,
      EXTRACT(EPOCH FROM (MAX(b.created_at) - MIN(se.created_at))) / 3600 AS hours_to_convert
    FROM signal_events se
    INNER JOIN bookings b
      ON se.event_type = 'convert'
      AND se.target_type = 'booking'
      AND se.target_id::TEXT = b.id::TEXT
      AND b.created_at >= se.created_at
      AND b.created_at <= se.created_at + (p_attribution_window_days || ' days')::INTERVAL
    WHERE se.content_type = 'article'
      AND se.created_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY b.id
  ),
  time_buckets AS (
    SELECT
      CASE
        WHEN hours_to_convert < 1 THEN '0-1 hours'
        WHEN hours_to_convert < 6 THEN '1-6 hours'
        WHEN hours_to_convert < 24 THEN '6-24 hours'
        WHEN hours_to_convert < 72 THEN '1-3 days'
        WHEN hours_to_convert < 168 THEN '3-7 days'
        ELSE '7+ days'
      END AS time_bucket,
      COUNT(*) AS booking_count
    FROM booking_times
    GROUP BY
      CASE
        WHEN hours_to_convert < 1 THEN '0-1 hours'
        WHEN hours_to_convert < 6 THEN '1-6 hours'
        WHEN hours_to_convert < 24 THEN '6-24 hours'
        WHEN hours_to_convert < 72 THEN '1-3 days'
        WHEN hours_to_convert < 168 THEN '3-7 days'
        ELSE '7+ days'
      END
  ),
  total_bookings AS (
    SELECT SUM(booking_count) AS total FROM time_buckets
  )
  SELECT
    tb.time_bucket,
    tb.booking_count,
    CASE
      WHEN t.total > 0 THEN ROUND((tb.booking_count::NUMERIC / t.total) * 100, 2)
      ELSE 0
    END AS percentage
  FROM time_buckets tb
  CROSS JOIN total_bookings t
  ORDER BY
    CASE tb.time_bucket
      WHEN '0-1 hours' THEN 1
      WHEN '1-6 hours' THEN 2
      WHEN '6-24 hours' THEN 3
      WHEN '1-3 days' THEN 4
      WHEN '3-7 days' THEN 5
      WHEN '7+ days' THEN 6
    END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RPC 5: get_signal_journey (NEW for Week 3)
-- ============================================================================

/**
 * Returns the complete event journey for a given signal_id.
 * Used for: Signal Path Viewer component in dashboard
 *
 * NEW: Visualizes multi-touch attribution journey
 *
 * @param p_signal_id TEXT - Signal ID to trace (e.g., "dist_linkedin_post_123")
 *
 * Returns:
 * - event_id: UUID of event
 * - signal_id: Journey tracking ID
 * - event_type: Type of event
 * - target_type: Type of target
 * - target_id: UUID of target
 * - target_name: Name of target (article title, tutor name, listing title, etc.)
 * - source_component: Where event originated
 * - distribution_id: Distribution source (if applicable)
 * - created_at: Event timestamp
 * - time_since_first: Time since first event in journey
 */
CREATE OR REPLACE FUNCTION get_signal_journey(
  p_signal_id TEXT
)
RETURNS TABLE (
  event_id UUID,
  signal_id UUID,
  event_type TEXT,
  target_type TEXT,
  target_id UUID,
  target_name TEXT,
  source_component TEXT,
  distribution_id TEXT,
  created_at TIMESTAMPTZ,
  time_since_first INTERVAL
) AS $$
BEGIN
  RETURN QUERY
  WITH journey_events AS (
    SELECT
      se.id AS event_id,
      se.signal_id,
      se.event_type,
      se.target_type,
      se.target_id,
      se.source_component,
      se.metadata->>'distribution_id' AS distribution_id,
      se.created_at,
      FIRST_VALUE(se.created_at) OVER (ORDER BY se.created_at) AS first_event_time
    FROM signal_events se
    WHERE se.signal_id::TEXT = p_signal_id
    ORDER BY se.created_at
  )
  SELECT
    je.event_id,
    je.signal_id,
    je.event_type,
    je.target_type,
    je.target_id,
    CASE
      WHEN je.target_type = 'article' THEN (SELECT title FROM blog_articles WHERE id = je.target_id)
      WHEN je.target_type = 'tutor' THEN (SELECT full_name FROM profiles WHERE id = je.target_id)
      WHEN je.target_type = 'listing' THEN (SELECT title FROM listings WHERE id = je.target_id)
      WHEN je.target_type = 'booking' THEN 'Booking #' || je.target_id::TEXT
      ELSE je.target_type
    END AS target_name,
    je.source_component,
    je.distribution_id,
    je.created_at,
    je.created_at - je.first_event_time AS time_since_first
  FROM journey_events je
  ORDER BY je.created_at;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RPC 6: get_attribution_comparison (NEW for Week 3)
-- ============================================================================

/**
 * Compares different attribution models for the same conversion events.
 * Used for: Understanding attribution model impact
 *
 * NEW: Multi-touch attribution analysis
 *
 * @param p_days INTEGER - Number of days to look back
 *
 * Returns:
 * - model_type: Attribution model (first-touch, last-touch, linear)
 * - attributed_articles: Count of articles credited
 * - attributed_bookings: Count of bookings attributed
 * - attributed_revenue: Total revenue attributed
 */
CREATE OR REPLACE FUNCTION get_attribution_comparison(
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  model_type TEXT,
  attributed_articles BIGINT,
  attributed_bookings BIGINT,
  attributed_revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  -- First-touch attribution (credit first article in journey)
  WITH first_touch AS (
    SELECT
      se.content_id AS article_id,
      COUNT(DISTINCT b.id) AS booking_count,
      SUM(b.amount) AS revenue
    FROM signal_events se
    INNER JOIN bookings b
      ON se.target_type = 'booking'
      AND se.target_id::TEXT = b.id::TEXT
    WHERE se.content_type = 'article'
      AND se.created_at >= NOW() - (p_days || ' days')::INTERVAL
      AND se.created_at = (
        SELECT MIN(se2.created_at)
        FROM signal_events se2
        WHERE se2.signal_id = se.signal_id
        AND se2.content_type = 'article'
      )
    GROUP BY se.content_id
  ),
  -- Last-touch attribution (credit last article before booking)
  last_touch AS (
    SELECT
      se.content_id AS article_id,
      COUNT(DISTINCT b.id) AS booking_count,
      SUM(b.amount) AS revenue
    FROM signal_events se
    INNER JOIN bookings b
      ON se.target_type = 'booking'
      AND se.target_id::TEXT = b.id::TEXT
    WHERE se.content_type = 'article'
      AND se.created_at >= NOW() - (p_days || ' days')::INTERVAL
      AND se.created_at = (
        SELECT MAX(se2.created_at)
        FROM signal_events se2
        WHERE se2.signal_id = se.signal_id
        AND se2.content_type = 'article'
        AND se2.created_at <= b.created_at
      )
    GROUP BY se.content_id
  ),
  -- Linear attribution (credit all articles equally)
  linear AS (
    SELECT
      se.content_id AS article_id,
      COUNT(DISTINCT b.id)::NUMERIC / COUNT(DISTINCT se.content_id) AS booking_count,
      SUM(b.amount)::NUMERIC / COUNT(DISTINCT se.content_id) AS revenue
    FROM signal_events se
    INNER JOIN bookings b
      ON se.target_type = 'booking'
      AND se.target_id::TEXT = b.id::TEXT
    WHERE se.content_type = 'article'
      AND se.created_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY se.content_id, b.id
  )
  SELECT
    'first-touch'::TEXT AS model_type,
    COUNT(DISTINCT ft.article_id) AS attributed_articles,
    SUM(ft.booking_count)::BIGINT AS attributed_bookings,
    SUM(ft.revenue) AS attributed_revenue
  FROM first_touch ft
  UNION ALL
  SELECT
    'last-touch'::TEXT AS model_type,
    COUNT(DISTINCT lt.article_id) AS attributed_articles,
    SUM(lt.booking_count)::BIGINT AS attributed_bookings,
    SUM(lt.revenue) AS attributed_revenue
  FROM last_touch lt
  UNION ALL
  SELECT
    'linear'::TEXT AS model_type,
    COUNT(DISTINCT l.article_id) AS attributed_articles,
    SUM(l.booking_count)::BIGINT AS attributed_bookings,
    SUM(l.revenue) AS attributed_revenue
  FROM linear l;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these after migration to verify RPCs work:

-- 1. Test get_article_performance_summary
-- SELECT * FROM get_article_performance_summary(30, 7) LIMIT 5;

-- 2. Test get_conversion_funnel
-- SELECT * FROM get_conversion_funnel(30, 7) LIMIT 5;

-- 3. Test get_blog_assisted_listings
-- SELECT * FROM get_blog_assisted_listings(30, 7) LIMIT 5;

-- 4. Test get_time_to_conversion_distribution
-- SELECT * FROM get_time_to_conversion_distribution(30, 7);

-- 5. Test get_signal_journey (replace with actual signal_id)
-- SELECT * FROM get_signal_journey('session_550e8400-e29b-41d4-a716-446655440000');

-- 6. Test get_attribution_comparison
-- SELECT * FROM get_attribution_comparison(30);
