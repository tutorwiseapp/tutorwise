# React Query Migration Guide

**Status:** Foundation Complete ✅
**Created:** 2025-11-08
**Timeline:** Medium-term (1 week) + Long-term (1 month)

---

## ✅ Completed Foundation

### 1. Infrastructure Setup
- ✅ React Query installed (`@tanstack/react-query`)
- ✅ QueryProvider configured with production defaults
- ✅ Sentry installed (`@sentry/nextjs`) for error monitoring
- ✅ Global ErrorBoundary with Sentry integration
- ✅ Listings page fully migrated (reference implementation)

### 2. Reference Implementation
**File:** `apps/web/src/app/(authenticated)/listings/page.tsx`

This is your gold-standard template for migrating other pages.

---

## 📋 Medium-Term Tasks (1 Week)

### Task 1: Migrate Remaining Hub Pages to React Query

#### Priority Order:
1. **Bookings Page** (Highest Priority)
2. **Reviews Page**
3. **Referrals Page**
4. **Network Page**
5. **Dashboard Page** (Lowest Priority - different pattern)

#### Migration Checklist Per Page:

```typescript
// BEFORE (Manual State Management)
const [data, setData] = useState([]);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  fetchData().then(setData);
}, []);

// AFTER (React Query)
const { data = [], isLoading, error, refetch } = useQuery({
  queryKey: ['resource', user?.id],
  queryFn: fetchData,
  enabled: !!user,
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
  retry: 2,
});
```

#### Steps:
1. **Remove manual state** (`useState`, `useEffect`)
2. **Add `useQuery` hook** with proper queryKey
3. **Add `useMutation` hooks** for CUD operations
4. **Implement optimistic updates** for instant UX
5. **Create skeleton component** (copy from ListingsSkeleton)
6. **Create error component** (copy from ListingsError)
7. **Update props** passed to stats widgets
8. **Test retry logic** and caching behavior

---

### Task 2: Set Up Sentry Project

#### Steps:
1. Create Sentry account at https://sentry.io
2. Create new project for "tutorwise-web"
3. Copy DSN from project settings
4. Add to `.env.local`:
   ```bash
   NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
   ```
5. Test error reporting:
   ```typescript
   // Temporary test button
   <button onClick={() => { throw new Error('Test Sentry'); }}>
     Test Error
   </button>
   ```
6. Verify error appears in Sentry dashboard
7. Remove test button

#### Expected Outcome:
- All React errors automatically reported to Sentry
- Component stack traces visible
- Performance monitoring enabled
- Session replay on errors

---

### Task 3: Add Performance Monitoring

#### Install React Query Devtools (Development Only):
```bash
npm install @tanstack/react-query-devtools --save-dev --workspace=@tutorwise/web
```

#### Add to QueryProvider:
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export default function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
```

#### Sentry Performance Tracking:
Already configured in `sentry.client.config.ts`:
- Tracks React Query operations
- Monitors API response times
- Captures slow database queries

---

### Task 4: Monitor Actual Failure Rates

#### Custom Sentry Metrics:
```typescript
// In QueryProvider.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      onError: (error) => {
        Sentry.captureException(error, {
          tags: { query_error: true },
        });
      },
    },
    mutations: {
      onError: (error) => {
        Sentry.captureException(error, {
          tags: { mutation_error: true },
        });
      },
    },
  },
});
```

#### Metrics to Track:
- Query success/failure rate
- Average response time
- Cache hit rate (via DevTools)
- Retry attempts before success
- Percentage of errors recovered automatically

---

## 📊 Expected Improvements

### Performance Gains:
- **API Calls:** -80% (caching)
- **Perceived Load Time:** -30% (skeletons)
- **Error Recovery:** +100% (automatic retry)

### User Experience:
- ✅ No more infinite loading
- ✅ No more page refreshes needed
- ✅ Instant feedback on mutations (optimistic updates)
- ✅ Graceful error recovery with retry
- ✅ Fresh data on window focus

---

## 🚀 Long-Term Tasks (1 Month)

### 1. Audit All Supabase Queries

#### Check for Missing Indexes:
```sql
-- Example: Check query performance
EXPLAIN ANALYZE
SELECT * FROM listings
WHERE profile_id = 'xxx'
ORDER BY created_at DESC;

