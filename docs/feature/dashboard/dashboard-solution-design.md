# Dashboard Feature - Solution Design

**Version**: C014 (Analytics Tab)
**Date**: 2025-12-12
**Status**: Active
**Owner**: Frontend Team
**Architecture**: Hub Layout + React Query + Role-Based Content

---

## Executive Summary

The Dashboard is Tutorwise's central command center, providing users with a comprehensive overview of their platform activity. Built on the Hub Layout architecture with React Query for data management, the dashboard delivers role-specific KPIs, interactive charts, actionable widgets, and analytics tracking. The system supports three distinct user roles (client, tutor, agent) with tailored metrics, real-time updates, and mobile-responsive design.

**Key Capabilities**:
- **Role-Based KPIs**: 6 unique metrics per role (clients, tutors, agents)
- **Real-Time Data**: React Query with automatic background refetch
- **Interactive Charts**: 5 visualization types (line, area, pie, bar, heatmap)
- **Analytics Tracking**: Profile views + traffic sources (Analytics tab)
- **Actionable Widgets**: Pending actions, messages, payouts
- **Error Resilience**: Component-level error boundaries
- **Onboarding Gating**: Redirects incomplete users to onboarding flow
- **Responsive Design**: Mobile-first with adaptive grid layouts

---

## System Architecture

### High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                    DASHBOARD SYSTEM ARCHITECTURE                    │
└────────────────────────────────────────────────────────────────────┘

┌──────────────┐                                      ┌──────────────┐
│   User       │                                      │  Supabase    │
│ (Client/     │                                      │  Database    │
│  Tutor/Agent)│                                      │              │
└──────┬───────┘                                      └──────┬───────┘
       │                                                     │
       │ 1. Navigate to /dashboard                          │
       ↓                                                     │
┌─────────────────────────────────────────────────────────────────────┐
│              AUTHENTICATION & ONBOARDING CHECK                      │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ 1. UserProfileContext verifies auth state                     │ │
│ │ 2. Check onboarding_completed status                          │ │
│ │ 3. If not authenticated → redirect to /login                  │ │
│ │ 4. If onboarding incomplete → redirect to /onboarding         │ │
│ └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          │ 2. Render Dashboard
                          ↓
┌─────────────────────────────────────────────────────────────────────┐
│              DASHBOARD PAGE (Client Component)                      │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ HubHeader: Title + Subtitle + Actions                         │ │
│ │ - Client: "My Learning Hub" + "Find Tutors" button           │ │
│ │ - Tutor: "My Teaching Studio" + "Create Listing" button      │ │
│ │ - Agent: "My Tutoring Agency" + "Create Listing" button      │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ HubTabs: [Overview] [Analytics]                               │ │
│ │ - Overview: KPIs + Charts + Widgets                           │ │
│ │ - Analytics: Profile Views + Referrer Sources (C014)          │ │
│ └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          │ 3. Fetch Data (React Query)
                          ↓
┌─────────────────────────────────────────────────────────────────────┐
│              REACT QUERY DATA FETCHING (Parallel)                   │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ Query 1: ['dashboard', 'kpis', profileId]                     │ │
│ │   → GET /api/dashboard/kpis                                   │ │
│ │   → 17 metrics (earnings, sessions, ratings, CaaS, etc.)     │ │
│ │   → Stale time: 2 minutes                                     │ │
│ │                                                                │ │
│ │ Query 2: ['dashboard', 'earnings-trend', profileId]          │ │
│ │   → GET /api/dashboard/earnings-trend?weeks=6                │ │
│ │   → 6 weeks of revenue data                                   │ │
│ │   → Stale time: 3 minutes                                     │ │
│ │                                                                │ │
│ │ Query 3: ['dashboard', 'booking-heatmap', profileId]         │ │
│ │   → GET /api/dashboard/booking-heatmap?days=14               │ │
│ │   → 14 days of booking density                                │ │
│ │   → Stale time: 2 minutes                                     │ │
│ │                                                                │ │
│ │ Query 4: ['dashboard', 'student-breakdown', profileId]       │ │
│ │   → GET /api/dashboard/student-breakdown                     │ │
│ │   → New vs returning students                                 │ │
│ │   → Stale time: 3 minutes                                     │ │
│ │                                                                │ │
│ │ Query 5: ['dashboard', 'profile-views-trend', profileId]     │ │
│ │   → GET /api/dashboard/profile-views-trend?days=30           │ │
│ │   → 30 days of profile views (Analytics tab only)            │ │
│ │   → Stale time: 5 minutes                                     │ │
│ │                                                                │ │
│ │ Query 6: ['dashboard', 'referrer-sources', profileId]        │ │
│ │   → GET /api/dashboard/referrer-sources                      │ │
│ │   → Traffic sources breakdown (Analytics tab only)           │ │
│ │   → Stale time: 5 minutes                                     │ │
│ └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          │ 4. Render Widgets
                          ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    OVERVIEW TAB COMPONENTS                          │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ KPIGrid (6 cards, role-specific)                              │ │
