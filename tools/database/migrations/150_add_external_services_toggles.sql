-- Migration: Add external services toggle controls
-- Purpose: Allow granular control of external integrations (GSC, SerpApi, Ahrefs)
-- Date: 2025-12-29
-- Goal: Support both with/without external services for testing and production

-- =====================================================
-- 1. Add External Services Configuration to seo_settings
-- =====================================================

ALTER TABLE seo_settings ADD COLUMN IF NOT EXISTS external_services_config JSONB DEFAULT '{
  "google_search_console": {
    "enabled": false,
    "auto_sync": false,
    "sync_frequency_hours": 24,
    "last_error": null,
    "last_error_at": null
  },
  "serpapi": {
    "enabled": false,
    "auto_track": false,
    "track_frequency_hours": 24,
    "last_error": null,
    "last_error_at": null
  },
  "ahrefs": {
    "enabled": false,
    "auto_sync": false,
    "sync_frequency_hours": 168,
    "last_error": null,
    "last_error_at": null
  }
}';

-- Add individual toggle columns for easier querying
ALTER TABLE seo_settings ADD COLUMN IF NOT EXISTS gsc_enabled BOOLEAN DEFAULT false;
ALTER TABLE seo_settings ADD COLUMN IF NOT EXISTS gsc_auto_sync BOOLEAN DEFAULT false;
ALTER TABLE seo_settings ADD COLUMN IF NOT EXISTS gsc_api_key_set BOOLEAN DEFAULT false;

ALTER TABLE seo_settings ADD COLUMN IF NOT EXISTS serpapi_enabled BOOLEAN DEFAULT false;
ALTER TABLE seo_settings ADD COLUMN IF NOT EXISTS serpapi_auto_track BOOLEAN DEFAULT false;
ALTER TABLE seo_settings ADD COLUMN IF NOT EXISTS serpapi_api_key_set BOOLEAN DEFAULT false;

ALTER TABLE seo_settings ADD COLUMN IF NOT EXISTS ahrefs_enabled BOOLEAN DEFAULT false;
ALTER TABLE seo_settings ADD COLUMN IF NOT EXISTS ahrefs_auto_sync BOOLEAN DEFAULT false;
ALTER TABLE seo_settings ADD COLUMN IF NOT EXISTS ahrefs_api_key_set BOOLEAN DEFAULT false;

-- Add fallback mode toggle
ALTER TABLE seo_settings ADD COLUMN IF NOT EXISTS use_fallback_tracking BOOLEAN DEFAULT true;
ALTER TABLE seo_settings ADD COLUMN IF NOT EXISTS fallback_tracking_method VARCHAR(50) DEFAULT 'manual'
  CHECK (fallback_tracking_method IN ('manual', 'gsc_only', 'disabled'));

-- Comments
COMMENT ON COLUMN seo_settings.external_services_config IS 'JSON configuration for external services with error tracking';
COMMENT ON COLUMN seo_settings.gsc_enabled IS 'Enable Google Search Console integration';
COMMENT ON COLUMN seo_settings.gsc_auto_sync IS 'Automatically sync GSC data on schedule';
COMMENT ON COLUMN seo_settings.use_fallback_tracking IS 'Use fallback methods when external services unavailable';
COMMENT ON COLUMN seo_settings.fallback_tracking_method IS 'Method to use when external services disabled: manual, gsc_only, or disabled';

-- =====================================================
-- 2. Add Service Health Tracking Table
-- =====================================================

CREATE TABLE IF NOT EXISTS seo_service_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    service_name VARCHAR(50) NOT NULL CHECK (service_name IN ('gsc', 'serpapi', 'ahrefs')),
    status VARCHAR(20) NOT NULL DEFAULT 'healthy' CHECK (status IN ('healthy', 'degraded', 'down', 'disabled')),

    -- Health Metrics
    last_successful_call TIMESTAMP WITH TIME ZONE,
    last_failed_call TIMESTAMP WITH TIME ZONE,
    consecutive_failures INTEGER DEFAULT 0,
    error_message TEXT,

    -- Rate Limiting
    api_calls_today INTEGER DEFAULT 0,
    api_limit_daily INTEGER,
    rate_limited_until TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(service_name)
);

