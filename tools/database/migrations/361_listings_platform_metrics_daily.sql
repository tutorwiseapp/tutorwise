-- Migration 361: Listings Platform Metrics Daily
-- Phase: Conductor Phase 3 — Listings Intelligence
-- Table: listings_platform_metrics_daily + compute_listings_platform_metrics()
-- Spec: conductor/listings-intelligence-spec.md
-- Agent: Market Intelligence (query_listing_health, query_pricing_intelligence tools)
-- pg_cron: daily 07:00 UTC

-- Listing completeness score function (0-100)
CREATE OR REPLACE FUNCTION compute_listing_completeness_score(listing_id uuid)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  l listings%ROWTYPE;
  score integer := 0;
BEGIN
  SELECT * INTO l FROM listings WHERE id = listing_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- Description ≥ 200 chars: 25 pts
  IF l.description IS NOT NULL AND length(l.description) >= 200 THEN score := score + 25; END IF;
  -- Delivery mode set: 20 pts
  IF l.delivery_mode IS NOT NULL AND array_length(l.delivery_mode, 1) > 0 THEN score := score + 20; END IF;
  -- Level set: 20 pts
  IF l.level IS NOT NULL AND array_length(l.level, 1) > 0 THEN score := score + 20; END IF;
  -- Price > 0: 20 pts
  IF l.price_per_hour IS NOT NULL AND l.price_per_hour > 0 THEN score := score + 20; END IF;
  -- Title ≥ 30 chars: 10 pts
  IF l.title IS NOT NULL AND length(l.title) >= 30 THEN score := score + 10; END IF;
  -- SEO eligible: 5 pts
  IF l.seo_eligible = true THEN score := score + 5; END IF;

  RETURN LEAST(score, 100);
END;
$$;

CREATE TABLE IF NOT EXISTS listings_platform_metrics_daily (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date              date NOT NULL UNIQUE,
  -- Supply
  total_active             integer NOT NULL DEFAULT 0,
  total_draft              integer NOT NULL DEFAULT 0,
  total_inactive           integer NOT NULL DEFAULT 0,
  new_last_30d             integer NOT NULL DEFAULT 0,
  archived_last_30d        integer NOT NULL DEFAULT 0,
  -- Quality
  avg_caas_score           numeric(5,2),
  pct_above_70_caas        numeric(5,2),
  pct_below_40_caas        numeric(5,2),
  missing_description_count integer NOT NULL DEFAULT 0,
  zero_view_30d_count      integer NOT NULL DEFAULT 0,
  zero_booking_alltime_count integer NOT NULL DEFAULT 0,
  avg_completeness_score   numeric(5,2),
  -- Pricing
  avg_price_per_hour_pence integer,
  pricing_outliers_high    integer NOT NULL DEFAULT 0,
  pricing_outliers_low     integer NOT NULL DEFAULT 0,
  -- SEO
  seo_eligible_count       integer NOT NULL DEFAULT 0,
  seo_ineligible_active_count integer NOT NULL DEFAULT 0,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS listings_platform_metrics_daily_date
  ON listings_platform_metrics_daily (metric_date DESC);

ALTER TABLE listings_platform_metrics_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY lpm_admin ON listings_platform_metrics_daily FOR ALL USING (is_admin());

CREATE OR REPLACE FUNCTION compute_listings_platform_metrics()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO listings_platform_metrics_daily (
    metric_date, total_active, total_draft, total_inactive,
    new_last_30d, archived_last_30d,
    avg_caas_score, pct_above_70_caas, pct_below_40_caas,
    missing_description_count, zero_view_30d_count, zero_booking_alltime_count,
    avg_completeness_score,
    avg_price_per_hour_pence,
    seo_eligible_count, seo_ineligible_active_count
  )
  SELECT
    CURRENT_DATE,
    COUNT(*) FILTER (WHERE status = 'active'),
    COUNT(*) FILTER (WHERE status = 'draft'),
    COUNT(*) FILTER (WHERE status = 'inactive'),
    COUNT(*) FILTER (WHERE status = 'active' AND created_at >= now() - interval '30 days'),
    COUNT(*) FILTER (WHERE status = 'archived' AND updated_at >= now() - interval '30 days'),
    -- Quality
    ROUND(AVG(caas_score) FILTER (WHERE status = 'active')::numeric, 2),
    ROUND(
      COUNT(*) FILTER (WHERE status = 'active' AND caas_score >= 70)::numeric /
      NULLIF(COUNT(*) FILTER (WHERE status = 'active'), 0) * 100, 2
    ),
    ROUND(
      COUNT(*) FILTER (WHERE status = 'active' AND caas_score < 40)::numeric /
      NULLIF(COUNT(*) FILTER (WHERE status = 'active'), 0) * 100, 2
    ),
    COUNT(*) FILTER (WHERE status = 'active'
      AND (description IS NULL OR length(description) < 100)),
    COUNT(*) FILTER (WHERE status = 'active' AND total_views = 0),
    COUNT(*) FILTER (WHERE status = 'active' AND total_bookings = 0),
    ROUND(AVG(compute_listing_completeness_score(id))
      FILTER (WHERE status = 'active')::numeric, 2),
    -- Pricing (pence = price_per_hour × 100)
    ROUND(AVG(price_per_hour) FILTER (WHERE status = 'active') * 100)::integer,
    -- SEO
    COUNT(*) FILTER (WHERE status = 'active' AND seo_eligible = true),
    COUNT(*) FILTER (WHERE status = 'active' AND (seo_eligible IS NULL OR seo_eligible = false))
  FROM listings
  ON CONFLICT (metric_date) DO UPDATE SET
    total_active               = EXCLUDED.total_active,
    total_draft                = EXCLUDED.total_draft,
    total_inactive             = EXCLUDED.total_inactive,
    new_last_30d               = EXCLUDED.new_last_30d,
    archived_last_30d          = EXCLUDED.archived_last_30d,
    avg_caas_score             = EXCLUDED.avg_caas_score,
    pct_above_70_caas          = EXCLUDED.pct_above_70_caas,
    pct_below_40_caas          = EXCLUDED.pct_below_40_caas,
    missing_description_count  = EXCLUDED.missing_description_count,
    zero_view_30d_count        = EXCLUDED.zero_view_30d_count,
    zero_booking_alltime_count = EXCLUDED.zero_booking_alltime_count,
    avg_completeness_score     = EXCLUDED.avg_completeness_score,
    avg_price_per_hour_pence   = EXCLUDED.avg_price_per_hour_pence,
    seo_eligible_count         = EXCLUDED.seo_eligible_count,
    seo_ineligible_active_count = EXCLUDED.seo_ineligible_active_count,
    created_at                 = now();
END;
$$;

-- pg_cron: daily 07:00 UTC
SELECT cron.schedule(
  'compute-listings-platform-metrics',
  '0 7 * * *',
  'SELECT compute_listings_platform_metrics()'
);
