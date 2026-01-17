-- Migration: blog_listing_links → signal_content_embeds
-- Strategy: Zero-downtime migration using views for backward compatibility
-- Week 1: Database Layer
-- Estimated Duration: 10 minutes (off-peak)

-- ============================================================================
-- STEP 1: Create new signal_content_embeds table
-- ============================================================================

CREATE TABLE signal_content_embeds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Content Reference (generic, not blog-specific)
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'article' CHECK (content_type IN (
    'article',      -- Blog articles (current)
    'podcast',      -- Future: Podcast episodes
    'video',        -- Future: Video content
    'webinar'       -- Future: Webinar recordings
  )),

  -- Embed Target (what is being embedded)
  target_type TEXT NOT NULL CHECK (target_type IN (
    'listing',      -- Tutor listing embed
    'tutor',        -- Tutor profile embed
    'course',       -- Future: Course embed
    'resource'      -- Future: Resource embed
  )),
  target_id UUID NOT NULL,

  -- Embed Presentation
  component_type TEXT NOT NULL CHECK (component_type IN (
    'listing_grid',      -- Grid of multiple listings
    'tutor_embed',       -- Single tutor card
    'tutor_carousel',    -- Carousel of tutors
    'cta_button',        -- Call-to-action button
    'inline_link'        -- Inline text link
  )),

  -- Embed Position & Context
  position_index INTEGER,  -- Order in content (1st, 2nd, 3rd embed)
  section_context TEXT,    -- E.g., "Finding a Math Tutor in London"

  -- Visibility & Status
  visibility TEXT NOT NULL DEFAULT 'active' CHECK (visibility IN (
    'active',      -- Currently displayed
    'archived',    -- Removed from content
    'draft'        -- Not yet published
  )),

  -- Flexible metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Ensure one embed per content/target combination (with same component type)
  UNIQUE(content_id, content_type, target_type, target_id, component_type)
);

-- ============================================================================
-- STEP 2: Create indexes for performance
-- ============================================================================

-- Find all embeds in a piece of content
CREATE INDEX idx_signal_content_embeds_content
ON signal_content_embeds(content_id, content_type, position_index);

-- Find where a target is embedded (e.g., which articles embed listing X)
CREATE INDEX idx_signal_content_embeds_target
ON signal_content_embeds(target_type, target_id, visibility);

-- Active embeds only (most common query)
CREATE INDEX idx_signal_content_embeds_active
ON signal_content_embeds(content_id, content_type, visibility)
WHERE visibility = 'active';

-- Component type analytics
CREATE INDEX idx_signal_content_embeds_component
ON signal_content_embeds(component_type, content_type, created_at DESC);

-- ============================================================================
-- STEP 3: Copy existing data from blog_listing_links
-- ============================================================================

INSERT INTO signal_content_embeds (
  id,
  content_id,
  content_type,
  target_type,
  target_id,
  component_type,
  position_index,
  section_context,
  visibility,
  metadata,
  created_at,
  updated_at
)
SELECT
  id,
  blog_article_id AS content_id,
  'article' AS content_type,
  'listing' AS target_type,  -- All existing links are to listings
  listing_id AS target_id,
  component_type,
  position_index,
  section_context,
  visibility,
  metadata,
  created_at,
  updated_at
FROM blog_listing_links;

-- ============================================================================
-- STEP 4: Rename old table to backup
-- ============================================================================

ALTER TABLE blog_listing_links
RENAME TO blog_listing_links_backup;

-- ============================================================================
-- STEP 5: Create view for backward compatibility
-- ============================================================================

-- This view allows existing code to continue reading from "blog_listing_links"
-- while actually reading from "signal_content_embeds"
CREATE VIEW blog_listing_links AS
SELECT
  id,
  content_id AS blog_article_id,  -- Map back to old column name
  target_id AS listing_id,         -- Map back to old column name
  component_type,
  position_index,
  section_context,
  visibility,
  metadata,
  created_at,
  updated_at
FROM signal_content_embeds
WHERE content_type = 'article'
AND target_type = 'listing';  -- Filter to blog articles with listing embeds only

-- ============================================================================
-- STEP 6: Create triggers for backward-compatible writes
-- ============================================================================

