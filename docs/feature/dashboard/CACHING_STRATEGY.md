# Unified Dashboard Caching Strategy - Phase 1.6

**Created:** 2026-01-22
**Status:** ✅ Complete
**Phase:** Dashboard Alignment Phase 1

## Purpose

Document the unified caching strategy for both admin and user dashboards, ensuring consistent data freshness, optimal performance, and predictable behavior across the platform.

---

## Architecture Overview

Both dashboards now use the same caching architecture:

```
Data Layer (PostgreSQL)
    ↓
Daily Statistics Tables (Pre-aggregated)
    ├── platform_statistics_daily (admin)
    └── user_statistics_daily (user)
    ↓
API Layer (Next.js API Routes)
    ├── /api/admin/metrics (admin)
    └── /api/dashboard/user-metrics (user)
    ↓
React Query Cache Layer
    ├── useAdminMetric hook (admin)
    └── useUserMetric hook (user)
    ↓
UI Components
    ├── Admin Dashboard
    └── User Dashboard
```

---

## Caching Layers

### Layer 1: Database Pre-aggregation

**Purpose:** Avoid expensive on-demand calculations

**Admin Dashboard:**
- Table: `platform_statistics_daily`
- Aggregation: `aggregate_daily_statistics(date)`
- Schedule: Midnight UTC daily (pg_cron)
- Retention: Unlimited (historical data)

**User Dashboard:**
- Table: `user_statistics_daily`
- Aggregation: `aggregate_user_statistics(user_id, date)`
- Schedule: 1am UTC daily (pg_cron)
- Retention: Unlimited (historical data)

**Benefits:**
- ✅ Fast queries (pre-calculated data)
- ✅ Historical comparison available
- ✅ Consistent data across requests
- ✅ No runtime calculation overhead

### Layer 2: React Query Client Cache

**Purpose:** Minimize API calls, provide instant UI updates

**Configuration (Both Dashboards):**
```typescript
{
  staleTime: 5 * 60 * 1000,        // 5 minutes
  gcTime: 10 * 60 * 1000,          // 10 minutes (formerly cacheTime)
  refetchOnMount: 'always',         // Refetch when component mounts
  refetchOnWindowFocus: true,       // Refetch when user returns to tab
  placeholderData: keepPreviousData // Keep old data while fetching
}
```

**Admin Hook (`useAdminMetric`):**
```typescript
const totalUsers = useAdminMetric({
  metric: 'total_users',
  compareWith: 'last_month',  // Automatic historical comparison
});

// Returns:
// {
//   value: 1234,
//   previousValue: 1180,
//   change: 54,
//   changePercent: 4.6,
//   trend: 'up',
//   isLoading: false,
//   error: null
// }
```

**User Hook (`useUserMetric`):**
```typescript
const monthlyEarnings = useUserMetric({
  userId: profile.id,
  metric: 'monthly_earnings',
  compareWith: 'last_month',  // Automatic historical comparison
});

// Returns: Same structure as useAdminMetric
```

**Benefits:**
- ✅ No redundant API calls (5min freshness)
- ✅ Instant UI when data is cached
- ✅ Automatic background refetch
- ✅ Shared cache across components

---

## Data Freshness Guarantees

### Admin Dashboard

| Metric Type | Freshness | Update Trigger | Cache Duration |
|-------------|-----------|----------------|----------------|
| **Platform Stats** | Daily snapshot | Midnight UTC cron | 5 min (React Query) |
| **Real-time Counts** | On-demand | API request | 5 min (React Query) |
| **Historical Comparison** | Daily | Midnight UTC cron | 5 min (React Query) |

**User Experience:**
- Dashboard loads instantly with cached data (< 100ms)
- Data refreshes in background if > 5 minutes old
- Historical trends available immediately (no calculation)

### User Dashboard

| Metric Type | Freshness | Update Trigger | Cache Duration |
|-------------|-----------|----------------|----------------|
| **User Stats** | Daily snapshot | 1am UTC cron | 5 min (React Query) |
| **Earnings/Spending** | Daily | 1am UTC cron | 5 min (React Query) |
| **Sessions** | Daily | 1am UTC cron | 5 min (React Query) |
| **Historical Comparison** | Daily | 1am UTC cron | 5 min (React Query) |

**User Experience:**
- Same as admin dashboard (instant load with cached data)
- Automatic background refresh every 5 minutes
- Parallel metric fetching (no waterfalls)

