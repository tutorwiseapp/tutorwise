-- Migration 356: Resources Platform Metrics Daily
-- Phase: Conductor Phase 3 — Resources Intelligence (Content Intelligence Loop Stage 1)
-- Table: resources_platform_metrics_daily + compute_article_readiness_score()
-- Spec: conductor/resources-intelligence-spec.md
-- Agent: Market Intelligence (query_resources_health, query_editorial_opportunities tools)
-- pg_cron: daily 04:30 UTC

-- Article SEO readiness score function (0-100)
CREATE OR REPLACE FUNCTION compute_article_readiness_score(article_id uuid)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  a resources_articles%ROWTYPE;
  score integer := 0;
  meta_len integer;
  word_count_est integer;
BEGIN
  SELECT * INTO a FROM resources_articles WHERE id = article_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- SEO title: 15 pts
  IF a.seo_title IS NOT NULL AND length(a.seo_title) > 0 THEN score := score + 15; END IF;
  -- Meta description: 20 pts + 10 pts length bonus
  IF a.meta_description IS NOT NULL AND length(a.meta_description) > 0 THEN
    score := score + 20;
    meta_len := length(a.meta_description);
    IF meta_len >= 120 AND meta_len <= 160 THEN score := score + 10;
    ELSIF meta_len >= 100 AND meta_len < 120 THEN score := score + 5; END IF;
  END IF;
  -- Hub link: 20 pts
  IF a.hub_id IS NOT NULL THEN score := score + 20; END IF;
  -- Canonical URL: 10 pts
  IF a.canonical_url IS NOT NULL AND length(a.canonical_url) > 0 THEN score := score + 10; END IF;
  -- Word count estimate: 15 pts
  word_count_est := COALESCE(length(regexp_replace(a.content, '<[^>]+>', '', 'g')) / 6, 0);
  IF word_count_est >= 800 THEN score := score + 15;
  ELSIF word_count_est >= 400 THEN score := score + 7; END IF;
  -- Featured image: 10 pts
  IF a.featured_image_url IS NOT NULL THEN score := score + 10; END IF;

  RETURN LEAST(score, 100);
END;
$$;