-- Allow INSERT INTO blog_listing_links to write to signal_content_embeds
CREATE FUNCTION fn_blog_listing_links_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO signal_content_embeds (
    id,
    content_id,
    content_type,
    target_type,
    target_id,
    component_type,
    position_index,
    section_context,
    visibility,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    COALESCE(NEW.id, uuid_generate_v4()),
    NEW.blog_article_id,
    'article',
    'listing',
    NEW.listing_id,
    NEW.component_type,
    NEW.position_index,
    NEW.section_context,
    NEW.visibility,
    NEW.metadata,
    COALESCE(NEW.created_at, NOW()),
    COALESCE(NEW.updated_at, NOW())
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_blog_listing_links_insert
INSTEAD OF INSERT ON blog_listing_links
FOR EACH ROW
EXECUTE FUNCTION fn_blog_listing_links_insert();

-- Allow UPDATE on blog_listing_links to update signal_content_embeds
CREATE FUNCTION fn_blog_listing_links_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE signal_content_embeds
  SET
    component_type = NEW.component_type,
    position_index = NEW.position_index,
    section_context = NEW.section_context,
    visibility = NEW.visibility,
    metadata = NEW.metadata,
    updated_at = NOW()
  WHERE id = NEW.id
  AND content_type = 'article'
  AND target_type = 'listing';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_blog_listing_links_update
INSTEAD OF UPDATE ON blog_listing_links
FOR EACH ROW
EXECUTE FUNCTION fn_blog_listing_links_update();

-- Allow DELETE on blog_listing_links to delete from signal_content_embeds
CREATE FUNCTION fn_blog_listing_links_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM signal_content_embeds
  WHERE id = OLD.id
  AND content_type = 'article'
  AND target_type = 'listing';
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_blog_listing_links_delete
INSTEAD OF DELETE ON blog_listing_links
FOR EACH ROW
EXECUTE FUNCTION fn_blog_listing_links_delete();

-- ============================================================================
-- STEP 7: Create updated_at trigger for signal_content_embeds
-- ============================================================================

CREATE FUNCTION fn_signal_content_embeds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_signal_content_embeds_updated_at
BEFORE UPDATE ON signal_content_embeds
FOR EACH ROW
EXECUTE FUNCTION fn_signal_content_embeds_updated_at();

-- ============================================================================
-- STEP 8: Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE signal_content_embeds ENABLE ROW LEVEL SECURITY;

-- Policy: Public can read active embeds
CREATE POLICY "Anyone can read active signal content embeds"
ON signal_content_embeds
FOR SELECT
TO authenticated, anon
USING (visibility = 'active');

-- Policy: Admins can read all embeds
CREATE POLICY "Admins can read all signal content embeds"
ON signal_content_embeds
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.roles ? 'admin'
  )
);

-- Policy: Admins can insert/update/delete embeds
CREATE POLICY "Admins can insert signal content embeds"
ON signal_content_embeds
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.roles ? 'admin'
  )
);

CREATE POLICY "Admins can update signal content embeds"
ON signal_content_embeds
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.roles ? 'admin'
  )
);

CREATE POLICY "Admins can delete signal content embeds"
ON signal_content_embeds
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.roles ? 'admin'
  )
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these after migration to verify success:

-- 1. Check row counts match
-- SELECT
--   (SELECT COUNT(*) FROM signal_content_embeds WHERE content_type = 'article' AND target_type = 'listing') as signal_embeds_count,
--   (SELECT COUNT(*) FROM blog_listing_links_backup) as backup_count;

-- 2. Verify view returns same data
-- SELECT COUNT(*) FROM blog_listing_links;

-- 3. Test INSERT through view
-- INSERT INTO blog_listing_links (
--   blog_article_id, listing_id, component_type, position_index, visibility
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000000'::uuid,
--   '11111111-1111-1111-1111-111111111111'::uuid,
--   'listing_grid', 1, 'active'
-- );
-- SELECT * FROM signal_content_embeds WHERE position_index = 1 AND component_type = 'listing_grid';
-- DELETE FROM blog_listing_links WHERE position_index = 1 AND component_type = 'listing_grid';

-- 4. Test UPDATE through view
-- UPDATE blog_listing_links
-- SET visibility = 'archived'
-- WHERE blog_article_id = '00000000-0000-0000-0000-000000000000'::uuid;

-- 5. Check indexes exist
-- SELECT indexname FROM pg_indexes WHERE tablename = 'signal_content_embeds';

-- ============================================================================
-- ROLLBACK PLAN
-- ============================================================================

-- If migration fails, run:
-- DROP VIEW IF EXISTS blog_listing_links CASCADE;
-- DROP TRIGGER IF EXISTS trg_blog_listing_links_insert ON blog_listing_links;
-- DROP TRIGGER IF EXISTS trg_blog_listing_links_update ON blog_listing_links;
-- DROP TRIGGER IF EXISTS trg_blog_listing_links_delete ON blog_listing_links;
-- DROP FUNCTION IF EXISTS fn_blog_listing_links_insert();
-- DROP FUNCTION IF EXISTS fn_blog_listing_links_update();
-- DROP FUNCTION IF EXISTS fn_blog_listing_links_delete();
-- DROP TRIGGER IF EXISTS trg_signal_content_embeds_updated_at ON signal_content_embeds;
-- DROP FUNCTION IF EXISTS fn_signal_content_embeds_updated_at();
-- ALTER TABLE blog_listing_links_backup RENAME TO blog_listing_links;
-- DROP TABLE IF EXISTS signal_content_embeds;