---

## Cache Invalidation Strategy

### Automatic Invalidation

**React Query handles automatically:**
1. **Time-based:** After `staleTime` (5 minutes)
2. **Focus-based:** When user returns to tab
3. **Mount-based:** When component mounts (page visited)
4. **Network-based:** After network reconnection

**Example Flow:**
```
User opens dashboard → Data is cached (fresh)
  ↓
User works for 6 minutes (data becomes stale)
  ↓
User switches to another tab
  ↓
User returns to dashboard tab → Automatic refetch
  ↓
Data updates in background (old data shown during fetch)
```

### Manual Invalidation

**When needed:**
- User performs an action that affects metrics
- Admin triggers a manual recalculation
- Data import/migration occurs

**Implementation:**
```typescript
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

// Invalidate all admin metrics
queryClient.invalidateQueries({ queryKey: ['admin-metric'] });

// Invalidate all user metrics
queryClient.invalidateQueries({ queryKey: ['user-metric'] });

// Invalidate specific metric
queryClient.invalidateQueries({
  queryKey: ['user-metric', userId, 'monthly_earnings']
});
```

---

## Performance Optimization

### 1. Parallel Fetching

**Admin Dashboard:**
```typescript
// All metrics fetch in parallel (no waterfalls)
const totalUsers = useAdminMetric({ metric: 'total_users' });
const activeUsers = useAdminMetric({ metric: 'active_users' });
const totalEarnings = useAdminMetric({ metric: 'platform_earnings' });
// ... all fire simultaneously
```

**User Dashboard:**
```typescript
// All metrics fetch in parallel
const monthlyEarnings = useUserMetric({ userId, metric: 'monthly_earnings' });
const monthlySessions = useUserMetric({ userId, metric: 'monthly_sessions' });
const averageRating = useUserMetric({ userId, metric: 'average_rating' });
// ... all fire simultaneously
```

**Benefits:**
- ✅ No request waterfalls
- ✅ Maximum parallelization
- ✅ Faster page load

### 2. Placeholder Data

**Strategy:** Keep previous data visible while fetching new data

```typescript
placeholderData: keepPreviousData
```

**Benefits:**
- ✅ No loading spinners on refetch
- ✅ Smooth UI experience
- ✅ No content flash

### 3. Selective Refetching

**Only refetch when needed:**
- Component mounts → Refetch (fresh data)
- User returns to tab → Refetch (catch up)
- Data is stale (> 5 min) → Refetch (time-based)
- Data is fresh (< 5 min) → Use cache (no network)

---

## Cache Size Management

### React Query Garbage Collection

**Configuration:**
```typescript
gcTime: 10 * 60 * 1000  // 10 minutes
```

**Behavior:**
- Unused queries remain in cache for 10 minutes
- After 10 minutes of no subscribers → Garbage collected
- Reduces memory footprint automatically

**Example:**
```
User views earnings metric → Cached (10min)
  ↓
User navigates away → No subscribers (10min timer starts)
  ↓
10 minutes pass → Query removed from cache
  ↓
User returns → Fresh fetch (no stale data)
```

### Database Statistics Cleanup

**Admin Stats:**
- Retention: Unlimited (historical trends needed)
- Size: ~365 rows/year (~36KB/year)

**User Stats:**
- Retention: Unlimited (per-user historical trends)
- Size: ~365 rows/year per user (~36KB/year per user)
- Total: ~360MB for 10,000 users over 1 year

**Optimization:**
- Indexed on (user_id, date DESC)
- Queries limited to recent data (last 90 days typical)
- Archival strategy: Move data > 2 years to cold storage (future)

---

## Error Handling & Resilience

### React Query Error Handling

**Automatic retries:**
```typescript
{
  retry: 3,                    // Retry failed requests 3 times
  retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
}
```

**Fallback behavior:**
```typescript
if (metric.error) {
  return (
    <div>
      Unable to load metric. <button onClick={() => queryClient.invalidateQueries()}>
        Retry
      </button>
    </div>
  );
}
```

### Database Resilience

**Cron job failures:**
- Logged to `pg_stat_statements`
- Manual trigger available: `SELECT aggregate_daily_statistics(CURRENT_DATE);`
- Alert system monitors job execution (future)

