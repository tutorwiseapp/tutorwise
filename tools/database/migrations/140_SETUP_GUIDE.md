# Statistics Infrastructure Setup Guide

This guide walks you through setting up the daily statistics aggregation system for admin dashboards.

## Overview

The statistics system uses:
- **Supabase pg_cron** to run nightly aggregation at midnight UTC
- **platform_statistics_daily** table to store pre-computed metrics
- **useAdminMetric** React hook to display metrics with month-over-month trends

## Setup Steps

### 1. Run Migration 140

Connect to your Supabase database and run the migration:

```bash
# Option A: Using psql
export DATABASE_URL="your-supabase-connection-string"
psql $DATABASE_URL < tools/database/migrations/140_add_daily_statistics_aggregation.sql

# Option B: Using Supabase dashboard
# Copy the contents of 140_add_daily_statistics_aggregation.sql
# Paste into Supabase Dashboard > SQL Editor > New Query
# Click "Run"
```

**Expected output:**
```
NOTICE:  Daily statistics aggregated for 2025-12-24: 11 users, 156 hubs, 45 spokes, 89 citations
NOTICE:  =================================================================
NOTICE:  Migration 140_add_daily_statistics_aggregation.sql completed
NOTICE:  =================================================================
```

### 2. Verify Cron Job is Scheduled

Check that the cron job was created:

```sql
-- View all cron jobs
SELECT * FROM cron.job;

-- Expected result:
-- jobid | schedule  | command                                  | nodename | ...
-- 1     | 0 0 * * * | SELECT aggregate_daily_statistics(...);  | ...      | ...
```

If you see the job listed, it will run automatically at midnight UTC every night.

### 3. Backfill Historical Data (Last 30 Days)

Run the backfill script to populate the last 30 days with statistics:

```bash
# Option A: Using psql
psql $DATABASE_URL < tools/database/scripts/backfill-statistics.sql

# Option B: Using Supabase dashboard
# Copy contents of backfill-statistics.sql and run in SQL Editor
```

**Expected output:**
```
NOTICE:  Backfilling platform statistics from 2025-11-24 to 2025-12-24
...
NOTICE:  Backfill complete! Processed 31 days

 date       | total_users | active_users | ...
------------+-------------+--------------+-----
 2025-12-24 | 11          | 0            | ...
 2025-12-23 | 11          | 0            | ...
 ...
```

**Note:** This creates snapshots based on *current* database state, not historical state. All 30 days will have the same values unless your data changed recently. This is expected and provides baseline data for comparison.

### 4. Verify Statistics Table

Check that statistics were populated:

```sql
-- View recent statistics
SELECT
  date,
  total_users,
  active_users,
  seo_total_hubs,
  seo_published_hubs,
  seo_total_spokes,
  seo_total_citations
FROM platform_statistics_daily
ORDER BY date DESC
LIMIT 10;
```

You should see rows for the last 30 days.

### 5. Test the Frontend

1. Start your development server:
   ```bash
   cd apps/web
   npm run dev
   ```

2. Visit admin dashboards:
   - http://localhost:3000/admin/users
   - http://localhost:3000/admin/seo

3. **What you should see:**
   - KPI cards with metric values
   - Sublabels showing "+X vs last month" or "No change"
   - Sidebar stats widgets with current values

4. **If you see "+0 vs last month":**
   - This is expected if all 30 days have the same values
   - As new data is added and nightly cron runs, you'll see real trends
   - You can manually test by changing a value in the statistics table

## Manual Testing

To see trend data immediately, you can manually create different values for past dates:

```sql
-- Update yesterday's statistics to have fewer users
UPDATE platform_statistics_daily
SET total_users = 9
WHERE date = CURRENT_DATE - INTERVAL '1 day';

-- Refresh the admin dashboard - you should now see "+2 vs yesterday"
```

## Troubleshooting

### Cron job isn't running
```sql
-- Check if pg_cron extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- If not found, enable it (requires superuser)
CREATE EXTENSION pg_cron;
```

### Statistics table is empty
```sql
-- Manually run aggregation for today
SELECT aggregate_daily_statistics(CURRENT_DATE);

-- Check the result
SELECT * FROM platform_statistics_daily WHERE date = CURRENT_DATE;
```

### Frontend shows "0" for all metrics
- Check that you're logged in as an admin user
- Verify RLS policies allow admins to read platform_statistics_daily
- Check browser console for errors
- Verify React Query is fetching data (check Network tab)

### Frontend shows error: "Failed to fetch..."
- Ensure migration 140 ran successfully
- Check that statistics table has data
- Verify your user has `is_admin = true` in profiles table

## Maintenance

### Adding New Metrics

To add a new metric (e.g., `total_bookings`):

1. Add column to table:
   ```sql
   ALTER TABLE platform_statistics_daily
     ADD COLUMN total_bookings INTEGER DEFAULT 0;
   ```

2. Update aggregation function:
   ```sql
   -- Edit aggregate_daily_statistics() function
   -- Add query for total_bookings
   -- Add to INSERT/UPDATE statement
   ```

3. Add to TypeScript types:
   ```typescript
   // apps/web/src/hooks/useAdminMetric.ts
   export type MetricName =
     | 'total_users'
     | 'total_bookings'  // ← Add here
     | ...
   ```

4. Use in dashboard:
   ```typescript
   const bookingsMetric = useAdminMetric({
     metric: 'total_bookings',
     compareWith: 'last_month'
   });
   ```

### Monitoring

```sql
-- View cron job execution history
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE command LIKE '%aggregate_daily_statistics%')
ORDER BY start_time DESC
LIMIT 10;

-- Check for errors
SELECT * FROM cron.job_run_details
WHERE status = 'failed'
ORDER BY start_time DESC;
```

## Next Steps

Once this is working:
1. Add more metrics to track (bookings, revenue, listings, reviews, etc.)
2. Create weekly/monthly rollup tables for longer-term trends
3. Add data visualization (charts, graphs) to admin dashboards
4. Set up alerts for anomalies (sudden drops/spikes)

## Support

If you encounter issues, check:
1. Supabase logs for cron job errors
2. Browser console for frontend errors
3. Database logs for permission issues
4. This guide's troubleshooting section

For questions about the implementation, refer to:
- Migration file: `140_add_daily_statistics_aggregation.sql`
- Hook implementation: `apps/web/src/hooks/useAdminMetric.ts`
- Commit message for full architecture details
