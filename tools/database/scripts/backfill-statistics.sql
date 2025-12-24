/*
 * Script: backfill-statistics.sql
 * Purpose: Backfill platform_statistics_daily table with historical data
 * Created: 2025-12-24
 * Usage: Run this script to populate statistics for the last 30 days
 *
 * This script calls aggregate_daily_statistics() for each day in the past 30 days.
 * Note: This generates snapshot data based on current database state, not historical state.
 * For true historical accuracy, you would need time-travel queries or archived data.
 */

DO $$
DECLARE
  v_date DATE;
  v_start_date DATE := CURRENT_DATE - INTERVAL '30 days';
  v_end_date DATE := CURRENT_DATE;
  v_days_processed INTEGER := 0;
BEGIN
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Backfilling platform statistics from % to %', v_start_date, v_end_date;
  RAISE NOTICE '=================================================================';

  -- Loop through each date from start to end
  FOR v_date IN
    SELECT generate_series(v_start_date, v_end_date, '1 day'::interval)::date
  LOOP
    -- Call aggregation function for this date
    PERFORM aggregate_daily_statistics(v_date);
    v_days_processed := v_days_processed + 1;
  END LOOP;

  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Backfill complete! Processed % days', v_days_processed;
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Verify with: SELECT date, total_users, seo_total_hubs FROM platform_statistics_daily ORDER BY date DESC LIMIT 10;';
END$$;

-- Display recent statistics
SELECT
  date,
  total_users,
  active_users,
  admin_users,
  seo_total_hubs,
  seo_published_hubs,
  seo_total_spokes,
  seo_total_citations
FROM platform_statistics_daily
ORDER BY date DESC
LIMIT 10;
