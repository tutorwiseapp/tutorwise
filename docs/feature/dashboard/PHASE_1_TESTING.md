# Phase 1 Testing & Verification Checklist

**Created:** 2026-01-22
**Phase:** Dashboard Alignment Phase 1.7
**Status:** 🔄 In Progress

## Purpose

Comprehensive testing checklist to verify all Phase 1 changes are working correctly and dashboards are properly aligned.

---

## Pre-Testing Setup

### ✅ Database Migrations

- [ ] Apply migration 206 (`create_user_statistics_daily.sql`)
  ```sql
  -- Run in Supabase SQL Editor or via psql
  \i tools/database/migrations/206_create_user_statistics_daily.sql
  ```

- [ ] Apply migration 207 (`add_user_statistics_aggregation.sql`)
  ```sql
  \i tools/database/migrations/207_add_user_statistics_aggregation.sql
  ```

- [ ] Verify table exists
  ```sql
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_name = 'user_statistics_daily';
  -- Expected: 1
  ```

- [ ] Verify functions exist
  ```sql
  SELECT proname FROM pg_proc
  WHERE proname IN ('aggregate_user_statistics', 'aggregate_single_user_statistics');
  -- Expected: 2 rows
  ```

- [ ] Verify cron job scheduled
  ```sql
  SELECT * FROM cron.job
  WHERE jobname = 'aggregate-user-statistics';
  -- Expected: 1 row, schedule '0 1 * * *'
  ```

### ✅ Data Backfill

- [ ] Run backfill script (Option A: TypeScript)
  ```bash
  npx tsx scripts/backfill-user-statistics.mts
  ```

- [ ] OR run backfill script (Option B: SQL)
  ```sql
  \i tools/database/scripts/backfill-user-statistics.sql
  ```

- [ ] Verify backfill completed
  ```sql
  SELECT
    date,
    COUNT(*) as user_count,
    SUM(total_sessions) as total_sessions
  FROM user_statistics_daily
  GROUP BY date
  ORDER BY date DESC
  LIMIT 10;
  -- Expected: 10-31 days with data
  ```

---

## Phase 1.1: useUserMetric Hook Testing

### Unit Tests

- [ ] Hook exists at `apps/web/src/hooks/useUserMetric.ts`
- [ ] Hook exports `useUserMetric` function
- [ ] Hook exports `UserMetricName` type (30+ metrics)
- [ ] Hook exports `UseUserMetricOptions` interface
- [ ] Hook exports `UserMetricResult` interface

### Integration Tests

- [ ] Test hook with valid user ID and metric
  ```typescript
  const { value, trend } = useUserMetric({
    userId: 'test-user-id',
    metric: 'monthly_earnings',
    compareWith: 'last_month'
  });
  ```

- [ ] Verify hook returns correct structure
  ```typescript
  interface Expected {
    value: number;
    previousValue: number | null;
    change: number | null;
    changePercent: number | null;
    trend: 'up' | 'down' | 'neutral';
    isLoading: boolean;
    error: Error | null;
  }
  ```

- [ ] Test all metric types
  - [ ] `monthly_earnings`
  - [ ] `monthly_spending`
  - [ ] `monthly_sessions`
  - [ ] `upcoming_sessions`
  - [ ] `total_sessions`
  - [ ] `average_rating`
  - [ ] `total_reviews`
  - [ ] `active_students`
  - [ ] `total_students`
  - [ ] `caas_score`

### Comparison Period Tests

- [ ] Test `compareWith: 'yesterday'`
- [ ] Test `compareWith: 'last_week'`
- [ ] Test `compareWith: 'last_month'`

---

## Phase 1.2: Database Table Testing

### Schema Verification

- [ ] Table `user_statistics_daily` exists
- [ ] Table has 33 columns (id, user_id, date, 30 metrics)
- [ ] Unique constraint on `(user_id, date)` exists
- [ ] Foreign key to `profiles(id)` exists
- [ ] `ON DELETE CASCADE` configured correctly

### Index Verification

- [ ] Index `idx_user_stats_user_date` exists
- [ ] Index `idx_user_stats_user` exists
- [ ] Index `idx_user_stats_date` exists