CREATE TABLE IF NOT EXISTS resources_platform_metrics_daily (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date                 date NOT NULL UNIQUE,
  -- Publishing pipeline
  total_published             integer NOT NULL DEFAULT 0,
  total_drafts                integer NOT NULL DEFAULT 0,
  published_last_30d          integer NOT NULL DEFAULT 0,
  avg_days_draft_to_publish   numeric(5,1),
  stale_drafts_count          integer NOT NULL DEFAULT 0,
  -- SEO readiness
  avg_readiness_score         numeric(5,2),
  below_threshold_count       integer NOT NULL DEFAULT 0,  -- score < 70
  missing_hub_link_count      integer NOT NULL DEFAULT 0,
  missing_meta_count          integer NOT NULL DEFAULT 0,
  -- Coverage
  hubs_with_zero_spokes       integer NOT NULL DEFAULT 0,
  categories_with_zero_published integer NOT NULL DEFAULT 0,
  -- Decay
  articles_not_updated_90d    integer NOT NULL DEFAULT 0,
  articles_falling_views      integer NOT NULL DEFAULT 0,
  -- Intelligence (from article_intelligence_scores)
  avg_intelligence_score      numeric(5,2),
  star_articles_count         integer NOT NULL DEFAULT 0,
  dead_weight_count           integer NOT NULL DEFAULT 0,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS resources_platform_metrics_daily_date
  ON resources_platform_metrics_daily (metric_date DESC);

ALTER TABLE resources_platform_metrics_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY resources_metrics_admin ON resources_platform_metrics_daily FOR ALL USING (is_admin());

CREATE OR REPLACE FUNCTION compute_resources_platform_metrics()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO resources_platform_metrics_daily (
    metric_date, total_published, total_drafts, published_last_30d,
    avg_days_draft_to_publish, stale_drafts_count, avg_readiness_score,
    below_threshold_count, missing_hub_link_count, missing_meta_count,
    hubs_with_zero_spokes, categories_with_zero_published,
    articles_not_updated_90d, articles_falling_views,
    avg_intelligence_score, star_articles_count, dead_weight_count
  )
  SELECT
    CURRENT_DATE,
    COUNT(*) FILTER (WHERE status = 'published'),
    COUNT(*) FILTER (WHERE status = 'draft'),
    COUNT(*) FILTER (WHERE status = 'published' AND published_at >= now() - interval '30 days'),
    AVG(EXTRACT(EPOCH FROM (published_at - created_at)) / 86400)
      FILTER (WHERE status = 'published' AND published_at IS NOT NULL),
    COUNT(*) FILTER (WHERE status = 'draft' AND updated_at < now() - interval '30 days'),
    AVG(compute_article_readiness_score(id)) FILTER (WHERE status = 'published'),
    COUNT(*) FILTER (WHERE status = 'published' AND compute_article_readiness_score(id) < 70),
    COUNT(*) FILTER (WHERE status = 'published' AND hub_id IS NULL),
    COUNT(*) FILTER (WHERE status = 'published'
      AND (meta_description IS NULL OR length(meta_description) = 0)),
    (SELECT COUNT(*) FROM seo_hubs h
     WHERE NOT EXISTS (
       SELECT 1 FROM resources_articles ra
       WHERE ra.hub_id = h.id AND ra.status = 'published'
     )),
    (SELECT COUNT(DISTINCT category) FROM resources_articles
       WHERE status IN ('draft', 'published')) -
    (SELECT COUNT(DISTINCT category) FROM resources_articles WHERE status = 'published'),
    COUNT(*) FILTER (WHERE status = 'published' AND updated_at < now() - interval '90 days'),
    -- articles with falling views (from article_intelligence_scores if exists)
    COALESCE((SELECT COUNT(*) FROM article_intelligence_scores
              WHERE traffic_trend = 'declining'
                AND measured_at >= CURRENT_DATE - 14), 0),
    COALESCE((SELECT AVG(score) FROM article_intelligence_scores
              WHERE measured_at = (SELECT MAX(measured_at) FROM article_intelligence_scores)), NULL),
    COALESCE((SELECT COUNT(*) FROM article_intelligence_scores
              WHERE band = 'Star'
                AND measured_at = (SELECT MAX(measured_at) FROM article_intelligence_scores)), 0),
    COALESCE((SELECT COUNT(*) FROM article_intelligence_scores
              WHERE band = 'Dead Weight'
                AND measured_at = (SELECT MAX(measured_at) FROM article_intelligence_scores)), 0)
  FROM resources_articles
  ON CONFLICT (metric_date) DO UPDATE SET
    total_published             = EXCLUDED.total_published,
    total_drafts                = EXCLUDED.total_drafts,
    published_last_30d          = EXCLUDED.published_last_30d,
    avg_days_draft_to_publish   = EXCLUDED.avg_days_draft_to_publish,
    stale_drafts_count          = EXCLUDED.stale_drafts_count,
    avg_readiness_score         = EXCLUDED.avg_readiness_score,
    below_threshold_count       = EXCLUDED.below_threshold_count,
    missing_hub_link_count      = EXCLUDED.missing_hub_link_count,
    missing_meta_count          = EXCLUDED.missing_meta_count,
    hubs_with_zero_spokes       = EXCLUDED.hubs_with_zero_spokes,
    categories_with_zero_published = EXCLUDED.categories_with_zero_published,
    articles_not_updated_90d    = EXCLUDED.articles_not_updated_90d,
    articles_falling_views      = EXCLUDED.articles_falling_views,
    avg_intelligence_score      = EXCLUDED.avg_intelligence_score,
    star_articles_count         = EXCLUDED.star_articles_count,
    dead_weight_count           = EXCLUDED.dead_weight_count,
    created_at                  = now();
END;
$$;

-- pg_cron: daily 04:30 UTC (first in the intelligence pipeline)
SELECT cron.schedule(
  'compute-resources-platform-metrics',
  '30 4 * * *',
  'SELECT compute_resources_platform_metrics()'
);
