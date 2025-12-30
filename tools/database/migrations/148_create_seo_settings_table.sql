-- Migration: Create seo_settings table
-- Purpose: Store SEO configuration settings
-- Date: 2025-12-29

-- Create the seo_settings table
-- This uses a singleton pattern - only one row should exist
CREATE TABLE IF NOT EXISTS seo_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Ensure only one row

    -- Meta Defaults
    default_meta_title_template VARCHAR(255) NOT NULL DEFAULT '{page_title} | Tutorwise',
    default_meta_description_template TEXT NOT NULL DEFAULT 'Find expert tutors on Tutorwise. {page_description}',
    default_og_image_url TEXT,
    default_og_type VARCHAR(50) NOT NULL DEFAULT 'website',

    -- URL Patterns
    hub_url_pattern VARCHAR(100) NOT NULL DEFAULT '/seo/hub/{slug}',
    spoke_url_pattern VARCHAR(100) NOT NULL DEFAULT '/seo/spoke/{slug}',
    canonical_base_url VARCHAR(255) NOT NULL DEFAULT 'https://tutorwise.io',

    -- Schema Markup Settings
    enable_schema_markup BOOLEAN NOT NULL DEFAULT true,
    default_hub_schema_type VARCHAR(50) NOT NULL DEFAULT 'WebPage',
    default_spoke_schema_type VARCHAR(50) NOT NULL DEFAULT 'Article',
    organization_schema JSONB DEFAULT '{"@type":"Organization","name":"Tutorwise","url":"https://tutorwise.io"}',

    -- Sitemap Settings
    enable_sitemap BOOLEAN NOT NULL DEFAULT true,
    sitemap_update_frequency VARCHAR(20) NOT NULL DEFAULT 'daily',
    sitemap_priority_hubs DECIMAL(2,1) NOT NULL DEFAULT 0.8,
    sitemap_priority_spokes DECIMAL(2,1) NOT NULL DEFAULT 0.6,

    -- Robots.txt Settings
    enable_robots_txt BOOLEAN NOT NULL DEFAULT true,
    allow_search_indexing BOOLEAN NOT NULL DEFAULT true,
    crawl_delay_seconds INTEGER NOT NULL DEFAULT 0,

    -- Performance Settings
    enable_image_lazy_loading BOOLEAN NOT NULL DEFAULT true,
    enable_cdn BOOLEAN NOT NULL DEFAULT false,
    cdn_base_url TEXT,
    cache_ttl_minutes INTEGER NOT NULL DEFAULT 60,

    -- Analytics Integration
    enable_google_search_console BOOLEAN NOT NULL DEFAULT false,
    google_search_console_property_url TEXT,
    google_analytics_id VARCHAR(50),
    track_internal_links BOOLEAN NOT NULL DEFAULT true,

    -- Content Settings
    min_hub_word_count INTEGER NOT NULL DEFAULT 500,
    min_spoke_word_count INTEGER NOT NULL DEFAULT 300,
    auto_generate_meta_descriptions BOOLEAN NOT NULL DEFAULT false,
    auto_internal_linking BOOLEAN NOT NULL DEFAULT true,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE seo_settings IS 'SEO configuration settings (singleton table)';
COMMENT ON COLUMN seo_settings.id IS 'Always 1 - ensures singleton pattern';
COMMENT ON COLUMN seo_settings.default_meta_title_template IS 'Template for meta titles, use {page_title} as placeholder';
COMMENT ON COLUMN seo_settings.default_meta_description_template IS 'Template for meta descriptions, use {page_description} as placeholder';
COMMENT ON COLUMN seo_settings.hub_url_pattern IS 'URL pattern for hub pages, use {slug} as placeholder';
COMMENT ON COLUMN seo_settings.spoke_url_pattern IS 'URL pattern for spoke pages, use {slug} as placeholder';
COMMENT ON COLUMN seo_settings.enable_schema_markup IS 'Enable schema.org structured data markup';
COMMENT ON COLUMN seo_settings.organization_schema IS 'JSON-LD schema for organization';
COMMENT ON COLUMN seo_settings.sitemap_update_frequency IS 'How often sitemap is regenerated: always, hourly, daily, weekly, monthly, yearly, never';
COMMENT ON COLUMN seo_settings.google_search_console_property_url IS 'Google Search Console property URL for integration';
COMMENT ON COLUMN seo_settings.track_internal_links IS 'Track internal link clicks for SEO analytics';
COMMENT ON COLUMN seo_settings.auto_internal_linking IS 'Automatically suggest internal links between hubs and spokes';

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_seo_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
CREATE TRIGGER trigger_update_seo_settings_updated_at
    BEFORE UPDATE ON seo_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_seo_settings_updated_at();

-- Insert default settings (singleton row)
INSERT INTO seo_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;
