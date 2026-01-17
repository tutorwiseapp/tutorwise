-- Migration: blog_article_saves → signal_content_saves
-- Strategy: Zero-downtime migration using views for backward compatibility
-- Week 1: Database Layer
-- Estimated Duration: 10 minutes (off-peak)

-- ============================================================================
-- STEP 1: Create new signal_content_saves table
-- ============================================================================

CREATE TABLE signal_content_saves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- User Reference
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Content Reference (generic, not blog-specific)
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'article' CHECK (content_type IN (
    'article',      -- Blog articles (current)
    'podcast',      -- Future: Podcast episodes
    'video',        -- Future: Video content
    'webinar'       -- Future: Webinar recordings
  )),

  -- Save Context
  saved_from_component TEXT CHECK (saved_from_component IN (
    'article_header',    -- Floating save button at top
    'article_footer',    -- Save CTA at bottom
    'floating_button',   -- Sticky floating button
    'inline_cta',        -- Inline save prompt
    'share_modal'        -- From share/refer modal
  )),

  -- Visibility & Status
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN (
    'private',     -- Only user can see
    'public',      -- Visible to others
    'shared'       -- Shared with specific users
  )),

  -- Engagement Tracking
  last_accessed_at TIMESTAMPTZ,  -- When user last viewed this saved content
  access_count INTEGER DEFAULT 0, -- How many times user revisited

  -- Flexible metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Ensure one save per user/content combination
  UNIQUE(user_id, content_id, content_type)
);

-- ============================================================================
-- STEP 2: Create indexes for performance
-- ============================================================================

