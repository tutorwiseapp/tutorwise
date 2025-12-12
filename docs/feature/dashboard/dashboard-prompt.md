# Dashboard Feature - AI Prompt

**Version**: C014 (Analytics Tab)
**Date**: 2025-12-12
**Purpose**: Guide AI assistants when working on the dashboard feature

---

## Feature Overview

The Dashboard is Tutorwise's central command center, providing users with a comprehensive overview of their platform activity through role-specific KPIs, interactive charts, and actionable widgets. Built on the Hub Layout architecture with React Query for state management, it delivers real-time metrics with automatic caching and background refetch.

**Key Responsibilities**:
- Role-based KPI display (6 cards per role: client, tutor, agent)
- Real-time data fetching with React Query (2-5 minute stale times)
- Interactive charts (Recharts: line, area, pie, bar, heatmap)
- Analytics tracking (profile views + traffic sources - C014)
- Onboarding gating (redirect incomplete users)
- Error resilience (component-level error boundaries)
- Mobile-responsive design (grid-to-stack layouts)

---

## System Context

### Core Architecture

The dashboard is built on these principles:

1. **Role-Based Content**: Different KPIs and metrics for clients, tutors, and agents
2. **Parallel Data Fetching**: All API queries wrapped in `Promise.all()` for performance
3. **React Query Caching**: Automatic background refetch with 2-5 minute stale times
4. **Hub Layout Integration**: Shared header, tabs, sidebar components
5. **Error Boundaries**: Isolated chart failures (one error doesn't crash entire page)
6. **Conditional Rendering**: Analytics tab queries only when tab active

### Database Tables

**Primary Queries**:
- `bookings` - Session counts, earnings, upcoming sessions
- `reviews` - Average rating, review counts
- `caas_scores` - Credibility score
- `transactions` - Earnings/spending calculations
- `profile_views` (future) - View tracking
- `referrals` - Traffic source attribution

**Key Fields**:
```sql
bookings {
  id UUID,
  client_id UUID,
  tutor_id UUID,
  agent_id UUID,
  status TEXT,              -- 'pending', 'completed', 'cancelled'
  session_start_time TIMESTAMPTZ,
  session_duration_hours DECIMAL,
  tutor_earnings DECIMAL,
  agent_commission DECIMAL,
  total_price DECIMAL
}

reviews {
  id UUID,
  reviewer_id UUID,
  reviewee_id UUID,
  rating INTEGER,           -- 1-5 stars
  status TEXT               -- 'published', 'pending'
}

caas_scores {
  id UUID,
  profile_id UUID,
  overall_score INTEGER,    -- 0-100
  created_at TIMESTAMPTZ
}
```

---

## Integration Points

### Critical Dependencies

1. **UserProfileContext** (CRITICAL - Auth State):
   - Provides `profile`, `activeRole`, `isLoading`, `needsOnboarding`
   - Dashboard redirects to `/login` if not authenticated
   - Dashboard redirects to `/onboarding` if `needsOnboarding === true`

2. **React Query**:
   - 6 parallel queries for dashboard data
   - Automatic retry (3 attempts with exponential backoff)
   - Background refetch when tab gains focus
   - Cache invalidation via `queryClient.invalidateQueries()`

3. **Bookings**:
   - KPI data source (earnings, sessions, student counts)
   - Queries filter by `client_id`, `tutor_id`, `agent_id`
   - Date range filtering for weekly/monthly trends

4. **Reviews**:
   - Rating aggregation (`AVG(rating)`)
   - Review count display
   - Last 10 ratings for trend comparison

5. **CaaS**:
   - Credibility score display (0-100)
   - Links to `/caas` for detailed breakdown

6. **Recharts**:
   - `LineChart` for earnings trend
   - `AreaChart` for profile views
   - `PieChart` / `BarChart` toggle for breakdowns
   - Custom calendar heatmap (14-day booking density)

7. **Hub Layout**:
   - `HubPageLayout`, `HubHeader`, `HubTabs`, `HubSidebar`
   - Responsive sidebar (desktop: fixed, mobile: collapsible)

---

## Key Functions & Components

### 1. KPI Fetching (Parallel Queries)

**Purpose**: Fetch all KPI metrics in parallel for performance

**Location**: `apps/web/src/app/api/dashboard/kpis/route.ts`

**Logic**:
```typescript
const [
  upcomingBookingsResult,
  completedBookingsResult,
  earningsResult,
  ratingsResult,
  caasResult,
] = await Promise.all([
  // Upcoming bookings (next 7 days)
  supabase
    .from('bookings')
    .select('id, session_start_time, session_duration_hours')
    .or(`client_id.eq.${user.id},tutor_id.eq.${user.id},agent_id.eq.${user.id}`)
    .gte('session_start_time', now)
    .lte('session_start_time', sevenDaysFromNow),

  // Completed bookings (this month)
  supabase
    .from('bookings')
    .select('id, client_id, tutor_id')
    .or(`client_id.eq.${user.id},tutor_id.eq.${user.id},agent_id.eq.${user.id}`)
    .eq('status', 'completed')
    .gte('session_start_time', firstDayOfMonth),

  // Earnings (role-specific)
  role === 'client'
    ? supabase.from('bookings').select('total_price').eq('client_id', user.id).eq('status', 'completed')
    : supabase.from('bookings').select('tutor_earnings, agent_commission, tutor_id, agent_id').or(`tutor_id.eq.${user.id},agent_id.eq.${user.id}`).eq('status', 'completed'),

  // Ratings
  supabase.from('reviews').select('rating').eq('reviewee_id', user.id).eq('status', 'published'),

  // CaaS score
  supabase.from('caas_scores').select('overall_score').eq('profile_id', user.id).order('created_at', { ascending: false }).limit(1).single(),
]);

// Calculate KPIs
const kpis = {
  totalEarnings: calculateEarnings(earningsResult.data, role, user.id),
  upcomingSessions: upcomingBookings.length,
  upcomingHours: upcomingBookings.reduce((sum, b) => sum + (b.session_duration_hours || 1), 0),
  completedSessionsThisMonth: completedBookings.length,
  averageRating: ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : 0,
  totalReviews: ratings.length,
  caasScore: caasResult.data?.overall_score || 0,
};

return NextResponse.json(kpis);
```

### 2. Role-Based KPI Rendering

**Purpose**: Display different KPI cards based on user role

**Location**: `apps/web/src/app/components/feature/dashboard/widgets/KPIGrid.tsx`

**Logic**:
```typescript
// TUTOR/AGENT KPIs (6 cards)
const tutorKPIs = [
  { label: 'Total Earnings', value: formatCurrency(data.totalEarnings), icon: Coins },
  { label: 'Upcoming Sessions', value: data.upcomingSessions, sublabel: `${data.upcomingHours} hours`, icon: Calendar },
  { label: 'Completed Sessions', value: data.completedSessionsThisMonth, icon: CheckCircle },
  { label: 'Average Rating', value: `${data.averageRating.toFixed(1)}`, icon: Star },
  { label: 'Repeat Students', value: `${data.repeatStudentsPercent}%`, icon: Users },
  { label: 'CaaS Score', value: data.caasScore, icon: Award, href: '/caas' },
];

// CLIENT KPIs (6 cards)
const clientKPIs = [
  { label: 'Active Bookings', value: data.activeBookings, icon: Calendar },
  { label: 'Total Spent', value: formatCurrency(data.totalSpent), icon: Coins },
  { label: 'Favorite Tutors', value: data.favoriteTutors, icon: Heart },
  { label: 'Total Hours Learned', value: data.totalHoursLearned, icon: Clock },
  { label: 'Average Rating Given', value: `${data.averageRatingGiven.toFixed(1)}`, icon: Star },
  { label: 'CaaS Score', value: data.caasScore, icon: Award, href: '/caas' },
];

const kpis = role === 'client' ? clientKPIs : tutorKPIs;
```

### 3. Earnings Trend Chart (6 Weeks)

**Purpose**: Weekly revenue visualization with Recharts

**Location**: `apps/web/src/app/api/dashboard/earnings-trend/route.ts`

**Logic**:
```typescript
const weeks = 6;
const earningsByWeek = [];

for (let i = weeks - 1; i >= 0; i--) {
  const weekStart = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data: bookings } = await supabase
    .from('bookings')
    .select('tutor_earnings, agent_commission, total_price, tutor_id, agent_id, client_id')
    .or(`tutor_id.eq.${user.id},agent_id.eq.${user.id},client_id.eq.${user.id}`)
    .eq('status', 'completed')
    .gte('session_start_time', weekStart.toISOString())
    .lt('session_start_time', weekEnd.toISOString());

  const weekTotal = bookings.reduce((sum, b) => {
    if (role === 'tutor' && b.tutor_id === user.id) return sum + (b.tutor_earnings || 0);
    if (role === 'agent' && b.agent_id === user.id) return sum + (b.agent_commission || 0);
    if (role === 'client' && b.client_id === user.id) return sum + (b.total_price || 0);
    return sum;
  }, 0);

  earningsByWeek.push({ week: `Week ${weeks - i}`, earnings: Math.round(weekTotal) });
}

return NextResponse.json(earningsByWeek);
```

### 4. Booking Calendar Heatmap (14 Days)

**Purpose**: Visual density map of booking distribution

**Location**: `apps/web/src/app/api/dashboard/booking-heatmap/route.ts`

**Logic**:
```typescript
const days = 14;
const bookingsByDay = [];

for (let i = 0; i < days; i++) {
  const day = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
  const dayStart = new Date(day.setHours(0, 0, 0, 0));
  const dayEnd = new Date(day.setHours(23, 59, 59, 999));

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id')
    .or(`client_id.eq.${user.id},tutor_id.eq.${user.id},agent_id.eq.${user.id}`)
    .gte('session_start_time', dayStart.toISOString())
    .lte('session_start_time', dayEnd.toISOString());

  bookingsByDay.push({
    date: dayStart.toISOString().split('T')[0],
    count: bookings.length,
  });
}

return NextResponse.json(bookingsByDay);
```

---

## Common Tasks & Patterns

### Task 1: Add New KPI Card

**Example**: Add "Response Rate" KPI for tutors

```typescript
// 1. Update KPI API to calculate response rate
const { data: messages } = await supabase
  .from('messages')
  .select('id, responded')
  .eq('recipient_id', user.id);

const responseRate = messages.length > 0
  ? (messages.filter(m => m.responded).length / messages.length) * 100
  : 0;

const kpis = {
  ...existingKPIs,
  responseRate: Math.round(responseRate),
};

// 2. Add to KPIGrid tutorKPIs array
const tutorKPIs = [
  ...existingKPIs,
  {
    label: 'Response Rate',
    value: `${data.responseRate}%`,
    sublabel: 'Avg. 24h reply time',
    icon: MessageSquare,
    variant: 'info'
  },
];
```

### Task 2: Add New Chart Widget

**Requirement**: Add "Session Duration Breakdown" pie chart

```typescript
// 1. Create API route
// apps/web/src/app/api/dashboard/session-duration/route.ts
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: bookings } = await supabase
    .from('bookings')
    .select('session_duration_hours')
    .or(`client_id.eq.${user.id},tutor_id.eq.${user.id}`)
    .eq('status', 'completed');

  const breakdown = bookings.reduce((acc, b) => {
    const duration = b.session_duration_hours;
    if (duration <= 1) acc['1 hour'] = (acc['1 hour'] || 0) + 1;
    else if (duration <= 2) acc['2 hours'] = (acc['2 hours'] || 0) + 1;
    else acc['3+ hours'] = (acc['3+ hours'] || 0) + 1;
    return acc;
  }, {});

  return NextResponse.json(Object.entries(breakdown).map(([duration, count]) => ({ duration, count })));
}

// 2. Add React Query
const { data: durationData } = useQuery({
  queryKey: ['dashboard', 'session-duration', profile?.id],
  queryFn: async () => {
    const response = await fetch('/api/dashboard/session-duration');
    return response.json();
  },
  enabled: !!profile,
  staleTime: 5 * 60 * 1000,
});

// 3. Render chart component
<SessionDurationChart data={durationData} />
```

### Task 3: Handle Role Switching

**Requirement**: Re-fetch KPIs when user switches role

```typescript
const { activeRole } = useUserProfile();

const { data: kpiData } = useQuery({
  queryKey: ['dashboard', 'kpis', profile?.id, activeRole], // ← Include activeRole in query key
  queryFn: async () => {
    const response = await fetch('/api/dashboard/kpis');
    return response.json();
  },
  enabled: !!profile,
});

// When activeRole changes, React Query automatically refetches
```

### Task 4: Add Tab-Specific Data Fetching

**Requirement**: Only fetch analytics data when Analytics tab is active

```typescript
const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview');

const { data: analyticsData } = useQuery({
  queryKey: ['dashboard', 'analytics', profile?.id],
  queryFn: async () => {
    const response = await fetch('/api/dashboard/analytics');
    return response.json();
  },
  enabled: !!profile && activeTab === 'analytics', // ← Conditional fetching
  staleTime: 5 * 60 * 1000,
});
```

---

## Testing Checklist

When modifying the dashboard feature, test:

- [ ] KPI data loads correctly for each role (client, tutor, agent)
- [ ] Charts render with valid data (no empty states)
- [ ] Loading skeletons display during fetch
- [ ] Error boundaries catch chart failures
- [ ] Tab switching works (Overview ↔ Analytics)
- [ ] Role switching updates KPIs
- [ ] Onboarding gate redirects incomplete users
- [ ] Auth gate redirects unauthenticated users
- [ ] Responsive layout adapts (mobile/tablet/desktop)
- [ ] Parallel queries complete efficiently (< 500ms)

---

## Security Considerations

1. **RLS Enforcement**: All queries filter by `user.id` (client_id, tutor_id, agent_id)
2. **Auth Verification**: API routes verify `auth.getUser()` before executing
3. **Onboarding Gating**: Redirects incomplete users to `/onboarding`
4. **Data Isolation**: Users only see their own metrics (enforced by Supabase RLS)

---

## Performance Optimization

1. **Parallel Queries**: Wrap all KPI queries in `Promise.all()` (1000ms → 300ms)
2. **React Query Caching**: 2-5 minute stale times prevent excessive refetch
3. **Conditional Fetching**: Analytics tab queries only when tab active
4. **Error Boundaries**: Isolated failures (one chart error doesn't crash page)
5. **Loading Skeletons**: Immediate visual feedback during fetch

---

## Migration Guidelines

When adding new dashboard features:

1. **New KPI**: Update `/api/dashboard/kpis/route.ts` + add to `KPIGrid` component
2. **New Chart**: Create API route + React Query + Recharts component + add to dashboard page
3. **Role-Specific**: Check `activeRole` and render accordingly
4. **Tab-Specific**: Use `enabled` in React Query with `activeTab` condition
5. **Error Handling**: Wrap in `<ErrorBoundary>` with fallback UI

---

## Related Documentation

- [Bookings Solution Design](../bookings/bookings-solution-design.md) - KPI data source
- [Reviews Solution Design](../reviews/reviews-solution-design.md) - Rating metrics
- [CaaS Solution Design](../caas/caas-solution-design.md) - Credibility score
- [Hub Layout Documentation](../hub-layout/README.md) - UI framework

---

**Last Updated**: 2025-12-12
**Maintainer**: Frontend Team
**For Questions**: See dashboard-solution-design.md or ask team lead
