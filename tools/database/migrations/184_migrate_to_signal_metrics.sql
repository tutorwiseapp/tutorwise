-- Migration: blog_article_metrics → signal_metrics
-- Strategy: Zero-downtime migration using views for backward compatibility
-- Week 1: Database Layer
-- Estimated Duration: 15 minutes (off-peak)

-- ============================================================================
-- STEP 1: Create new signal_metrics table
-- ============================================================================

CREATE TABLE signal_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Content Reference (generic, not blog-specific)
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'article' CHECK (content_type IN (
    'article',      -- Blog articles (current)
    'podcast',      -- Future: Podcast episodes
    'video',        -- Future: Video content
    'webinar'       -- Future: Webinar recordings
  )),

  -- Time Window
  date DATE NOT NULL,
  window_days INTEGER NOT NULL DEFAULT 30,

  -- Visibility Metrics
  impressions INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,

  -- Engagement Metrics
  clicks INTEGER DEFAULT 0,
  click_through_rate DECIMAL(5,4),  -- clicks / impressions

  -- Attribution Metrics (within window)
  attributed_listings_viewed INTEGER DEFAULT 0,
  attributed_bookings INTEGER DEFAULT 0,
  attributed_revenue_gbp DECIMAL(10,2) DEFAULT 0,

  -- Conversion Metrics
  conversion_rate DECIMAL(5,4),  -- attributed_bookings / unique_visitors

  -- Distribution Metrics (Phase 4+)
  social_shares INTEGER DEFAULT 0,
  social_impressions INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Ensure one metric row per content/date/window combination
  UNIQUE(content_id, content_type, date, window_days)
);

-- ============================================================================
-- STEP 2: Create indexes for performance
-- ============================================================================

-- Content performance: Get metrics for a specific piece of content
CREATE INDEX idx_signal_metrics_content
ON signal_metrics(content_id, content_type, date DESC);

-- Time-series queries: Metrics over date range
CREATE INDEX idx_signal_metrics_date
ON signal_metrics(date DESC);

-- Top performers: Find highest converting content
CREATE INDEX idx_signal_metrics_conversion
ON signal_metrics(conversion_rate DESC NULLS LAST)
WHERE conversion_rate IS NOT NULL;

-- Revenue leaderboard: Find highest revenue content
CREATE INDEX idx_signal_metrics_revenue
ON signal_metrics(attributed_revenue_gbp DESC)
WHERE attributed_revenue_gbp > 0;

-- Composite index for dashboard queries
CREATE INDEX idx_signal_metrics_dashboard
ON signal_metrics(content_type, date DESC, window_days)
WHERE content_type = 'article';

-- ============================================================================
-- STEP 3: Copy existing data from blog_article_metrics
-- ============================================================================

INSERT INTO signal_metrics (
  id,
  content_id,
  content_type,
  date,
  window_days,
  impressions,
  unique_visitors,
  clicks,
  click_through_rate,
  attributed_listings_viewed,
  attributed_bookings,
  attributed_revenue_gbp,
  conversion_rate,
  social_shares,
  social_impressions,
  metadata,
  created_at,
  updated_at
)
SELECT
  id,
  blog_article_id AS content_id,
  'article' AS content_type,  -- All existing metrics are blog articles
  date,
  window_days,
  impressions,
  unique_visitors,
  clicks,
  click_through_rate,
  attributed_listings_viewed,
  attributed_bookings,
  attributed_revenue_gbp,
  conversion_rate,
  social_shares,
  social_impressions,
  metadata,
  created_at,
  updated_at
FROM blog_article_metrics;

-- ============================================================================
-- STEP 4: Rename old table to backup
-- ============================================================================

ALTER TABLE blog_article_metrics
RENAME TO blog_article_metrics_backup;

-- ============================================================================
-- STEP 5: Create view for backward compatibility
-- ============================================================================

-- This view allows existing code to continue reading from "blog_article_metrics"
-- while actually reading from "signal_metrics"
CREATE VIEW blog_article_metrics AS
SELECT
  id,
  content_id AS blog_article_id,  -- Map back to old column name
  date,
  window_days,
  impressions,
  unique_visitors,
  clicks,
  click_through_rate,
  attributed_listings_viewed,
  attributed_bookings,
  attributed_revenue_gbp,
  conversion_rate,
  social_shares,
  social_impressions,
  metadata,
  created_at,
  updated_at
FROM signal_metrics
WHERE content_type = 'article';  -- Filter to blog articles only

-- ============================================================================
-- STEP 6: Create triggers for backward-compatible writes
-- ============================================================================

