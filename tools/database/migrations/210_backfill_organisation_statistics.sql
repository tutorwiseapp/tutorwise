/**
 * Migration 210: Backfill Organisation Statistics (31 Days)
 *
 * Purpose:
 * - Populate organisation_statistics_daily with 31 days of historical data
 * - Enable historical comparison and trend analysis for browse pages
 * - Align with user_statistics_daily backfill pattern (migration 207)
 *
 * Phase: Public Pages Alignment - Phase 3
 * Created: 2026-01-22
 * Pattern: Follows user statistics backfill (migration 207)
 *
 * Execution Time: ~2-5 minutes depending on number of organisations
 *
 * Related Migrations:
 * - Migration 208: organisation_statistics_daily table
 * - Migration 209: aggregate_organisation_statistics() function
 * - Migration 207: User statistics backfill (31 days)
 */

-- ================================================================
-- BACKFILL 31 DAYS OF ORGANISATION STATISTICS
-- ================================================================

DO $$
DECLARE
  v_start_date DATE := CURRENT_DATE - INTERVAL '30 days';
  v_end_date DATE := CURRENT_DATE;
  v_current_date DATE;
  v_org_count INTEGER;
  v_total_rows INTEGER := 0;
  v_start_time TIMESTAMP := clock_timestamp();
BEGIN
  -- Get count of public organisations
  SELECT COUNT(*)
  INTO v_org_count
  FROM connection_groups
  WHERE type = 'organisation'
    AND public_visible = true;

  RAISE NOTICE 'Starting backfill for % organisations from % to %',
    v_org_count, v_start_date, v_end_date;

  -- Loop through each date
  v_current_date := v_start_date;
  WHILE v_current_date <= v_end_date LOOP
    RAISE NOTICE 'Aggregating organisations for date: %', v_current_date;

    -- Call aggregation function for this date
    PERFORM aggregate_organisation_statistics(NULL, v_current_date);

    -- Count rows created
    DECLARE
      v_rows_for_date INTEGER;
    BEGIN
      SELECT COUNT(*)
      INTO v_rows_for_date
      FROM organisation_statistics_daily
      WHERE date = v_current_date;

      v_total_rows := v_total_rows + v_rows_for_date;

      RAISE NOTICE '  → Created/updated % rows for %', v_rows_for_date, v_current_date;
    END;

    -- Move to next date
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Backfill Summary:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Date range: % to %', v_start_date, v_end_date;
  RAISE NOTICE 'Organisations processed: %', v_org_count;
  RAISE NOTICE 'Total rows created/updated: %', v_total_rows;
  RAISE NOTICE 'Expected rows: % (% orgs × 31 days)', v_org_count * 31, v_org_count;
  RAISE NOTICE 'Duration: %', clock_timestamp() - v_start_time;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Organisation statistics backfill completed successfully!';

END;
$$;

-- ================================================================
-- VERIFY BACKFILL RESULTS
-- ================================================================

-- Check data distribution
SELECT
  'Data Distribution Check' as check_type,
  COUNT(DISTINCT organisation_id) as organisations,
  COUNT(DISTINCT date) as dates,
  COUNT(*) as total_rows,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM organisation_statistics_daily;

-- Sample of today's data
SELECT
  'Sample Data (Today)' as check_type,
  osd.organisation_id,
  cg.name as organisation_name,
  osd.total_tutors,
  osd.total_sessions,
  osd.average_rating,
  osd.total_reviews,
  osd.profile_views
FROM organisation_statistics_daily osd
JOIN connection_groups cg ON osd.organisation_id = cg.id
WHERE osd.date = CURRENT_DATE
ORDER BY osd.total_sessions DESC
LIMIT 5;

-- Check for organisations with no data
SELECT
  'Organisations Missing Data' as check_type,
  cg.id,
  cg.name,
  cg.slug
FROM connection_groups cg
WHERE cg.type = 'organisation'
  AND cg.public_visible = true
  AND cg.id NOT IN (
    SELECT DISTINCT organisation_id
    FROM organisation_statistics_daily
    WHERE date = CURRENT_DATE
  )
LIMIT 5;

-- ================================================================
-- COMMENTS
-- ================================================================

COMMENT ON TABLE organisation_statistics_daily IS
  'Pre-aggregated daily statistics for organisations. Backfilled with 31 days of historical data on 2026-01-22.';
