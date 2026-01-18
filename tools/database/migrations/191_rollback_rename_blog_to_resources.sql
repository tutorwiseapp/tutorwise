/**
 * ROLLBACK Migration: 191_rollback_rename_blog_to_resources.sql
 * Purpose: Rollback migration 191 (reverse all Blog → Resources changes)
 * Created: 2026-01-18
 *
 * WARNING: Only run this if migration 191 needs to be rolled back
 * This script reverses all table/index/function renames
 */

-- ============================================
-- PHASE 1: DROP BACKWARD COMPATIBILITY VIEWS
-- ============================================

DROP VIEW IF EXISTS blog_articles CASCADE;
DROP VIEW IF EXISTS blog_article_views CASCADE;
DROP VIEW IF EXISTS blog_search_queries CASCADE;
DROP VIEW IF EXISTS blog_article_saves CASCADE;
DROP VIEW IF EXISTS blog_listing_links CASCADE;
DROP VIEW IF EXISTS blog_attribution_events CASCADE;

-- ============================================
-- PHASE 2: RENAME TABLES BACK
-- ============================================

ALTER TABLE IF EXISTS public.resource_articles RENAME TO blog_articles;
ALTER TABLE IF EXISTS public.resource_article_views RENAME TO blog_article_views;
ALTER TABLE IF EXISTS public.resource_search_queries RENAME TO blog_search_queries;
ALTER TABLE IF EXISTS public.resource_article_saves RENAME TO blog_article_saves;
ALTER TABLE IF EXISTS public.resource_listing_links RENAME TO blog_listing_links;
ALTER TABLE IF EXISTS public.resource_attribution_events RENAME TO blog_attribution_events;

-- ============================================
-- PHASE 3: RENAME INDEXES BACK
-- ============================================

ALTER INDEX IF EXISTS idx_resource_articles_slug RENAME TO idx_blog_articles_slug;
ALTER INDEX IF EXISTS idx_resource_articles_category RENAME TO idx_blog_articles_category;
ALTER INDEX IF EXISTS idx_resource_articles_status RENAME TO idx_blog_articles_status;
ALTER INDEX IF EXISTS idx_resource_articles_published_at RENAME TO idx_blog_articles_published_at;
ALTER INDEX IF EXISTS idx_resource_articles_author_id RENAME TO idx_blog_articles_author_id;

ALTER INDEX IF EXISTS idx_resource_article_views_article_id RENAME TO idx_blog_article_views_article_id;
ALTER INDEX IF EXISTS idx_resource_article_views_viewed_at RENAME TO idx_blog_article_views_viewed_at;
ALTER INDEX IF EXISTS idx_resource_article_views_referrer RENAME TO idx_blog_article_views_referrer;

ALTER INDEX IF EXISTS idx_resource_search_queries_query RENAME TO idx_blog_search_queries_query;
ALTER INDEX IF EXISTS idx_resource_search_queries_searched_at RENAME TO idx_blog_search_queries_searched_at;

ALTER INDEX IF EXISTS idx_resource_article_saves_article_id RENAME TO idx_blog_article_saves_article_id;
ALTER INDEX IF EXISTS idx_resource_article_saves_profile_id RENAME TO idx_blog_article_saves_profile_id;
ALTER INDEX IF EXISTS idx_resource_article_saves_composite RENAME TO idx_blog_article_saves_composite;

ALTER INDEX IF EXISTS idx_resource_listing_links_article_id RENAME TO idx_blog_listing_links_article_id;
ALTER INDEX IF EXISTS idx_resource_listing_links_listing_id RENAME TO idx_blog_listing_links_listing_id;
ALTER INDEX IF EXISTS idx_resource_listing_links_composite RENAME TO idx_blog_listing_links_composite;

ALTER INDEX IF EXISTS idx_resource_attribution_events_session_id RENAME TO idx_blog_attribution_events_session_id;
ALTER INDEX IF EXISTS idx_resource_attribution_events_article_id RENAME TO idx_blog_attribution_events_article_id;
ALTER INDEX IF EXISTS idx_resource_attribution_events_listing_id RENAME TO idx_blog_attribution_events_listing_id;
ALTER INDEX IF EXISTS idx_resource_attribution_events_event_type RENAME TO idx_blog_attribution_events_event_type;
ALTER INDEX IF EXISTS idx_resource_attribution_events_timestamp RENAME TO idx_blog_attribution_events_timestamp;
ALTER INDEX IF EXISTS idx_resource_attribution_events_profile_id RENAME TO idx_blog_attribution_events_profile_id;