-- Allow INSERT INTO blog_article_metrics to write to signal_metrics
CREATE FUNCTION fn_blog_article_metrics_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO signal_metrics (
    id,
    content_id,
    content_type,
    date,
    window_days,
    impressions,
    unique_visitors,
    clicks,
    click_through_rate,
    attributed_listings_viewed,
    attributed_bookings,
    attributed_revenue_gbp,
    conversion_rate,
    social_shares,
    social_impressions,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    COALESCE(NEW.id, uuid_generate_v4()),
    NEW.blog_article_id,
    'article',
    NEW.date,
    NEW.window_days,
    NEW.impressions,
    NEW.unique_visitors,
    NEW.clicks,
    NEW.click_through_rate,
    NEW.attributed_listings_viewed,
    NEW.attributed_bookings,
    NEW.attributed_revenue_gbp,
    NEW.conversion_rate,
    NEW.social_shares,
    NEW.social_impressions,
    NEW.metadata,
    COALESCE(NEW.created_at, NOW()),
    COALESCE(NEW.updated_at, NOW())
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_blog_article_metrics_insert
INSTEAD OF INSERT ON blog_article_metrics
FOR EACH ROW
EXECUTE FUNCTION fn_blog_article_metrics_insert();

-- Allow UPDATE on blog_article_metrics to update signal_metrics
CREATE FUNCTION fn_blog_article_metrics_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE signal_metrics
  SET
    impressions = NEW.impressions,
    unique_visitors = NEW.unique_visitors,
    clicks = NEW.clicks,
    click_through_rate = NEW.click_through_rate,
    attributed_listings_viewed = NEW.attributed_listings_viewed,
    attributed_bookings = NEW.attributed_bookings,
    attributed_revenue_gbp = NEW.attributed_revenue_gbp,
    conversion_rate = NEW.conversion_rate,
    social_shares = NEW.social_shares,
    social_impressions = NEW.social_impressions,
    metadata = NEW.metadata,
    updated_at = NOW()
  WHERE id = NEW.id
  AND content_type = 'article';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_blog_article_metrics_update
INSTEAD OF UPDATE ON blog_article_metrics
FOR EACH ROW
EXECUTE FUNCTION fn_blog_article_metrics_update();

-- ============================================================================
-- STEP 7: Create updated_at trigger for signal_metrics
-- ============================================================================

CREATE FUNCTION fn_signal_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_signal_metrics_updated_at
BEFORE UPDATE ON signal_metrics
FOR EACH ROW
EXECUTE FUNCTION fn_signal_metrics_updated_at();

-- ============================================================================
-- STEP 8: Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE signal_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Public can read metrics (for public dashboards)
CREATE POLICY "Anyone can read signal metrics"
ON signal_metrics
FOR SELECT
TO authenticated, anon
USING (true);

-- Policy: Admins can insert/update metrics
CREATE POLICY "Admins can insert signal metrics"
ON signal_metrics
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.roles @> ARRAY['admin']
  )
);

CREATE POLICY "Admins can update signal metrics"
ON signal_metrics
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.roles @> ARRAY['admin']
  )
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these after migration to verify success:

-- 1. Check row counts match
-- SELECT
--   (SELECT COUNT(*) FROM signal_metrics WHERE content_type = 'article') as signal_metrics_count,
--   (SELECT COUNT(*) FROM blog_article_metrics_backup) as backup_count;

-- 2. Verify view returns same data
-- SELECT COUNT(*) FROM blog_article_metrics;

-- 3. Test INSERT through view
-- INSERT INTO blog_article_metrics (
--   blog_article_id, date, window_days, impressions, unique_visitors
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000000'::uuid,
--   CURRENT_DATE, 30, 100, 50
-- );
-- SELECT * FROM signal_metrics WHERE date = CURRENT_DATE AND impressions = 100;
-- DELETE FROM signal_metrics WHERE date = CURRENT_DATE AND impressions = 100;

-- 4. Test UPDATE through view
-- UPDATE blog_article_metrics
-- SET impressions = 200
-- WHERE blog_article_id = '00000000-0000-0000-0000-000000000000'::uuid
-- AND date = CURRENT_DATE;

-- 5. Check indexes exist
-- SELECT indexname FROM pg_indexes WHERE tablename = 'signal_metrics';

-- ============================================================================
-- ROLLBACK PLAN
-- ============================================================================

-- If migration fails, run:
-- DROP VIEW IF EXISTS blog_article_metrics CASCADE;
-- DROP TRIGGER IF EXISTS trg_blog_article_metrics_insert ON blog_article_metrics;
-- DROP TRIGGER IF EXISTS trg_blog_article_metrics_update ON blog_article_metrics;
-- DROP FUNCTION IF EXISTS fn_blog_article_metrics_insert();
-- DROP FUNCTION IF EXISTS fn_blog_article_metrics_update();
-- DROP TRIGGER IF EXISTS trg_signal_metrics_updated_at ON signal_metrics;
-- DROP FUNCTION IF EXISTS fn_signal_metrics_updated_at();
-- ALTER TABLE blog_article_metrics_backup RENAME TO blog_article_metrics;
-- DROP TABLE IF EXISTS signal_metrics;
