# Dashboard - Implementation Guide

**Version**: C014 (Analytics Tab)
**Last Updated**: 2025-12-12
**Target Audience**: Developers

---

## Table of Contents
1. [File Structure](#file-structure)
2. [Component Overview](#component-overview)
3. [Setup Instructions](#setup-instructions)
4. [Common Tasks](#common-tasks)
5. [API Reference](#api-reference)
6. [Database Schema](#database-schema)
7. [State Management](#state-management)
8. [Testing](#testing)

---

## File Structure

```
apps/web/src/
├─ app/(authenticated)/dashboard/
│   ├─ page.tsx                           # Main dashboard hub (Client Component)
│   └─ page.module.css
│
├─ app/components/feature/dashboard/
│   ├─ widgets/
│   │   ├─ KPIGrid.tsx                    # 6 KPI cards container
│   │   ├─ KPIGrid.module.css
│   │   ├─ KPICard.tsx                    # Individual KPI card
│   │   ├─ KPICard.module.css
│   │   ├─ EarningsTrendChart.tsx         # 6-week line chart (Recharts)
│   │   ├─ EarningsTrendChart.module.css
│   │   ├─ BookingCalendarHeatmap.tsx     # 14-day booking density
│   │   ├─ BookingCalendarHeatmap.module.css
│   │   ├─ StudentTypeBreakdown.tsx       # New vs returning pie/bar
│   │   ├─ StudentTypeBreakdown.module.css
│   │   ├─ ProfileViewsTrendChart.tsx     # 30-day area chart
│   │   ├─ ProfileViewsTrendChart.module.css
│   │   ├─ ReferrerSourcesChart.tsx       # Traffic sources pie/bar
│   │   ├─ ReferrerSourcesChart.module.css
│   │   ├─ MessagesWidget.tsx             # Unread messages preview
│   │   ├─ MessagesWidget.module.css
│   │   ├─ PayoutWidget.tsx               # Next payout info
│   │   ├─ PayoutWidget.module.css
│   │   ├─ HelpCard.tsx                   # Role-specific tips
│   │   ├─ HelpCard.module.css
│   │   └─ TipsCard.tsx                   # Actionable tips
│   │       └─ TipsCard.module.css
│   └─ PendingLogsWidget.tsx              # Action items widget
│       └─ PendingLogsWidget.module.css
│
├─ app/api/dashboard/
│   ├─ kpis/route.ts                      # GET KPI metrics
│   ├─ earnings-trend/route.ts            # GET weekly earnings
│   ├─ booking-heatmap/route.ts           # GET booking density
│   ├─ student-breakdown/route.ts         # GET new vs returning
│   ├─ profile-views-trend/route.ts       # GET profile views
│   └─ referrer-sources/route.ts          # GET traffic sources
│
└─ app/components/ui/feedback/
    ├─ LoadingSkeleton.tsx                # KPISkeleton, ChartSkeleton
    └─ ErrorBoundary.tsx                  # Component-level error catching

```

---

## Component Overview

### Dashboard Architecture

```
┌─────────────────────────────────────────────┐
│ Dashboard (/dashboard)                     │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ HubHeader: Title + Actions              │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ HubTabs: [Overview] [Analytics]         │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌──────────────────┐  ┌──────────────────┐ │
│ │ Main Content     │  │ Sidebar          │ │
│ │ - KPIGrid (6)    │  │ - HelpCard       │ │
│ │ - Charts (3-5)   │  │ - TipsCard       │ │
│ │ - Widgets (2-3)  │  │                  │ │
│ └──────────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────┘
```

### Component Breakdown

**KPIGrid** (apps/web/src/app/components/feature/dashboard/widgets/KPIGrid.tsx)
- Displays 6 role-specific KPI cards
- Grid layout: `repeat(auto-fit, minmax(280px, 1fr))`
- Adapts content based on role (client/tutor/agent)

**EarningsTrendChart**
- Recharts `LineChart` component
- 6 weeks of revenue data
- Tooltips, grid lines, responsive axes

**BookingCalendarHeatmap**
- Custom calendar grid component
- 14 days of booking density
- Color intensity gradient (0-5+ bookings)

---

## Setup Instructions

### Prerequisites
- Next.js 14+ installed
- Supabase configured
- React Query installed
- Recharts installed (`npm install recharts`)

### Environment Variables

Required in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Development Setup

```bash
# 1. Navigate to web app
cd apps/web

# 2. Install dependencies
npm install recharts lucide-react

# 3. Start dev server
npm run dev

# 4. Open dashboard
open http://localhost:3000/dashboard
```

---

## Common Tasks

### Task 1: Fetch KPI Data

```typescript
// apps/web/src/app/(authenticated)/dashboard/page.tsx

import { useQuery } from '@tanstack/react-query';

const { data: kpiData, isLoading: isLoadingKPIs } = useQuery({
  queryKey: ['dashboard', 'kpis', profile?.id],
  queryFn: async () => {
    const response = await fetch('/api/dashboard/kpis');
    if (!response.ok) throw new Error('Failed to fetch KPIs');
    return response.json();
  },
  enabled: !!profile && !isLoading,
  staleTime: 2 * 60 * 1000, // 2 minutes
  gcTime: 5 * 60 * 1000, // 5 minutes
});

// Usage
{isLoadingKPIs ? (
  <KPISkeleton count={6} />
) : kpiData ? (
  <KPIGrid data={kpiData} role={activeRole} currency="GBP" />
) : null}
```

### Task 2: Create KPI API Route

```typescript
// apps/web/src/app/api/dashboard/kpis/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile for role context
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, active_role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const role = profile.active_role;

    // Parallel fetch all KPI data
    const [
      upcomingBookingsResult,
      completedBookingsResult,
      earningsResult,
      ratingsResult,
      caasResult,
    ] = await Promise.all([
      // 1. Upcoming bookings (next 7 days)
      supabase
        .from('bookings')
        .select('id, session_start_time, session_duration_hours')
        .or(`client_id.eq.${user.id},tutor_id.eq.${user.id},agent_id.eq.${user.id}`)
        .gte('session_start_time', new Date().toISOString())
        .lte('session_start_time', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),

      // 2. Completed bookings this month
      supabase
        .from('bookings')
        .select('id, client_id, tutor_id')
        .or(`client_id.eq.${user.id},tutor_id.eq.${user.id},agent_id.eq.${user.id}`)
        .eq('status', 'completed')
        .gte('session_start_time', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),

      // 3. Earnings (role-specific)
      role === 'client'
        ? supabase.from('bookings').select('total_price').eq('client_id', user.id).eq('status', 'completed')
        : supabase.from('bookings').select('tutor_earnings, agent_commission, tutor_id, agent_id').or(`tutor_id.eq.${user.id},agent_id.eq.${user.id}`).eq('status', 'completed'),

      // 4. Ratings received
      supabase
        .from('reviews')
        .select('rating')
        .eq('reviewee_id', user.id)
        .eq('status', 'published'),

      // 5. CaaS score
      supabase
        .from('caas_scores')
        .select('overall_score')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
    ]);

    // Process results
    const upcomingBookings = upcomingBookingsResult.data || [];
    const completedBookings = completedBookingsResult.data || [];
    const ratings = ratingsResult.data || [];

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
  } catch (error) {
    console.error('[Dashboard KPIs API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch KPIs' }, { status: 500 });
  }
}

function calculateEarnings(bookings: any[], role: string, userId: string): number {
  if (!bookings) return 0;

  return bookings.reduce((sum, b) => {
    if (role === 'tutor' && b.tutor_id === userId) {
      return sum + (b.tutor_earnings || 0);
    } else if (role === 'agent' && b.agent_id === userId) {
      return sum + (b.agent_commission || 0);
    } else if (role === 'client') {
      return sum + (b.total_price || 0);
    }
    return sum;
  }, 0);
}
```

### Task 3: Create Earnings Trend Chart

```typescript
// apps/web/src/app/api/dashboard/earnings-trend/route.ts

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const weeks = parseInt(searchParams.get('weeks') || '6');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('active_role')
    .eq('id', user.id)
    .single();

  const role = profile.active_role;

  // Calculate earnings for each week
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

    const weekTotal = (bookings || []).reduce((sum, b) => {
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
}
```

### Task 4: Render Earnings Trend Chart

```typescript
// apps/web/src/app/components/feature/dashboard/widgets/EarningsTrendChart.tsx

'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import styles from './EarningsTrendChart.module.css';

export interface WeeklyEarnings {
  week: string;
  earnings: number;
}

interface EarningsTrendChartProps {
  data: WeeklyEarnings[];
  currency?: string;
  showComparison?: boolean;
}

export default function EarningsTrendChart({ data, currency = 'GBP', showComparison = false }: EarningsTrendChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className={styles.chartContainer}>
      <div className={styles.header}>
        <h3 className={styles.title}>Earnings Trend</h3>
        <p className={styles.subtitle}>Last 6 weeks</p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="week"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => formatCurrency(value)}
          />
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
          />
          <Line
            type="monotone"
            dataKey="earnings"
            stroke="#006c67"
            strokeWidth={2}
            dot={{ fill: '#006c67', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### Task 5: Create Booking Calendar Heatmap

```typescript
// apps/web/src/app/components/feature/dashboard/widgets/BookingCalendarHeatmap.tsx

'use client';

import React from 'react';
import styles from './BookingCalendarHeatmap.module.css';

export interface DayBooking {
  date: string; // "2025-12-12"
  count: number; // 0-5+
}

interface BookingCalendarHeatmapProps {
  data: DayBooking[];
  range?: 'next-14-days' | 'last-30-days';
}

export default function BookingCalendarHeatmap({ data, range = 'next-14-days' }: BookingCalendarHeatmapProps) {
  // Get color based on booking count
  const getColor = (count: number): string => {
    if (count === 0) return '#e6f0f0';
    if (count === 1) return '#b3d9d9';
    if (count === 2) return '#80c2c2';
    if (count === 3) return '#4dabab';
    if (count === 4) return '#1a9494';
    return '#006c67'; // 5+
  };

  // Format date for display
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  // Get day of week
  const getDayOfWeek = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { weekday: 'short' });
  };

  return (
    <div className={styles.heatmapContainer}>
      <div className={styles.header}>
        <h3 className={styles.title}>Booking Calendar</h3>
        <p className={styles.subtitle}>
          {range === 'next-14-days' ? 'Next 14 days' : 'Last 30 days'}
        </p>
      </div>

      <div className={styles.calendar}>
        {data.map((day) => (
          <div
            key={day.date}
            className={styles.dayCell}
            style={{ backgroundColor: getColor(day.count) }}
            title={`${day.count} bookings on ${formatDate(day.date)}`}
          >
            <div className={styles.dayLabel}>{getDayOfWeek(day.date)}</div>
            <div className={styles.dayNumber}>{new Date(day.date).getDate()}</div>
            <div className={styles.bookingCount}>{day.count > 0 ? day.count : ''}</div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <span className={styles.legendLabel}>Less</span>
        {[0, 1, 2, 3, 4, 5].map((count) => (
          <div
            key={count}
            className={styles.legendSquare}
            style={{ backgroundColor: getColor(count) }}
          />
        ))}
        <span className={styles.legendLabel}>More</span>
      </div>
    </div>
  );
}
```

### Task 6: Handle Tab Switching

```typescript
// apps/web/src/app/(authenticated)/dashboard/page.tsx

const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview');

// Conditional query fetching based on active tab
const { data: profileViewsTrendData } = useQuery({
  queryKey: ['dashboard', 'profile-views-trend', profile?.id],
  queryFn: async () => {
    const response = await fetch('/api/dashboard/profile-views-trend?days=30');
    if (!response.ok) throw new Error('Failed to fetch profile views');
    return response.json();
  },
  enabled: !!profile && !isLoading && activeTab === 'analytics', // ← Only fetch when Analytics tab active
  staleTime: 5 * 60 * 1000,
});

// Render based on active tab
{activeTab === 'overview' && (
  <>
    <KPIGrid data={kpiData} role={activeRole} />
    <EarningsTrendChart data={earningsTrendData} />
    <BookingCalendarHeatmap data={bookingHeatmapData} />
  </>
)}

{activeTab === 'analytics' && (
  <>
    <ProfileViewsTrendChart data={profileViewsTrendData} />
    <ReferrerSourcesChart data={referrerSourcesData} />
  </>
)}
```

### Task 7: Add Error Boundaries

```typescript
// Wrap each chart in ErrorBoundary
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';

<ErrorBoundary fallback={<div>Unable to load earnings chart</div>}>
  {isLoadingEarnings ? (
    <ChartSkeleton height="320px" />
  ) : earningsTrendData.length > 0 ? (
    <EarningsTrendChart data={earningsTrendData} currency="GBP" />
  ) : null}
</ErrorBoundary>
```

### Task 8: Implement Role-Specific KPIs

```typescript
// apps/web/src/app/components/feature/dashboard/widgets/KPIGrid.tsx

export default function KPIGrid({ data, role, currency = 'GBP' }: KPIGridProps) {
  // TUTOR/AGENT KPIs
  const tutorKPIs: KPICardProps[] = [
    {
      label: 'Total Earnings',
      value: formatCurrency(data.totalEarnings),
      change: '+12% vs last month',
      timeframe: 'This Month',
      icon: Coins,
      variant: 'success'
    },
    // ... 5 more KPI cards
  ];

  // CLIENT KPIs
  const clientKPIs: KPICardProps[] = [
    {
      label: 'Active Bookings',
      value: data.activeBookings || 0,
      sublabel: 'Next session: Tomorrow',
      icon: Calendar,
      variant: 'info'
    },
    // ... 5 more KPI cards
  ];

  const kpis = role === 'client' ? clientKPIs : tutorKPIs;

  return (
    <div className={styles.grid}>
      {kpis.map((kpi, index) => (
        <KPICard key={index} {...kpi} />
      ))}
    </div>
  );
}
```

---

## API Reference

### GET /api/dashboard/kpis

Fetch comprehensive KPI metrics.

**Response**:
```typescript
{
  totalEarnings: number;
  upcomingSessions: number;
  upcomingHours: number;
  completedSessionsThisMonth: number;
  averageRating: number;
  totalReviews: number;
  repeatStudentsPercent?: number;
  caasScore?: number;
  // ... 10 more metrics
}
```

### GET /api/dashboard/earnings-trend?weeks=6

Fetch weekly earnings data.

**Query Parameters**:
- `weeks` (optional, default: 6) - Number of weeks

**Response**:
```typescript
[
  { week: "Week 1", earnings: 1234 },
  { week: "Week 2", earnings: 1456 },
  ...
]
```

### GET /api/dashboard/booking-heatmap?days=14

Fetch booking density for calendar heatmap.

**Query Parameters**:
- `days` (optional, default: 14) - Number of days

**Response**:
```typescript
[
  { date: "2025-12-12", count: 3 },
  { date: "2025-12-13", count: 1 },
  ...
]
```

---

## Database Schema

### Queries Used

**bookings**:
```sql
SELECT id, session_start_time, session_duration_hours, tutor_earnings, agent_commission, total_price
FROM bookings
WHERE (client_id = :user_id OR tutor_id = :user_id OR agent_id = :user_id)
  AND status = 'completed'
  AND session_start_time >= :start_date
```

**reviews**:
```sql
SELECT rating
FROM reviews
WHERE reviewee_id = :user_id
  AND status = 'published'
```

**caas_scores**:
```sql
SELECT overall_score
FROM caas_scores
WHERE profile_id = :user_id
ORDER BY created_at DESC
LIMIT 1
```

---

## State Management

### React Query Setup

```typescript
// Query keys
['dashboard', 'kpis', profileId]
['dashboard', 'earnings-trend', profileId]
['dashboard', 'booking-heatmap', profileId]
['dashboard', 'student-breakdown', profileId]
['dashboard', 'profile-views-trend', profileId]
['dashboard', 'referrer-sources', profileId]
```

---

## Testing

### Component Testing

```typescript
describe('KPIGrid', () => {
  it('renders tutor KPIs correctly', () => {
    const data = {
      totalEarnings: 2450,
      upcomingSessions: 5,
      averageRating: 4.8,
    };

    render(<KPIGrid data={data} role="tutor" />);

    expect(screen.getByText('Total Earnings')).toBeInTheDocument();
    expect(screen.getByText('£2,450')).toBeInTheDocument();
  });
});
```

---

**Last Updated**: 2025-12-12
**Version**: C014
**Maintainer**: Frontend Team