│ │ ┌──────────┐ ┌──────────┐ ┌──────────┐                       │ │
│ │ │ Earnings │ │ Upcoming │ │ Completed│ (Tutor/Agent)         │ │
│ │ │  £2,450  │ │ Sessions │ │ Sessions │                       │ │
│ │ └──────────┘ └──────────┘ └──────────┘                       │ │
│ │ ┌──────────┐ ┌──────────┐ ┌──────────┐                       │ │
│ │ │ Rating   │ │ Repeat   │ │ CaaS     │                       │ │
│ │ │  4.8★    │ │ Students │ │ Score 92 │                       │ │
│ │ └──────────┘ └──────────┘ └──────────┘                       │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ EarningsTrendChart (Recharts LineChart)                      │ │
│ │ - 6 weeks of revenue data                                     │ │
│ │ - Tooltips, grid, responsive axes                             │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ BookingCalendarHeatmap                                        │ │
│ │ - 14-day booking density grid                                 │ │
│ │ - Color intensity (0-5+ bookings per day)                     │ │
│ │ - Day-of-week labels, hover tooltips                          │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ StudentTypeBreakdown (PieChart / BarChart toggle)            │ │
│ │ - New vs Returning students                                   │ │
│ │ - Toggle button to switch views                               │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ Actionable Widgets Row                                        │ │
│ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │ │
│ │ │ Pending      │ │ Messages     │ │ Payout       │           │ │
│ │ │ Actions      │ │ Widget       │ │ Widget       │           │ │
│ │ │ (3 items)    │ │ (5 unread)   │ │ (£450 next)  │           │ │
│ │ └──────────────┘ └──────────────┘ └──────────────┘           │ │
│ └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    ANALYTICS TAB COMPONENTS (C014)                  │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ ProfileViewsTrendChart (Recharts AreaChart)                   │ │
│ │ - 30 days of profile views                                     │ │
│ │ - Smooth curve, gradient fill, tooltips                        │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ ReferrerSourcesChart (PieChart / BarChart toggle)             │ │
│ │ - Traffic sources: Direct, Search, Social, Referral           │ │
│ │ - Multi-color palette, toggle view                             │ │
│ └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    SIDEBAR (HubSidebar)                             │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ HelpCard (Role-specific next steps)                           │ │
│ │ - Tutor: "Complete your profile to get more bookings"        │ │
│ │ - Client: "Book your first session"                           │ │
│ │ - Agent: "Add your first listing"                             │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ TipsCard (Actionable tips)                                    │ │
│ │ - Tutor: "Upload a bio video to boost credibility"           │ │
│ │ - Client: "Rate your tutors to help others"                   │ │
│ │ - Agent: "Refer tutors to earn commissions"                   │ │
│ └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## System Integrations

The dashboard integrates with **10 major platform features**:

### 1. Auth Integration (CRITICAL - Access Control)

**Purpose**: Verify authentication and onboarding status before rendering dashboard

**Key Files**:
- `apps/web/src/app/contexts/UserProfileContext.tsx` - Auth state provider
- `apps/web/src/app/(authenticated)/dashboard/page.tsx` - Auth check logic

**Mechanism**:

```typescript
// Dashboard page component
const { profile, activeRole, isLoading, needsOnboarding } = useUserProfile();
const router = useRouter();

useEffect(() => {
  // Redirect to login if not authenticated
  if (!isLoading && !profile) {
    router.push('/login');
    return;
  }

  // Redirect to onboarding if not completed
  if (!isLoading && profile && needsOnboarding) {
    console.log('Redirecting to onboarding - dashboard access blocked');
    router.push('/onboarding');
    return;
  }
}, [isLoading, profile, needsOnboarding, router]);
```

**Integration Points**:
- `UserProfileContext` provides `profile`, `activeRole`, `needsOnboarding`
- Strict enforcement: No dashboard access until onboarding complete
- Auth state changes trigger automatic re-evaluation

---

### 2. Bookings Integration (KPI Data Source)

**Purpose**: Fetch booking metrics for earnings, sessions, and student counts

**Key Files**:
- `apps/web/src/app/api/dashboard/kpis/route.ts` - KPI aggregation
- `apps/web/src/app/api/dashboard/booking-heatmap/route.ts` - Calendar density
- `bookings` table - Primary data source

**Mechanism**:

```typescript
// KPI API: Parallel booking queries
const [
  upcomingBookingsResult,
  completedBookingsResult,
  earningsResult,
] = await Promise.all([
  // Upcoming bookings (next 7 days)
  supabase
    .from('bookings')
    .select('id, session_start_time, session_duration_hours')
    .or(`client_id.eq.${user.id},tutor_id.eq.${user.id},agent_id.eq.${user.id}`)
    .gte('session_start_time', new Date().toISOString())
    .lte('session_start_time', sevenDaysFromNow),

  // Completed bookings this month
  supabase
    .from('bookings')
    .select('id, client_id, tutor_id')
    .or(`client_id.eq.${user.id},tutor_id.eq.${user.id},agent_id.eq.${user.id}`)
    .eq('status', 'completed')
    .gte('session_start_time', firstDayOfMonth),

  // Earnings calculation (role-specific)
  role === 'client'
    ? supabase.from('bookings').select('total_price').eq('client_id', user.id).eq('status', 'completed')
    : supabase.from('bookings').select('tutor_earnings, agent_commission, tutor_id, agent_id').or(`tutor_id.eq.${user.id},agent_id.eq.${user.id}`).eq('status', 'completed'),
]);

// Calculate KPIs
const kpis = {
  upcomingSessions: upcomingBookings.length,
  upcomingHours: upcomingBookings.reduce((sum, b) => sum + (b.session_duration_hours || 1), 0),
  completedSessionsThisMonth: completedBookings.length,
  totalEarnings: calculateEarnings(earningsResult, role, user.id),
  repeatStudentsPercent: calculateRepeatRate(completedBookings),
};
```

**Integration Points**:
- `bookings.client_id`, `bookings.tutor_id`, `bookings.agent_id` - User filtering
- `bookings.status` - Filter by completed/upcoming
- `bookings.session_start_time` - Date range filtering
- `bookings.tutor_earnings`, `bookings.agent_commission` - Revenue calculation

---

### 3. Reviews Integration (Rating Metrics)

**Purpose**: Calculate average ratings and review counts

**Key Files**:
- `apps/web/src/app/api/dashboard/kpis/route.ts` - Rating aggregation
- `reviews` table - Rating data source

**Mechanism**:

```typescript
// Fetch ratings received
const { data: ratings } = await supabase
  .from('reviews')
  .select('rating, created_at')
  .eq('reviewee_id', user.id)
  .eq('status', 'published')
  .order('created_at', { ascending: false });

// Calculate average rating
const averageRating = ratings.length > 0
  ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
  : 0;

// Last 10 ratings average
const last10Ratings = ratings.slice(0, 10);
const last10Rating = last10Ratings.length > 0
  ? last10Ratings.reduce((sum, r) => sum + r.rating, 0) / last10Ratings.length
  : averageRating;

const kpis = {
  averageRating: Math.round(averageRating * 10) / 10,
  totalReviews: ratings.length,
  last10Rating: Math.round(last10Rating * 10) / 10,
};
```

