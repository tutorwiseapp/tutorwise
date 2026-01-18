/**
 * Migration: 191_rename_blog_to_resources.sql
 * Purpose: Rename all blog tables to resource tables (Blog → Resources rebranding)
 * Created: 2026-01-18
 *
 * STRATEGY:
 * - Rename tables: blog_* → resource_*
 * - Rename indexes: idx_blog_* → idx_resource_*
 * - Rename functions: *_blog_* → *_resource_*
 * - Rename triggers: trigger_*_blog_* → trigger_*_resource_*
 * - Create backward compatibility views (6-month deprecation)
 *
 * ROLLBACK:
 * - Reverse all renames
 * - Drop compatibility views
 */

-- ============================================
-- PHASE 1: RENAME TABLES
-- ============================================

-- Main content table
ALTER TABLE IF EXISTS public.blog_articles RENAME TO resource_articles;

-- SEO analytics tables
ALTER TABLE IF EXISTS public.blog_article_views RENAME TO resource_article_views;
ALTER TABLE IF EXISTS public.blog_search_queries RENAME TO resource_search_queries;

-- Attribution and saves tables
ALTER TABLE IF EXISTS public.blog_article_saves RENAME TO resource_article_saves;
ALTER TABLE IF EXISTS public.blog_listing_links RENAME TO resource_listing_links;
ALTER TABLE IF EXISTS public.blog_attribution_events RENAME TO resource_attribution_events;

-- ============================================
-- PHASE 2: RENAME INDEXES
-- ============================================

-- resource_articles indexes
ALTER INDEX IF EXISTS idx_blog_articles_slug RENAME TO idx_resource_articles_slug;
ALTER INDEX IF EXISTS idx_blog_articles_category RENAME TO idx_resource_articles_category;
ALTER INDEX IF EXISTS idx_blog_articles_status RENAME TO idx_resource_articles_status;
ALTER INDEX IF EXISTS idx_blog_articles_published_at RENAME TO idx_resource_articles_published_at;
ALTER INDEX IF EXISTS idx_blog_articles_author_id RENAME TO idx_resource_articles_author_id;

-- resource_article_views indexes
ALTER INDEX IF EXISTS idx_blog_article_views_article_id RENAME TO idx_resource_article_views_article_id;
ALTER INDEX IF EXISTS idx_blog_article_views_viewed_at RENAME TO idx_resource_article_views_viewed_at;
ALTER INDEX IF EXISTS idx_blog_article_views_referrer RENAME TO idx_resource_article_views_referrer;

-- resource_search_queries indexes
ALTER INDEX IF EXISTS idx_blog_search_queries_query RENAME TO idx_resource_search_queries_query;
ALTER INDEX IF EXISTS idx_blog_search_queries_searched_at RENAME TO idx_resource_search_queries_searched_at;

-- resource_article_saves indexes
ALTER INDEX IF EXISTS idx_blog_article_saves_article_id RENAME TO idx_resource_article_saves_article_id;
ALTER INDEX IF EXISTS idx_blog_article_saves_profile_id RENAME TO idx_resource_article_saves_profile_id;
ALTER INDEX IF EXISTS idx_blog_article_saves_composite RENAME TO idx_resource_article_saves_composite;

-- resource_listing_links indexes
ALTER INDEX IF EXISTS idx_blog_listing_links_article_id RENAME TO idx_resource_listing_links_article_id;
ALTER INDEX IF EXISTS idx_blog_listing_links_listing_id RENAME TO idx_resource_listing_links_listing_id;
ALTER INDEX IF EXISTS idx_blog_listing_links_composite RENAME TO idx_resource_listing_links_composite;

-- resource_attribution_events indexes
ALTER INDEX IF EXISTS idx_blog_attribution_events_session_id RENAME TO idx_resource_attribution_events_session_id;
ALTER INDEX IF EXISTS idx_blog_attribution_events_article_id RENAME TO idx_resource_attribution_events_article_id;
ALTER INDEX IF EXISTS idx_blog_attribution_events_listing_id RENAME TO idx_resource_attribution_events_listing_id;
ALTER INDEX IF EXISTS idx_blog_attribution_events_event_type RENAME TO idx_resource_attribution_events_event_type;
ALTER INDEX IF EXISTS idx_blog_attribution_events_timestamp RENAME TO idx_resource_attribution_events_timestamp;
ALTER INDEX IF EXISTS idx_blog_attribution_events_profile_id RENAME TO idx_resource_attribution_events_profile_id;

-- ============================================
-- PHASE 3: RENAME FUNCTIONS
-- ============================================