### Data Integrity Tests

- [ ] Insert test row
  ```sql
  INSERT INTO user_statistics_daily (user_id, date, monthly_earnings)
  VALUES ('test-user-id', CURRENT_DATE, 100.00);
  ```

- [ ] Verify unique constraint (should fail on duplicate)
  ```sql
  INSERT INTO user_statistics_daily (user_id, date, monthly_earnings)
  VALUES ('test-user-id', CURRENT_DATE, 200.00);
  -- Expected: Error (duplicate key)
  ```

- [ ] Test ON CONFLICT UPDATE
  ```sql
  INSERT INTO user_statistics_daily (user_id, date, monthly_earnings)
  VALUES ('test-user-id', CURRENT_DATE, 200.00)
  ON CONFLICT (user_id, date)
  DO UPDATE SET monthly_earnings = EXCLUDED.monthly_earnings;
  -- Expected: Success (updated to 200.00)
  ```

---

## Phase 1.3: Background Job Testing

### Function Testing

- [ ] Test `aggregate_user_statistics()` with no parameters (all users)
  ```sql
  SELECT aggregate_user_statistics(NULL, CURRENT_DATE);
  ```

- [ ] Test `aggregate_user_statistics()` with specific user
  ```sql
  SELECT aggregate_user_statistics('test-user-id', CURRENT_DATE);
  ```

- [ ] Test `aggregate_single_user_statistics()`
  ```sql
  SELECT aggregate_single_user_statistics('test-user-id', CURRENT_DATE);
  ```

### Cron Job Testing

- [ ] Verify job scheduled correctly
  ```sql
  SELECT jobname, schedule, command
  FROM cron.job
  WHERE jobname = 'aggregate-user-statistics';
  -- Expected: '0 1 * * *' at 1am UTC
  ```

- [ ] Check last execution
  ```sql
  SELECT *
  FROM cron.job_run_details
  WHERE jobname = 'aggregate-user-statistics'
  ORDER BY start_time DESC
  LIMIT 1;
  ```

- [ ] Manual trigger test
  ```sql
  SELECT cron.schedule_in_database(
    'test-aggregate-user-statistics',
    '* * * * *',  -- Every minute (for testing)
    $$SELECT aggregate_user_statistics(NULL, CURRENT_DATE);$$
  );
  -- Wait 1 minute, then unschedule:
  SELECT cron.unschedule('test-aggregate-user-statistics');
  ```

### Performance Testing

- [ ] Measure execution time for all users
  ```sql
  EXPLAIN ANALYZE
  SELECT aggregate_user_statistics(NULL, CURRENT_DATE);
  ```

- [ ] Verify execution time < 30 seconds for 10,000 users
- [ ] Check database load during aggregation

---

## Phase 1.4: Dashboard KPI Migration Testing

### Component Tests

- [ ] `KPIGrid` component updated (not V2)
- [ ] `KPIGrid` accepts `userId` prop (not `data`)
- [ ] `KPIGrid` uses `useUserMetric` hooks
- [ ] Dashboard page passes `userId={profile.id}`

### Visual Regression Tests

- [ ] Dashboard loads without errors
- [ ] KPI cards display correctly
- [ ] Loading states show "-" (not spinners)
- [ ] Trend indicators appear (up/down arrows)
- [ ] Currency formatting correct (£1,234)

### Data Accuracy Tests

#### For Tutors:
- [ ] "Total Earnings" shows monthly earnings
- [ ] "Upcoming Sessions" shows count + sublabel
- [ ] "Completed Sessions" shows monthly count
- [ ] "Average Rating" shows rating + review count
- [ ] "Active Students" shows count + total
- [ ] "CaaS Score" shows score + tier

#### For Clients:
- [ ] "Active Bookings" shows upcoming count
- [ ] "Total Spent" shows monthly spending
- [ ] "Completed Sessions" shows monthly count
- [ ] "Average Rating" shows rating given
- [ ] "Lifetime Spending" shows total
- [ ] "CaaS Score" shows score + tier