**Integration Points**:
- `reviews.reviewee_id` - Filter by user being reviewed
- `reviews.status = 'published'` - Only published reviews
- `reviews.rating` - Numeric rating (1-5 stars)
- `reviews.created_at` - Sort for recent ratings

---

### 4. CaaS Integration (Credibility Score)

**Purpose**: Display user's Credibility-as-a-Service score

**Key Files**:
- `apps/web/src/app/api/dashboard/kpis/route.ts` - CaaS score fetch
- `caas_scores` table - Score data source

**Mechanism**:

```typescript
// Fetch latest CaaS score
const { data: caasScore } = await supabase
  .from('caas_scores')
  .select('overall_score')
  .eq('profile_id', user.id)
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

const kpis = {
  caasScore: caasScore?.overall_score || 0,
};
```

**Integration Points**:
- `caas_scores.profile_id` - User's score
- `caas_scores.overall_score` - Numeric score (0-100)
- KPICard links to `/caas` for detailed breakdown

---

### 5. Financials Integration (Earnings/Spending)

**Purpose**: Calculate role-specific revenue metrics

**Key Files**:
- `apps/web/src/app/api/dashboard/earnings-trend/route.ts` - Weekly earnings
- `bookings` table - Revenue source (tutor_earnings, agent_commission, total_price)

**Mechanism**:

```typescript
// Earnings Trend API (6 weeks)
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
    if (role === 'tutor' && b.tutor_id === user.id) {
      return sum + (b.tutor_earnings || 0);
    } else if (role === 'agent' && b.agent_id === user.id) {
      return sum + (b.agent_commission || 0);
    } else if (role === 'client' && b.client_id === user.id) {
      return sum + (b.total_price || 0);
    }
    return sum;
  }, 0);

  earningsByWeek.push({
    week: `Week ${weeks - i}`,
    earnings: Math.round(weekTotal),
  });
}

return NextResponse.json(earningsByWeek);
```

**Integration Points**:
- `bookings.tutor_earnings` - Tutor revenue
- `bookings.agent_commission` - Agent revenue
- `bookings.total_price` - Client spending
- Role-based filtering for accurate calculations

---

### 6. Messages Integration (Unread Count)

**Purpose**: Display unread messages count and recent conversations

**Key Files**:
- `apps/web/src/app/components/feature/dashboard/widgets/MessagesWidget.tsx`
- `messages` table (future integration)

**Mechanism**:

```typescript
// TODO: Integrate with messages API when available
const { data: messages } = await supabase
  .from('messages')
  .select('id, sender_id, content, created_at')
  .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
  .eq('read', false)
  .order('created_at', { ascending: false })
  .limit(5);

const unreadCount = messages?.length || 0;
```

**Integration Points** (Planned):
- `messages.recipient_id` - User receiving message
- `messages.read = false` - Unread filter
- `messages.created_at` - Sort by recent

---

### 7. Payments Integration (Payout Widget)

**Purpose**: Display next payout date and pending balance

**Key Files**:
- `apps/web/src/app/components/feature/dashboard/widgets/PayoutWidget.tsx`
- `transactions` table - Pending balances

**Mechanism**:

```typescript
// Fetch pending balance
const { data: transactions } = await supabase
  .from('transactions')
  .select('amount, status')
  .eq('profile_id', user.id)
  .in('status', ['clearing', 'available']);

const pendingBalance = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

// Next payout date (calculate based on platform schedule)
const nextPayoutDate = calculateNextPayoutDate(); // e.g., next Friday
```

**Integration Points**:
- `transactions.profile_id` - User's transactions
- `transactions.status IN ('clearing', 'available')` - Pending funds
- `transactions.amount` - Sum for pending balance

---

### 8. Analytics Integration (Profile Views + Referrer Sources)

**Purpose**: Track profile views and traffic sources (Analytics tab - C014)

**Key Files**:
- `apps/web/src/app/api/dashboard/profile-views-trend/route.ts`
- `apps/web/src/app/api/dashboard/referrer-sources/route.ts`
- `profile_views` table (future), `referrals` table

**Mechanism**:

```typescript
// Profile Views Trend (30 days)
const days = 30;
const viewsByDay = [];

for (let i = days - 1; i >= 0; i--) {
  const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
  const dayStart = new Date(day.setHours(0, 0, 0, 0));
  const dayEnd = new Date(day.setHours(23, 59, 59, 999));

  const { data: views } = await supabase
    .from('profile_views')
    .select('id')
    .eq('profile_id', user.id)
    .gte('created_at', dayStart.toISOString())
    .lte('created_at', dayEnd.toISOString());

  viewsByDay.push({
    date: dayStart.toISOString().split('T')[0],
    views: views?.length || 0,
  });
}

// Referrer Sources
const { data: referrals } = await supabase
  .from('referrals')
  .select('source')
  .eq('profile_id', user.id);

const sourceBreakdown = referrals.reduce((acc, r) => {
  acc[r.source] = (acc[r.source] || 0) + 1;
  return acc;
}, {});

return NextResponse.json([
  { source: 'Direct', count: sourceBreakdown.direct || 0 },
  { source: 'Search', count: sourceBreakdown.search || 0 },
  { source: 'Social', count: sourceBreakdown.social || 0 },
  { source: 'Referral', count: sourceBreakdown.referral || 0 },
]);
```

**Integration Points** (Planned):
- `profile_views.profile_id` - User's profile views
- `profile_views.created_at` - Date filtering
- `referrals.source` - Traffic source attribution

---

### 9. Hub Layout Integration (UI Framework)

**Purpose**: Consistent header, tabs, and sidebar structure

**Key Files**:
- `apps/web/src/app/components/hub/layout/HubPageLayout.tsx`
- `apps/web/src/app/components/hub/layout/HubHeader.tsx`
- `apps/web/src/app/components/hub/layout/HubTabs.tsx`
- `apps/web/src/app/components/hub/sidebar/HubSidebar.tsx`

**Mechanism**:

```typescript
// Dashboard page structure
<HubPageLayout
  header={
    <HubHeader
      title={getDashboardTitle()} // Role-specific title
      subtitle={`Welcome, ${firstName} (${role})`}
      actions={getHeaderActions()} // Role-specific action buttons
    />
  }
  tabs={
    <HubTabs
      tabs={[
        { id: 'overview', label: 'Overview', active: activeTab === 'overview' },
        { id: 'analytics', label: 'Analytics', active: activeTab === 'analytics' }
      ]}
      onTabChange={(tabId) => setActiveTab(tabId)}
    />
  }
  sidebar={
    <HubSidebar>
      <HelpCard role={role} />
      <TipsCard role={role} />
    </HubSidebar>
  }
>
  {/* Main content */}
</HubPageLayout>
```

**Integration Points**:
- Shared layout components across all hub pages
- Responsive sidebar (desktop: fixed, mobile: collapsible)
- Tab state management

---

### 10. React Query Integration (Data Management)

**Purpose**: Automatic caching, background refetch, error handling

**Key Files**:
- `apps/web/src/app/(authenticated)/dashboard/page.tsx` - Query definitions

**Mechanism**:

```typescript
// KPI Query
const { data: kpiData, isLoading: isLoadingKPIs } = useQuery({
  queryKey: ['dashboard', 'kpis', profile?.id],
  queryFn: async () => {
    const response = await fetch('/api/dashboard/kpis');
    if (!response.ok) throw new Error('Failed to fetch KPIs');
    return response.json();
  },
  enabled: !!profile && !isLoading,
  staleTime: 2 * 60 * 1000, // 2 minutes
  gcTime: 5 * 60 * 1000, // 5 minutes (garbage collection)
});
```

**Integration Points**:
- Automatic retry on failure (3 retries with exponential backoff)
- Background refetch when tab gains focus
- Cache invalidation via `queryClient.invalidateQueries()`
- Loading/error states managed by React Query

---

## Database Schema

### Primary Tables

**bookings** (Main KPI Source):
```sql
- id, client_id, tutor_id, agent_id
- status ('pending', 'completed', 'cancelled')
- session_start_time, session_duration_hours
- tutor_earnings, agent_commission, total_price
```

**reviews**:
```sql
- id, reviewer_id, reviewee_id
- rating (1-5), status ('published', 'pending')
- created_at
```

**caas_scores**:
```sql
- id, profile_id, overall_score (0-100)
- created_at
```

