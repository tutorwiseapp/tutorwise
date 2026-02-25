# Phase 2B: Analytics Dashboard - Implementation Guide

**Feature:** Complete Analytics Dashboard for AI Tutor Studio
**Priority:** High (High Value)
**Estimated Effort:** 3-4 days
**Dependencies:** Metrics collection infrastructure
**Status:** Ready to Implement

---

## 📋 **Overview**

This phase upgrades the simplified Overview tab to match the comprehensive analytics pattern used in Admin Listings. It adds historical metrics tracking, trend indicators, and interactive charts for data-driven decision making.

**Business Value:**
- **Historical Comparison** - Track month-over-month growth
- **Trend Analysis** - Identify patterns in AI tutor performance
- **Data-Driven Decisions** - Optimize pricing, featuring, and priorities
- **Performance Monitoring** - Detect issues early via metrics

---

## 🎯 **Current vs Target State**

### **Current State (Phase 1)**
```typescript
// Simplified real-time metrics only
const { data: aiTutorStats } = useQuery({
  queryKey: ['admin-ai-tutor-stats'],
  queryFn: async () => {
    const [totalRes, activeRes] = await Promise.all([...]);
    return { total, active, platform, user };
  }
});

// 4 basic KPI cards (no trends)
<HubKPICard title="Total AI Tutors" value={stats?.total || 0} />

// 1 static chart (ownership breakdown)
<OwnershipBreakdownChart data={stats} />

// Placeholder for missing charts
<p>Additional charts will be added in Phase 2B...</p>
```

### **Target State (Phase 2B)**
```typescript
// Historical metrics with trends
const totalMetric = useAdminMetric({
  metric: 'ai_tutors_total',
  compareWith: 'last_month'
});

// 8 KPI cards with trend indicators
<HubKPICard
  title="Total AI Tutors"
  value={totalMetric.current || 0}
  change={totalMetric.change}
  trend={totalMetric.trend}
/>

// 4 charts (growth, sessions, revenue, ownership)
<AITutorGrowthChart />
<AITutorSessionsChart />
<AITutorRevenueChart />
<OwnershipBreakdownChart />
```

---

## 📊 **Metrics to Track**

### **8 KPI Metrics** (Daily Collection)

| Metric Name | Description | Query |
|-------------|-------------|-------|
| `ai_tutors_total` | Total AI tutors (all statuses) | `COUNT(*)` |
| `ai_tutors_active` | Published AI tutors only | `COUNT(*) WHERE status = 'published'` |
| `ai_tutors_platform` | Platform-owned tutors | `COUNT(*) WHERE is_platform_owned = true` |
| `ai_tutors_user` | User-created tutors | `COUNT(*) WHERE is_platform_owned = false` |
| `ai_tutor_sessions_total` | Total sessions across all tutors | `SUM(total_sessions)` |
| `ai_tutor_revenue_total` | Total revenue across all tutors | `SUM(total_revenue)` |
| `ai_tutor_avg_rating` | Average rating across all tutors | `AVG(avg_rating)` |
| `ai_tutor_subscriptions_active` | Active subscriptions to AI tutors | `COUNT(*) FROM subscriptions WHERE ...` |

### **3 Trend Charts** (7-Day Data)

| Chart | Metrics | Visualization |
|-------|---------|---------------|
| Growth Trend | Total, Active over time | Line chart |
| Session Activity | Daily sessions over time | Bar chart |
| Revenue Trend | Daily revenue over time | Area chart |

### **1 Static Chart**

| Chart | Metrics | Visualization |
|-------|---------|---------------|
| Ownership Breakdown | Platform vs User count | Donut chart |

---

## 🗄️ **Backend Implementation**

### **Step 1: Update Metrics Collection Script**

**File:** `tools/database/scripts/collect-platform-statistics.sql` (UPDATE)

**Add to existing daily aggregation:**

