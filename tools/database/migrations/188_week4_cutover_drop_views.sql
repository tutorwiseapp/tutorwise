/**
 * Filename: tools/database/migrations/188_week4_cutover_drop_views.sql
 * Purpose: Week 4 - Final cutover: Drop backward-compatible views and cleanup
 * Created: 2026-01-17
 *
 * WEEK 4 SCOPE: Complete migration by removing backward compatibility layer
 * - Drop all views (blog_attribution_events, blog_article_metrics, etc.)
 * - Drop all triggers and functions for view compatibility
 * - Drop backup tables (after 30-day retention period)
 * - Update any remaining references to old table names
 *
 * IMPORTANT: Only run this migration after:
 * 1. Week 1-3 migrations are deployed and stable
 * 2. All application code is updated (Week 2 complete)
 * 3. All RPCs are updated (Week 3 complete / Migration 187 applied)
 * 4. 30-day backup retention period has passed
 * 5. Full system testing completed
 *
 * ROLLBACK: If issues arise, can recreate views from backup tables
 */

-- ============================================================================
-- SAFETY CHECK: Verify all signal_* tables exist
-- ============================================================================

DO $$
BEGIN
  -- Check signal_events exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'signal_events') THEN
    RAISE EXCEPTION 'signal_events table does not exist. Run Migration 183 first.';
  END IF;

  -- Check signal_metrics exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'signal_metrics') THEN
    RAISE EXCEPTION 'signal_metrics table does not exist. Run Migration 184 first.';
  END IF;

  -- Check signal_content_embeds exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'signal_content_embeds') THEN
    RAISE EXCEPTION 'signal_content_embeds table does not exist. Run Migration 185 first.';
  END IF;

  -- Check signal_content_saves exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'signal_content_saves') THEN
    RAISE EXCEPTION 'signal_content_saves table does not exist. Run Migration 186 first.';
  END IF;

  RAISE NOTICE 'Safety check passed: All signal_* tables exist';
END $$;

-- ============================================================================
-- STEP 1: Drop backward-compatible views
-- ============================================================================

-- Drop blog_attribution_events view
DROP VIEW IF EXISTS blog_attribution_events CASCADE;
RAISE NOTICE 'Dropped view: blog_attribution_events';

-- Drop blog_article_metrics view
DROP VIEW IF EXISTS blog_article_metrics CASCADE;
RAISE NOTICE 'Dropped view: blog_article_metrics';

-- Drop blog_listing_links view
DROP VIEW IF EXISTS blog_listing_links CASCADE;
RAISE NOTICE 'Dropped view: blog_listing_links';

-- Drop blog_article_saves view
DROP VIEW IF EXISTS blog_article_saves CASCADE;
RAISE NOTICE 'Dropped view: blog_article_saves';

-- ============================================================================
-- STEP 2: Drop trigger functions (CASCADE will drop triggers automatically)
-- ============================================================================

-- Drop blog_attribution_events trigger functions
DROP FUNCTION IF EXISTS fn_blog_attribution_events_insert() CASCADE;
RAISE NOTICE 'Dropped function: fn_blog_attribution_events_insert';

-- Drop blog_article_metrics trigger functions
DROP FUNCTION IF EXISTS fn_blog_article_metrics_insert() CASCADE;
DROP FUNCTION IF EXISTS fn_blog_article_metrics_update() CASCADE;
RAISE NOTICE 'Dropped functions: fn_blog_article_metrics_insert, fn_blog_article_metrics_update';

-- Drop blog_listing_links trigger functions
DROP FUNCTION IF EXISTS fn_blog_listing_links_insert() CASCADE;
DROP FUNCTION IF EXISTS fn_blog_listing_links_update() CASCADE;
DROP FUNCTION IF EXISTS fn_blog_listing_links_delete() CASCADE;
RAISE NOTICE 'Dropped functions: fn_blog_listing_links_insert/update/delete';

-- Drop blog_article_saves trigger functions
DROP FUNCTION IF EXISTS fn_blog_article_saves_insert() CASCADE;
DROP FUNCTION IF EXISTS fn_blog_article_saves_update() CASCADE;
DROP FUNCTION IF EXISTS fn_blog_article_saves_delete() CASCADE;
RAISE NOTICE 'Dropped functions: fn_blog_article_saves_insert/update/delete';

-- ============================================================================
-- STEP 3: Drop backup tables (after 30-day retention)
-- ============================================================================

-- IMPORTANT: Only uncomment and run this section after 30-day retention period
-- This provides rollback safety in case of issues with the migration

-- DROP TABLE IF EXISTS blog_attribution_events_backup CASCADE;
-- RAISE NOTICE 'Dropped backup table: blog_attribution_events_backup';

-- DROP TABLE IF EXISTS blog_article_metrics_backup CASCADE;
-- RAISE NOTICE 'Dropped backup table: blog_article_metrics_backup';