-- Updated_at trigger functions
ALTER FUNCTION IF EXISTS update_blog_articles_updated_at() RENAME TO update_resource_articles_updated_at;
ALTER FUNCTION IF EXISTS update_blog_article_saves_updated_at() RENAME TO update_resource_article_saves_updated_at;

-- Comprehensive fix for Migration 191 RPC functions
-- These functions are renamed from get_article_* to get_resource_article_*
-- They query signal_events table directly (source of truth)
-- Copied from Migration 187 with table name updates: blog_articles → resource_articles

-- ============================================================================
-- 1. get_resource_article_performance_summary
-- ============================================================================
DROP FUNCTION IF EXISTS get_resource_article_performance_summary(integer, integer);

CREATE OR REPLACE FUNCTION get_resource_article_performance_summary(
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
  signal_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH article_views AS (
    SELECT
      ra.id AS article_id,
      ra.title AS article_title,
      ra.slug AS article_slug,
      ra.category,
      ra.published_at,
      COALESCE(SUM(sm.impressions), 0) AS views
    FROM resource_articles ra
    LEFT JOIN signal_metrics sm
      ON ra.id = sm.content_id
      AND sm.content_type = 'article'
      AND sm.date >= CURRENT_DATE - p_days
    WHERE ra.published_at IS NOT NULL
    GROUP BY ra.id, ra.title, ra.slug, ra.category, ra.published_at
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
    COALESCE(asig.signal_count, 0) AS signal_count
  FROM article_views av
  LEFT JOIN article_interactions ai ON av.article_id = ai.article_id
  LEFT JOIN article_wiselist_saves aws ON av.article_id = aws.article_id
  LEFT JOIN article_bookings ab ON av.article_id = ab.article_id
  LEFT JOIN article_signals asig ON av.article_id = asig.article_id
  ORDER BY booking_revenue DESC NULLS LAST, views_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. get_resource_conversion_funnel
-- ============================================================================
DROP FUNCTION IF EXISTS get_resource_conversion_funnel(integer, integer);

CREATE OR REPLACE FUNCTION get_resource_conversion_funnel(
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
      ra.id AS article_id,
      ra.title AS article_title,
      COALESCE(SUM(sm.impressions), 0) AS views
    FROM resource_articles ra
    LEFT JOIN signal_metrics sm
      ON ra.id = sm.content_id
      AND sm.content_type = 'article'
      AND sm.date >= CURRENT_DATE - p_days
    WHERE ra.published_at IS NOT NULL
    GROUP BY ra.id, ra.title
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
  WHERE av.views > 0
  ORDER BY bookings DESC NULLS LAST, views DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. get_resource_assisted_listings
-- ============================================================================
DROP FUNCTION IF EXISTS get_resource_assisted_listings(integer, integer, integer);

CREATE OR REPLACE FUNCTION get_resource_assisted_listings(
  p_days INTEGER DEFAULT 30,
  p_attribution_window_days INTEGER DEFAULT 7,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  listing_id UUID,
  listing_title VARCHAR(200),
  tutor_name TEXT,
  views_from_resources BIGINT,
  bookings_from_resources BIGINT,
  revenue_from_resources NUMERIC,
  top_referring_article_title TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH listing_interactions AS (
    SELECT
      se.target_id AS listing_id,
      COUNT(DISTINCT se.id) FILTER (WHERE se.event_type = 'impression') AS impression_count,
      COUNT(DISTINCT se.id) FILTER (WHERE se.event_type = 'click') AS click_count
    FROM signal_events se
    WHERE se.content_type = 'article'
      AND se.target_type = 'listing'
      AND se.event_type IN ('impression', 'click')
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
      AND b.listing_id::TEXT = se.target_id::TEXT
      AND b.created_at >= se.created_at
      AND b.created_at <= se.created_at + (p_attribution_window_days || ' days')::INTERVAL
    WHERE se.content_type = 'article'
      AND se.created_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY se.target_id
  ),
  top_articles AS (
    SELECT DISTINCT ON (se.target_id)
      se.target_id AS listing_id,
      ra.title AS article_title
    FROM signal_events se
    INNER JOIN resource_articles ra ON ra.id = se.content_id
    WHERE se.content_type = 'article'
      AND se.target_type = 'listing'
      AND se.event_type IN ('impression', 'click')
      AND se.created_at >= NOW() - (p_days || ' days')::INTERVAL
    ORDER BY se.target_id, se.created_at DESC
  )
  SELECT
    l.id AS listing_id,
    l.title AS listing_title,
    p.first_name || ' ' || p.last_name AS tutor_name,
    COALESCE(li.impression_count + li.click_count, 0) AS views_from_resources,
    COALESCE(lb.booking_count, 0) AS bookings_from_resources,
    COALESCE(lb.booking_revenue, 0) AS revenue_from_resources,
    ta.article_title AS top_referring_article_title
  FROM listings l
  INNER JOIN profiles p ON l.profile_id = p.id
  LEFT JOIN listing_interactions li ON l.id = li.listing_id
  LEFT JOIN listing_bookings lb ON l.id = lb.listing_id
  LEFT JOIN top_articles ta ON l.id = ta.listing_id
  WHERE l.status = 'active'
    AND (li.impression_count > 0 OR li.click_count > 0 OR lb.booking_count > 0)
  ORDER BY revenue_from_resources DESC NULLS LAST, views_from_resources DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. get_time_to_conversion_distribution (renaming from get_time_to_conversion_distribution)
-- ============================================================================
DROP FUNCTION IF EXISTS get_time_to_conversion_distribution(integer, integer);

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PHASE 4: RENAME TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS trigger_update_blog_articles_updated_at ON public.resource_articles;
CREATE TRIGGER trigger_update_resource_articles_updated_at
  BEFORE UPDATE ON public.resource_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_articles_updated_at();

DROP TRIGGER IF EXISTS trigger_update_blog_article_saves_updated_at ON public.resource_article_saves;
CREATE TRIGGER trigger_update_resource_article_saves_updated_at
  BEFORE UPDATE ON public.resource_article_saves
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_article_saves_updated_at();

-- ============================================
-- PHASE 5: BACKWARD COMPATIBILITY REMOVED
-- ============================================
-- No backward compatibility views created.
-- All application code has been updated to use resource_* naming.
-- Zero technical debt approach.

-- ============================================
-- PHASE 6: UPDATE GRANTS
-- ============================================

-- resource_articles grants (same as before)
GRANT SELECT ON public.resource_articles TO anon;
GRANT ALL ON public.resource_articles TO authenticated;
GRANT ALL ON public.resource_articles TO service_role;

-- resource_article_views grants
GRANT SELECT ON public.resource_article_views TO anon;
GRANT ALL ON public.resource_article_views TO authenticated;
GRANT ALL ON public.resource_article_views TO service_role;

-- resource_search_queries grants
GRANT ALL ON public.resource_search_queries TO anon;
GRANT ALL ON public.resource_search_queries TO authenticated;
GRANT ALL ON public.resource_search_queries TO service_role;

-- resource_article_saves grants
GRANT ALL ON public.resource_article_saves TO authenticated;
GRANT ALL ON public.resource_article_saves TO service_role;

-- resource_listing_links grants
GRANT ALL ON public.resource_listing_links TO authenticated;
GRANT ALL ON public.resource_listing_links TO service_role;

-- resource_attribution_events grants
GRANT INSERT, SELECT ON public.resource_attribution_events TO anon;
GRANT ALL ON public.resource_attribution_events TO authenticated;
GRANT ALL ON public.resource_attribution_events TO service_role;

-- RPC function grants
GRANT EXECUTE ON FUNCTION get_resource_article_performance_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_resource_assisted_listings TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversion_funnel TO authenticated;
GRANT EXECUTE ON FUNCTION get_time_to_conversion_distribution TO authenticated;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- ============================================
-- PHASE 7: CREATE NEW RPC FUNCTIONS
-- ============================================

-- Replace increment_blog_link_click with increment_resource_link_click
DROP FUNCTION IF EXISTS increment_blog_link_click(UUID, UUID);

CREATE OR REPLACE FUNCTION increment_resource_link_click(
  p_article_id UUID,
  p_listing_id UUID
)
RETURNS void AS $$
BEGIN
  -- Update click_count in signal_content_embeds directly (the source table)
  UPDATE signal_content_embeds
  SET
    click_count = click_count + 1,
    last_shown_at = NOW()
  WHERE content_type = 'article'
    AND content_id = p_article_id
    AND embed_type = 'listing'
    AND embed_id = p_listing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_resource_link_click IS
  'Increment click count for resource article → listing link.
   Updates signal_content_embeds directly (source of truth).';

GRANT EXECUTE ON FUNCTION increment_resource_link_click TO authenticated;
GRANT EXECUTE ON FUNCTION increment_resource_link_click TO anon;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 191 complete: Blog tables renamed to Resource tables';
  RAISE NOTICE 'Zero technical debt: No backward compatibility views created';
  RAISE NOTICE 'All application code updated to use resource_* naming';
  RAISE NOTICE 'Next step: Run migration 192 to update RBAC permissions';
END $$;