```sql
/*
 * AI Tutor Metrics Collection
 * Phase: 2B - Analytics Dashboard
 * Runs: Daily at midnight UTC via cron
 */

-- 1. Total AI Tutors
INSERT INTO platform_statistics_daily (date, metric_name, metric_value)
SELECT
  CURRENT_DATE,
  'ai_tutors_total',
  COUNT(*)
FROM ai_tutors
ON CONFLICT (date, metric_name)
DO UPDATE SET
  metric_value = EXCLUDED.metric_value,
  updated_at = NOW();

-- 2. Active AI Tutors (Published)
INSERT INTO platform_statistics_daily (date, metric_name, metric_value)
SELECT
  CURRENT_DATE,
  'ai_tutors_active',
  COUNT(*)
FROM ai_tutors
WHERE status = 'published'
ON CONFLICT (date, metric_name)
DO UPDATE SET
  metric_value = EXCLUDED.metric_value,
  updated_at = NOW();

-- 3. Platform-Owned AI Tutors
INSERT INTO platform_statistics_daily (date, metric_name, metric_value)
SELECT
  CURRENT_DATE,
  'ai_tutors_platform',
  COUNT(*)
FROM ai_tutors
WHERE is_platform_owned = true
ON CONFLICT (date, metric_name)
DO UPDATE SET
  metric_value = EXCLUDED.metric_value,
  updated_at = NOW();

-- 4. User-Created AI Tutors
INSERT INTO platform_statistics_daily (date, metric_name, metric_value)
SELECT
  CURRENT_DATE,
  'ai_tutors_user',
  COUNT(*)
FROM ai_tutors
WHERE is_platform_owned = false
ON CONFLICT (date, metric_name)
DO UPDATE SET
  metric_value = EXCLUDED.metric_value,
  updated_at = NOW();

-- 5. Total Sessions (Aggregate)
INSERT INTO platform_statistics_daily (date, metric_name, metric_value)
SELECT
  CURRENT_DATE,
  'ai_tutor_sessions_total',
  COALESCE(SUM(total_sessions), 0)
FROM ai_tutors
ON CONFLICT (date, metric_name)
DO UPDATE SET
  metric_value = EXCLUDED.metric_value,
  updated_at = NOW();

-- 6. Total Revenue (Aggregate)
INSERT INTO platform_statistics_daily (date, metric_name, metric_value)
SELECT
  CURRENT_DATE,
  'ai_tutor_revenue_total',
  COALESCE(SUM(total_revenue), 0)
FROM ai_tutors
ON CONFLICT (date, metric_name)
DO UPDATE SET
  metric_value = EXCLUDED.metric_value,
  updated_at = NOW();

-- 7. Average Rating (Across All Tutors)
INSERT INTO platform_statistics_daily (date, metric_name, metric_value)
SELECT
  CURRENT_DATE,
  'ai_tutor_avg_rating',
  COALESCE(AVG(avg_rating), 0)
FROM ai_tutors
WHERE avg_rating IS NOT NULL
ON CONFLICT (date, metric_name)
DO UPDATE SET
  metric_value = EXCLUDED.metric_value,
  updated_at = NOW();

-- 8. Active Subscriptions (To AI Tutors)
INSERT INTO platform_statistics_daily (date, metric_name, metric_value)
SELECT
  CURRENT_DATE,
  'ai_tutor_subscriptions_active',
  COUNT(DISTINCT s.id)
FROM subscriptions s
INNER JOIN ai_tutors at ON s.ai_tutor_id = at.id
WHERE s.status = 'active'
  AND s.cancelled_at IS NULL
ON CONFLICT (date, metric_name)
DO UPDATE SET
  metric_value = EXCLUDED.metric_value,
  updated_at = NOW();
```

---

### **Step 2: Backfill Historical Data (One-Time)**

**File:** `tools/database/scripts/backfill-ai-tutor-metrics.sql` (NEW)