**transactions** (Payout Widget):
```sql
- id, profile_id, amount, status ('clearing', 'available', 'paid_out')
```

**profile_views** (Future - Analytics):
```sql
- id, profile_id, viewer_id, created_at
- source ('direct', 'search', 'social', 'referral')
```

---

## Role-Specific KPIs

### Tutor KPIs (6 cards)

1. **Total Earnings**: `£X,XXX` (This Month)
   - Source: `SUM(bookings.tutor_earnings WHERE tutor_id = user.id AND status = 'completed' AND session_start_time >= first_day_of_month)`
   - Change: `+12% vs last month`

2. **Upcoming Sessions**: `X sessions` (Next 7 Days)
   - Source: `COUNT(bookings WHERE tutor_id = user.id AND session_start_time BETWEEN now AND now+7days)`
   - Sublabel: `X hours`

3. **Completed Sessions**: `X sessions` (This Month)
   - Source: `COUNT(bookings WHERE tutor_id = user.id AND status = 'completed' AND session_start_time >= first_day_of_month)`

4. **Average Rating**: `X.X★`
   - Source: `AVG(reviews.rating WHERE reviewee_id = user.id AND status = 'published')`
   - Sublabel: `From X reviews`

5. **Repeat Students**: `X%`
   - Source: Calculate from unique `client_id` with booking count > 1
   - Sublabel: `X of Y students`

6. **CaaS Score**: `X`
   - Source: `caas_scores.overall_score WHERE profile_id = user.id ORDER BY created_at DESC LIMIT 1`
   - Sublabel: `Premium tier` (if >= 90), `Standard tier` (if > 0)

### Agent KPIs (6 cards)

Same as Tutor KPIs, but:
- **Total Earnings**: Uses `agent_commission` instead of `tutor_earnings`
- **Upcoming Sessions**: Filters by `agent_id`
- **Completed Sessions**: Filters by `agent_id`

### Client KPIs (6 cards)

1. **Active Bookings**: `X`
   - Source: `COUNT(bookings WHERE client_id = user.id AND session_start_time >= now)`

2. **Total Spent**: `£X,XXX` (All Time)
   - Source: `SUM(bookings.total_price WHERE client_id = user.id AND status = 'completed')`

3. **Favorite Tutors**: `X`
   - Source: `COUNT(DISTINCT tutor_id FROM profile_graph WHERE client_id = user.id AND type = 'favorite')`

4. **Total Hours Learned**: `X hours` (All Time)
   - Source: `SUM(bookings.session_duration_hours WHERE client_id = user.id AND status = 'completed')`

5. **Average Rating Given**: `X.X★`
   - Source: `AVG(reviews.rating WHERE reviewer_id = user.id AND status = 'published')`

6. **CaaS Score**: `X`
   - Source: Same as Tutor

---

## Charts & Visualizations

### 1. Earnings Trend Chart (Recharts LineChart)

**Data Source**: `/api/dashboard/earnings-trend?weeks=6`

**Data Structure**:
```typescript
interface WeeklyEarnings {
  week: string; // "Week 1", "Week 2", ...
  earnings: number; // £1,234
}
```

**Features**:
- Recharts `LineChart` component
- X-axis: Week labels
- Y-axis: Earnings (£)
- Tooltips on hover
- Responsive width
- Grid lines for readability

### 2. Booking Calendar Heatmap

**Data Source**: `/api/dashboard/booking-heatmap?days=14`

**Data Structure**:
```typescript
interface DayBooking {
  date: string; // "2025-12-12"
  count: number; // 0-5+
}
```

**Features**:
- 14-day calendar grid (2 weeks)
- Color intensity: `#e6f0f0` (0 bookings) → `#006c67` (5+ bookings)
- Day-of-week labels (Mon, Tue, Wed, ...)
- Hover tooltips: "3 bookings on Dec 12"
- Responsive: Stacks on mobile

### 3. Student Type Breakdown (PieChart / BarChart)

**Data Source**: `/api/dashboard/student-breakdown`

**Data Structure**:
```typescript
interface StudentTypeData {
  new: number; // New students count
  returning: number; // Returning students count
}
```