-- DROP TABLE IF EXISTS blog_listing_links_backup CASCADE;
-- RAISE NOTICE 'Dropped backup table: blog_listing_links_backup';

-- DROP TABLE IF EXISTS blog_article_saves_backup CASCADE;
-- RAISE NOTICE 'Dropped backup table: blog_article_saves_backup';

-- ============================================================================
-- STEP 4: Verify migration completeness
-- ============================================================================

DO $$
DECLARE
  view_count INTEGER;
  backup_table_count INTEGER;
BEGIN
  -- Count remaining views
  SELECT COUNT(*) INTO view_count
  FROM information_schema.views
  WHERE table_schema = 'public'
  AND table_name IN ('blog_attribution_events', 'blog_article_metrics', 'blog_listing_links', 'blog_article_saves');

  IF view_count > 0 THEN
    RAISE WARNING 'Some views still exist: % views remaining', view_count;
  ELSE
    RAISE NOTICE 'All backward-compatible views dropped successfully';
  END IF;

  -- Count backup tables
  SELECT COUNT(*) INTO backup_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name LIKE '%_backup';

  IF backup_table_count > 0 THEN
    RAISE NOTICE 'Backup tables still present: % tables (kept for rollback safety)', backup_table_count;
  ELSE
    RAISE NOTICE 'All backup tables dropped';
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Performance optimization (optional)
-- ============================================================================

-- Analyze all signal_* tables for query planner optimization
ANALYZE signal_events;
ANALYZE signal_metrics;
ANALYZE signal_content_embeds;
ANALYZE signal_content_saves;
RAISE NOTICE 'Analyzed all signal_* tables for query optimization';

-- Vacuum to reclaim space (optional, can be scheduled separately)
-- VACUUM ANALYZE signal_events;
-- VACUUM ANALYZE signal_metrics;
-- VACUUM ANALYZE signal_content_embeds;
-- VACUUM ANALYZE signal_content_saves;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these after migration to verify cleanup:

-- 1. Verify no views remain
-- SELECT table_name
-- FROM information_schema.views
-- WHERE table_schema = 'public'
-- AND table_name LIKE 'blog_%';

-- 2. Verify signal_* tables are populated
-- SELECT
--   'signal_events' as table_name, COUNT(*) as row_count FROM signal_events
-- UNION ALL
-- SELECT 'signal_metrics', COUNT(*) FROM signal_metrics
-- UNION ALL
-- SELECT 'signal_content_embeds', COUNT(*) FROM signal_content_embeds
-- UNION ALL
-- SELECT 'signal_content_saves', COUNT(*) FROM signal_content_saves;

-- 3. Check for any remaining references to old tables in RPCs
-- SELECT routine_name, routine_definition
-- FROM information_schema.routines
-- WHERE routine_schema = 'public'
-- AND routine_definition LIKE '%blog_attribution_events%'
-- OR routine_definition LIKE '%blog_article_metrics%';

-- 4. Verify all indexes exist on signal_* tables
-- SELECT tablename, indexname
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- AND tablename LIKE 'signal_%'
-- ORDER BY tablename, indexname;

-- ============================================================================
-- ROLLBACK PLAN (if needed within 30 days)
-- ============================================================================

-- If you need to rollback this migration:

-- 1. Restore views from backup tables:
/*
CREATE VIEW blog_attribution_events AS
SELECT
  id,
  content_id AS blog_article_id,
  user_id,
  session_id,
  target_type,
  target_id,
  event_type,
  source_component,
  metadata,
  created_at
FROM signal_events
WHERE content_type = 'article';

-- (Recreate triggers and functions from Migrations 183-186)
*/

-- 2. If backup tables were dropped and you need full rollback:
/*
-- Rename signal_* back to blog_* (DESTRUCTIVE!)
ALTER TABLE signal_events RENAME TO blog_attribution_events;
ALTER TABLE signal_metrics RENAME TO blog_article_metrics;
ALTER TABLE signal_content_embeds RENAME TO blog_listing_links;
ALTER TABLE signal_content_saves RENAME TO blog_article_saves;

-- Drop signal_id column (if needed)
ALTER TABLE blog_attribution_events DROP COLUMN IF EXISTS signal_id;
ALTER TABLE blog_attribution_events DROP COLUMN IF EXISTS content_type;
ALTER TABLE blog_attribution_events RENAME COLUMN content_id TO blog_article_id;
*/

-- ============================================================================
-- POST-MIGRATION NOTES
-- ============================================================================

/*
After running this migration:

1. ✅ All code must use signal_* table names
2. ✅ Old blog_* views no longer exist
3. ✅ No backward compatibility layer
4. ✅ signal_id journey tracking fully enabled
5. ⚠️  Backup tables retained for 30 days (rollback safety)

Next steps:
- Monitor application logs for any errors referencing blog_* tables
- Verify all RPCs return expected data
- Test dashboard functionality
- Monitor query performance
- Schedule backup table cleanup after 30 days
*/