```sql
/*
 * Backfill AI Tutor Metrics (One-Time Script)
 * Purpose: Populate historical data for the past 30 days
 * Run: Once before enabling analytics dashboard
 */

DO $$
DECLARE
  backfill_date DATE;
BEGIN
  -- Loop through past 30 days
  FOR backfill_date IN
    SELECT generate_series(
      CURRENT_DATE - INTERVAL '30 days',
      CURRENT_DATE - INTERVAL '1 day',
      '1 day'::INTERVAL
    )::DATE
  LOOP
    -- Note: This assumes ai_tutors doesn't have historical snapshots
    -- We'll use current counts as estimates for all dates
    -- For production, you may need time-travel queries or audit logs

    -- 1. Total AI Tutors (estimate)
    INSERT INTO platform_statistics_daily (date, metric_name, metric_value)
    SELECT backfill_date, 'ai_tutors_total', COUNT(*) FROM ai_tutors
    ON CONFLICT (date, metric_name) DO NOTHING;

    -- 2. Active AI Tutors (estimate)
    INSERT INTO platform_statistics_daily (date, metric_name, metric_value)
    SELECT backfill_date, 'ai_tutors_active', COUNT(*)
    FROM ai_tutors WHERE status = 'published'
    ON CONFLICT (date, metric_name) DO NOTHING;

    -- 3. Platform-Owned (estimate)
    INSERT INTO platform_statistics_daily (date, metric_name, metric_value)
    SELECT backfill_date, 'ai_tutors_platform', COUNT(*)
    FROM ai_tutors WHERE is_platform_owned = true
    ON CONFLICT (date, metric_name) DO NOTHING;

    -- 4. User-Created (estimate)
    INSERT INTO platform_statistics_daily (date, metric_name, metric_value)
    SELECT backfill_date, 'ai_tutors_user', COUNT(*)
    FROM ai_tutors WHERE is_platform_owned = false
    ON CONFLICT (date, metric_name) DO NOTHING;

    -- 5-8. Sessions, Revenue, Rating, Subscriptions (current snapshot)
    INSERT INTO platform_statistics_daily (date, metric_name, metric_value)
    SELECT backfill_date, 'ai_tutor_sessions_total', COALESCE(SUM(total_sessions), 0)
    FROM ai_tutors
    ON CONFLICT (date, metric_name) DO NOTHING;

    INSERT INTO platform_statistics_daily (date, metric_name, metric_value)
    SELECT backfill_date, 'ai_tutor_revenue_total', COALESCE(SUM(total_revenue), 0)
    FROM ai_tutors
    ON CONFLICT (date, metric_name) DO NOTHING;

    INSERT INTO platform_statistics_daily (date, metric_name, metric_value)
    SELECT backfill_date, 'ai_tutor_avg_rating', COALESCE(AVG(avg_rating), 0)
    FROM ai_tutors WHERE avg_rating IS NOT NULL
    ON CONFLICT (date, metric_name) DO NOTHING;

    INSERT INTO platform_statistics_daily (date, metric_name, metric_value)
    SELECT backfill_date, 'ai_tutor_subscriptions_active', COUNT(DISTINCT s.id)
    FROM subscriptions s
    INNER JOIN ai_tutors at ON s.ai_tutor_id = at.id
    WHERE s.status = 'active' AND s.cancelled_at IS NULL
    ON CONFLICT (date, metric_name) DO NOTHING;

  END LOOP;

  RAISE NOTICE 'Backfill complete for % days', 30;
END $$;

-- Verify backfill
SELECT
  metric_name,
  COUNT(*) as days_populated,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM platform_statistics_daily
WHERE metric_name LIKE 'ai_tutor%'
GROUP BY metric_name
ORDER BY metric_name;
```

---

### **Step 3: Update TypeScript Types**

**File:** `apps/web/src/types/admin.ts` (UPDATE)

**Add AI tutor metrics to MetricName union:**

```typescript
// Existing type (update this)
export type MetricName =
  // User metrics
  | 'users_total'
  | 'users_tutors'
  | 'users_students'
  | 'users_verified'
  // Listing metrics
  | 'listings_total'
  | 'listings_active'
  | 'listings_pending'
  | 'listings_verified'
  // Booking metrics
  | 'bookings_total'
  | 'bookings_completed'
  | 'bookings_revenue'
  // ↓ ADD AI TUTOR METRICS BELOW ↓
  | 'ai_tutors_total'
  | 'ai_tutors_active'
  | 'ai_tutors_platform'
  | 'ai_tutors_user'
  | 'ai_tutor_sessions_total'
  | 'ai_tutor_revenue_total'
  | 'ai_tutor_avg_rating'
  | 'ai_tutor_subscriptions_active';
```

---

## 🎨 **Frontend Implementation**

### **Step 1: Update Overview Tab Page**

