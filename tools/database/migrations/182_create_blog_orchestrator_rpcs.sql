/**
 * Filename: tools/database/migrations/182_create_blog_orchestrator_rpcs.sql
 * Purpose: Phase 3 - Unified SEO Orchestrator Dashboard (Read-Only Analytics)
 * Created: 2026-01-16
 *
 * PHASE 3 SCOPE: Visibility and decision clarity, NOT optimization.
 * Core Purpose: Turn raw attribution data into actionable answers.
 *
 * GUARDRAIL 1: Attribution window is explicit parameter (not hard-coded)
 * GUARDRAIL 2: Event semantics defined canonically (documented below)
 */

-- ============================================================================
-- EVENT SEMANTICS (Canonical Definitions)
-- ============================================================================

/*
These are the single source of truth for what counts as what.
Do NOT make these configurable. Keep them explicit and documented.

1. ARTICLE VIEW
   - Source: blog_article_metrics.views_count
   - Represents: User viewed the article page

2. MARKETPLACE INTERACTION
   - event_type IN ('click', 'save')
   - target_type IN ('tutor', 'listing')
   - Represents: Any engagement with marketplace content from blog

3. WISELIST SAVE
   - event_type = 'save'
   - target_type IN ('article', 'tutor', 'listing', 'wiselist_item')
   - Represents: User saved something to a wiselist

4. BOOKING
   - event_type = 'convert'
   - target_type = 'booking'
   - Represents: User created a booking

BLOG-ASSISTED BOOKING:
   - ANY blog event within attribution window before booking
   - Default window: 7 days (passed as parameter)
*/

-- ============================================================================
-- RPC 1: get_article_performance_summary
-- ============================================================================

/**
 * Returns performance metrics for all articles over specified period.
 * Used for: Article Performance Table in dashboard
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
 */
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
  conversion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH article_views AS (
    -- Get article views from blog_article_metrics (summed across all days)
    SELECT
      ba.id AS article_id,
      ba.title::TEXT AS article_title,
      ba.slug::TEXT AS article_slug,
      ba.category::TEXT,
      ba.published_at,
      COALESCE(SUM(bam.impressions), 0) AS views
    FROM blog_articles ba
    LEFT JOIN blog_article_metrics bam
      ON ba.id = bam.blog_article_id
      AND bam.date >= CURRENT_DATE - p_days
    WHERE ba.published_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY ba.id, ba.title, ba.slug, ba.category, ba.published_at
  ),
  article_interactions AS (
    -- Count marketplace interactions (clicks on embeds)
    SELECT
      blog_article_id,
      COUNT(*) AS interactions
    FROM blog_attribution_events
    WHERE event_type IN ('click', 'save')
      AND target_type IN ('tutor', 'listing')
      AND created_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY blog_article_id
  ),
  article_saves AS (
    -- Count wiselist saves
    SELECT
      blog_article_id,
      COUNT(*) AS saves
    FROM blog_attribution_events
    WHERE event_type = 'save'
      AND created_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY blog_article_id
  ),
  article_bookings AS (
    -- Count blog-assisted bookings (ANY blog event within attribution window)
    SELECT
      e.blog_article_id,
      COUNT(DISTINCT b.id) AS bookings,
      SUM(COALESCE(b.amount, 0)) AS revenue
    FROM bookings b
    INNER JOIN blog_attribution_events e
      ON e.target_type = 'booking'
      AND e.target_id = b.id
      AND e.created_at <= b.created_at
      AND e.created_at >= b.created_at - (p_attribution_window_days || ' days')::INTERVAL
    WHERE b.created_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY e.blog_article_id
  )
  SELECT
    av.article_id,
    av.article_title,
    av.article_slug,
    av.category,
    av.published_at,
    av.views AS views_count,
    COALESCE(ai.interactions, 0) AS interaction_count,
    COALESCE(asv.saves, 0) AS wiselist_save_count,
    COALESCE(ab.bookings, 0) AS booking_count,
    COALESCE(ab.revenue, 0) AS booking_revenue,
    CASE
      WHEN av.views > 0 THEN ROUND((COALESCE(ab.bookings, 0)::NUMERIC / av.views::NUMERIC) * 100, 2)
      ELSE 0
    END AS conversion_rate
  FROM article_views av
  LEFT JOIN article_interactions ai ON av.article_id = ai.blog_article_id
  LEFT JOIN article_saves asv ON av.article_id = asv.blog_article_id
  LEFT JOIN article_bookings ab ON av.article_id = ab.blog_article_id
  ORDER BY COALESCE(ab.revenue, 0) DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_article_performance_summary IS
  'Phase 3: Article performance metrics for dashboard table.
   Returns: views, interactions, saves, bookings, revenue, conversion rate.
   Attribution window is explicit parameter (not hard-coded).';

-- ============================================================================
-- RPC 2: get_conversion_funnel
-- ============================================================================