**Missing data:**
- Query returns `0` for missing metrics (graceful degradation)
- UI shows "No data available" instead of crashing
- Backfill script available for historical data gaps

---

## Monitoring & Debugging

### React Query DevTools

**Enable in development:**
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<ReactQueryDevtools initialIsOpen={false} />
```

**Features:**
- View all cached queries
- See query status (fresh/stale/fetching)
- Manually trigger refetch
- Inspect query data

### Cache Performance Metrics

**Track in production:**
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      onSuccess: (data, query) => {
        console.log('[Cache Hit]', query.queryKey, 'from cache');
      },
      onError: (error, query) => {
        console.error('[Cache Error]', query.queryKey, error);
      },
    },
  },
});
```

### Database Query Performance

**Monitor cron jobs:**
```sql
-- Check last execution
SELECT * FROM cron.job_run_details
WHERE jobname IN ('aggregate-daily-statistics', 'aggregate-user-statistics')
ORDER BY start_time DESC
LIMIT 10;

-- Check execution time
SELECT
  jobname,
  AVG(EXTRACT(EPOCH FROM (end_time - start_time))) as avg_duration_seconds
FROM cron.job_run_details
WHERE jobname IN ('aggregate-daily-statistics', 'aggregate-user-statistics')
GROUP BY jobname;
```

---

## Best Practices

### 1. Always Use Hooks

**❌ Don't:**
```typescript
// Direct API call - no caching
const response = await fetch('/api/dashboard/user-metrics?metric=earnings');
```

**✅ Do:**
```typescript
// Use hook - automatic caching
const earnings = useUserMetric({ userId, metric: 'monthly_earnings' });
```

### 2. Avoid Over-fetching

**❌ Don't:**
```typescript
// Fetch all metrics in one large object
const allMetrics = await fetch('/api/dashboard/all-metrics');
```

**✅ Do:**
```typescript
// Fetch only needed metrics
const earnings = useUserMetric({ userId, metric: 'monthly_earnings' });
const sessions = useUserMetric({ userId, metric: 'monthly_sessions' });
```

### 3. Trust the Cache

**❌ Don't:**
```typescript
// Force refetch on every render
const earnings = useUserMetric({ userId, metric: 'monthly_earnings' });
queryClient.invalidateQueries(); // Don't do this!
```

**✅ Do:**
```typescript
// Let React Query handle freshness
const earnings = useUserMetric({ userId, metric: 'monthly_earnings' });
// Automatic refetch when stale
```

### 4. Use Placeholder Data

**❌ Don't:**
```typescript
if (earnings.isLoading) return <Spinner />;
```

**✅ Do:**
```typescript
// Show previous data while fetching (no spinner)
<KPICard
  value={earnings.isLoading ? '-' : earnings.value}
  isStale={earnings.isFetching}
/>
```

---

## Comparison: Before vs After

### Before Phase 1

| Aspect | Admin Dashboard | User Dashboard |
|--------|-----------------|----------------|
| **Data Source** | Pre-aggregated table | On-demand aggregation |
| **Caching** | React Query (5min) | React Query (2min) |
| **Historical Data** | Built-in (daily snapshots) | Not available |
| **Query Pattern** | useAdminMetric hook | Inline useQuery calls |
| **Parallel Fetching** | ✅ Yes | ❌ No (consolidated API) |

### After Phase 1

| Aspect | Admin Dashboard | User Dashboard |
|--------|-----------------|----------------|
| **Data Source** | Pre-aggregated table ✅ | Pre-aggregated table ✅ |
| **Caching** | React Query (5min) ✅ | React Query (5min) ✅ |
| **Historical Data** | Built-in ✅ | Built-in ✅ |
| **Query Pattern** | useAdminMetric hook ✅ | useUserMetric hook ✅ |
| **Parallel Fetching** | ✅ Yes | ✅ Yes |

**Result:** 100% alignment in caching strategy

---

## Related Documentation

- [useAdminMetric Hook](../admin-dashboard/hooks/useAdminMetric.md)
- [useUserMetric Hook](../../hooks/useUserMetric.ts)
- [Widget Alignment](./WIDGET_ALIGNMENT.md)
- [React Query Documentation](https://tanstack.com/query/latest/docs/react/overview)

---

**Phase 1.6 Status:** ✅ Complete
**Cache Layers Aligned:** 3/3 (Database, API, React Query)
**Documentation:** 100%