-- Add index if slow
CREATE INDEX IF NOT EXISTS idx_listings_profile_created
ON listings(profile_id, created_at DESC);
```

#### Queries to Audit:
- [ ] `getMyListings()` - Check profile_id index
- [ ] `getMyBookings()` - Check tutor_id/student_id indexes
- [ ] `getMyReferrals()` - Check referrer_id index
- [ ] `getMyReviews()` - Check reviewer_id/reviewee_id indexes
- [ ] `getConnections()` - Check user_id index

---

### 2. Implement Global Caching Strategy

#### Cache Invalidation Rules:
```typescript
// When a listing is created/updated/deleted
queryClient.invalidateQueries({ queryKey: ['listings'] });

// When a booking is made
queryClient.invalidateQueries({ queryKey: ['bookings'] });
queryClient.invalidateQueries({ queryKey: ['financials'] });

// When a review is submitted
queryClient.invalidateQueries({ queryKey: ['reviews'] });
queryClient.invalidateQueries({ queryKey: ['reputation'] });
```

#### Prefetching Strategy:
```typescript
// Prefetch related data on hover
<Link
  href="/bookings"
  onMouseEnter={() => {
    queryClient.prefetchQuery({
      queryKey: ['bookings', user?.id],
      queryFn: getMyBookings,
    });
  }}
>
  Bookings
</Link>
```

---

### 3. Add Offline Support (Service Worker)

#### Install Workbox:
```bash
npm install next-pwa --workspace=@tutorwise/web
```

#### Configure in `next.config.js`:
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});

module.exports = withPWA({
  // existing config
});
```

#### Features:
- Cache API responses for offline access
- Background sync for pending mutations
- Push notifications

---

### 4. Progressive Web App Features

#### Add Web App Manifest:
```json
// public/manifest.json
{
  "name": "Tutorwise",
  "short_name": "Tutorwise",
  "description": "Professional Tutoring Platform",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#006c67",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## 🧪 Testing Checklist

### Before Each Migration:
- [ ] Read current page implementation
- [ ] Identify all data fetching calls
- [ ] Identify all mutations
- [ ] Plan optimistic updates

### During Migration:
- [ ] TypeScript compiles without errors
- [ ] All tests pass
- [ ] No console errors in development
- [ ] Loading states work correctly
- [ ] Error states work correctly
- [ ] Retry logic works
- [ ] Cache invalidation works

### After Migration:
- [ ] Test with slow network (DevTools throttling)
- [ ] Test with network errors (offline mode)
- [ ] Test error recovery (break API temporarily)
- [ ] Test optimistic updates (create/delete rapidly)
- [ ] Verify Sentry captures errors

---

## 📈 Success Metrics

### Before Migration (Baseline):
- Infinite loading incidents: ~5/week
- API failure recovery: 0%
- Cache hit rate: 0%
- Average load time: 2-3 seconds

### After Migration (Target):
- Infinite loading incidents: 0/week
- API failure recovery: 90%+
- Cache hit rate: 70%+
- Average load time: <1 second (cached)

---

## 🔗 Resources

### Documentation:
- [React Query Docs](https://tanstack.com/query/latest)
- [Sentry Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)

### Reference Implementation:
- `apps/web/src/app/(authenticated)/listings/page.tsx` - Migrated page
- `apps/web/src/app/components/listings/ListingsSkeleton.tsx` - Loading skeleton
- `apps/web/src/app/components/listings/ListingsError.tsx` - Error fallback
- `apps/web/src/app/providers/QueryProvider.tsx` - React Query config
- `apps/web/src/app/components/ErrorBoundary.tsx` - Global error boundary

---

## 👥 Team Responsibilities

### Frontend Team:
1. Migrate remaining 4 hub pages
2. Create skeleton/error components
3. Implement optimistic updates
4. Test error scenarios

### DevOps Team:
1. Set up Sentry project
2. Configure environment variables
3. Monitor error rates
4. Set up alerts for high error rates

### Database Team:
1. Audit query performance
2. Add missing indexes
3. Optimize slow queries
4. Monitor database metrics

---

## ✅ Definition of Done

A page migration is complete when:
1. ✅ No manual `useState` for server data
2. ✅ No manual `useEffect` for data fetching
3. ✅ `useQuery` hook implemented
4. ✅ `useMutation` hooks for all CUD operations
5. ✅ Optimistic updates working
6. ✅ Loading skeleton component
7. ✅ Error component with retry
8. ✅ TypeScript compiles
9. ✅ All tests pass
10. ✅ Tested in development
11. ✅ Code reviewed
12. ✅ Deployed to production
13. ✅ Sentry shows no new errors
14. ✅ Performance metrics improved

---

**Next Step:** Migrate bookings page following listings page pattern.