-- Find all saves for a user (user's saved library)
CREATE INDEX idx_signal_content_saves_user
ON signal_content_saves(user_id, created_at DESC);

-- Find all saves for a piece of content (popularity)
CREATE INDEX idx_signal_content_saves_content
ON signal_content_saves(content_id, content_type, created_at DESC);

-- Public saves only (for sharing features)
CREATE INDEX idx_signal_content_saves_public
ON signal_content_saves(content_id, visibility, created_at DESC)
WHERE visibility = 'public';

-- Recently accessed (for "Continue Reading" features)
CREATE INDEX idx_signal_content_saves_accessed
ON signal_content_saves(user_id, last_accessed_at DESC NULLS LAST)
WHERE last_accessed_at IS NOT NULL;

-- Save source analytics
CREATE INDEX idx_signal_content_saves_component
ON signal_content_saves(saved_from_component, content_type, created_at DESC)
WHERE saved_from_component IS NOT NULL;

-- ============================================================================
-- STEP 3: Copy existing data from blog_article_saves
-- ============================================================================

INSERT INTO signal_content_saves (
  id,
  user_id,
  content_id,
  content_type,
  saved_from_component,
  visibility,
  last_accessed_at,
  access_count,
  metadata,
  created_at,
  updated_at
)
SELECT
  id,
  user_id,
  blog_article_id AS content_id,
  'article' AS content_type,  -- All existing saves are blog articles
  saved_from_component,
  visibility,
  last_accessed_at,
  access_count,
  metadata,
  created_at,
  updated_at
FROM blog_article_saves;

-- ============================================================================
-- STEP 4: Rename old table to backup
-- ============================================================================

ALTER TABLE blog_article_saves
RENAME TO blog_article_saves_backup;

-- ============================================================================
-- STEP 5: Create view for backward compatibility
-- ============================================================================

-- This view allows existing code to continue reading from "blog_article_saves"
-- while actually reading from "signal_content_saves"
CREATE VIEW blog_article_saves AS
SELECT
  id,
  user_id,
  content_id AS blog_article_id,  -- Map back to old column name
  saved_from_component,
  visibility,
  last_accessed_at,
  access_count,
  metadata,
  created_at,
  updated_at
FROM signal_content_saves
WHERE content_type = 'article';  -- Filter to blog articles only

-- ============================================================================
-- STEP 6: Create triggers for backward-compatible writes
-- ============================================================================

-- Allow INSERT INTO blog_article_saves to write to signal_content_saves
CREATE FUNCTION fn_blog_article_saves_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO signal_content_saves (
    id,
    user_id,
    content_id,
    content_type,
    saved_from_component,
    visibility,
    last_accessed_at,
    access_count,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    COALESCE(NEW.id, uuid_generate_v4()),
    NEW.user_id,
    NEW.blog_article_id,
    'article',
    NEW.saved_from_component,
    NEW.visibility,
    NEW.last_accessed_at,
    NEW.access_count,
    NEW.metadata,
    COALESCE(NEW.created_at, NOW()),
    COALESCE(NEW.updated_at, NOW())
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_blog_article_saves_insert
INSTEAD OF INSERT ON blog_article_saves
FOR EACH ROW
EXECUTE FUNCTION fn_blog_article_saves_insert();

-- Allow UPDATE on blog_article_saves to update signal_content_saves
CREATE FUNCTION fn_blog_article_saves_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE signal_content_saves
  SET
    saved_from_component = NEW.saved_from_component,
    visibility = NEW.visibility,
    last_accessed_at = NEW.last_accessed_at,
    access_count = NEW.access_count,
    metadata = NEW.metadata,
    updated_at = NOW()
  WHERE id = NEW.id
  AND content_type = 'article';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_blog_article_saves_update
INSTEAD OF UPDATE ON blog_article_saves
FOR EACH ROW
EXECUTE FUNCTION fn_blog_article_saves_update();

-- Allow DELETE on blog_article_saves to delete from signal_content_saves
CREATE FUNCTION fn_blog_article_saves_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM signal_content_saves
  WHERE id = OLD.id
  AND content_type = 'article';
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_blog_article_saves_delete
INSTEAD OF DELETE ON blog_article_saves
FOR EACH ROW
EXECUTE FUNCTION fn_blog_article_saves_delete();

-- ============================================================================
-- STEP 7: Create updated_at trigger for signal_content_saves
-- ============================================================================

CREATE FUNCTION fn_signal_content_saves_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_signal_content_saves_updated_at
BEFORE UPDATE ON signal_content_saves
FOR EACH ROW
EXECUTE FUNCTION fn_signal_content_saves_updated_at();

-- ============================================================================
-- STEP 8: Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE signal_content_saves ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own saves
CREATE POLICY "Users can read their own signal content saves"
ON signal_content_saves
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Users can read public saves
CREATE POLICY "Anyone can read public signal content saves"
ON signal_content_saves
FOR SELECT
TO authenticated, anon
USING (visibility = 'public');

-- Policy: Users can insert their own saves
CREATE POLICY "Users can insert their own signal content saves"
ON signal_content_saves
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own saves
CREATE POLICY "Users can update their own signal content saves"
ON signal_content_saves
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Policy: Users can delete their own saves
CREATE POLICY "Users can delete their own signal content saves"
ON signal_content_saves
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Policy: Admins can read all saves
CREATE POLICY "Admins can read all signal content saves"
ON signal_content_saves
FOR SELECT
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
--   (SELECT COUNT(*) FROM signal_content_saves WHERE content_type = 'article') as signal_saves_count,
--   (SELECT COUNT(*) FROM blog_article_saves_backup) as backup_count;

-- 2. Verify view returns same data
-- SELECT COUNT(*) FROM blog_article_saves;

-- 3. Test INSERT through view (requires real user_id)
-- INSERT INTO blog_article_saves (
--   user_id, blog_article_id, saved_from_component, visibility
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000000'::uuid,
--   '11111111-1111-1111-1111-111111111111'::uuid,
--   'floating_button', 'private'
-- );
-- SELECT * FROM signal_content_saves WHERE saved_from_component = 'floating_button';
-- DELETE FROM blog_article_saves WHERE saved_from_component = 'floating_button';

-- 4. Test UPDATE through view
-- UPDATE blog_article_saves
-- SET visibility = 'public'
-- WHERE user_id = '00000000-0000-0000-0000-000000000000'::uuid;

-- 5. Check indexes exist
-- SELECT indexname FROM pg_indexes WHERE tablename = 'signal_content_saves';

-- 6. Test RLS policies (as authenticated user)
-- SELECT * FROM signal_content_saves WHERE user_id = auth.uid();

-- ============================================================================
-- ROLLBACK PLAN
-- ============================================================================

-- If migration fails, run:
-- DROP VIEW IF EXISTS blog_article_saves CASCADE;
-- DROP TRIGGER IF EXISTS trg_blog_article_saves_insert ON blog_article_saves;
-- DROP TRIGGER IF EXISTS trg_blog_article_saves_update ON blog_article_saves;
-- DROP TRIGGER IF EXISTS trg_blog_article_saves_delete ON blog_article_saves;
-- DROP FUNCTION IF EXISTS fn_blog_article_saves_insert();
-- DROP FUNCTION IF EXISTS fn_blog_article_saves_update();
-- DROP FUNCTION IF EXISTS fn_blog_article_saves_delete();
-- DROP TRIGGER IF EXISTS trg_signal_content_saves_updated_at ON signal_content_saves;
-- DROP FUNCTION IF EXISTS fn_signal_content_saves_updated_at();
-- ALTER TABLE blog_article_saves_backup RENAME TO blog_article_saves;
-- DROP TABLE IF EXISTS signal_content_saves;
