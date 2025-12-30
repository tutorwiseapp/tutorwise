-- Migration: Create SEO Hub & Spoke tables
-- Purpose: Create tables for SEO hub-and-spoke content strategy
-- Date: 2025-12-29
-- Phase: SEO Management Module

-- =====================================================
-- 1. SEO Hubs Table
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_hubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Content
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    content TEXT,

    -- SEO Meta
    meta_title VARCHAR(60),
    meta_description VARCHAR(160),
    meta_keywords TEXT[],

    -- Status & Publishing
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    published_at TIMESTAMP WITH TIME ZONE,
    published_by UUID REFERENCES auth.users(id),

    -- Authorship
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_edited_by UUID REFERENCES auth.users(id),
    last_edited_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Analytics (denormalized for performance)
    view_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,

    -- Schema.org
    schema_type VARCHAR(50) DEFAULT 'WebPage',
    custom_schema JSONB
);

-- Indexes for seo_hubs
CREATE INDEX idx_seo_hubs_slug ON seo_hubs(slug);
CREATE INDEX idx_seo_hubs_status ON seo_hubs(status);
CREATE INDEX idx_seo_hubs_created_at ON seo_hubs(created_at DESC);
CREATE INDEX idx_seo_hubs_published_at ON seo_hubs(published_at DESC NULLS LAST);

-- Comments
COMMENT ON TABLE seo_hubs IS 'Hub pages for SEO content strategy (pillar content)';
COMMENT ON COLUMN seo_hubs.slug IS 'URL-friendly identifier for the hub';
COMMENT ON COLUMN seo_hubs.status IS 'Publishing status: draft, published, or archived';
COMMENT ON COLUMN seo_hubs.view_count IS 'Denormalized view count for performance';

-- =====================================================
-- 2. SEO Spokes Table
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_spokes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Hub Relationship
    hub_id UUID NOT NULL REFERENCES seo_hubs(id) ON DELETE CASCADE,

    -- Content
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    content TEXT,

    -- SEO Meta
    meta_title VARCHAR(60),
    meta_description VARCHAR(160),
    meta_keywords TEXT[],

    -- Status & Publishing
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    published_at TIMESTAMP WITH TIME ZONE,
    published_by UUID REFERENCES auth.users(id),

    -- Authorship
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_edited_by UUID REFERENCES auth.users(id),
    last_edited_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Analytics (denormalized for performance)
    view_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,

    -- Schema.org
    schema_type VARCHAR(50) DEFAULT 'Article',
    custom_schema JSONB,

    -- Ordering within hub
    display_order INTEGER DEFAULT 0
);

-- Indexes for seo_spokes
CREATE INDEX idx_seo_spokes_hub_id ON seo_spokes(hub_id);
CREATE INDEX idx_seo_spokes_slug ON seo_spokes(slug);
CREATE INDEX idx_seo_spokes_status ON seo_spokes(status);
CREATE INDEX idx_seo_spokes_created_at ON seo_spokes(created_at DESC);
CREATE INDEX idx_seo_spokes_published_at ON seo_spokes(published_at DESC NULLS LAST);
CREATE INDEX idx_seo_spokes_hub_order ON seo_spokes(hub_id, display_order);

-- Comments
COMMENT ON TABLE seo_spokes IS 'Spoke pages linked to hubs (deep-dive content)';
COMMENT ON COLUMN seo_spokes.hub_id IS 'Parent hub this spoke belongs to';
COMMENT ON COLUMN seo_spokes.display_order IS 'Order in which spoke appears under hub';

-- =====================================================
-- 3. SEO Citations Table
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_citations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source Information
    source_name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    author VARCHAR(255),
    publication_date DATE,

    -- Citation Metadata
    citation_type VARCHAR(50) DEFAULT 'reference' CHECK (citation_type IN ('reference', 'statistic', 'quote', 'research')),
    description TEXT,

    -- Link Status
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'broken', 'pending')),
    last_checked_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Indexes for seo_citations
CREATE INDEX idx_seo_citations_url ON seo_citations USING hash (url);
CREATE INDEX idx_seo_citations_status ON seo_citations(status);
CREATE INDEX idx_seo_citations_created_at ON seo_citations(created_at DESC);

-- Comments
COMMENT ON TABLE seo_citations IS 'External citations and references used in SEO content';
COMMENT ON COLUMN seo_citations.status IS 'Link status: active, broken, or pending validation';
COMMENT ON COLUMN seo_citations.last_checked_at IS 'Last time URL was validated';

