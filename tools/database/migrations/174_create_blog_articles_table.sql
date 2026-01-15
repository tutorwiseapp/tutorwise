/**
 * Migration: 174_create_blog_articles_table.sql
 * Purpose: Create blog_articles table for managing blog content
 * Created: 2026-01-15
 */

-- Create blog_articles table
CREATE TABLE IF NOT EXISTS public.blog_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Article content
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT, -- Meta description / excerpt
  content TEXT, -- MDX content

  -- Categorization
  category TEXT NOT NULL, -- 'for-clients', 'for-tutors', 'for-agents', 'education-insights', 'company-news'
  tags TEXT[], -- Array of tags for additional categorization

  -- Author information
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL, -- Cached author display name

  -- Media
  featured_image_url TEXT, -- Featured image for social sharing

  -- SEO
  meta_title TEXT, -- Custom meta title (falls back to title)
  meta_description TEXT, -- Custom meta description
  meta_keywords TEXT[], -- SEO keywords

  -- Publishing
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'published', 'scheduled'
  published_at TIMESTAMPTZ, -- When article was/will be published
  scheduled_for TIMESTAMPTZ, -- For scheduled posts

  -- Analytics
  view_count INTEGER DEFAULT 0,
  read_time TEXT, -- e.g., "12 min read"

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('draft', 'published', 'scheduled')),
  CONSTRAINT valid_category CHECK (category IN ('for-clients', 'for-tutors', 'for-agents', 'education-insights', 'company-news'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_blog_articles_slug ON public.blog_articles(slug);
CREATE INDEX IF NOT EXISTS idx_blog_articles_category ON public.blog_articles(category);
CREATE INDEX IF NOT EXISTS idx_blog_articles_status ON public.blog_articles(status);
CREATE INDEX IF NOT EXISTS idx_blog_articles_published_at ON public.blog_articles(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_blog_articles_author_id ON public.blog_articles(author_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_blog_articles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_blog_articles_updated_at
  BEFORE UPDATE ON public.blog_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_articles_updated_at();

-- Enable RLS
ALTER TABLE public.blog_articles ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Public read access for published articles
CREATE POLICY "Public can view published articles"
  ON public.blog_articles
  FOR SELECT
  USING (status = 'published' AND published_at <= NOW());

-- Authenticated users can view all articles (for admin)
CREATE POLICY "Authenticated users can view all articles"
  ON public.blog_articles
  FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated users can insert articles
CREATE POLICY "Authenticated users can insert articles"
  ON public.blog_articles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authors and admins can update their articles
CREATE POLICY "Authors can update their articles"
  ON public.blog_articles
  FOR UPDATE
  TO authenticated
  USING (true); -- In production, add proper authorization check

-- Authors and admins can delete their articles
CREATE POLICY "Authors can delete their articles"
  ON public.blog_articles
  FOR DELETE
  TO authenticated
  USING (true); -- In production, add proper authorization check

-- Grant permissions
GRANT SELECT ON public.blog_articles TO anon;
GRANT ALL ON public.blog_articles TO authenticated;
GRANT ALL ON public.blog_articles TO service_role;

-- Insert seed data (the 5 existing articles from MOCK_ARTICLES)
INSERT INTO public.blog_articles (
  title,
  slug,
  description,
  category,
  author_name,
  status,
  published_at,
  read_time,
  view_count,
  content
) VALUES
(
  'Building a Successful Tutoring Business in 2026: The Complete Guide',
  'building-successful-tutoring-business',
  'Essential strategies for tutors looking to grow their client base, increase earnings, and build a sustainable tutoring business.',
  'for-tutors',
  'James Chen',
  'published',
  '2026-01-08'::timestamptz,
  '15 min read',
  1243,
  '# Building a Successful Tutoring Business in 2026

Essential strategies for tutors looking to grow their client base, increase earnings, and build a sustainable tutoring business.

[Content coming soon]'
),
(
  'How to Find the Perfect Tutor for Your Child: A Complete Guide for Parents',
  'how-to-find-perfect-tutor',
  'Learn how students find and book your services through our comprehensive booking process guide.',
  'for-clients',
  'Sarah Thompson',
  'published',
  '2026-01-10'::timestamptz,
  '10 min read',
  2156,
  '# How to Find the Perfect Tutor for Your Child

Learn how students find and book your services through our comprehensive booking process guide.

[Content coming soon]'
),
(
  'UK Tutoring Market 2026: Trends, Data & Growth Opportunities',
  'uk-tutoring-market-2026',
  'Comprehensive analysis of the UK tutoring market with data-driven insights and growth opportunities.',
  'education-insights',
  'Dr. Emily Roberts',
  'published',
  '2026-01-05'::timestamptz,
  '12 min read',
  3421,
  '# UK Tutoring Market 2026: Trends, Data & Growth Opportunities

Comprehensive analysis of the UK tutoring market with data-driven insights and growth opportunities.

[Content coming soon]'
),
(
  'How to Price Your Tutoring Services: The Complete Pricing Guide for UK Tutors',
  'how-to-price-tutoring-services',
  'Discover proven strategies for pricing your tutoring services competitively while maximizing your earnings.',
  'for-tutors',
  'James Chen',
  'published',
  '2025-12-20'::timestamptz,
  '14 min read',
  1876,
  '# How to Price Your Tutoring Services

Discover proven strategies for pricing your tutoring services competitively while maximizing your earnings.

[Content coming soon]'
),
(
  'Growing Your Tutoring Agency: From Solo Tutor to Scalable Business',
  'growing-tutoring-agency',
  'Step-by-step guide for tutoring agencies looking to scale from solo operations to managing multiple tutors.',
  'for-agents',
  'Rachel Morrison',
  'published',
  '2025-12-15'::timestamptz,
  '16 min read',
  987,
  '# Growing Your Tutoring Agency

Step-by-step guide for tutoring agencies looking to scale from solo operations to managing multiple tutors.

[Content coming soon]'
);