**File:** `apps/web/src/app/(admin)/admin/ai-tutors/page.tsx`

**Replace current simplified implementation with full analytics:**

```typescript
'use client';

import { useState } from 'react';
import { useAdminProfile } from '@/lib/rbac';
import { useAdminMetric, useAdminTrendData } from '@/lib/hooks/useAdminMetrics';
import HubPageLayout from '@/app/components/admin/hub-layout/HubPageLayout';
import HubHeader from '@/app/components/admin/hub-layout/HubHeader';
import HubTabs from '@/app/components/admin/hub-layout/HubTabs';
import HubSidebar from '@/app/components/admin/hub-layout/HubSidebar';
import HubKPIGrid from '@/app/components/admin/hub-layout/HubKPIGrid';
import HubKPICard from '@/app/components/admin/hub-layout/HubKPICard';
import { ErrorBoundary } from '@/app/components/ui/feedback/ErrorBoundary';
import ChartSkeleton from '@/app/components/admin/charts/ChartSkeleton';

// Import chart components
import AITutorGrowthChart from './components/charts/AITutorGrowthChart';
import AITutorSessionsChart from './components/charts/AITutorSessionsChart';
import AITutorRevenueChart from './components/charts/AITutorRevenueChart';
import OwnershipBreakdownChart from './components/charts/OwnershipBreakdownChart';

// Import other tab components
import AITutorsTable from './components/AITutorsTable';
import AdminAITutorCreateTab from './components/AdminAITutorCreateTab';

// Hub widgets
import StatsWidget from '@/app/components/admin/hub-layout/widgets/StatsWidget';
import LimitsWidget from '@/app/components/admin/hub-layout/widgets/LimitsWidget';
import HelpWidget from '@/app/components/admin/hub-layout/widgets/HelpWidget';
import TipsWidget from '@/app/components/admin/hub-layout/widgets/TipsWidget';
import VideoWidget from '@/app/components/admin/hub-layout/widgets/VideoWidget';

export default function AdminAITutorsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const { profile, isLoading: profileLoading } = useAdminProfile();

  // ===== PHASE 2B: HISTORICAL METRICS =====
  // 8 KPI metrics with month-over-month comparison
  const totalMetric = useAdminMetric({
    metric: 'ai_tutors_total',
    compareWith: 'last_month'
  });

  const activeMetric = useAdminMetric({
    metric: 'ai_tutors_active',
    compareWith: 'last_month'
  });

  const platformMetric = useAdminMetric({
    metric: 'ai_tutors_platform',
    compareWith: 'last_month'
  });

  const userMetric = useAdminMetric({
    metric: 'ai_tutors_user',
    compareWith: 'last_month'
  });

  const sessionsMetric = useAdminMetric({
    metric: 'ai_tutor_sessions_total',
    compareWith: 'last_month'
  });

  const revenueMetric = useAdminMetric({
    metric: 'ai_tutor_revenue_total',
    compareWith: 'last_month'
  });

  const ratingMetric = useAdminMetric({
    metric: 'ai_tutor_avg_rating',
    compareWith: 'last_month'
  });

  const subscriptionsMetric = useAdminMetric({
    metric: 'ai_tutor_subscriptions_active',
    compareWith: 'last_month'
  });

  // 3 trend charts (7-day data)
  const growthTrend = useAdminTrendData({
    metrics: ['ai_tutors_total', 'ai_tutors_active'],
    days: 7
  });

  const sessionsTrend = useAdminTrendData({
    metrics: ['ai_tutor_sessions_total'],
    days: 7
  });

  const revenueTrend = useAdminTrendData({
    metrics: ['ai_tutor_revenue_total'],
    days: 7
  });

  // Loading states
  const isLoadingMetrics =
    totalMetric.isLoading ||
    activeMetric.isLoading ||
    platformMetric.isLoading ||
    userMetric.isLoading;

  const isLoadingCharts =
    growthTrend.isLoading ||
    sessionsTrend.isLoading ||
    revenueTrend.isLoading;

  if (profileLoading) {
    return <div>Loading...</div>;
  }

  if (!profile?.is_admin) {
    return <div>Access denied</div>;
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'all', label: 'All AI Tutors' },
    { id: 'create', label: 'Create New' },
  ];

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="AI Tutor Studio"
          subtitle="Manage platform-owned AI tutors, analytics, and marketplace control"
          actions={
            <button className="btn-primary">
              Create Platform AI Tutor
            </button>
          }
        />
      }
      tabs={<HubTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />}
      sidebar={
        <HubSidebar>
          <StatsWidget
            stats={[
              { label: 'Total AI Tutors', value: totalMetric.current || 0 },
              { label: 'Active Tutors', value: activeMetric.current || 0 },
              { label: 'Platform Tutors', value: platformMetric.current || 0 },
            ]}
          />
          <LimitsWidget
            limits={[
              {
                label: 'Platform Tutors',
                current: platformMetric.current || 0,
                max: 50,
                color: 'primary',
              },
            ]}
          />
          <HelpWidget
            title="AI Tutor Studio Help"
            items={[
              { label: 'Creating AI Tutors', href: '/docs/ai-tutors' },
              { label: 'Platform Policies', href: '/docs/platform' },
              { label: 'Pricing Guidelines', href: '/docs/pricing' },
            ]}
          />
          <TipsWidget
            tips={[
              'Platform tutors bypass CaaS limits',
              'Featured tutors appear on homepage',
              'Higher priority = better search placement',
            ]}
          />
          <VideoWidget
            title="AI Tutor Studio Tour"
            videoUrl="https://youtube.com/watch?v=..."
          />
        </HubSidebar>
      }
    >
      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Grid: 8 Cards with Trends */}
          <HubKPIGrid>
            <HubKPICard
              title="Total AI Tutors"
              value={totalMetric.current || 0}
              change={totalMetric.change}
              trend={totalMetric.trend}
              isLoading={isLoadingMetrics}
            />
            <HubKPICard
              title="Active Tutors"
              value={activeMetric.current || 0}
              change={activeMetric.change}
              trend={activeMetric.trend}
              isLoading={isLoadingMetrics}
            />
            <HubKPICard
              title="Platform Tutors"
              value={platformMetric.current || 0}
              change={platformMetric.change}
              trend={platformMetric.trend}
              isLoading={isLoadingMetrics}
            />
            <HubKPICard
              title="User Tutors"
              value={userMetric.current || 0}
              change={userMetric.change}
              trend={userMetric.trend}
              isLoading={isLoadingMetrics}
            />
            <HubKPICard
              title="Total Sessions"
              value={sessionsMetric.current || 0}
              change={sessionsMetric.change}
              trend={sessionsMetric.trend}
              isLoading={isLoadingMetrics}
            />
            <HubKPICard
              title="Total Revenue"
              value={`£${revenueMetric.current?.toFixed(2) || '0.00'}`}
              change={revenueMetric.change}
              trend={revenueMetric.trend}
              isLoading={isLoadingMetrics}
            />
            <HubKPICard
              title="Avg Rating"
              value={ratingMetric.current?.toFixed(2) || '0.00'}
              change={ratingMetric.change}
              trend={ratingMetric.trend}
              isLoading={isLoadingMetrics}
            />
            <HubKPICard
              title="Active Subscriptions"
              value={subscriptionsMetric.current || 0}
              change={subscriptionsMetric.change}
              trend={subscriptionsMetric.trend}
              isLoading={isLoadingMetrics}
            />
          </HubKPIGrid>

          {/* Charts Section: 3-Column + Full Width */}
          <div className="space-y-6">
            {/* Row 1: 3 Charts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ErrorBoundary fallback={<div>Failed to load chart</div>}>
                {isLoadingCharts ? (
                  <ChartSkeleton />
                ) : (
                  <AITutorGrowthChart data={growthTrend.data} />
                )}
              </ErrorBoundary>

              <ErrorBoundary fallback={<div>Failed to load chart</div>}>
                {isLoadingCharts ? (
                  <ChartSkeleton />
                ) : (
                  <AITutorSessionsChart data={sessionsTrend.data} />
                )}
              </ErrorBoundary>

              <ErrorBoundary fallback={<div>Failed to load chart</div>}>
                {isLoadingCharts ? (
                  <ChartSkeleton />
                ) : (
                  <AITutorRevenueChart data={revenueTrend.data} />
                )}
              </ErrorBoundary>
            </div>

            {/* Row 2: Full Width Chart */}
            <ErrorBoundary fallback={<div>Failed to load chart</div>}>
              <OwnershipBreakdownChart
                platform={platformMetric.current || 0}
                user={userMetric.current || 0}
              />
            </ErrorBoundary>
          </div>
        </div>
      )}

      {activeTab === 'all' && <AITutorsTable />}

      {activeTab === 'create' && <AdminAITutorCreateTab />}
    </HubPageLayout>
  );
}
```