-- =====================================================
-- 4. Hub-Citation Junction Table
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_hub_citations (
    hub_id UUID NOT NULL REFERENCES seo_hubs(id) ON DELETE CASCADE,
    citation_id UUID NOT NULL REFERENCES seo_citations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    PRIMARY KEY (hub_id, citation_id)
);

-- Indexes for seo_hub_citations
CREATE INDEX idx_seo_hub_citations_hub_id ON seo_hub_citations(hub_id);
CREATE INDEX idx_seo_hub_citations_citation_id ON seo_hub_citations(citation_id);

-- Comments
COMMENT ON TABLE seo_hub_citations IS 'Junction table linking hubs to citations';

-- =====================================================
-- 5. Spoke-Citation Junction Table
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_spoke_citations (
    spoke_id UUID NOT NULL REFERENCES seo_spokes(id) ON DELETE CASCADE,
    citation_id UUID NOT NULL REFERENCES seo_citations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    PRIMARY KEY (spoke_id, citation_id)
);

-- Indexes for seo_spoke_citations
CREATE INDEX idx_seo_spoke_citations_spoke_id ON seo_spoke_citations(spoke_id);
CREATE INDEX idx_seo_spoke_citations_citation_id ON seo_spoke_citations(citation_id);

-- Comments
COMMENT ON TABLE seo_spoke_citations IS 'Junction table linking spokes to citations';

-- =====================================================
-- 6. SEO Settings Table (Singleton)
-- =====================================================
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

-- Comments for seo_settings
COMMENT ON TABLE seo_settings IS 'SEO configuration settings (singleton table)';
COMMENT ON COLUMN seo_settings.id IS 'Always 1 - ensures singleton pattern';

-- =====================================================
-- 7. Triggers for updated_at
-- =====================================================

-- Trigger function for seo_hubs
CREATE OR REPLACE FUNCTION update_seo_hubs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_seo_hubs_updated_at
    BEFORE UPDATE ON seo_hubs
    FOR EACH ROW
    EXECUTE FUNCTION update_seo_hubs_updated_at();

-- Trigger function for seo_spokes
CREATE OR REPLACE FUNCTION update_seo_spokes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_seo_spokes_updated_at
    BEFORE UPDATE ON seo_spokes
    FOR EACH ROW
    EXECUTE FUNCTION update_seo_spokes_updated_at();

-- Trigger function for seo_citations
CREATE OR REPLACE FUNCTION update_seo_citations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_seo_citations_updated_at
    BEFORE UPDATE ON seo_citations
    FOR EACH ROW
    EXECUTE FUNCTION update_seo_citations_updated_at();

-- Trigger function for seo_settings
CREATE OR REPLACE FUNCTION update_seo_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_seo_settings_updated_at
    BEFORE UPDATE ON seo_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_seo_settings_updated_at();

-- =====================================================
-- 8. Insert default SEO settings
-- =====================================================
INSERT INTO seo_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 9. Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE seo_hubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_spokes ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_hub_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_spoke_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_settings ENABLE ROW LEVEL SECURITY;

-- SEO Hubs policies
CREATE POLICY "Public can view published hubs"
    ON seo_hubs FOR SELECT
    USING (status = 'published');

CREATE POLICY "Admins can manage all hubs"
    ON seo_hubs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.admin_role IS NOT NULL
        )
    );

-- SEO Spokes policies
CREATE POLICY "Public can view published spokes"
    ON seo_spokes FOR SELECT
    USING (status = 'published');

CREATE POLICY "Admins can manage all spokes"
    ON seo_spokes FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.admin_role IS NOT NULL
        )
    );

-- SEO Citations policies
CREATE POLICY "Public can view citations"
    ON seo_citations FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage citations"
    ON seo_citations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.admin_role IS NOT NULL
        )
    );

-- Junction tables policies
CREATE POLICY "Public can view hub citations"
    ON seo_hub_citations FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage hub citations"
    ON seo_hub_citations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.admin_role IS NOT NULL
        )
    );

CREATE POLICY "Public can view spoke citations"
    ON seo_spoke_citations FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage spoke citations"
    ON seo_spoke_citations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.admin_role IS NOT NULL
        )
    );

-- SEO Settings policies
CREATE POLICY "Public can view settings"
    ON seo_settings FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can update settings"
    ON seo_settings FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.admin_role IS NOT NULL
        )
    );