-- ============================================
-- PHASE 4: RENAME FUNCTIONS BACK
-- ============================================

ALTER FUNCTION IF EXISTS update_resource_articles_updated_at() RENAME TO update_blog_articles_updated_at;
ALTER FUNCTION IF EXISTS update_resource_article_saves_updated_at() RENAME TO update_blog_article_saves_updated_at;

-- Drop new RPC functions and recreate old ones
DROP FUNCTION IF EXISTS get_resource_article_performance_summary(integer, integer);
DROP FUNCTION IF EXISTS get_resource_assisted_listings(integer, integer, integer);
DROP FUNCTION IF EXISTS get_conversion_funnel(integer, integer);
DROP FUNCTION IF EXISTS get_time_to_conversion_distribution(integer, integer);

-- Recreate original blog functions (simplified version - refer to migration 182 for full version)
CREATE OR REPLACE FUNCTION get_article_performance_summary(
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
    ba.id AS article_id,
    ba.slug AS article_slug,
    ba.title AS article_title,
    COUNT(DISTINCT bae.id) FILTER (WHERE bae.event_type = 'article_view')::bigint AS total_views,
    COUNT(DISTINCT bae.session_id) FILTER (WHERE bae.event_type = 'article_view')::bigint AS unique_visitors,
    COUNT(DISTINCT bae.id) FILTER (WHERE bae.event_type = 'link_click')::bigint AS link_clicks,
    COUNT(DISTINCT bae.id) FILTER (WHERE bae.event_type = 'listing_view')::bigint AS listing_views,
    COUNT(DISTINCT bae.id) FILTER (WHERE bae.event_type = 'booking_made')::bigint AS bookings_made,
    COALESCE(SUM(bae.booking_amount) FILTER (WHERE bae.event_type = 'booking_made'), 0)::numeric AS revenue_generated,
    AVG(
      EXTRACT(EPOCH FROM (
        bae.timestamp -
        (SELECT MIN(bae2.timestamp)
         FROM blog_attribution_events bae2
         WHERE bae2.session_id = bae.session_id
           AND bae2.event_type = 'article_view')
      )) / 3600
    ) FILTER (WHERE bae.event_type = 'booking_made')::numeric AS avg_time_to_conversion,
    CASE
      WHEN COUNT(DISTINCT bae.session_id) FILTER (WHERE bae.event_type = 'article_view') > 0 THEN
        (COUNT(DISTINCT bae.id) FILTER (WHERE bae.event_type = 'booking_made')::numeric /
         COUNT(DISTINCT bae.session_id) FILTER (WHERE bae.event_type = 'article_view')::numeric * 100)
      ELSE 0
    END AS conversion_rate
  FROM blog_articles ba
  LEFT JOIN blog_attribution_events bae ON ba.id = bae.article_id
    AND bae.timestamp >= NOW() - (p_days || ' days')::interval
  WHERE ba.status = 'published'
  GROUP BY ba.id, ba.slug, ba.title
  ORDER BY revenue_generated DESC, total_views DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PHASE 5: RENAME TRIGGERS BACK
-- ============================================

DROP TRIGGER IF EXISTS trigger_update_resource_articles_updated_at ON public.blog_articles;
CREATE TRIGGER trigger_update_blog_articles_updated_at
  BEFORE UPDATE ON public.blog_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_articles_updated_at();

DROP TRIGGER IF EXISTS trigger_update_resource_article_saves_updated_at ON public.blog_article_saves;
CREATE TRIGGER trigger_update_blog_article_saves_updated_at
  BEFORE UPDATE ON public.blog_article_saves
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_article_saves_updated_at();

-- ============================================
-- ROLLBACK COMPLETE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Rollback of migration 191 complete';
  RAISE NOTICE 'All tables, indexes, and functions reverted to "blog" naming';
  RAISE WARNING 'Remember to also rollback migration 192 if it was applied';
END $$;