---

### **Step 2: Create Chart Components**

**File:** `apps/web/src/app/(admin)/admin/ai-tutors/components/charts/AITutorGrowthChart.tsx` (NEW)

```typescript
'use client';

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface AITutorGrowthChartProps {
  data: Array<{ date: string; ai_tutors_total: number; ai_tutors_active: number }>;
}

export default function AITutorGrowthChart({ data }: AITutorGrowthChartProps) {
  const chartData = {
    labels: data.map((d) => new Date(d.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Total AI Tutors',
        data: data.map((d) => d.ai_tutors_total),
        borderColor: '#006c67',
        backgroundColor: 'rgba(0, 108, 103, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Active AI Tutors',
        data: data.map((d) => d.ai_tutors_active),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: true,
        text: 'AI Tutor Growth (7 Days)',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow" style={{ height: '300px' }}>
      <Line data={chartData} options={options} />
    </div>
  );
}
```

**File:** `apps/web/src/app/(admin)/admin/ai-tutors/components/charts/AITutorSessionsChart.tsx` (NEW)

```typescript
'use client';

import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface AITutorSessionsChartProps {
  data: Array<{ date: string; ai_tutor_sessions_total: number }>;
}

export default function AITutorSessionsChart({ data }: AITutorSessionsChartProps) {
  const chartData = {
    labels: data.map((d) => new Date(d.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Sessions',
        data: data.map((d) => d.ai_tutor_sessions_total),
        backgroundColor: '#3b82f6',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Session Activity (7 Days)',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow" style={{ height: '300px' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}
```

