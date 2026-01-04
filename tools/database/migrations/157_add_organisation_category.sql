-- Migration: 157_add_organisation_category.sql
-- Purpose: Add category field to distinguish organisation types (agency, school, company, etc.)
-- Created: 2026-01-03
-- Context: Enable SEO-optimized category routes (/agencies, /schools, /companies)

-- ============================================================================
-- PART 1: Add category column to connection_groups
-- ============================================================================

-- Add category column with constraint
ALTER TABLE public.connection_groups
ADD COLUMN IF NOT EXISTS category TEXT
  CHECK (category IN ('agency', 'school', 'company', 'nonprofit', 'franchise', 'other'))
  DEFAULT 'agency';

-- Add comment
COMMENT ON COLUMN public.connection_groups.category IS
'Organisation category for filtering and SEO routes. Only applicable when type = ''organisation''.
Values: agency (tutoring agency), school (tutoring school/center), company (tutoring company),
nonprofit (charitable org), franchise (franchise location), other (miscellaneous)';

-- ============================================================================
-- PART 2: Create index for category filtering
-- ============================================================================

-- Index for fast category + public_visible queries
CREATE INDEX IF NOT EXISTS idx_connection_groups_category_public
ON public.connection_groups(category, public_visible)
WHERE type = 'organisation';

-- Composite index for common query pattern (category + location + caas_score)
CREATE INDEX IF NOT EXISTS idx_connection_groups_category_location_score
ON public.connection_groups(category, location_city, caas_score DESC)
WHERE type = 'organisation' AND public_visible = true;

-- ============================================================================
-- PART 3: Set default category for existing organisations
-- ============================================================================

-- Set existing organisations to 'agency' as default
UPDATE public.connection_groups
SET category = 'agency'
WHERE type = 'organisation' AND category IS NULL;

-- ============================================================================
-- PART 4: Update RLS policies (no changes needed - inherits from type filter)
-- ============================================================================

-- Existing RLS policies already filter by type = 'organisation'
-- Category is a sub-filter, so no policy changes required

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify category distribution
-- SELECT category, COUNT(*) as count
-- FROM connection_groups
-- WHERE type = 'organisation'
-- GROUP BY category
-- ORDER BY count DESC;

-- Verify indexes created
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'connection_groups'
-- AND indexname LIKE '%category%';

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- To rollback this migration:
-- DROP INDEX IF EXISTS idx_connection_groups_category_public;
-- DROP INDEX IF EXISTS idx_connection_groups_category_location_score;
-- ALTER TABLE public.connection_groups DROP COLUMN IF EXISTS category;