**Features**:
- Recharts `PieChart` (default) with toggle to `BarChart`
- Colors: Primary (#006c67), Secondary (#f59e0b)
- Percentage labels
- Legend with counts

### 4. Profile Views Trend Chart (Recharts AreaChart)

**Data Source**: `/api/dashboard/profile-views-trend?days=30`

**Data Structure**:
```typescript
interface DailyViews {
  date: string; // "2025-12-12"
  views: number; // 42
}
```

**Features**:
- Recharts `AreaChart` with gradient fill
- 30-day history
- Smooth curve (`monotone`)
- Tooltips, responsive axes

### 5. Referrer Sources Chart (PieChart / BarChart)

**Data Source**: `/api/dashboard/referrer-sources`

**Data Structure**:
```typescript
interface ReferrerData {
  source: string; // "Direct", "Search", "Social", "Referral"
  count: number; // 127
}
```

**Features**:
- Recharts `PieChart` with toggle to `BarChart`
- Multi-color palette (4 colors)
- Percentage labels + counts
- Legend

---

## Performance Optimizations

1. **Parallel API Calls**:
   - All KPI queries wrapped in `Promise.all()` in backend
   - Reduces total request time from 1000ms+ to ~300ms

2. **React Query Caching**:
   - KPIs: 2-minute stale time (frequent updates needed)
   - Charts: 3-5 minute stale time (less volatile data)
   - Automatic background refetch when tab gains focus

3. **Conditional Fetching**:
   - Analytics tab queries only run when `activeTab === 'analytics'`
   - `enabled: !!profile && !isLoading && activeTab === 'analytics'`

4. **Error Boundaries**:
   - Each chart wrapped in `<ErrorBoundary>`
   - Isolated failures (one chart error doesn't crash entire page)

5. **Loading Skeletons**:
   - `KPISkeleton`, `ChartSkeleton`, `WidgetSkeleton`
   - Immediate visual feedback during data fetch

---

## Security Considerations

1. **RLS Enforcement**:
   - All queries filter by `user.id` (client_id, tutor_id, agent_id)
   - Supabase RLS policies enforce data access

2. **Auth Verification**:
   - API routes verify `auth.getUser()` before executing queries
   - Return 401 Unauthorized if no valid session

3. **Onboarding Gating**:
   - Redirects incomplete users to `/onboarding`
   - Prevents access to dashboard until profile setup complete

4. **Rate Limiting** (Future):
   - Implement rate limiting on API routes to prevent abuse
   - Max 100 requests per minute per user

---

## Testing Strategy

### Unit Tests

```typescript
describe('Dashboard KPI Calculation', () => {
  it('calculates total earnings correctly for tutors', async () => {
    const kpis = await fetchKPIs(tutorId, 'tutor');
    expect(kpis.totalEarnings).toBe(2450);
  });

  it('calculates repeat students percentage', () => {
    const bookings = [
      { client_id: 'c1' },
      { client_id: 'c1' },
      { client_id: 'c2' },
    ];
    const repeatPercent = calculateRepeatRate(bookings);
    expect(repeatPercent).toBe(50); // 1 of 2 students repeated
  });
});
```

### Integration Tests

```typescript
describe('Dashboard Page', () => {
  it('redirects to login if not authenticated', async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(window.location.pathname).toBe('/login');
    });
  });

  it('renders KPI cards for tutors', async () => {
    mockAuth({ role: 'tutor' });
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Earnings')).toBeInTheDocument();
      expect(screen.getByText('Upcoming Sessions')).toBeInTheDocument();
    });
  });
});
```

---

## Related Documentation

- [Bookings Solution Design](../bookings/bookings-solution-design.md) - KPI data source
- [Reviews Solution Design](../reviews/reviews-solution-design.md) - Rating metrics
- [CaaS Solution Design](../caas/caas-solution-design.md) - Credibility score
- [Financials Solution Design](../financials/financials-solution-design.md) - Earnings/spending

---

**Last Updated**: 2025-12-12
**Version**: C014 (Analytics Tab)
**Status**: Active - Core Platform Hub
**Architecture**: Hub Layout + React Query + Recharts + Role-Based Content