**File:** `apps/web/src/app/(admin)/admin/ai-tutors/components/charts/AITutorRevenueChart.tsx` (NEW)

```typescript
'use client';

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AITutorRevenueChartProps {
  data: Array<{ date: string; ai_tutor_revenue_total: number }>;
}

export default function AITutorRevenueChart({ data }: AITutorRevenueChartProps) {
  const chartData = {
    labels: data.map((d) => new Date(d.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Revenue (£)',
        data: data.map((d) => d.ai_tutor_revenue_total),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Revenue Trend (7 Days)',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: number) => `£${value.toFixed(0)}`,
        },
      },
    },
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow" style={{ height: '300px' }}>
      <Line data={chartData} options={options} />
    </div>
  );
}
```

**File:** `apps/web/src/app/(admin)/admin/ai-tutors/components/charts/OwnershipBreakdownChart.tsx` (UPDATE)

```typescript
'use client';

import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface OwnershipBreakdownChartProps {
  platform: number;
  user: number;
}

export default function OwnershipBreakdownChart({ platform, user }: OwnershipBreakdownChartProps) {
  const chartData = {
    labels: ['Platform Tutors', 'User Tutors'],
    datasets: [
      {
        data: [platform, user],
        backgroundColor: ['#006c67', '#10b981'],
        borderColor: ['#ffffff', '#ffffff'],
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: true,
        text: 'Ownership Breakdown',
      },
    },
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow" style={{ height: '300px' }}>
      <Doughnut data={chartData} options={options} />
    </div>
  );
}
```

---

## 🧪 **Testing Checklist**

### **Backend Testing**

**1. Metrics Collection:**
```sql
-- Manually run collection script
\i tools/database/scripts/collect-platform-statistics.sql

-- Verify all 8 metrics collected today
SELECT metric_name, metric_value, date
FROM platform_statistics_daily
WHERE date = CURRENT_DATE
AND metric_name LIKE 'ai_tutor%'
ORDER BY metric_name;

-- Expected: 8 rows (all metrics)
```