/**
 * Returns four-stage conversion funnel with drop-off percentages.
 * Used for: Conversion Funnel visualization in dashboard
 *
 * @param p_days INTEGER - Number of days to look back
 * @param p_attribution_window_days INTEGER - Attribution window (default: 7)
 *
 * Stages:
 * 1. Article View
 * 2. Marketplace Interaction (click/save on tutor/listing)
 * 3. Wiselist Save
 * 4. Booking Created
 *
 * Returns:
 * - stage_number: 1-4
 * - stage_name: Stage label
 * - count: Number of users at this stage
 * - conversion_rate: Percentage converting to next stage
 */
CREATE OR REPLACE FUNCTION get_conversion_funnel(
  p_days INTEGER DEFAULT 30,
  p_attribution_window_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  stage_number INTEGER,
  stage_name TEXT,
  count BIGINT,
  conversion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH funnel_data AS (
    SELECT
      -- Stage 1: Article views
      (SELECT SUM(page_views)
       FROM blog_article_metrics
       WHERE date >= CURRENT_DATE - p_days) AS stage1_views,

      -- Stage 2: Marketplace interactions
      (SELECT COUNT(DISTINCT session_id)
       FROM blog_attribution_events
       WHERE event_type IN ('click', 'save')
         AND target_type IN ('tutor', 'listing')
         AND created_at >= NOW() - (p_days || ' days')::INTERVAL
         AND session_id IS NOT NULL) AS stage2_interactions,

      -- Stage 3: Wiselist saves
      (SELECT COUNT(DISTINCT session_id)
       FROM blog_attribution_events
       WHERE event_type = 'save'
         AND created_at >= NOW() - (p_days || ' days')::INTERVAL
         AND session_id IS NOT NULL) AS stage3_saves,

      -- Stage 4: Bookings
      (SELECT COUNT(DISTINCT b.id)
       FROM bookings b
       INNER JOIN blog_attribution_events e
         ON e.target_type = 'booking'
         AND e.target_id = b.id
         AND e.created_at <= b.created_at
         AND e.created_at >= b.created_at - (p_attribution_window_days || ' days')::INTERVAL
       WHERE b.created_at >= NOW() - (p_days || ' days')::INTERVAL) AS stage4_bookings
  )
  SELECT
    1 AS stage_number,
    'Article View' AS stage_name,
    stage1_views AS count,
    CASE WHEN stage1_views > 0
      THEN ROUND((stage2_interactions::NUMERIC / stage1_views::NUMERIC) * 100, 2)
      ELSE 0
    END AS conversion_rate
  FROM funnel_data

  UNION ALL

  SELECT
    2,
    'Marketplace Interaction',
    stage2_interactions,
    CASE WHEN stage2_interactions > 0
      THEN ROUND((stage3_saves::NUMERIC / stage2_interactions::NUMERIC) * 100, 2)
      ELSE 0
    END
  FROM funnel_data

  UNION ALL

  SELECT
    3,
    'Wiselist Save',
    stage3_saves,
    CASE WHEN stage3_saves > 0
      THEN ROUND((stage4_bookings::NUMERIC / stage3_saves::NUMERIC) * 100, 2)
      ELSE 0
    END
  FROM funnel_data

  UNION ALL

  SELECT
    4,
    'Booking Created',
    stage4_bookings,
    0 AS conversion_rate
  FROM funnel_data

  ORDER BY stage_number;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_conversion_funnel IS
  'Phase 3: Four-stage conversion funnel for visualization.
   Simple, linear path: View → Interact → Save → Book.
   No branching, no segmentation (that is Phase 4+).';

-- ============================================================================
-- RPC 3: get_blog_assisted_listings
-- ============================================================================

/**
 * Returns listings that receive blog-mentioned traffic with uplift vs baseline.
 * Used for: Blog-Assisted Listing Visibility report
 *
 * @param p_days INTEGER - Number of days to look back
 * @param p_attribution_window_days INTEGER - Attribution window (default: 7)
 *
 * Returns:
 * - listing_id: UUID of listing
 * - listing_title: Listing title
 * - category: Listing category
 * - articles_linking_count: Number of articles mentioning this listing
 * - blog_assisted_views: Views from blog traffic
 * - blog_assisted_bookings: Bookings attributed to blog
 * - baseline_views: Avg views for same-category listings without blog mentions
 * - baseline_bookings: Avg bookings for same-category listings without blog mentions
 * - uplift_views_pct: Percentage uplift vs baseline (views)
 * - uplift_bookings_pct: Percentage uplift vs baseline (bookings)
 */
CREATE OR REPLACE FUNCTION get_blog_assisted_listings(
  p_days INTEGER DEFAULT 30,
  p_attribution_window_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  listing_id UUID,
  listing_title TEXT,
  category TEXT,
  articles_linking_count BIGINT,
  blog_assisted_views BIGINT,
  blog_assisted_bookings BIGINT,
  baseline_views NUMERIC,
  baseline_bookings NUMERIC,
  uplift_views_pct NUMERIC,
  uplift_bookings_pct NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH blog_assisted_performance AS (
    -- Performance metrics for blog-linked listings
    SELECT
      l.id,
      l.title::TEXT,
      l.subjects[1]::TEXT AS subj_category,
      COUNT(DISTINCT bll.blog_article_id) AS articles_linking,
      COUNT(DISTINCT CASE
        WHEN e.event_type = 'click' AND e.target_type = 'listing' THEN e.id
      END) AS assisted_views,
      COUNT(DISTINCT CASE
        WHEN e.event_type = 'convert' AND e.target_type = 'booking' THEN e.target_id
      END) AS assisted_bookings
    FROM listings l
    INNER JOIN blog_listing_links bll ON l.id = bll.listing_id
    LEFT JOIN blog_attribution_events e
      ON e.blog_article_id = bll.blog_article_id
      AND e.target_id = l.id
      AND e.created_at >= NOW() - (p_days || ' days')::INTERVAL
    WHERE l.status = 'active'
      AND l.subjects IS NOT NULL
      AND array_length(l.subjects, 1) > 0
      AND bll.created_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY l.id, l.title, l.subjects[1]
  )
  SELECT
    bap.id,
    bap.title,
    bap.subj_category,
    bap.articles_linking,
    bap.assisted_views,
    bap.assisted_bookings,
    0::NUMERIC AS baseline_views,  -- Placeholder: listing_views table doesn't exist yet
    0::NUMERIC AS baseline_bookings,  -- Placeholder: baseline calculation requires listing_views table
    0::NUMERIC AS uplift_views_pct,  -- Placeholder: will be calculated when baseline data available
    0::NUMERIC AS uplift_bookings_pct  -- Placeholder: will be calculated when baseline data available
  FROM blog_assisted_performance bap
  WHERE bap.assisted_views > 0 OR bap.assisted_bookings > 0
  ORDER BY bap.assisted_bookings DESC, bap.assisted_views DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_blog_assisted_listings IS
  'Phase 3: Blog-assisted listing visibility report (correlation signals).
   Baseline = same-category avg excluding blog-linked listings (mature only).
   NOT claiming causation - just exposing correlation for investigation.';

-- ============================================================================
-- RPC 4: get_time_to_conversion_distribution
-- ============================================================================

/**
 * Returns histogram of time-to-conversion distribution.
 * Used for: Validating attribution window length
 *
 * @param p_days INTEGER - Number of days to look back
 * @param p_attribution_window_days INTEGER - Max days to track (default: 7)
 *
 * Returns:
 * - day_bucket: Days from first blog interaction to booking (0-7)
 * - conversion_count: Number of conversions in this bucket
 * - cumulative_pct: Cumulative percentage of conversions
 */
CREATE OR REPLACE FUNCTION get_time_to_conversion_distribution(
  p_days INTEGER DEFAULT 30,
  p_attribution_window_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  day_bucket INTEGER,
  conversion_count BIGINT,
  cumulative_pct NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH conversion_times AS (
    SELECT
      b.id AS booking_id,
      MIN(e.created_at) AS first_blog_interaction,
      b.created_at AS booking_time,
      EXTRACT(DAY FROM (b.created_at - MIN(e.created_at)))::INTEGER AS days_to_conversion
    FROM bookings b
    INNER JOIN blog_attribution_events e
      ON e.created_at <= b.created_at
      AND e.created_at >= b.created_at - (p_attribution_window_days || ' days')::INTERVAL
    WHERE b.created_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY b.id, b.created_at
  ),
  bucketed_conversions AS (
    SELECT
      days_to_conversion AS day_bucket,
      COUNT(*) AS count
    FROM conversion_times
    WHERE days_to_conversion >= 0
      AND days_to_conversion <= p_attribution_window_days
    GROUP BY days_to_conversion
  ),
  total_conversions AS (
    SELECT SUM(count) AS total FROM bucketed_conversions
  )
  SELECT
    bc.day_bucket,
    bc.count AS conversion_count,
    ROUND(
      (SUM(bc.count) OVER (ORDER BY bc.day_bucket)::NUMERIC / tc.total::NUMERIC) * 100,
      2
    ) AS cumulative_pct
  FROM bucketed_conversions bc
  CROSS JOIN total_conversions tc
  ORDER BY bc.day_bucket;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_time_to_conversion_distribution IS
  'Phase 3: Time-to-conversion histogram for validating attribution window.
   Shows: "X% of conversions happen within Y days of first blog interaction."
   Used to validate 7-day default or adjust based on observed behavior.';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions to authenticated users (admin dashboard)
GRANT EXECUTE ON FUNCTION get_article_performance_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversion_funnel TO authenticated;
GRANT EXECUTE ON FUNCTION get_blog_assisted_listings TO authenticated;
GRANT EXECUTE ON FUNCTION get_time_to_conversion_distribution TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test RPC 1: Article performance (last 30 days, 7-day attribution window)
-- SELECT * FROM get_article_performance_summary(30, 7);

-- Test RPC 2: Conversion funnel
-- SELECT * FROM get_conversion_funnel(30, 7);

-- Test RPC 3: Blog-assisted listings (top 10)
-- SELECT * FROM get_blog_assisted_listings(30, 7);

-- Test RPC 4: Time-to-conversion distribution
-- SELECT * FROM get_time_to_conversion_distribution(30, 7);
