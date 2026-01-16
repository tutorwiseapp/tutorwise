-- Migration 176: Blog Marketplace Attribution Schema
-- Purpose: Enable full attribution tracking between blog content and marketplace conversions
-- Created: 2026-01-16
-- Implements: Phase 1 of Blog-to-Marketplace Demand Engine

-- ============================================================================
-- ATTRIBUTION COLUMNS ON EXISTING TABLES
-- ============================================================================

-- BOOKINGS: Track blog articles that influenced bookings
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS source_blog_article_id UUID REFERENCES public.blog_articles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS attribution_timestamp TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS attribution_context TEXT;

COMMENT ON COLUMN public.bookings.source_blog_article_id IS 'Blog article that influenced this booking (7-day attribution window)';
COMMENT ON COLUMN public.bookings.attribution_timestamp IS 'When the user first interacted with blog content leading to this booking';
COMMENT ON COLUMN public.bookings.attribution_context IS 'How the attribution occurred: direct_embed, related_widget, social_share';

CREATE INDEX IF NOT EXISTS idx_bookings_blog_article
  ON public.bookings(source_blog_article_id)
  WHERE source_blog_article_id IS NOT NULL;

-- REFERRALS: Track blog articles that generated referrals
ALTER TABLE public.referrals
ADD COLUMN IF NOT EXISTS source_blog_article_id UUID REFERENCES public.blog_articles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.referrals.source_blog_article_id IS 'Blog article that drove this referral (via social share or embed)';

CREATE INDEX IF NOT EXISTS idx_referrals_blog_article
  ON public.referrals(source_blog_article_id)
  WHERE source_blog_article_id IS NOT NULL;

-- WISELIST_ITEMS: Track blog influence on saves
ALTER TABLE public.wiselist_items
ADD COLUMN IF NOT EXISTS source_blog_article_id UUID REFERENCES public.blog_articles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS save_context TEXT;

COMMENT ON COLUMN public.wiselist_items.source_blog_article_id IS 'Blog article that influenced saving this tutor/listing';
COMMENT ON COLUMN public.wiselist_items.save_context IS 'Context: blog_embed, blog_related, direct';

CREATE INDEX IF NOT EXISTS idx_wiselist_items_blog_article
  ON public.wiselist_items(source_blog_article_id)
  WHERE source_blog_article_id IS NOT NULL;

-- ============================================================================
-- NEW TABLE: blog_article_saves
-- Purpose: Enable saving blog articles to wiselists (like bookmarking articles)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.blog_article_saves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL REFERENCES public.blog_articles(id) ON DELETE CASCADE,
  wiselist_id UUID NOT NULL REFERENCES public.wiselists(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_article_wiselist UNIQUE(article_id, wiselist_id)
);

CREATE INDEX idx_blog_saves_article ON public.blog_article_saves(article_id);
CREATE INDEX idx_blog_saves_wiselist ON public.blog_article_saves(wiselist_id);
CREATE INDEX idx_blog_saves_profile ON public.blog_article_saves(profile_id);

COMMENT ON TABLE public.blog_article_saves IS 'Tracks blog articles saved to wiselists (article bookmarks)';

-- RLS for blog_article_saves
ALTER TABLE public.blog_article_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own article saves"
  ON public.blog_article_saves FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can manage their own article saves"
  ON public.blog_article_saves FOR ALL
  USING (profile_id = auth.uid());

-- ============================================================================
-- NEW TABLE: blog_listing_links
-- Purpose: Track blog-to-listing connections for SEO amplification and conversion tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.blog_listing_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blog_article_id UUID NOT NULL REFERENCES public.blog_articles(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK (link_type IN ('manual_embed', 'auto_related', 'author_listing')),
  position_in_article INTEGER,
  click_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_blog_listing_link UNIQUE(blog_article_id, listing_id, link_type)
);

CREATE INDEX idx_blog_links_article ON public.blog_listing_links(blog_article_id);
CREATE INDEX idx_blog_links_listing ON public.blog_listing_links(listing_id);
CREATE INDEX idx_blog_links_performance ON public.blog_listing_links(click_count DESC, conversion_count DESC);