**2. Backfill Testing:**
```sql
-- Run backfill script
\i tools/database/scripts/backfill-ai-tutor-metrics.sql

-- Verify 30 days × 8 metrics = 240 rows
SELECT COUNT(*) FROM platform_statistics_daily
WHERE metric_name LIKE 'ai_tutor%'
AND date >= CURRENT_DATE - INTERVAL '30 days';

-- Expected: 240 rows (or 248 if including today)
```

**3. API Testing:**
```bash
# Test useAdminMetric endpoint
curl http://localhost:3000/api/admin/metrics?metric=ai_tutors_total&compareWith=last_month

# Expected: { current: X, previous: Y, change: Z, trend: "up"/"down" }

# Test useAdminTrendData endpoint
curl http://localhost:3000/api/admin/trends?metrics=ai_tutors_total,ai_tutors_active&days=7

# Expected: Array of 7 objects with dates and metric values
```

### **Frontend Testing**

**4. KPI Cards:**
- [ ] All 8 cards render without errors
- [ ] Values display correctly (not 0 unless truly 0)
- [ ] Trend indicators show (↑ up, ↓ down, → flat)
- [ ] Change percentages calculated correctly
- [ ] Loading states work (show skeleton)
- [ ] Error states handled gracefully

**5. Charts:**
- [ ] Growth chart renders with 2 lines (total, active)
- [ ] Sessions chart renders with bars
- [ ] Revenue chart renders with area fill
- [ ] Ownership chart renders as donut
- [ ] All charts show 7 days of data
- [ ] X-axis labels formatted correctly (MMM DD)
- [ ] Y-axis scales appropriately
- [ ] Tooltips work on hover
- [ ] Legends display correctly

**6. Real-Time Updates:**
```typescript
// Create a new AI tutor, then:
// 1. Wait 30 seconds (auto-refresh interval)
// 2. Verify "Total AI Tutors" increments by 1
// 3. Verify "Platform Tutors" increments by 1 (if platform-owned)
```

**7. Historical Comparison:**
```typescript
// Set yesterday's ai_tutors_total to 10
// Set today's ai_tutors_total to 12
// Expected: Card shows 12, +20%, ↑
```

---

## 🚀 **Deployment Plan**

### **Phase 1: Backend (Week 1)**
```bash
# Day 1: Add metrics collection
git add tools/database/scripts/collect-platform-statistics.sql
git commit -m "feat: Add AI tutor metrics collection (Phase 2B)"
git push origin main

# Day 2: Run backfill on production (after testing on staging)
psql -h production-host -U postgres -d production-db \
  -f tools/database/scripts/backfill-ai-tutor-metrics.sql

# Day 3-7: Collect real data (wait for 7 days)
```

### **Phase 2: Frontend (Week 2)**
```bash
# Day 8: Deploy frontend updates (after 7 days of data)
git add apps/web/src/app/\(admin\)/admin/ai-tutors/
git commit -m "feat: Enable Phase 2B analytics dashboard"
git push origin main

# Day 9: Monitor for errors
# - Check Sentry for chart errors
# - Verify all metrics loading
# - Test on mobile/tablet
```

---

## 📈 **Success Metrics**

**Week 1 (Backend):**
- [ ] All 8 metrics collected daily
- [ ] 7+ days of historical data available
- [ ] No collection script failures

**Week 2 (Frontend):**
- [ ] Overview tab loads in <2s
- [ ] All charts render without errors
- [ ] Admin uses dashboard 3+ times
- [ ] No regression in page performance

**Month 1:**
- [ ] 30+ days of trend data available
- [ ] Admin makes 1+ data-driven decision
- [ ] Metrics inform featuring/priority choices

---

## 🔗 **Related Documents**

- [Solution Design](./SOLUTION_DESIGN.md) - Overall architecture
- [Phase 2A: Featured](./PHASE_2A_FEATURED_IMPLEMENTATION.md) - Companion feature
- [Phase 2A: Priority](./PHASE_2A_PRIORITY_IMPLEMENTATION.md) - Companion feature

---

**Status:** ✅ Ready to Implement (After 7-day data collection)
**Last Updated:** 2026-02-25
**Version:** 1.0