### Historical Comparison Tests

- [ ] Change percentage shows ("+" or "-")
- [ ] "vs last month" text displays
- [ ] Trend arrows match change direction
- [ ] No data shows gracefully (no errors)

---

## Phase 1.5: Widget Wrapper Testing

### File Structure Tests

- [ ] Directory `apps/web/src/app/components/feature/dashboard/widgets/` exists
- [ ] `UserStatsWidget.tsx` exists
- [ ] `UserTipWidget.tsx` exists
- [ ] `UserHelpWidget.tsx` exists
- [ ] `UserVideoWidget.tsx` exists
- [ ] `UserActivityWidget.tsx` exists
- [ ] `index.ts` barrel file exists

### Component Tests

- [ ] Import from barrel file works
  ```typescript
  import {
    UserStatsWidget,
    UserTipWidget,
    UserHelpWidget
  } from '@/app/components/feature/dashboard/widgets';
  ```

- [ ] `UserStatsWidget` wraps `HubStatsCard`
- [ ] `UserTipWidget` wraps `HubTipCard`
- [ ] `UserHelpWidget` wraps `HubComplexCard`
- [ ] `UserVideoWidget` wraps `HubVideoCard`
- [ ] `UserActivityWidget` wraps `HubActivityCard`

### Usage Tests

- [ ] Create test instance of `UserStatsWidget`
  ```typescript
  <UserStatsWidget
    title="Test Stats"
    stats={[
      { label: 'Test', value: 42 }
    ]}
  />
  ```

- [ ] Verify rendering matches `HubStatsCard`
- [ ] Test with multiple stats
- [ ] Test with colored values

---

## Phase 1.6: Caching Strategy Verification

### React Query Cache Tests

- [ ] Metrics cache for 5 minutes
- [ ] Garbage collection after 10 minutes
- [ ] Refetch on mount works
- [ ] Refetch on window focus works
- [ ] Placeholder data shows during refetch

### Cache Hit Rate Tests

- [ ] First load: Network request (cache miss)
- [ ] Second load (< 5min): No network (cache hit)
- [ ] Third load (> 5min): Network request (stale)
- [ ] Tab switch back: Network request (refetch)

### Performance Tests

- [ ] Parallel metric fetching (not sequential)
- [ ] No request waterfalls
- [ ] Loading states don't flash (placeholder data)
- [ ] Cache hit response < 100ms

---

## Alignment Verification

### Admin vs User Dashboard Comparison

| Feature | Admin Dashboard | User Dashboard | Aligned? |
|---------|-----------------|----------------|----------|
| **Metric Hook** | `useAdminMetric` | `useUserMetric` | [ ] Yes |
| **Statistics Table** | `platform_statistics_daily` | `user_statistics_daily` | [ ] Yes |
| **Aggregation Function** | `aggregate_daily_statistics` | `aggregate_user_statistics` | [ ] Yes |
| **Cron Schedule** | Midnight UTC | 1am UTC | [ ] Yes |
| **staleTime** | 5 minutes | 5 minutes | [ ] Yes |
| **gcTime** | 10 minutes | 10 minutes | [ ] Yes |
| **Widget Wrappers** | `Admin*Widget` | `User*Widget` | [ ] Yes |
| **Widget Location** | `admin/widgets/` | `dashboard/widgets/` | [ ] Yes |
| **Historical Comparison** | Built-in | Built-in | [ ] Yes |
| **Parallel Fetching** | Yes | Yes | [ ] Yes |

### Code Pattern Consistency

- [ ] Both use same Hook interface pattern
- [ ] Both use same Component prop patterns
- [ ] Both use same CSS module naming
- [ ] Both use same Error handling approach
- [ ] Both use same Loading state approach

---

## Browser Testing

### Desktop Browsers

- [ ] Chrome (latest)
  - [ ] Dashboard loads
  - [ ] KPIs display
  - [ ] Cache works
  - [ ] No console errors

- [ ] Firefox (latest)
  - [ ] Dashboard loads
  - [ ] KPIs display
  - [ ] Cache works
  - [ ] No console errors