CREATE INDEX idx_seo_service_health_service ON seo_service_health(service_name);
CREATE INDEX idx_seo_service_health_status ON seo_service_health(status);

COMMENT ON TABLE seo_service_health IS 'Health monitoring for external SEO services';
COMMENT ON COLUMN seo_service_health.consecutive_failures IS 'Auto-disable service after N consecutive failures';

-- Initialize service health records
INSERT INTO seo_service_health (service_name, status, api_limit_daily) VALUES
    ('gsc', 'disabled', 1200),
    ('serpapi', 'disabled', 100),
    ('ahrefs', 'disabled', 500)
ON CONFLICT (service_name) DO NOTHING;

-- =====================================================
-- 3. Add Data Source Tracking to Keywords
-- =====================================================

ALTER TABLE seo_keywords ADD COLUMN IF NOT EXISTS position_source VARCHAR(20) DEFAULT 'manual'
  CHECK (position_source IN ('manual', 'gsc', 'serpapi', 'calculated'));

ALTER TABLE seo_keywords ADD COLUMN IF NOT EXISTS position_confidence NUMERIC(3,2) DEFAULT 0.5
  CHECK (position_confidence BETWEEN 0 AND 1);

ALTER TABLE seo_keywords ADD COLUMN IF NOT EXISTS last_external_check_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE seo_keywords ADD COLUMN IF NOT EXISTS external_check_status VARCHAR(20) DEFAULT 'pending'
  CHECK (external_check_status IN ('pending', 'success', 'failed', 'skipped'));

COMMENT ON COLUMN seo_keywords.position_source IS 'Data source: manual entry, GSC data, SerpApi, or calculated from GSC';
COMMENT ON COLUMN seo_keywords.position_confidence IS 'Confidence score (0-1): manual=0.5, gsc=0.7, serpapi=1.0';
COMMENT ON COLUMN seo_keywords.last_external_check_at IS 'Last time external service checked this keyword';

-- =====================================================
-- 4. Add Fallback Position Calculation Function
-- =====================================================

-- Function to calculate estimated position from GSC impressions/clicks
CREATE OR REPLACE FUNCTION calculate_position_from_gsc(
    p_impressions INTEGER,
    p_clicks INTEGER,
    p_ctr NUMERIC
) RETURNS INTEGER AS $$
DECLARE
    estimated_position INTEGER;
BEGIN
    -- Estimation logic based on CTR benchmarks
    -- Top 1: ~30% CTR, Top 3: ~15% CTR, Top 5: ~8% CTR, Top 10: ~3% CTR

    IF p_ctr >= 25 THEN
        estimated_position := 1;
    ELSIF p_ctr >= 15 THEN
        estimated_position := 2;
    ELSIF p_ctr >= 10 THEN
        estimated_position := 3;
    ELSIF p_ctr >= 7 THEN
        estimated_position := 5;
    ELSIF p_ctr >= 4 THEN
        estimated_position := 7;
    ELSIF p_ctr >= 2 THEN
        estimated_position := 10;
    ELSIF p_ctr >= 1 THEN
        estimated_position := 15;
    ELSIF p_impressions > 0 THEN
        estimated_position := 25; -- Has impressions but very low CTR
    ELSE
        estimated_position := NULL; -- No data
    END IF;

    RETURN estimated_position;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_position_from_gsc IS 'Estimate ranking position from GSC CTR data when SerpApi unavailable';

-- =====================================================
-- 5. Trigger for updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_seo_service_health_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_seo_service_health_updated_at
    BEFORE UPDATE ON seo_service_health
    FOR EACH ROW
    EXECUTE FUNCTION update_seo_service_health_updated_at();

-- =====================================================
-- 6. Row Level Security
-- =====================================================

ALTER TABLE seo_service_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view service health"
    ON seo_service_health FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.admin_role IS NOT NULL
        )
    );

CREATE POLICY "Admins can update service health"
    ON seo_service_health FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.admin_role IS NOT NULL
        )
    );
