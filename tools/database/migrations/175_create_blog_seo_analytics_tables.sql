/**
 * Migration: 175_create_blog_seo_analytics_tables.sql
 * Purpose: Create tables for tracking blog SEO performance metrics
 * Created: 2026-01-15
 */

-- Table for tracking daily article performance metrics
CREATE TABLE IF NOT EXISTS public.blog_article_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID REFERENCES public.blog_articles(id) ON DELETE CASCADE,

  -- Date tracking
  date DATE NOT NULL,

  -- Traffic metrics
  page_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  avg_time_on_page INTEGER DEFAULT 0, -- in seconds
  bounce_rate DECIMAL(5,2) DEFAULT 0, -- percentage

  -- Engagement metrics
  scroll_depth_avg DECIMAL(5,2) DEFAULT 0, -- percentage
  social_shares INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,

  -- Traffic sources
  organic_search INTEGER DEFAULT 0,
  direct_traffic INTEGER DEFAULT 0,
  social_traffic INTEGER DEFAULT 0,
  referral_traffic INTEGER DEFAULT 0,

  -- Search metrics
  search_impressions INTEGER DEFAULT 0, -- From Google Search Console
  search_clicks INTEGER DEFAULT 0,
  avg_search_position DECIMAL(5,2) DEFAULT 0,
  ctr DECIMAL(5,2) DEFAULT 0, -- Click-through rate percentage

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(article_id, date)
);

-- Table for tracking search keywords performance
CREATE TABLE IF NOT EXISTS public.blog_seo_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID REFERENCES public.blog_articles(id) ON DELETE CASCADE,

  -- Keyword data
  keyword TEXT NOT NULL,
  search_volume INTEGER DEFAULT 0, -- Monthly search volume
  difficulty INTEGER DEFAULT 0, -- SEO difficulty score (0-100)

  -- Ranking data
  current_position INTEGER,
  previous_position INTEGER,
  best_position INTEGER,

  -- Performance data
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5,2) DEFAULT 0,

  -- Timestamps
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(article_id, keyword, date)
);

-- Table for tracking backlinks to blog articles
CREATE TABLE IF NOT EXISTS public.blog_backlinks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID REFERENCES public.blog_articles(id) ON DELETE CASCADE,

  -- Backlink data
  source_url TEXT NOT NULL,
  source_domain TEXT NOT NULL,
  anchor_text TEXT,

  -- Link quality
  domain_authority INTEGER, -- 0-100
  is_follow BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,

  -- Discovery
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_checked TIMESTAMPTZ DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(article_id, source_url)
);

-- Table for tracking overall blog SEO health
CREATE TABLE IF NOT EXISTS public.blog_seo_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,

  -- Overall metrics
  total_articles INTEGER DEFAULT 0,
  published_articles INTEGER DEFAULT 0,
  total_page_views INTEGER DEFAULT 0,
  total_organic_traffic INTEGER DEFAULT 0,

  -- Average metrics
  avg_article_views DECIMAL(10,2) DEFAULT 0,
  avg_time_on_site INTEGER DEFAULT 0,
  avg_bounce_rate DECIMAL(5,2) DEFAULT 0,

  -- Search performance
  total_search_impressions INTEGER DEFAULT 0,
  total_search_clicks INTEGER DEFAULT 0,
  avg_search_position DECIMAL(5,2) DEFAULT 0,
  avg_ctr DECIMAL(5,2) DEFAULT 0,

  -- Link metrics
  total_backlinks INTEGER DEFAULT 0,
  new_backlinks_today INTEGER DEFAULT 0,

  -- Top performers
  top_article_id UUID REFERENCES public.blog_articles(id),
  top_keyword TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_blog_article_metrics_article_date ON public.blog_article_metrics(article_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_blog_article_metrics_date ON public.blog_article_metrics(date DESC);
CREATE INDEX IF NOT EXISTS idx_blog_seo_keywords_article ON public.blog_seo_keywords(article_id);
CREATE INDEX IF NOT EXISTS idx_blog_seo_keywords_keyword ON public.blog_seo_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_blog_seo_keywords_position ON public.blog_seo_keywords(current_position);
CREATE INDEX IF NOT EXISTS idx_blog_backlinks_article ON public.blog_backlinks(article_id);
CREATE INDEX IF NOT EXISTS idx_blog_backlinks_domain ON public.blog_backlinks(source_domain);
CREATE INDEX IF NOT EXISTS idx_blog_seo_summary_date ON public.blog_seo_summary(date DESC);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_blog_seo_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_blog_article_metrics_updated_at
  BEFORE UPDATE ON public.blog_article_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_seo_tables_updated_at();

CREATE TRIGGER trigger_update_blog_seo_keywords_updated_at
  BEFORE UPDATE ON public.blog_seo_keywords
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_seo_tables_updated_at();

CREATE TRIGGER trigger_update_blog_backlinks_updated_at
  BEFORE UPDATE ON public.blog_backlinks
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_seo_tables_updated_at();

CREATE TRIGGER trigger_update_blog_seo_summary_updated_at
  BEFORE UPDATE ON public.blog_seo_summary
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_seo_tables_updated_at();

-- Enable RLS
ALTER TABLE public.blog_article_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_seo_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_backlinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_seo_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin only access for SEO metrics
CREATE POLICY "Authenticated users can view SEO metrics"
  ON public.blog_article_metrics
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert SEO metrics"
  ON public.blog_article_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update SEO metrics"
  ON public.blog_article_metrics
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view keywords"
  ON public.blog_seo_keywords
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage keywords"
  ON public.blog_seo_keywords
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view backlinks"
  ON public.blog_backlinks
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage backlinks"
  ON public.blog_backlinks
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view SEO summary"
  ON public.blog_seo_summary
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage SEO summary"
  ON public.blog_seo_summary
  FOR ALL
  TO authenticated
  USING (true);

-- Grant permissions
GRANT SELECT ON public.blog_article_metrics TO authenticated;
GRANT INSERT, UPDATE ON public.blog_article_metrics TO authenticated;
GRANT ALL ON public.blog_seo_keywords TO authenticated;
GRANT ALL ON public.blog_backlinks TO authenticated;
GRANT ALL ON public.blog_seo_summary TO authenticated;
GRANT ALL ON public.blog_article_metrics TO service_role;
GRANT ALL ON public.blog_seo_keywords TO service_role;
GRANT ALL ON public.blog_backlinks TO service_role;
GRANT ALL ON public.blog_seo_summary TO service_role;
