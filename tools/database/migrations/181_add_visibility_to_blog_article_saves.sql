/**
 * Filename: tools/database/migrations/181_add_visibility_to_blog_article_saves.sql
 * Purpose: Add visibility column to blog_article_saves for privacy control
 * Created: 2026-01-16
 *
 * This migration adds privacy controls to article saves:
 * - 'private': Never show in public wiselists (DEFAULT)
 * - 'inherit_wiselist': Respects parent wiselist visibility
 *
 * Design Decision: Privacy-first. Users must explicitly choose to share
 * their reading history in public wiselists.
 */

-- ============================================================================
-- 1. ADD VISIBILITY COLUMN
-- ============================================================================

ALTER TABLE blog_article_saves
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private'
CHECK (visibility IN ('private', 'inherit_wiselist'));

-- ============================================================================
-- 2. ADD COLUMN COMMENT
-- ============================================================================

COMMENT ON COLUMN blog_article_saves.visibility IS
  'Privacy control for article saves:
   - private: Never show in public wiselists (DEFAULT - privacy-first)
   - inherit_wiselist: Respects parent wiselist visibility (explicit share)

   Design rationale: Reading history is sensitive. Users must opt-in to sharing.
   Article saves in "My Saves" wiselist remain private by default even if wiselist is shared.';

COMMENT ON TABLE blog_article_saves IS
  'Records user intent to save articles to wiselists.
   This represents explicit intent, not exclusive attribution.

   Dual purpose (conceptually distinct but stored together):
   1. User Intent: "I want to save this article for later"
   2. Attribution Signal: "This article is part of my influence history"

   For multi-touch attribution, query blog_attribution_events table.
   For "what did I save?", query this table.';

-- ============================================================================
-- 3. CREATE INDEX FOR PUBLIC VISIBILITY QUERIES
-- ============================================================================

-- Optimize queries that filter for publicly visible article saves
CREATE INDEX IF NOT EXISTS idx_blog_article_saves_public
ON blog_article_saves(wiselist_id, visibility)
WHERE visibility = 'inherit_wiselist';

-- ============================================================================
-- 4. MIGRATION DATA INTEGRITY
-- ============================================================================

-- Set default visibility for existing rows (if any)
-- Existing saves should remain private by default
UPDATE blog_article_saves
SET visibility = 'private'
WHERE visibility IS NULL;

-- Make column NOT NULL after setting defaults
ALTER TABLE blog_article_saves
ALTER COLUMN visibility SET NOT NULL;

-- ============================================================================
-- 5. UPDATE RLS POLICIES (if they exist)
-- ============================================================================

-- Drop existing policies to recreate with visibility logic
DROP POLICY IF EXISTS "Users can view own article saves" ON blog_article_saves;
DROP POLICY IF EXISTS "Users can insert own article saves" ON blog_article_saves;
DROP POLICY IF EXISTS "Users can delete own article saves" ON blog_article_saves;

-- Enable RLS if not already enabled
ALTER TABLE blog_article_saves ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own saves
CREATE POLICY "Users can view own article saves"
  ON blog_article_saves
  FOR SELECT
  USING (profile_id = auth.uid());

-- Policy: Users can view public article saves in public wiselists
CREATE POLICY "Anyone can view public article saves"
  ON blog_article_saves
  FOR SELECT
  USING (
    visibility = 'inherit_wiselist'
    AND EXISTS (
      SELECT 1 FROM wiselists
      WHERE wiselists.id = blog_article_saves.wiselist_id
      AND wiselists.visibility = 'public'
    )
  );

-- Policy: Users can insert their own article saves
CREATE POLICY "Users can insert own article saves"
  ON blog_article_saves
  FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- Policy: Users can update their own article saves (e.g., change visibility)
CREATE POLICY "Users can update own article saves"
  ON blog_article_saves
  FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Policy: Users can delete their own article saves
CREATE POLICY "Users can delete own article saves"
  ON blog_article_saves
  FOR DELETE
  USING (profile_id = auth.uid());

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON blog_article_saves TO authenticated;
GRANT SELECT ON blog_article_saves TO anon; -- For viewing public saves

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test privacy: Query only public article saves in a public wiselist
-- SELECT bas.*, ba.title
-- FROM blog_article_saves bas
-- JOIN blog_articles ba ON ba.id = bas.article_id
-- JOIN wiselists w ON w.id = bas.wiselist_id
-- WHERE w.slug = 'public-wiselist-slug'
-- AND w.visibility = 'public'
-- AND bas.visibility = 'inherit_wiselist';

-- Test privacy: Verify private saves are excluded
-- SELECT COUNT(*)
-- FROM blog_article_saves
-- WHERE wiselist_id = 'xxx'
-- AND visibility = 'private'; -- Should not appear in public view

-- Test update: Change visibility to public
-- UPDATE blog_article_saves
-- SET visibility = 'inherit_wiselist'
-- WHERE id = 'xxx' AND profile_id = auth.uid();