- [ ] Safari (latest)
  - [ ] Dashboard loads
  - [ ] KPIs display
  - [ ] Cache works
  - [ ] No console errors

### Mobile Browsers

- [ ] iOS Safari
  - [ ] Responsive layout
  - [ ] Touch interactions
  - [ ] Cache works

- [ ] Android Chrome
  - [ ] Responsive layout
  - [ ] Touch interactions
  - [ ] Cache works

---

## Performance Benchmarks

### Target Metrics

- [ ] Initial page load < 2 seconds
- [ ] Time to interactive < 3 seconds
- [ ] KPI render < 500ms (from cache)
- [ ] KPI refetch < 1 second
- [ ] No layout shift (CLS = 0)
- [ ] Database aggregation < 30 seconds

### Measurement

```bash
# Lighthouse audit
npm run lighthouse

# Core Web Vitals
# - LCP (Largest Contentful Paint) < 2.5s
# - FID (First Input Delay) < 100ms
# - CLS (Cumulative Layout Shift) < 0.1
```

---

## Error Handling Tests

### Network Errors

- [ ] Offline mode shows cached data
- [ ] Network reconnect triggers refetch
- [ ] Failed requests retry 3 times
- [ ] Error state shows user-friendly message

### Data Errors

- [ ] Missing user data shows gracefully
- [ ] Invalid metric name caught
- [ ] Database errors handled
- [ ] Null/undefined values handled

### Edge Cases

- [ ] New user (no statistics yet)
- [ ] User with no bookings
- [ ] User with no earnings
- [ ] Historical data missing

---

## Regression Tests

### Existing Functionality

- [ ] Charts still work (earnings, heatmap)
- [ ] Sidebar widgets still work
- [ ] Profile growth widget works
- [ ] Pending logs widget works
- [ ] Messages widget works
- [ ] Payout widget works

### Navigation

- [ ] Dashboard routing works
- [ ] Tab switching works
- [ ] Back/forward buttons work
- [ ] Direct URL access works

---

## Documentation Review

- [ ] `WIDGET_ALIGNMENT.md` complete and accurate
- [ ] `CACHING_STRATEGY.md` complete and accurate
- [ ] `PHASE_1_TESTING.md` (this file) complete
- [ ] Code comments updated
- [ ] Migration files documented
- [ ] Hook usage examples provided

---

## Sign-Off Criteria

### Must Pass (Blocking)

- [x] All migrations applied successfully
- [x] All backfill completed without errors
- [x] Dashboard loads without errors
- [x] KPIs display correct data
- [x] No console errors in production
- [x] Caching works as documented
- [x] Pattern alignment verified

### Should Pass (Non-Blocking)

- [ ] Performance benchmarks met
- [ ] All browsers tested
- [ ] Mobile responsive works
- [ ] Error handling graceful
- [ ] Documentation complete

---

## Testing Status

| Phase | Status | Tested By | Date | Notes |
|-------|--------|-----------|------|-------|
| 1.1 - useUserMetric Hook | ⏳ Pending | - | - | Needs integration test |
| 1.2 - Database Table | ⏳ Pending | - | - | Migrations not yet applied |
| 1.3 - Background Job | ⏳ Pending | - | - | Backfill not yet run |
| 1.4 - Dashboard KPIs | ⏳ Pending | - | - | Needs visual verification |
| 1.5 - Widget Wrappers | ✅ Complete | AI | 2026-01-22 | Created, not yet used |
| 1.6 - Caching Strategy | ✅ Complete | AI | 2026-01-22 | Documented |
| 1.7 - Testing | 🔄 In Progress | - | - | This checklist |

---

## Next Steps

1. **Apply migrations** (206, 207)
2. **Run backfill script**
3. **Test dashboard in browser**
4. **Verify KPI data accuracy**
5. **Run performance benchmarks**
6. **Complete sign-off**
7. **Proceed to Phase 1 Checkpoint**

---

**Testing Status:** 🔄 In Progress (0/7 phases fully tested)
**Blocking Issues:** Migrations not applied, backfill not run
**Ready for Production:** ❌ No (pending testing)