COMMENT ON TABLE public.blog_listing_links IS 'Tracks connections between blog articles and listings for SEO and attribution';
COMMENT ON COLUMN public.blog_listing_links.link_type IS 'manual_embed: Author added <ListingGrid> in MDX; auto_related: System suggested; author_listing: Article written by listing owner';
COMMENT ON COLUMN public.blog_listing_links.click_count IS 'Number of clicks from blog article to this listing';
COMMENT ON COLUMN public.blog_listing_links.conversion_count IS 'Number of bookings attributed to this blog-listing link';

-- RLS for blog_listing_links (public read, admin write)
ALTER TABLE public.blog_listing_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blog listing links"
  ON public.blog_listing_links FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage blog listing links"
  ON public.blog_listing_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND admin_role IS NOT NULL
    )
  );

-- ============================================================================
-- NEW TABLE: blog_attribution_config
-- Purpose: Configure attribution window and multi-touch model
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.blog_attribution_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attribution_window_days INTEGER NOT NULL DEFAULT 7 CHECK (attribution_window_days > 0),
  multi_touch_model TEXT NOT NULL DEFAULT 'last_touch' CHECK (multi_touch_model IN ('first_touch', 'last_touch', 'linear')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.blog_attribution_config IS 'Global configuration for blog attribution tracking';
COMMENT ON COLUMN public.blog_attribution_config.attribution_window_days IS 'Number of days to track attribution between blog view and conversion (default: 7)';
COMMENT ON COLUMN public.blog_attribution_config.multi_touch_model IS 'Attribution model: first_touch (first article wins), last_touch (most recent wins), linear (split credit)';

-- Insert default config
INSERT INTO public.blog_attribution_config (attribution_window_days, multi_touch_model)
VALUES (7, 'last_touch')
ON CONFLICT DO NOTHING;

-- RLS for config (public read, admin write)
ALTER TABLE public.blog_attribution_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view attribution config"
  ON public.blog_attribution_config FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage attribution config"
  ON public.blog_attribution_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND admin_role IS NOT NULL
    )
  );

-- ============================================================================
-- UPDATE: blog_articles table
-- ============================================================================

ALTER TABLE public.blog_articles
ADD COLUMN IF NOT EXISTS is_saveable BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.blog_articles.is_saveable IS 'Whether this article can be saved to wiselists (default: true)';

-- ============================================================================
-- HELPER FUNCTION: Update blog_listing_links click count
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_blog_link_click(
  p_blog_article_id UUID,
  p_listing_id UUID
)
RETURNS void AS $$
BEGIN
  UPDATE public.blog_listing_links
  SET
    click_count = click_count + 1,
    updated_at = NOW()
  WHERE blog_article_id = p_blog_article_id
    AND listing_id = p_listing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.increment_blog_link_click IS 'Increment click count when user clicks from blog article to listing';

-- ============================================================================
-- HELPER FUNCTION: Record booking attribution
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_blog_booking_attribution(
  p_booking_id UUID,
  p_blog_article_id UUID,
  p_attribution_context TEXT,
  p_attribution_timestamp TIMESTAMPTZ DEFAULT NOW()
)
RETURNS void AS $$
BEGIN
  -- Update booking with attribution
  UPDATE public.bookings
  SET
    source_blog_article_id = p_blog_article_id,
    attribution_timestamp = p_attribution_timestamp,
    attribution_context = p_attribution_context
  WHERE id = p_booking_id;

  -- Increment conversion count in blog_listing_links if exists
  UPDATE public.blog_listing_links
  SET
    conversion_count = conversion_count + 1,
    updated_at = NOW()
  WHERE blog_article_id = p_blog_article_id
    AND listing_id = (SELECT listing_id FROM public.bookings WHERE id = p_booking_id)
    AND listing_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.record_blog_booking_attribution IS 'Records blog attribution when booking is created and updates conversion metrics';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_blog_link_click TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_blog_booking_attribution TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify new columns exist
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'bookings' AND column_name LIKE '%blog%';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'referrals' AND column_name LIKE '%blog%';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'wiselist_items' AND column_name LIKE '%blog%';

-- Verify new tables exist
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'blog_%';

-- Verify indexes exist
-- SELECT indexname FROM pg_indexes WHERE tablename IN ('bookings', 'referrals', 'wiselist_items', 'blog_listing_links') AND indexname LIKE '%blog%';

-- Check attribution config
-- SELECT * FROM public.blog_attribution_config;
