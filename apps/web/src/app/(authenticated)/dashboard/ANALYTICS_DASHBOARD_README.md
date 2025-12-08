# Analytics Dashboard

**Created**: 2025-12-08
**Status**: ✅ Fully implemented
**Location**: `/dashboard` → Analytics tab

---

## Overview

The Analytics Dashboard provides comprehensive profile views tracking with trend analysis and referrer source breakdown.

---

## Features

### 1. Profile Views Trend Chart

**Component**: `ProfileViewsTrendChart.tsx`

- **Visualization**: Dual-line chart showing total views vs unique viewers
- **Time Range**: Last 30 days
- **Data Points**:
  - Total views (blue line)
  - Unique viewers (green line)
- **Summary Stats**:
  - Total views count (header)
  - Total unique viewers (header)
- **Empty State**: "No profile views yet. Share your profile to start tracking views."

**Key Features**:
- Interactive tooltips on hover
- Responsive design (mobile/tablet/desktop)
- Loading skeleton while fetching data
- Error boundary with fallback UI

### 2. Referrer Sources Chart

**Component**: `ReferrerSourcesChart.tsx`

- **Visualization**: Dual-view (pie chart / bar chart)
- **Toggle**: Switch between pie and bar views
- **Data**: Top referrer sources ranked by view count
- **Colors**:
  - Blue (#2563EB) - Search/marketplace
  - Green (#059669) - Direct
  - Orange (#EA580C) - Listing
  - Purple (#7C3AED) - Referral
  - Red (#DC2626) - Social
  - Gray (#6b7280) - Other

**Key Features**:
- Stats summary below chart
- Insight text highlighting top referrer
- Empty state with helpful message
- Loading skeleton and error boundary

---

## Architecture

### Dashboard Tab System

The dashboard uses `HubTabs` component with two tabs:
1. **Overview** - KPIs, earnings, bookings, students
2. **Analytics** - Profile views and referrer sources

**Tab State Management**:
```typescript
const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview');
```

**Conditional Rendering**:
```typescript
{activeTab === 'overview' && <OverviewContent />}
{activeTab === 'analytics' && <AnalyticsContent />}
```

### Data Fetching

**React Query** is used for all analytics data with:
- Automatic caching (5-10 minutes)
- Background refetch
- Loading states
- Error handling
- Only fetch when tab is active (performance optimization)

**Queries**:
1. `profile-views-trend` - Fetches daily aggregated views
2. `referrer-sources` - Fetches grouped referrer counts

---

## API Endpoints

### 1. GET `/api/dashboard/profile-views-trend`

**File**: `apps/web/src/app/api/dashboard/profile-views-trend/route.ts`

**Query Parameters**:
- `days` (optional): Number of days to fetch (default: 30)

**Response**:
```json
[
  {
    "date": "Dec 1",
    "total_views": 15,
    "unique_viewers": 8
  },
  {
    "date": "Dec 2",
    "total_views": 23,
    "unique_viewers": 12
  }
]
```

**Features**:
- Uses `get_profile_views_by_day()` RPC if available
- Fallback to manual aggregation if RPC doesn't exist
- Groups by date with proper formatting
- Counts unique authenticated viewers

### 2. GET `/api/dashboard/referrer-sources`

**File**: `apps/web/src/app/api/dashboard/referrer-sources/route.ts`

**Response**:
```json
[
  {
    "source": "Search",
    "count": 45
  },
  {
    "source": "Direct",
    "count": 32
  },
  {
    "source": "Listing",
    "count": 18
  }
]
```

**Features**:
- Groups by referrer_source
- Capitalizes source names
- Sorts by count (descending)
- Returns top sources

---

## Database

### Required Tables

**`profile_views`** (Migration 097):
- `id` - UUID primary key
- `profile_id` - Profile being viewed
- `viewer_id` - Viewer (null if anonymous)
- `viewed_at` - Timestamp
- `session_id` - Browser session
- `referrer_source` - Where view came from
- `user_agent` - Browser info
- `ip_address` - IP address

**`profile_view_counts`** (Materialized View):
- `profile_id` - Profile ID
- `total_views` - Total view count
- `unique_viewers` - Unique authenticated viewers
- `unique_sessions` - Unique sessions
- `last_viewed_at` - Most recent view

### Optional Helper Function

**File**: `apps/api/migrations/097_analytics_helper_functions.sql`

**Function**: `get_profile_views_by_day(profile_id UUID, days INTEGER)`

**Purpose**: Server-side aggregation for better performance

**Note**: The API has a fallback implementation, so this function is optional but recommended for production use.

---

## Components

### ProfileViewsTrendChart

**File**: `apps/web/src/app/components/feature/dashboard/widgets/ProfileViewsTrendChart.tsx`

**Props**:
```typescript
interface ProfileViewsTrendChartProps {
  data: DailyViews[];
  days?: number;
}
```

**Styling**: `ProfileViewsTrendChart.module.css`

**Dependencies**:
- `recharts` - Line chart library
- React hooks (memo, useMemo)

### ReferrerSourcesChart

**File**: `apps/web/src/app/components/feature/dashboard/widgets/ReferrerSourcesChart.tsx`

**Props**:
```typescript
interface ReferrerSourcesChartProps {
  data: ReferrerData[];
  defaultView?: 'pie' | 'bar';
}
```

**Styling**: `ReferrerSourcesChart.module.css`

**Dependencies**:
- `recharts` - Pie/Bar chart library
- `lucide-react` - Icons
- React hooks (memo, useMemo, useState, useCallback)

---

## User Flow

1. **Navigate to Dashboard** → User lands on Overview tab by default
2. **Click Analytics Tab** → Tab switches, analytics data starts fetching
3. **View Loading State** → Chart skeletons displayed while fetching
4. **View Data**:
   - **If no data**: Empty state messages encourage profile sharing
   - **If data exists**: Charts render with interactive features
5. **Interact with Charts**:
   - Hover over trend chart for tooltip details
   - Toggle between pie/bar views on referrer chart
   - Read insights automatically generated from data

---

## Performance Optimizations

1. **Lazy Loading**: Analytics data only fetches when Analytics tab is active
2. **React Query Caching**:
   - `staleTime: 5 minutes` - Data considered fresh for 5 min
   - `gcTime: 10 minutes` - Cache persists for 10 min
3. **Memoization**:
   - Chart data calculations memoized with `useMemo`
   - Components wrapped in `memo()` to prevent re-renders
4. **Error Boundaries**: Isolate chart failures to prevent full page crashes
5. **Loading Skeletons**: Instant visual feedback while loading

---

## Responsive Design

### Mobile (< 640px)
- Charts stack vertically
- Stats move below header
- Smaller font sizes
- Touch-friendly toggle buttons

### Tablet (640-1023px)
- 2-column grid for charts
- Moderate padding
- Balanced text sizes

### Desktop (1024px+)
- Full-width charts (1 column for readability)
- Larger visualizations
- Optimal spacing

---

## Testing

### Manual Testing Checklist

**Profile Views Trend**:
- [ ] Empty state displays when no views
- [ ] Chart renders with sample data
- [ ] Tooltips appear on hover
- [ ] Loading skeleton shows while fetching
- [ ] Error boundary catches failures
- [ ] Responsive on mobile/tablet/desktop

**Referrer Sources**:
- [ ] Empty state displays when no views
- [ ] Pie chart renders correctly
- [ ] Bar chart renders correctly
- [ ] Toggle switches between views
- [ ] Stats summary matches chart data
- [ ] Insight text calculates correctly
- [ ] Loading skeleton shows while fetching
- [ ] Error boundary catches failures

**Tab Switching**:
- [ ] Default tab is Overview
- [ ] Analytics tab clickable
- [ ] Active state shows correctly
- [ ] Content switches on tab change
- [ ] Data doesn't refetch unnecessarily (cache works)

### Test Data

**Create test profile views** (run in Supabase SQL Editor):
```sql
-- Insert sample views for testing
INSERT INTO profile_views (profile_id, viewer_id, viewed_at, session_id, referrer_source)
VALUES
  ('your-profile-id', NULL, NOW() - INTERVAL '1 day', 'test-session-1', 'search'),
  ('your-profile-id', NULL, NOW() - INTERVAL '2 days', 'test-session-2', 'direct'),
  ('your-profile-id', NULL, NOW() - INTERVAL '3 days', 'test-session-3', 'listing'),
  ('your-profile-id', NULL, NOW() - INTERVAL '5 days', 'test-session-4', 'search'),
  ('your-profile-id', NULL, NOW() - INTERVAL '7 days', 'test-session-5', 'referral');

-- Refresh materialized view
SELECT refresh_profile_view_counts();
```

---

## Troubleshooting

### Charts not loading

**Check**:
1. Is profile views migration (097) applied?
2. Is profile_views table accessible?
3. Check browser console for API errors
4. Check Network tab for 401/403/500 errors

**Solution**:
- Verify RLS policies allow SELECT on profile_views
- Check Supabase logs for query errors
- Ensure user is authenticated

### No data showing

**Check**:
1. Does user have any profile views in database?
2. Is materialized view up to date?
3. Are views within last 30 days?

**Solution**:
```sql
-- Check if user has views
SELECT COUNT(*) FROM profile_views WHERE profile_id = 'your-profile-id';

-- Manually refresh materialized view
SELECT refresh_profile_view_counts();
```

### RPC function error (42883)

**This is expected** - The API has a fallback query.

**Optional fix** (better performance):
Run `097_analytics_helper_functions.sql` in Supabase SQL Editor to install the optimized RPC function.

---

## Future Enhancements

1. **Date Range Picker**: Allow users to select custom date ranges (7/14/30/90 days)
2. **Geographic Distribution**: Add map showing where views came from (requires IP geocoding)
3. **Export Data**: Download analytics as CSV/PDF
4. **Conversion Tracking**: Link views → messages → bookings
5. **Comparison Mode**: Compare current period vs previous period
6. **Real-time Updates**: Use Supabase Realtime for live view tracking
7. **Notifications**: Alert when profile gets viewed
8. **Goal Setting**: Set view targets and track progress
9. **A/B Testing**: Track which profile versions perform better
10. **Heatmaps**: Show which sections of profile are viewed most

---

## Related Files

**Components**:
- `apps/web/src/app/components/feature/dashboard/widgets/ProfileViewsTrendChart.tsx`
- `apps/web/src/app/components/feature/dashboard/widgets/ProfileViewsTrendChart.module.css`
- `apps/web/src/app/components/feature/dashboard/widgets/ReferrerSourcesChart.tsx`
- `apps/web/src/app/components/feature/dashboard/widgets/ReferrerSourcesChart.module.css`

**API Routes**:
- `apps/web/src/app/api/dashboard/profile-views-trend/route.ts`
- `apps/web/src/app/api/dashboard/referrer-sources/route.ts`

**Database**:
- `apps/api/migrations/097_create_profile_views_table.sql` (required)
- `apps/api/migrations/097_analytics_helper_functions.sql` (optional)
- `apps/api/migrations/097_monitor_profile_views.sql` (monitoring)
- `apps/api/migrations/PROFILE_VIEWS_README.md` (tracking system docs)

**Dashboard**:
- `apps/web/src/app/(authenticated)/dashboard/page.tsx`
- `apps/web/src/app/(authenticated)/dashboard/page.module.css`

---

## Support

For issues or questions:
1. Check this README for solutions
2. Review PROFILE_VIEWS_README.md for tracking system details
3. Check Supabase logs for database errors
4. Review browser console for frontend errors
5. Use monitoring queries in `097_monitor_profile_views.sql`

---

**Last Updated**: 2025-12-08
**Version**: 1.0
**Maintained By**: Development Team
