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

-- RPC functions (Revenue Signal Analytics)
DROP FUNCTION IF EXISTS get_article_performance_summary(integer, integer);
CREATE OR REPLACE FUNCTION get_resource_article_performance_summary(
  p_days integer DEFAULT 30,
  p_attribution_window_days integer DEFAULT 7
)
RETURNS TABLE (
  article_id uuid,
  article_slug text,
  article_title text,
  total_views bigint,
  unique_visitors bigint,
  link_clicks bigint,
  listing_views bigint,
  bookings_made bigint,
  revenue_generated numeric,
  avg_time_to_conversion numeric,
  conversion_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ra.id AS article_id,
    ra.slug AS article_slug,
    ra.title AS article_title,
    COUNT(DISTINCT rae.id) FILTER (WHERE rae.event_type = 'article_view')::bigint AS total_views,
    COUNT(DISTINCT rae.session_id) FILTER (WHERE rae.event_type = 'article_view')::bigint AS unique_visitors,
    COUNT(DISTINCT rae.id) FILTER (WHERE rae.event_type = 'link_click')::bigint AS link_clicks,
    COUNT(DISTINCT rae.id) FILTER (WHERE rae.event_type = 'listing_view')::bigint AS listing_views,
    COUNT(DISTINCT rae.id) FILTER (WHERE rae.event_type = 'booking_made')::bigint AS bookings_made,
    COALESCE(SUM(rae.booking_amount) FILTER (WHERE rae.event_type = 'booking_made'), 0)::numeric AS revenue_generated,
    AVG(
      EXTRACT(EPOCH FROM (
        rae.timestamp -
        (SELECT MIN(rae2.timestamp)
         FROM resource_attribution_events rae2
         WHERE rae2.session_id = rae.session_id
           AND rae2.event_type = 'article_view')
      )) / 3600
    ) FILTER (WHERE rae.event_type = 'booking_made')::numeric AS avg_time_to_conversion,
    CASE
      WHEN COUNT(DISTINCT rae.session_id) FILTER (WHERE rae.event_type = 'article_view') > 0 THEN
        (COUNT(DISTINCT rae.id) FILTER (WHERE rae.event_type = 'booking_made')::numeric /
         COUNT(DISTINCT rae.session_id) FILTER (WHERE rae.event_type = 'article_view')::numeric * 100)
      ELSE 0
    END AS conversion_rate
  FROM resource_articles ra
  LEFT JOIN resource_attribution_events rae ON ra.id = rae.article_id
    AND rae.timestamp >= NOW() - (p_days || ' days')::interval
    AND rae.timestamp <= NOW()
    AND (
      rae.event_type != 'booking_made' OR
      EXTRACT(EPOCH FROM (rae.timestamp - (
        SELECT MIN(rae2.timestamp)
        FROM resource_attribution_events rae2
        WHERE rae2.session_id = rae.session_id
          AND rae2.event_type = 'article_view'
      ))) / 86400 <= p_attribution_window_days
    )
  WHERE ra.status = 'published'
  GROUP BY ra.id, ra.slug, ra.title
  ORDER BY revenue_generated DESC, total_views DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS get_blog_assisted_listings(integer, integer, integer);
CREATE OR REPLACE FUNCTION get_resource_assisted_listings(
  p_days integer DEFAULT 30,
  p_attribution_window_days integer DEFAULT 7,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  listing_id uuid,
  listing_title text,
  tutor_name text,
  views_from_resources bigint,
  bookings_from_resources bigint,
  revenue_from_resources numeric,
  top_referring_article_title text,
  visibility_score numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id AS listing_id,
    l.title AS listing_title,
    p.first_name || ' ' || p.last_name AS tutor_name,
    COUNT(DISTINCT rae.id) FILTER (WHERE rae.event_type = 'listing_view')::bigint AS views_from_resources,
    COUNT(DISTINCT rae.id) FILTER (WHERE rae.event_type = 'booking_made')::bigint AS bookings_from_resources,
    COALESCE(SUM(rae.booking_amount) FILTER (WHERE rae.event_type = 'booking_made'), 0)::numeric AS revenue_from_resources,
    (
      SELECT ra.title
      FROM resource_articles ra
      JOIN resource_attribution_events rae2 ON ra.id = rae2.article_id
      WHERE rae2.listing_id = l.id
        AND rae2.event_type IN ('link_click', 'listing_view')
        AND rae2.timestamp >= NOW() - (p_days || ' days')::interval
      GROUP BY ra.id, ra.title
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) AS top_referring_article_title,
    (
      SELECT rll.visibility_score
      FROM resource_listing_links rll
      WHERE rll.listing_id = l.id
      ORDER BY rll.last_shown_at DESC NULLS LAST
      LIMIT 1
    ) AS visibility_score
  FROM listings l
  JOIN profiles p ON l.profile_id = p.id
  LEFT JOIN resource_attribution_events rae ON l.id = rae.listing_id
    AND rae.timestamp >= NOW() - (p_days || ' days')::interval
    AND rae.timestamp <= NOW()
    AND (
      rae.event_type != 'booking_made' OR
      EXTRACT(EPOCH FROM (rae.timestamp - (
        SELECT MIN(rae2.timestamp)
        FROM resource_attribution_events rae2
        WHERE rae2.session_id = rae.session_id
          AND rae2.event_type = 'article_view'
      ))) / 86400 <= p_attribution_window_days
    )
  WHERE l.status = 'active'
  GROUP BY l.id, l.title, p.first_name, p.last_name
  HAVING COUNT(DISTINCT rae.id) FILTER (WHERE rae.event_type IN ('listing_view', 'booking_made')) > 0
  ORDER BY revenue_from_resources DESC, views_from_resources DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS get_conversion_funnel(integer, integer);
CREATE OR REPLACE FUNCTION get_conversion_funnel(
  p_days integer DEFAULT 30,
  p_attribution_window_days integer DEFAULT 7
)
RETURNS TABLE (
  stage text,
  count bigint,
  percentage numeric
) AS $$
DECLARE
  total_article_views bigint;
BEGIN
  SELECT COUNT(DISTINCT session_id)
  INTO total_article_views
  FROM resource_attribution_events
  WHERE event_type = 'article_view'
    AND timestamp >= NOW() - (p_days || ' days')::interval;

  IF total_article_views = 0 THEN
    total_article_views := 1;
  END IF;

  RETURN QUERY
  WITH funnel_data AS (
    SELECT
      'Article Views' AS stage,
      1 AS stage_order,
      COUNT(DISTINCT session_id)::bigint AS stage_count
    FROM resource_attribution_events
    WHERE event_type = 'article_view'
      AND timestamp >= NOW() - (p_days || ' days')::interval

    UNION ALL

    SELECT
      'Link Clicks' AS stage,
      2 AS stage_order,
      COUNT(DISTINCT rae.session_id)::bigint AS stage_count
    FROM resource_attribution_events rae
    WHERE rae.event_type = 'link_click'
      AND rae.timestamp >= NOW() - (p_days || ' days')::interval
      AND EXISTS (
        SELECT 1
        FROM resource_attribution_events rae2
        WHERE rae2.session_id = rae.session_id
          AND rae2.event_type = 'article_view'
          AND rae2.timestamp <= rae.timestamp
      )

    UNION ALL

    SELECT
      'Listing Views' AS stage,
      3 AS stage_order,
      COUNT(DISTINCT rae.session_id)::bigint AS stage_count
    FROM resource_attribution_events rae
    WHERE rae.event_type = 'listing_view'
      AND rae.timestamp >= NOW() - (p_days || ' days')::interval
      AND EXISTS (
        SELECT 1
        FROM resource_attribution_events rae2
        WHERE rae2.session_id = rae.session_id
          AND rae2.event_type = 'article_view'
          AND rae2.timestamp <= rae.timestamp
      )

    UNION ALL

    SELECT
      'Bookings Made' AS stage,
      4 AS stage_order,
      COUNT(DISTINCT rae.session_id)::bigint AS stage_count
    FROM resource_attribution_events rae
    WHERE rae.event_type = 'booking_made'
      AND rae.timestamp >= NOW() - (p_days || ' days')::interval
      AND EXISTS (
        SELECT 1
        FROM resource_attribution_events rae2
        WHERE rae2.session_id = rae.session_id
          AND rae2.event_type = 'article_view'
          AND rae2.timestamp <= rae.timestamp
          AND EXTRACT(EPOCH FROM (rae.timestamp - rae2.timestamp)) / 86400 <= p_attribution_window_days
      )
  )
  SELECT
    fd.stage,
    fd.stage_count AS count,
    ROUND((fd.stage_count::numeric / total_article_views::numeric * 100), 2) AS percentage
  FROM funnel_data fd
  ORDER BY fd.stage_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS get_time_to_conversion_distribution(integer, integer);
CREATE OR REPLACE FUNCTION get_time_to_conversion_distribution(
  p_days integer DEFAULT 30,
  p_attribution_window_days integer DEFAULT 7
)
RETURNS TABLE (
  time_bucket text,
  conversion_count bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH conversion_times AS (
    SELECT
      EXTRACT(EPOCH FROM (
        rae.timestamp -
        (SELECT MIN(rae2.timestamp)
         FROM resource_attribution_events rae2
         WHERE rae2.session_id = rae.session_id
           AND rae2.event_type = 'article_view')
      )) / 3600 AS hours_to_conversion
    FROM resource_attribution_events rae
    WHERE rae.event_type = 'booking_made'
      AND rae.timestamp >= NOW() - (p_days || ' days')::interval
      AND EXISTS (
        SELECT 1
        FROM resource_attribution_events rae2
        WHERE rae2.session_id = rae.session_id
          AND rae2.event_type = 'article_view'
          AND EXTRACT(EPOCH FROM (rae.timestamp - rae2.timestamp)) / 86400 <= p_attribution_window_days
      )
  )
  SELECT
    CASE
      WHEN hours_to_conversion < 1 THEN '< 1 hour'
      WHEN hours_to_conversion < 24 THEN '1-24 hours'
      WHEN hours_to_conversion < 72 THEN '1-3 days'
      WHEN hours_to_conversion < 168 THEN '3-7 days'
      ELSE '7+ days'
    END AS time_bucket,
    COUNT(*)::bigint AS conversion_count
  FROM conversion_times
  GROUP BY time_bucket
  ORDER BY
    CASE time_bucket
      WHEN '< 1 hour' THEN 1
      WHEN '1-24 hours' THEN 2
      WHEN '1-3 days' THEN 3
      WHEN '3-7 days' THEN 4
      WHEN '7+ days' THEN 5
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
-- PHASE 5: CREATE BACKWARD COMPATIBILITY VIEWS
-- (6-month deprecation period)
-- ============================================

-- DEPRECATED: Use resource_articles instead
CREATE OR REPLACE VIEW blog_articles AS SELECT * FROM resource_articles;
COMMENT ON VIEW blog_articles IS 'DEPRECATED: Use resource_articles table instead. This view will be removed in 6 months (July 2026).';

-- DEPRECATED: Use resource_article_views instead
CREATE OR REPLACE VIEW blog_article_views AS SELECT * FROM resource_article_views;
COMMENT ON VIEW blog_article_views IS 'DEPRECATED: Use resource_article_views table instead. This view will be removed in 6 months (July 2026).';

-- DEPRECATED: Use resource_search_queries instead
CREATE OR REPLACE VIEW blog_search_queries AS SELECT * FROM resource_search_queries;
COMMENT ON VIEW blog_search_queries IS 'DEPRECATED: Use resource_search_queries table instead. This view will be removed in 6 months (July 2026).';

-- DEPRECATED: Use resource_article_saves instead
CREATE OR REPLACE VIEW blog_article_saves AS SELECT * FROM resource_article_saves;
COMMENT ON VIEW blog_article_saves IS 'DEPRECATED: Use resource_article_saves table instead. This view will be removed in 6 months (July 2026).';

-- DEPRECATED: Use resource_listing_links instead
CREATE OR REPLACE VIEW blog_listing_links AS SELECT * FROM resource_listing_links;
COMMENT ON VIEW blog_listing_links IS 'DEPRECATED: Use resource_listing_links table instead. This view will be removed in 6 months (July 2026).';

-- DEPRECATED: Use resource_attribution_events instead
CREATE OR REPLACE VIEW blog_attribution_events AS SELECT * FROM resource_attribution_events;
COMMENT ON VIEW blog_attribution_events IS 'DEPRECATED: Use resource_attribution_events table instead. This view will be removed in 6 months (July 2026).';

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

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 191 complete: Blog tables renamed to Resource tables';
  RAISE NOTICE 'Backward compatibility views created (6-month deprecation period)';
  RAISE NOTICE 'Next step: Run migration 192 to update RBAC permissions';
END $$;
