/**
 * Migration: 218_create_resource_article_versions.sql
 * Purpose: Create article version history table for tracking revisions
 * Created: 2026-02-02
 *
 * Features:
 * - Stores up to 20 versions per article
 * - Tracks who made changes and when
 * - Stores full article snapshot for each version
 * - Supports restore to previous versions
 * - Auto-cleanup of old versions beyond limit
 */

-- Create resource_article_versions table
CREATE TABLE IF NOT EXISTS public.resource_article_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Reference to the article
  article_id UUID NOT NULL REFERENCES public.resource_articles(id) ON DELETE CASCADE,

  -- Version metadata
  version_number INTEGER NOT NULL,

  -- Snapshot of article content at this version
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  content TEXT,
  category TEXT NOT NULL,
  tags TEXT[],
  featured_image_url TEXT,
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT[],
  status TEXT NOT NULL,
  read_time TEXT,

  -- Publishing fields
  publish_platforms TEXT[],
  image_type TEXT,
  image_color TEXT,
  scheduled_for TIMESTAMPTZ,

  -- Who made this version
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT,

  -- Change summary
  change_summary TEXT, -- Optional note about what changed

  -- Is this a "published" milestone (protected from auto-delete)
  is_milestone BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique version numbers per article
  CONSTRAINT unique_version_per_article UNIQUE (article_id, version_number)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_resource_article_versions_article_id
  ON public.resource_article_versions(article_id);
CREATE INDEX IF NOT EXISTS idx_resource_article_versions_created_at
  ON public.resource_article_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resource_article_versions_is_milestone
  ON public.resource_article_versions(is_milestone) WHERE is_milestone = TRUE;

-- Enable RLS
ALTER TABLE public.resource_article_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Authenticated users can view all versions (for admin)
CREATE POLICY "Authenticated users can view article versions"
  ON public.resource_article_versions
  FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated users can insert versions
CREATE POLICY "Authenticated users can insert article versions"
  ON public.resource_article_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can delete old versions (for cleanup)
CREATE POLICY "Authenticated users can delete article versions"
  ON public.resource_article_versions
  FOR DELETE
  TO authenticated
  USING (true);

-- Grant permissions
GRANT ALL ON public.resource_article_versions TO authenticated;
GRANT ALL ON public.resource_article_versions TO service_role;

-- ============================================
-- FUNCTION: Create a new version when article is updated
-- ============================================
CREATE OR REPLACE FUNCTION create_article_version()
RETURNS TRIGGER AS $$
DECLARE
  next_version INTEGER;
  version_count INTEGER;
  oldest_non_milestone_id UUID;
BEGIN
  -- Get the next version number for this article
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
  FROM public.resource_article_versions
  WHERE article_id = OLD.id;

  -- Insert the OLD state as a new version (before the update)
  INSERT INTO public.resource_article_versions (
    article_id,
    version_number,
    title,
    slug,
    description,
    content,
    category,
    tags,
    featured_image_url,
    meta_title,
    meta_description,
    meta_keywords,
    status,
    read_time,
    scheduled_for,
    created_by,
    created_by_name,
    is_milestone
  )
  SELECT
    OLD.id,
    next_version,
    OLD.title,
    OLD.slug,
    OLD.description,
    OLD.content,
    OLD.category,
    OLD.tags,
    OLD.featured_image_url,
    OLD.meta_title,
    OLD.meta_description,
    OLD.meta_keywords,
    OLD.status,
    OLD.read_time,
    OLD.scheduled_for,
    OLD.author_id,
    OLD.author_name,
    -- Mark as milestone if status changed to 'published'
    (NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published'));

  -- Check if we need to clean up old versions (keep max 20)
  SELECT COUNT(*) INTO version_count
  FROM public.resource_article_versions
  WHERE article_id = OLD.id;

  -- If more than 20 versions, delete oldest non-milestone versions
  IF version_count > 20 THEN
    -- Find and delete oldest non-milestone versions
    DELETE FROM public.resource_article_versions
    WHERE id IN (
      SELECT id
      FROM public.resource_article_versions
      WHERE article_id = OLD.id
        AND is_milestone = FALSE
      ORDER BY created_at ASC
      LIMIT (version_count - 20)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create versions on update
DROP TRIGGER IF EXISTS trigger_create_article_version ON public.resource_articles;
CREATE TRIGGER trigger_create_article_version
  BEFORE UPDATE ON public.resource_articles
  FOR EACH ROW
  WHEN (
    OLD.title IS DISTINCT FROM NEW.title OR
    OLD.content IS DISTINCT FROM NEW.content OR
    OLD.description IS DISTINCT FROM NEW.description OR
    OLD.category IS DISTINCT FROM NEW.category OR
    OLD.status IS DISTINCT FROM NEW.status
  )
  EXECUTE FUNCTION create_article_version();

-- ============================================
-- FUNCTION: Restore article to a specific version
-- ============================================
CREATE OR REPLACE FUNCTION restore_article_version(
  p_article_id UUID,
  p_version_id UUID
)
RETURNS public.resource_articles AS $$
DECLARE
  v_version public.resource_article_versions;
  v_article public.resource_articles;
BEGIN
  -- Get the version to restore
  SELECT * INTO v_version
  FROM public.resource_article_versions
  WHERE id = p_version_id
    AND article_id = p_article_id;

  IF v_version IS NULL THEN
    RAISE EXCEPTION 'Version not found';
  END IF;

  -- Update the article with the version data
  UPDATE public.resource_articles
  SET
    title = v_version.title,
    slug = v_version.slug,
    description = v_version.description,
    content = v_version.content,
    category = v_version.category,
    tags = v_version.tags,
    featured_image_url = v_version.featured_image_url,
    meta_title = v_version.meta_title,
    meta_description = v_version.meta_description,
    meta_keywords = v_version.meta_keywords,
    read_time = v_version.read_time,
    scheduled_for = v_version.scheduled_for
    -- Note: Don't restore status - let admin decide
  WHERE id = p_article_id
  RETURNING * INTO v_article;

  RETURN v_article;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION restore_article_version TO authenticated;

-- ============================================
-- FUNCTION: Get version history for an article
-- ============================================
CREATE OR REPLACE FUNCTION get_article_version_history(
  p_article_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  version_number INTEGER,
  title TEXT,
  status TEXT,
  created_by_name TEXT,
  created_at TIMESTAMPTZ,
  is_milestone BOOLEAN,
  change_summary TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.version_number,
    v.title,
    v.status,
    v.created_by_name,
    v.created_at,
    v.is_milestone,
    v.change_summary
  FROM public.resource_article_versions v
  WHERE v.article_id = p_article_id
  ORDER BY v.version_number DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_article_version_history TO authenticated;

-- ============================================
-- Add scheduled_publish_at column to resource_articles if not exists
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resource_articles'
    AND column_name = 'publish_platforms'
  ) THEN
    ALTER TABLE public.resource_articles ADD COLUMN publish_platforms TEXT[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resource_articles'
    AND column_name = 'image_type'
  ) THEN
    ALTER TABLE public.resource_articles ADD COLUMN image_type TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resource_articles'
    AND column_name = 'image_color'
  ) THEN
    ALTER TABLE public.resource_articles ADD COLUMN image_color TEXT;
  END IF;
END $$;

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 218 complete: Article version history table created';
  RAISE NOTICE 'Features: Auto-versioning on update, 20 version limit, milestone protection';
  RAISE NOTICE 'New columns added: publish_platforms, image_type, image_color';
END $$;
