/**
 * Script: backfill-user-statistics.sql
 * Purpose: Backfill user_statistics_daily table with historical data
 * Created: 2026-01-22
 * Usage: Run this script to populate user statistics for the last 30 days
 *
 * This script calls aggregate_user_statistics() for each day in the past 30 days.
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
  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Backfilling user statistics from % to %', v_start_date, v_end_date;
  RAISE NOTICE '=================================================================';
  RAISE NOTICE '';

  -- Loop through each date from start to end
  FOR v_date IN
    SELECT generate_series(v_start_date, v_end_date, '1 day'::interval)::date
  LOOP
    RAISE NOTICE 'Processing date: %', v_date;

    -- Call aggregation function for all users on this date
    PERFORM aggregate_user_statistics(NULL, v_date);

    v_days_processed := v_days_processed + 1;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Backfill complete! Processed % days', v_days_processed;
  RAISE NOTICE '=================================================================';
  RAISE NOTICE '';
END$$;

-- Display recent statistics summary
SELECT
  date,
  COUNT(*) as user_count,
  SUM(total_sessions) as total_sessions,
  SUM(total_earnings) as total_earnings,
  SUM(total_spending) as total_spending,
  AVG(caas_score) as avg_caas_score
FROM user_statistics_daily
GROUP BY date
ORDER BY date DESC
LIMIT 10;
