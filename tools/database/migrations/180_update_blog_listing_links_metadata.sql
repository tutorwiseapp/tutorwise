/**
 * Filename: tools/database/migrations/180_update_blog_listing_links_metadata.sql
 * Purpose: Add metadata columns to blog_listing_links for richer context
 * Created: 2026-01-16
 *
 * This migration adds metadata columns to blog_listing_links to track:
 * - Position of embed in article
 * - Embed instance ID (stable hash for performance comparison)
 * - Additional context (subjects, levels, etc.)
 *
 * Note: blog_listing_links serves dual purpose (acknowledged technical debt):
 * 1. Editorial layer: Which tutors/listings should appear in which articles?
 * 2. Behavioral layer: How do those embeds perform?
 * This will eventually split into separate tables when it "feels awkward."
 */

-- ============================================================================
-- 1. ADD METADATA COLUMNS
-- ============================================================================

ALTER TABLE blog_listing_links
ADD COLUMN IF NOT EXISTS position_in_article INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS embed_instance_id TEXT NULL,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- ============================================================================
-- 2. UPDATE EXISTING CONSTRAINTS
-- ============================================================================

-- Update unique constraint to include position (allow same listing multiple times at different positions)
ALTER TABLE blog_listing_links
DROP CONSTRAINT IF EXISTS blog_listing_links_blog_article_id_listing_id_link_type_key;

ALTER TABLE blog_listing_links
ADD CONSTRAINT blog_listing_links_unique_embed
UNIQUE (blog_article_id, listing_id, link_type, position_in_article);

-- ============================================================================
-- 3. ADD COLUMN COMMENTS
-- ============================================================================

COMMENT ON COLUMN blog_listing_links.position_in_article IS
  'Zero-indexed position of embed within article. Used with embed_instance_id for stable performance tracking.';

COMMENT ON COLUMN blog_listing_links.embed_instance_id IS
  'Stable hash-based ID: hash(article_id + component + position).
   Enables "position 1 vs position 2" performance comparison across users.';

COMMENT ON COLUMN blog_listing_links.metadata IS
  'Additional context stored as JSONB. Common keys:
   - subjects: Array of subject filters (for ListingGrid)
   - levels: Array of level filters (for ListingGrid)
   - max_price: Price filter (for ListingGrid)
   - context: Component context (e.g., "recommended", "author" for TutorEmbed)
   - component_type: "tutor_embed", "listing_grid", "tutor_carousel"';

COMMENT ON COLUMN blog_listing_links.click_count IS
  'Total clicks on this embed across all users (behavioral metric).
   Incremented by blog_attribution_events but cached here for performance.';

COMMENT ON COLUMN blog_listing_links.conversion_count IS
  'Total conversions (bookings) attributed to this embed (behavioral metric).
   Incremented by blog_attribution_events but cached here for performance.';

COMMENT ON TABLE blog_listing_links IS
  'Links between blog articles and marketplace listings/tutors.
   Serves dual purpose (acknowledged technical debt):
   1. Editorial: Which tutors/listings should appear in which articles?
   2. Behavioral: How do those embeds perform (clicks, conversions)?

   link_type meanings:
   - manual_embed: Author explicitly added component (TutorEmbed, ListingGrid, etc.)
   - auto_related: System automatically suggested based on tags/subjects
   - author_listing: Link to the article authors own tutor profile/listing';

-- ============================================================================
-- 4. CREATE INDEXES FOR NEW COLUMNS
-- ============================================================================

-- Query by embed_instance_id for performance tracking
CREATE INDEX IF NOT EXISTS idx_blog_listing_links_embed_instance
ON blog_listing_links(embed_instance_id)
WHERE embed_instance_id IS NOT NULL;

-- Query by position for positional analysis
CREATE INDEX IF NOT EXISTS idx_blog_listing_links_position
ON blog_listing_links(blog_article_id, position_in_article);

-- ============================================================================
-- 5. MIGRATION DATA INTEGRITY
-- ============================================================================

-- Set default position for existing rows (if any)
UPDATE blog_listing_links
SET position_in_article = 0
WHERE position_in_article IS NULL;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test inserting a link with metadata
-- INSERT INTO blog_listing_links (blog_article_id, listing_id, link_type, position_in_article, embed_instance_id, metadata)
-- VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   '00000000-0000-0000-0000-000000000000',
--   'manual_embed',
--   0,
--   'embed_abc123',
--   '{"component_type": "tutor_embed", "context": "recommended"}'::jsonb
-- );

-- Query performance by position
-- SELECT position_in_article, SUM(click_count), SUM(conversion_count)
-- FROM blog_listing_links
-- WHERE blog_article_id = 'xxx'
-- GROUP BY position_in_article
-- ORDER BY position_in_article;
