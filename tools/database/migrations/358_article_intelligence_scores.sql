-- Migration 358: Article Intelligence Scores
-- Phase: Conductor Phase 3 — Signal Intelligence (Content Intelligence Loop Stage 3)
-- Table: article_intelligence_scores — composite score per article (0-100)
-- Spec: conductor/signal-intelligence-spec.md
-- Agent: Market Intelligence (query_content_attribution tool)
-- pg_cron: daily at 04:45 UTC (between Resources 04:30 and SEO 05:00)

CREATE TABLE IF NOT EXISTS article_intelligence_scores (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id          uuid NOT NULL,          -- references resources_articles(id)
  measured_at         date NOT NULL,
  -- Component scores (0-100 each, normalised within day's cohort)
  conv_score          numeric(5,1),           -- views → bookings vs platform avg
  revenue_score       numeric(5,1),           -- attributed revenue vs platform max
  traffic_score       numeric(5,1),           -- views trend (MoM)
  freshness_score     numeric(5,1),           -- days since last update (decay penalty)
  -- Composite intelligence score
  score               numeric(5,1) NOT NULL,  -- weighted: conv(40%)+revenue(30%)+traffic(20%)+fresh(10%)
  band                text NOT NULL,          -- 'Star' | 'Performer' | 'Opportunity' | 'Underperformer' | 'Dead Weight'
  -- Raw metrics snapshot
  views_30d           integer NOT NULL DEFAULT 0,
  bookings_30d        integer NOT NULL DEFAULT 0,
  revenue_30d_pence   bigint NOT NULL DEFAULT 0,
  conv_rate_pct       numeric(6,3),           -- bookings/views × 100
  days_stale          integer,
  -- Trend signals
  traffic_trend       text,                   -- 'growing' | 'stable' | 'declining'
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (article_id, measured_at)
);

CREATE INDEX IF NOT EXISTS article_intelligence_scores_measured_at
  ON article_intelligence_scores (measured_at DESC);
CREATE INDEX IF NOT EXISTS article_intelligence_scores_article_id
  ON article_intelligence_scores (article_id);
CREATE INDEX IF NOT EXISTS article_intelligence_scores_band
  ON article_intelligence_scores (band, measured_at DESC);

ALTER TABLE article_intelligence_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY ais_admin ON article_intelligence_scores FOR ALL USING (is_admin());

-- Compute function: inserts today's intelligence scores for all published articles
CREATE OR REPLACE FUNCTION compute_article_intelligence_scores()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO article_intelligence_scores (
    article_id, measured_at, conv_score, revenue_score, traffic_score, freshness_score,
    score, band, views_30d, bookings_30d, revenue_30d_pence, conv_rate_pct, days_stale, traffic_trend
  )
  WITH article_metrics AS (
    SELECT
      a.id,
      a.updated_at,
      COALESCE(p.total_views, 0)         AS views_30d,
      COALESCE(p.attributed_bookings, 0) AS bookings_30d,
      COALESCE(p.attributed_revenue_pence, COALESCE(p.attributed_revenue, 0) * 100) AS revenue_30d_pence,
      ROUND(
        COALESCE(p.attributed_bookings, 0)::numeric
        / NULLIF(COALESCE(p.total_views, 0), 0) * 100, 3
      )                                  AS conv_rate_pct,
      EXTRACT(DAYS FROM now() - a.updated_at)::integer AS days_stale
    FROM resources_articles a
    LEFT JOIN (
      SELECT article_id, total_views, attributed_bookings, attributed_revenue,
             NULL::bigint AS attributed_revenue_pence
      FROM get_resource_article_performance_summary(30, 14)
    ) p ON p.article_id = a.id
    WHERE a.status = 'published'
  ),
  normalised AS (
    SELECT
      id, updated_at, views_30d, bookings_30d, revenue_30d_pence, conv_rate_pct, days_stale,
      ROUND(LEAST(
        conv_rate_pct / NULLIF(MAX(conv_rate_pct) OVER (), 0) * 100, 100
      )::numeric, 1) AS conv_score,
      ROUND(LEAST(
        revenue_30d_pence / NULLIF(MAX(revenue_30d_pence) OVER (), 0) * 100, 100
      )::numeric, 1) AS revenue_score,
      ROUND(LEAST(
        views_30d / NULLIF(MAX(views_30d) OVER (), 0) * 100, 100
      )::numeric, 1) AS traffic_score,
      ROUND(GREATEST(100 - (days_stale / 90.0 * 100), 0)::numeric, 1) AS freshness_score
    FROM article_metrics
  )
  SELECT
    id,
    CURRENT_DATE,
    COALESCE(conv_score, 0),
    COALESCE(revenue_score, 0),
    COALESCE(traffic_score, 0),
    COALESCE(freshness_score, 0),
    ROUND(
      (COALESCE(conv_score,0) * 0.40)
      + (COALESCE(revenue_score,0) * 0.30)
      + (COALESCE(traffic_score,0) * 0.20)
      + (COALESCE(freshness_score,0) * 0.10)
    , 1) AS score,
    CASE
      WHEN ROUND((COALESCE(conv_score,0) * 0.40) + (COALESCE(revenue_score,0) * 0.30) + (COALESCE(traffic_score,0) * 0.20) + (COALESCE(freshness_score,0) * 0.10), 1) >= 80 THEN 'Star'
      WHEN ROUND((COALESCE(conv_score,0) * 0.40) + (COALESCE(revenue_score,0) * 0.30) + (COALESCE(traffic_score,0) * 0.20) + (COALESCE(freshness_score,0) * 0.10), 1) >= 60 THEN 'Performer'
      WHEN ROUND((COALESCE(conv_score,0) * 0.40) + (COALESCE(revenue_score,0) * 0.30) + (COALESCE(traffic_score,0) * 0.20) + (COALESCE(freshness_score,0) * 0.10), 1) >= 40 THEN 'Opportunity'
      WHEN ROUND((COALESCE(conv_score,0) * 0.40) + (COALESCE(revenue_score,0) * 0.30) + (COALESCE(traffic_score,0) * 0.20) + (COALESCE(freshness_score,0) * 0.10), 1) >= 20 THEN 'Underperformer'
      ELSE 'Dead Weight'
    END AS band,
    views_30d,
    bookings_30d,
    revenue_30d_pence,
    conv_rate_pct,
    days_stale,
    CASE
      WHEN traffic_score >= 60 THEN 'growing'
      WHEN traffic_score >= 30 THEN 'stable'
      ELSE 'declining'
    END AS traffic_trend
  FROM normalised
  ON CONFLICT (article_id, measured_at) DO UPDATE SET
    conv_score         = EXCLUDED.conv_score,
    revenue_score      = EXCLUDED.revenue_score,
    traffic_score      = EXCLUDED.traffic_score,
    freshness_score    = EXCLUDED.freshness_score,
    score              = EXCLUDED.score,
    band               = EXCLUDED.band,
    views_30d          = EXCLUDED.views_30d,
    bookings_30d       = EXCLUDED.bookings_30d,
    revenue_30d_pence  = EXCLUDED.revenue_30d_pence,
    conv_rate_pct      = EXCLUDED.conv_rate_pct,
    days_stale         = EXCLUDED.days_stale,
    traffic_trend      = EXCLUDED.traffic_trend,
    created_at         = now();
END;
$$;

-- pg_cron: daily 04:45 UTC (after Resources 04:30, before SEO 05:00)
SELECT cron.schedule(
  'compute-article-intelligence-scores',
  '45 4 * * *',
  'SELECT compute_article_intelligence_scores()'
);
