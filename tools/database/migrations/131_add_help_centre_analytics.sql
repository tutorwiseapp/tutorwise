-- Migration: 131_add_help_centre_analytics.sql
-- Purpose: Add analytics tables for Help Centre
-- Created: 2025-01-19
-- Author: Tutorwise Engineering Team

-- ============================================================================
-- HELP ARTICLE VIEWS
-- Track which articles users view (for "Popular Articles" widget)
-- ============================================================================
CREATE TABLE IF NOT EXISTS help_article_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_slug TEXT NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id TEXT, -- For anonymous users
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  referrer TEXT, -- Where they came from (contextual help link, search, etc.)

  -- Indexes for fast queries
  CONSTRAINT help_article_views_slug_idx CHECK (LENGTH(article_slug) > 0)
);

CREATE INDEX idx_help_article_views_slug ON help_article_views(article_slug);
CREATE INDEX idx_help_article_views_profile ON help_article_views(profile_id);
CREATE INDEX idx_help_article_views_viewed_at ON help_article_views(viewed_at DESC);

-- ============================================================================
-- HELP ARTICLE FEEDBACK
-- Track "Was this helpful?" votes
-- ============================================================================
CREATE TABLE IF NOT EXISTS help_article_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_slug TEXT NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_id TEXT, -- For anonymous users
  was_helpful BOOLEAN NOT NULL,
  comment TEXT, -- Optional feedback comment
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate votes from same user/session
  CONSTRAINT unique_feedback_per_user UNIQUE NULLS NOT DISTINCT (article_slug, profile_id, session_id)
);

CREATE INDEX idx_help_article_feedback_slug ON help_article_feedback(article_slug);
CREATE INDEX idx_help_article_feedback_helpful ON help_article_feedback(was_helpful);

-- ============================================================================
-- HELP SEARCH QUERIES
-- Track what users search for (identify content gaps)
-- ============================================================================
CREATE TABLE IF NOT EXISTS help_search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id TEXT, -- For anonymous users
  results_count INTEGER DEFAULT 0,
  clicked_result TEXT, -- Which article they clicked (if any)
  searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_help_search_queries_query ON help_search_queries(query);
CREATE INDEX idx_help_search_queries_searched_at ON help_search_queries(searched_at DESC);
CREATE INDEX idx_help_search_queries_results ON help_search_queries(results_count);

-- ============================================================================
-- MATERIALIZED VIEW: POPULAR ARTICLES
-- Pre-computed popular articles for fast widget loading
-- ============================================================================
CREATE MATERIALIZED VIEW help_popular_articles AS
SELECT
  article_slug,
  COUNT(*) as view_count,
  COUNT(DISTINCT profile_id) as unique_viewers,
  MAX(viewed_at) as last_viewed
FROM help_article_views
WHERE viewed_at > NOW() - INTERVAL '30 days'
GROUP BY article_slug
ORDER BY view_count DESC
LIMIT 10;

CREATE UNIQUE INDEX idx_help_popular_articles_slug ON help_popular_articles(article_slug);

-- Refresh schedule: Every hour
-- Run manually: REFRESH MATERIALIZED VIEW CONCURRENTLY help_popular_articles;

-- ============================================================================
-- MATERIALIZED VIEW: ARTICLE HELPFULNESS SCORES
-- Pre-computed helpfulness ratings
-- ============================================================================
CREATE MATERIALIZED VIEW help_article_helpfulness AS
SELECT
  article_slug,
  COUNT(*) as total_votes,
  SUM(CASE WHEN was_helpful THEN 1 ELSE 0 END) as helpful_votes,
  ROUND(
    (SUM(CASE WHEN was_helpful THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)) * 100,
    1
  ) as helpfulness_percentage
FROM help_article_feedback
GROUP BY article_slug
HAVING COUNT(*) >= 3; -- Only show if at least 3 votes

CREATE UNIQUE INDEX idx_help_article_helpfulness_slug ON help_article_helpfulness(article_slug);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Public help centre = No RLS needed (all data is aggregated/anonymous)
-- ============================================================================

-- Views are public (read-only)
ALTER TABLE help_article_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view article views" ON help_article_views FOR SELECT USING (true);
CREATE POLICY "Anyone can insert article views" ON help_article_views FOR INSERT WITH CHECK (true);

-- Feedback is public
ALTER TABLE help_article_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view article feedback" ON help_article_feedback FOR SELECT USING (true);
CREATE POLICY "Anyone can insert article feedback" ON help_article_feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own feedback" ON help_article_feedback FOR UPDATE
  USING (profile_id = auth.uid() OR session_id = current_setting('app.session_id', true));

-- Search queries are public
ALTER TABLE help_search_queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view search queries" ON help_search_queries FOR SELECT USING (true);
CREATE POLICY "Anyone can insert search queries" ON help_search_queries FOR INSERT WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get popular articles (cached via materialized view)
CREATE OR REPLACE FUNCTION get_popular_help_articles(limit_count INTEGER DEFAULT 5)
RETURNS TABLE (
  article_slug TEXT,
  view_count BIGINT,
  unique_viewers BIGINT,
  last_viewed TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM help_popular_articles
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get article helpfulness
CREATE OR REPLACE FUNCTION get_article_helpfulness(p_article_slug TEXT)
RETURNS TABLE (
  total_votes BIGINT,
  helpful_votes BIGINT,
  helpfulness_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM help_article_helpfulness
  WHERE article_slug = p_article_slug;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to track article view
CREATE OR REPLACE FUNCTION track_help_article_view(
  p_article_slug TEXT,
  p_profile_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_view_id UUID;
BEGIN
  INSERT INTO help_article_views (article_slug, profile_id, session_id, referrer)
  VALUES (p_article_slug, p_profile_id, p_session_id, p_referrer)
  RETURNING id INTO v_view_id;

  RETURN v_view_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE help_article_views IS 'Tracks article views for analytics and popular articles widget';
COMMENT ON TABLE help_article_feedback IS 'Stores "Was this helpful?" votes and optional comments';
COMMENT ON TABLE help_search_queries IS 'Tracks search queries to identify content gaps';
COMMENT ON MATERIALIZED VIEW help_popular_articles IS 'Pre-computed popular articles (refresh hourly)';
COMMENT ON MATERIALIZED VIEW help_article_helpfulness IS 'Pre-computed helpfulness scores';
