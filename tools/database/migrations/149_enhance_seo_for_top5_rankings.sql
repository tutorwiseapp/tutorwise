-- Migration: Enhance SEO System for Top 5 Rankings & AI Search
-- Purpose: Address critical gaps in SEO implementation
-- Date: 2025-12-29
-- Goal: Enable tracking and optimization for top 5 Google rankings

-- =====================================================
-- 1. Target Keywords Table (Critical Gap #1)
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Keyword Data
    keyword VARCHAR(255) NOT NULL UNIQUE,
    search_volume INTEGER,
    keyword_difficulty INTEGER CHECK (keyword_difficulty BETWEEN 0 AND 100),
    cpc NUMERIC(10,2),
    search_intent VARCHAR(50) CHECK (search_intent IN ('informational', 'navigational', 'transactional', 'commercial')),

    -- Current Performance
    current_position INTEGER,
    best_position INTEGER,
    url TEXT, -- Which page ranks for this keyword
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    ctr NUMERIC(5,2),

    -- Target & Strategy
    target_position INTEGER CHECK (target_position BETWEEN 1 AND 10),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    keyword_type VARCHAR(20) DEFAULT 'primary' CHECK (keyword_type IN ('primary', 'secondary', 'long-tail', 'lsi')),

    -- Tracking
    last_checked_at TIMESTAMP WITH TIME ZONE,
    first_rank_date TIMESTAMP WITH TIME ZONE,
    position_history JSONB DEFAULT '[]', -- [{date, position, url}]

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Keywords associated with specific hubs/spokes
CREATE TABLE IF NOT EXISTS seo_content_keywords (
    content_id UUID NOT NULL,
    content_type VARCHAR(10) NOT NULL CHECK (content_type IN ('hub', 'spoke')),
    keyword_id UUID NOT NULL REFERENCES seo_keywords(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    position_in_content INTEGER, -- Where keyword appears (title=1, h2=2, etc)
    density NUMERIC(5,2), -- Keyword density percentage

    PRIMARY KEY (content_id, keyword_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_seo_keywords_keyword ON seo_keywords(keyword);
CREATE INDEX idx_seo_keywords_priority ON seo_keywords(priority, target_position);
CREATE INDEX idx_seo_keywords_current_position ON seo_keywords(current_position);
CREATE INDEX idx_seo_content_keywords_content ON seo_content_keywords(content_id, content_type);

COMMENT ON TABLE seo_keywords IS 'Target keywords with rankings and performance tracking';
COMMENT ON COLUMN seo_keywords.keyword_difficulty IS 'SEO difficulty score 0-100 (from SEMrush/Ahrefs)';
COMMENT ON COLUMN seo_keywords.current_position IS 'Current Google ranking position';
COMMENT ON COLUMN seo_keywords.target_position IS 'Goal ranking position (1-10 for page 1)';

-- =====================================================
-- 2. Backlinks Tracking Table (Critical Gap #3)
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_backlinks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Link Details
    source_url TEXT NOT NULL,
    source_domain VARCHAR(255) NOT NULL,
    target_url TEXT NOT NULL, -- Our page being linked to
    anchor_text TEXT,

    -- Quality Metrics
    domain_authority INTEGER CHECK (domain_authority BETWEEN 0 AND 100),
    domain_rating INTEGER CHECK (domain_rating BETWEEN 0 AND 100),
    spam_score INTEGER CHECK (spam_score BETWEEN 0 AND 100),
    link_type VARCHAR(20) CHECK (link_type IN ('dofollow', 'nofollow', 'ugc', 'sponsored')),

    -- Link Context
    surrounding_text TEXT,
    is_image_link BOOLEAN DEFAULT false,
    link_position VARCHAR(50), -- header, footer, sidebar, content

    -- Status & Discovery
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'lost', 'broken', 'redirected')),
    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    lost_at TIMESTAMP WITH TIME ZONE,

    -- Source
    discovered_via VARCHAR(50), -- ahrefs, semrush, gsc, manual

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_seo_backlinks_target_url ON seo_backlinks(target_url);
CREATE INDEX idx_seo_backlinks_source_domain ON seo_backlinks(source_domain);
CREATE INDEX idx_seo_backlinks_status ON seo_backlinks(status);
CREATE INDEX idx_seo_backlinks_quality ON seo_backlinks(domain_authority DESC, status);

COMMENT ON TABLE seo_backlinks IS 'Inbound backlinks with quality metrics for link building';
COMMENT ON COLUMN seo_backlinks.domain_authority IS 'Moz DA score (0-100)';
COMMENT ON COLUMN seo_backlinks.domain_rating IS 'Ahrefs DR score (0-100)';

-- =====================================================
-- 3. Competitors Tracking Table (Critical Gap #4)
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_competitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Competitor Info
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) NOT NULL UNIQUE,

    -- Authority Metrics
    domain_authority INTEGER,
    domain_rating INTEGER,
    organic_traffic INTEGER,
    organic_keywords INTEGER,
    backlinks_count INTEGER,

    -- Status
    is_active BOOLEAN DEFAULT true,
    last_analyzed_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track competitor rankings for our target keywords
CREATE TABLE IF NOT EXISTS seo_competitor_rankings (
    competitor_id UUID NOT NULL REFERENCES seo_competitors(id) ON DELETE CASCADE,
    keyword_id UUID NOT NULL REFERENCES seo_keywords(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    url TEXT NOT NULL,
    title TEXT,
    meta_description TEXT,
    word_count INTEGER,
    backlinks_to_page INTEGER,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    PRIMARY KEY (competitor_id, keyword_id, checked_at)
);

CREATE INDEX idx_seo_competitors_domain ON seo_competitors(domain);
CREATE INDEX idx_seo_competitor_rankings_keyword ON seo_competitor_rankings(keyword_id, position);

COMMENT ON TABLE seo_competitors IS 'Competitor tracking for benchmarking and strategy';
COMMENT ON TABLE seo_competitor_rankings IS 'Competitor keyword rankings snapshot history';

-- =====================================================
-- 4. Enhanced Content Quality Validation
-- =====================================================

-- Add quality metrics to existing seo_hubs table
ALTER TABLE seo_hubs ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0;
ALTER TABLE seo_hubs ADD COLUMN IF NOT EXISTS readability_score NUMERIC(5,2);
ALTER TABLE seo_hubs ADD COLUMN IF NOT EXISTS seo_score INTEGER CHECK (seo_score BETWEEN 0 AND 100);
ALTER TABLE seo_hubs ADD COLUMN IF NOT EXISTS content_quality_status VARCHAR(20) DEFAULT 'draft' CHECK (content_quality_status IN ('draft', 'needs_review', 'approved', 'published'));
ALTER TABLE seo_hubs ADD COLUMN IF NOT EXISTS last_quality_check_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE seo_hubs ADD COLUMN IF NOT EXISTS quality_issues JSONB DEFAULT '[]';
ALTER TABLE seo_hubs ADD COLUMN IF NOT EXISTS target_keyword_id UUID REFERENCES seo_keywords(id);
ALTER TABLE seo_hubs ADD COLUMN IF NOT EXISTS internal_links_count INTEGER DEFAULT 0;
ALTER TABLE seo_hubs ADD COLUMN IF NOT EXISTS external_links_count INTEGER DEFAULT 0;
ALTER TABLE seo_hubs ADD COLUMN IF NOT EXISTS images_count INTEGER DEFAULT 0;
ALTER TABLE seo_hubs ADD COLUMN IF NOT EXISTS videos_count INTEGER DEFAULT 0;

-- Add quality metrics to existing seo_spokes table
ALTER TABLE seo_spokes ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0;
ALTER TABLE seo_spokes ADD COLUMN IF NOT EXISTS readability_score NUMERIC(5,2);
ALTER TABLE seo_spokes ADD COLUMN IF NOT EXISTS seo_score INTEGER CHECK (seo_score BETWEEN 0 AND 100);
ALTER TABLE seo_spokes ADD COLUMN IF NOT EXISTS content_quality_status VARCHAR(20) DEFAULT 'draft' CHECK (content_quality_status IN ('draft', 'needs_review', 'approved', 'published'));
ALTER TABLE seo_spokes ADD COLUMN IF NOT EXISTS last_quality_check_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE seo_spokes ADD COLUMN IF NOT EXISTS quality_issues JSONB DEFAULT '[]';
ALTER TABLE seo_spokes ADD COLUMN IF NOT EXISTS target_keyword_id UUID REFERENCES seo_keywords(id);
ALTER TABLE seo_spokes ADD COLUMN IF NOT EXISTS internal_links_count INTEGER DEFAULT 0;
ALTER TABLE seo_spokes ADD COLUMN IF NOT EXISTS external_links_count INTEGER DEFAULT 0;
ALTER TABLE seo_spokes ADD COLUMN IF NOT EXISTS images_count INTEGER DEFAULT 0;
ALTER TABLE seo_spokes ADD COLUMN IF NOT EXISTS videos_count INTEGER DEFAULT 0;

COMMENT ON COLUMN seo_hubs.word_count IS 'Total word count (min 1500 for top 5 rankings)';
COMMENT ON COLUMN seo_hubs.readability_score IS 'Flesch reading ease score (aim for 60-70)';
COMMENT ON COLUMN seo_hubs.seo_score IS 'Overall SEO optimization score 0-100';
COMMENT ON COLUMN seo_hubs.quality_issues IS 'Array of quality issues: [{type, message, severity}]';

-- =====================================================
-- 5. Schema.org Structured Data Templates
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_schema_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Template Info
    name VARCHAR(100) NOT NULL UNIQUE,
    schema_type VARCHAR(50) NOT NULL, -- Article, FAQPage, HowTo, Course, etc
    template JSONB NOT NULL, -- Schema.org JSON-LD template

    -- Usage
    is_active BOOLEAN DEFAULT true,
    use_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert common schema templates for AI search optimization
INSERT INTO seo_schema_templates (name, schema_type, template) VALUES
('Article Schema', 'Article', '{
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "{title}",
    "description": "{description}",
    "author": {
        "@type": "Person",
        "name": "{author_name}"
    },
    "publisher": {
        "@type": "Organization",
        "name": "Tutorwise",
        "logo": {
            "@type": "ImageObject",
            "url": "https://tutorwise.io/logo.png"
        }
    },
    "datePublished": "{published_date}",
    "dateModified": "{modified_date}"
}'),
('FAQ Schema', 'FAQPage', '{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": []
}'),
('HowTo Schema', 'HowTo', '{
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "{title}",
    "description": "{description}",
    "step": []
}'),
('Course Schema', 'Course', '{
    "@context": "https://schema.org",
    "@type": "Course",
    "name": "{course_name}",
    "description": "{course_description}",
    "provider": {
        "@type": "Organization",
        "name": "Tutorwise"
    }
}');

COMMENT ON TABLE seo_schema_templates IS 'Reusable schema.org templates for structured data';

-- =====================================================
-- 6. Google Search Console Integration Data
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_gsc_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Page & Query
    page_url TEXT NOT NULL,
    query TEXT NOT NULL,

    -- Performance Metrics
    impressions INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    ctr NUMERIC(5,2) NOT NULL DEFAULT 0,
    position NUMERIC(5,2) NOT NULL,

    -- Date
    date DATE NOT NULL,

    -- Source
    country VARCHAR(2) DEFAULT 'US',
    device VARCHAR(20) DEFAULT 'desktop' CHECK (device IN ('desktop', 'mobile', 'tablet')),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(page_url, query, date, device)
);

CREATE INDEX idx_seo_gsc_performance_page ON seo_gsc_performance(page_url, date DESC);
CREATE INDEX idx_seo_gsc_performance_query ON seo_gsc_performance(query, date DESC);
CREATE INDEX idx_seo_gsc_performance_position ON seo_gsc_performance(position, clicks DESC);

COMMENT ON TABLE seo_gsc_performance IS 'Google Search Console performance data for ranking analysis';

-- =====================================================
-- 7. Content Freshness & Update Tracking
-- =====================================================
ALTER TABLE seo_hubs ADD COLUMN IF NOT EXISTS content_freshness_score INTEGER CHECK (content_freshness_score BETWEEN 0 AND 100);
ALTER TABLE seo_hubs ADD COLUMN IF NOT EXISTS next_update_due DATE;
ALTER TABLE seo_hubs ADD COLUMN IF NOT EXISTS update_frequency VARCHAR(20) DEFAULT 'quarterly' CHECK (update_frequency IN ('weekly', 'monthly', 'quarterly', 'annually'));
ALTER TABLE seo_hubs ADD COLUMN IF NOT EXISTS last_significant_update_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE seo_spokes ADD COLUMN IF NOT EXISTS content_freshness_score INTEGER CHECK (content_freshness_score BETWEEN 0 AND 100);
ALTER TABLE seo_spokes ADD COLUMN IF NOT EXISTS next_update_due DATE;
ALTER TABLE seo_spokes ADD COLUMN IF NOT EXISTS update_frequency VARCHAR(20) DEFAULT 'quarterly' CHECK (update_frequency IN ('weekly', 'monthly', 'quarterly', 'annually'));
ALTER TABLE seo_spokes ADD COLUMN IF NOT EXISTS last_significant_update_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN seo_hubs.content_freshness_score IS 'Freshness score 0-100 based on last update and ranking impact';
COMMENT ON COLUMN seo_hubs.next_update_due IS 'Calculated date when content should be reviewed/updated';

-- =====================================================
-- 8. Enhanced SEO Settings for AI Search
-- =====================================================
ALTER TABLE seo_settings ADD COLUMN IF NOT EXISTS ai_crawlers_allowed TEXT DEFAULT 'ChatGPT-User, PerplexityBot, ClaudeBot, Google-Extended';
ALTER TABLE seo_settings ADD COLUMN IF NOT EXISTS enable_faq_schema BOOLEAN DEFAULT true;
ALTER TABLE seo_settings ADD COLUMN IF NOT EXISTS enable_howto_schema BOOLEAN DEFAULT true;
ALTER TABLE seo_settings ADD COLUMN IF NOT EXISTS enable_breadcrumb_schema BOOLEAN DEFAULT true;
ALTER TABLE seo_settings ADD COLUMN IF NOT EXISTS min_hub_word_count_override INTEGER DEFAULT 1500;
ALTER TABLE seo_settings ADD COLUMN IF NOT EXISTS min_spoke_word_count_override INTEGER DEFAULT 800;
ALTER TABLE seo_settings ADD COLUMN IF NOT EXISTS target_readability_score NUMERIC(5,2) DEFAULT 65.0;
ALTER TABLE seo_settings ADD COLUMN IF NOT EXISTS gsc_property_id VARCHAR(100);
ALTER TABLE seo_settings ADD COLUMN IF NOT EXISTS gsc_last_sync_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE seo_settings ADD COLUMN IF NOT EXISTS rank_tracking_enabled BOOLEAN DEFAULT true;
ALTER TABLE seo_settings ADD COLUMN IF NOT EXISTS rank_tracking_frequency VARCHAR(20) DEFAULT 'daily';

-- =====================================================
-- 9. Fix URL Patterns (Critical Gap #9)
-- =====================================================
UPDATE seo_settings SET
    hub_url_pattern = '/guides/{slug}',
    spoke_url_pattern = '/guides/{hub_slug}/{slug}'
WHERE id = 1;

COMMENT ON COLUMN seo_settings.hub_url_pattern IS 'SEO-friendly URL pattern for hubs (e.g., /guides/{slug})';
COMMENT ON COLUMN seo_settings.spoke_url_pattern IS 'SEO-friendly URL pattern for spokes (e.g., /guides/{hub_slug}/{slug})';

-- =====================================================
-- 10. Content Templates & Validation Rules
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_content_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Template Info
    name VARCHAR(100) NOT NULL UNIQUE,
    content_type VARCHAR(10) NOT NULL CHECK (content_type IN ('hub', 'spoke')),
    description TEXT,

    -- Template Structure (JSON definition of required sections)
    template_structure JSONB NOT NULL,
    -- Example: [
    --   {section: "introduction", required: true, min_words: 100, max_words: 200},
    --   {section: "main_content", required: true, min_words: 1000},
    --   {section: "faq", required: true, min_questions: 3}
    -- ]

    -- Validation Rules
    validation_rules JSONB DEFAULT '{}',
    -- Example: {
    --   min_word_count: 1500,
    --   max_word_count: 5000,
    --   required_headings: ["h2", "h3"],
    --   min_internal_links: 5,
    --   min_external_citations: 3,
    --   require_images: true,
    --   min_readability_score: 60
    -- }

    -- SEO Checklist
    seo_checklist JSONB DEFAULT '[]',
    -- Example: [
    --   {item: "Target keyword in title", required: true},
    --   {item: "Target keyword in first 100 words", required: true},
    --   {item: "Meta description 150-160 chars", required: true}
    -- ]

    -- Usage
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    use_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default hub template for top 5 rankings
INSERT INTO seo_content_templates (name, content_type, description, template_structure, validation_rules, seo_checklist, is_default) VALUES
('Top 5 Rankings Hub Template', 'hub', 'Optimized template for achieving top 5 Google rankings',
'[
    {"section": "direct_answer", "required": true, "min_words": 50, "max_words": 100, "purpose": "Featured snippet optimization"},
    {"section": "table_of_contents", "required": true, "purpose": "User navigation"},
    {"section": "overview", "required": true, "min_words": 200, "max_words": 300, "purpose": "Comprehensive context"},
    {"section": "main_sections", "required": true, "min_sections": 3, "max_sections": 7, "min_words_per_section": 300},
    {"section": "faq", "required": true, "min_questions": 5, "max_questions": 10, "purpose": "People Also Ask optimization"},
    {"section": "expert_insights", "required": true, "min_words": 200, "purpose": "E-E-A-T signals"},
    {"section": "statistics", "required": true, "min_citations": 3, "purpose": "Authority and credibility"},
    {"section": "related_resources", "required": true, "min_internal_links": 5, "min_external_links": 3}
]',
'{
    "min_word_count": 1500,
    "max_word_count": 3500,
    "target_readability": 65,
    "min_internal_links": 5,
    "max_internal_links": 15,
    "min_external_citations": 3,
    "max_external_citations": 10,
    "require_primary_keyword_in_title": true,
    "require_primary_keyword_in_first_paragraph": true,
    "require_images": true,
    "min_images": 1,
    "require_schema_markup": true
}',
'[
    {"item": "Primary keyword in title (front-loaded)", "required": true, "category": "on-page"},
    {"item": "Primary keyword in H1", "required": true, "category": "on-page"},
    {"item": "Primary keyword in first 100 words", "required": true, "category": "on-page"},
    {"item": "Secondary keywords in H2 tags", "required": true, "category": "on-page"},
    {"item": "Meta title 50-60 characters", "required": true, "category": "metadata"},
    {"item": "Meta description 150-160 characters with CTA", "required": true, "category": "metadata"},
    {"item": "URL is short and includes primary keyword", "required": true, "category": "technical"},
    {"item": "Images have descriptive alt text", "required": true, "category": "accessibility"},
    {"item": "Internal links to related hubs/spokes", "required": true, "category": "internal-linking"},
    {"item": "External links to authoritative sources", "required": true, "category": "credibility"},
    {"item": "FAQ schema markup implemented", "required": true, "category": "structured-data"},
    {"item": "Last updated date visible", "required": false, "category": "freshness"},
    {"item": "Author bio included (E-E-A-T)", "required": true, "category": "authority"},
    {"item": "Table of contents for scannability", "required": true, "category": "ux"}
]',
true);

COMMENT ON TABLE seo_content_templates IS 'Content templates with validation rules for quality enforcement';
COMMENT ON COLUMN seo_content_templates.validation_rules IS 'JSON rules for automated content quality validation';

-- =====================================================
-- 11. Triggers for Updated_At
-- =====================================================

-- Update function for keywords
CREATE OR REPLACE FUNCTION update_seo_keywords_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_seo_keywords_updated_at
    BEFORE UPDATE ON seo_keywords
    FOR EACH ROW
    EXECUTE FUNCTION update_seo_keywords_updated_at();

-- Update function for backlinks
CREATE OR REPLACE FUNCTION update_seo_backlinks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_seo_backlinks_updated_at
    BEFORE UPDATE ON seo_backlinks
    FOR EACH ROW
    EXECUTE FUNCTION update_seo_backlinks_updated_at();

-- Update function for competitors
CREATE OR REPLACE FUNCTION update_seo_competitors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_seo_competitors_updated_at
    BEFORE UPDATE ON seo_competitors
    FOR EACH ROW
    EXECUTE FUNCTION update_seo_competitors_updated_at();

-- =====================================================
-- 12. RLS Policies for New Tables
-- =====================================================

-- Enable RLS
ALTER TABLE seo_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_content_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_backlinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_competitor_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_schema_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_gsc_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_content_templates ENABLE ROW LEVEL SECURITY;

-- Policies: Admin full access
CREATE POLICY "Admins can manage keywords"
    ON seo_keywords FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.admin_role IS NOT NULL
        )
    );

CREATE POLICY "Admins can manage backlinks"
    ON seo_backlinks FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.admin_role IS NOT NULL
        )
    );

CREATE POLICY "Admins can manage competitors"
    ON seo_competitors FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.admin_role IS NOT NULL
        )
    );

CREATE POLICY "Admins can view GSC data"
    ON seo_gsc_performance FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.admin_role IS NOT NULL
        )
    );

CREATE POLICY "Admins can manage templates"
    ON seo_content_templates FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.admin_role IS NOT NULL
        )
    );
