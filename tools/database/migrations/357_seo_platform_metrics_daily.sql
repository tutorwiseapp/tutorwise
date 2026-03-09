-- Migration 357: SEO Platform Metrics Daily
-- Phase: Conductor Phase 3 — SEO Intelligence (Content Intelligence Loop Stage 2)
-- Table: seo_platform_metrics_daily + compute_seo_platform_metrics()
-- Spec: conductor/seo-intelligence-spec.md
-- Agent: Market Intelligence (query_seo_health, query_keyword_opportunities tools)
-- pg_cron: daily 05:00 UTC

CREATE TABLE IF NOT EXISTS seo_platform_metrics_daily (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date        date NOT NULL UNIQUE,
  -- Keyword position distribution
  critical_keywords    integer,
  high_keywords        integer,
  keywords_top5        integer,
  keywords_top10       integer,
  keywords_page2       integer,   -- positions 11-20
  keywords_page3plus   integer,   -- positions 21+
  not_ranked           integer,   -- no data / not in top 100
  avg_position         numeric(5,1),
  avg_position_delta   numeric(5,1),  -- vs prior day
  -- Backlinks
  active_backlinks     integer,
  lost_7d              integer,
  avg_dr               numeric(5,1),
  -- Content health
  hubs_published       integer,
  spokes_published     integer,
  hubs_stale_90d       integer,
  spokes_stale_90d     integer,
  avg_hub_seo_score    numeric(5,1),
  avg_spoke_seo_score  numeric(5,1),
  -- GSC (from seo_gsc_performance)
  impressions_7d       integer,
  clicks_7d            integer,
  avg_ctr              numeric(5,2),
  created_at           timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seo_platform_metrics_daily_date
  ON seo_platform_metrics_daily (snapshot_date DESC);

ALTER TABLE seo_platform_metrics_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY seo_metrics_admin ON seo_platform_metrics_daily FOR ALL USING (is_admin());

CREATE OR REPLACE FUNCTION compute_seo_platform_metrics()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_prev_avg numeric(5,1);
BEGIN
  -- Get yesterday's avg_position for delta
  SELECT avg_position INTO v_prev_avg
  FROM seo_platform_metrics_daily
  WHERE snapshot_date = CURRENT_DATE - 1
  LIMIT 1;

  INSERT INTO seo_platform_metrics_daily (
    snapshot_date, critical_keywords, high_keywords,
    keywords_top5, keywords_top10, keywords_page2, keywords_page3plus, not_ranked,
    avg_position, avg_position_delta,
    active_backlinks, lost_7d, avg_dr,
    hubs_published, spokes_published, hubs_stale_90d, spokes_stale_90d,
    avg_hub_seo_score, avg_spoke_seo_score,
    impressions_7d, clicks_7d, avg_ctr
  )
  SELECT
    CURRENT_DATE,
    COUNT(*) FILTER (WHERE priority = 'critical'),
    COUNT(*) FILTER (WHERE priority = 'high'),
    COUNT(*) FILTER (WHERE current_position <= 5),
    COUNT(*) FILTER (WHERE current_position <= 10),
    COUNT(*) FILTER (WHERE current_position BETWEEN 11 AND 20),
    COUNT(*) FILTER (WHERE current_position > 20),
    COUNT(*) FILTER (WHERE current_position IS NULL),
    ROUND(AVG(current_position)::numeric, 1),
    ROUND(AVG(current_position)::numeric, 1) - COALESCE(v_prev_avg, ROUND(AVG(current_position)::numeric, 1)),
    -- Backlinks from seo_backlinks
    (SELECT COUNT(*) FROM seo_backlinks WHERE status = 'active'),
    (SELECT COUNT(*) FROM seo_backlinks WHERE status = 'lost' AND updated_at >= now() - interval '7 days'),
    (SELECT ROUND(AVG(domain_rating)::numeric, 1) FROM seo_backlinks WHERE status = 'active'),
    -- Hub/spoke counts
    (SELECT COUNT(*) FROM seo_hubs WHERE status = 'published'),
    (SELECT COUNT(*) FROM seo_spokes WHERE status = 'published'),
    (SELECT COUNT(*) FROM seo_hubs WHERE status = 'published' AND updated_at < now() - interval '90 days'),
    (SELECT COUNT(*) FROM seo_spokes WHERE status = 'published' AND updated_at < now() - interval '90 days'),
    (SELECT ROUND(AVG(seo_score)::numeric, 1) FROM seo_hubs WHERE status = 'published'),
    (SELECT ROUND(AVG(seo_score)::numeric, 1) FROM seo_spokes WHERE status = 'published'),
    -- GSC (last 7 days)
    (SELECT COALESCE(SUM(impressions), 0) FROM seo_gsc_performance WHERE date >= CURRENT_DATE - 7),
    (SELECT COALESCE(SUM(clicks), 0) FROM seo_gsc_performance WHERE date >= CURRENT_DATE - 7),
    (SELECT ROUND(
       COALESCE(SUM(clicks), 0)::numeric /
       NULLIF(COALESCE(SUM(impressions), 0), 0) * 100, 2
     ) FROM seo_gsc_performance WHERE date >= CURRENT_DATE - 7)
  FROM seo_keywords
  ON CONFLICT (snapshot_date) DO UPDATE SET
    critical_keywords  = EXCLUDED.critical_keywords,
    high_keywords      = EXCLUDED.high_keywords,
    keywords_top5      = EXCLUDED.keywords_top5,
    keywords_top10     = EXCLUDED.keywords_top10,
    keywords_page2     = EXCLUDED.keywords_page2,
    keywords_page3plus = EXCLUDED.keywords_page3plus,
    not_ranked         = EXCLUDED.not_ranked,
    avg_position       = EXCLUDED.avg_position,
    avg_position_delta = EXCLUDED.avg_position_delta,
    active_backlinks   = EXCLUDED.active_backlinks,
    lost_7d            = EXCLUDED.lost_7d,
    avg_dr             = EXCLUDED.avg_dr,
    hubs_published     = EXCLUDED.hubs_published,
    spokes_published   = EXCLUDED.spokes_published,
    hubs_stale_90d     = EXCLUDED.hubs_stale_90d,
    spokes_stale_90d   = EXCLUDED.spokes_stale_90d,
    avg_hub_seo_score  = EXCLUDED.avg_hub_seo_score,
    avg_spoke_seo_score = EXCLUDED.avg_spoke_seo_score,
    impressions_7d     = EXCLUDED.impressions_7d,
    clicks_7d          = EXCLUDED.clicks_7d,
    avg_ctr            = EXCLUDED.avg_ctr,
    created_at         = now();
END;
$$;

-- pg_cron: daily 05:00 UTC
SELECT cron.schedule(
  'compute-seo-platform-metrics',
  '0 5 * * *',
  'SELECT compute_seo_platform_metrics()'
);
