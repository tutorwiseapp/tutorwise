/*
 * Filename: src/app/(admin)/admin/sage/components/UsageAnalytics.tsx
 * Purpose: Usage Analytics tab for Sage admin — DAU/WAU/MAU, session trends,
 *          provider & level breakdowns, peak hours/days
 * Created: 2026-03-16
 */
'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { HubKPIGrid, HubKPICard, HubTrendChart, HubCategoryBreakdownChart } from '@/components/hub/charts';
import type { CategoryData } from '@/components/hub/charts';
import ErrorBoundary from '@/components/ui/feedback/ErrorBoundary';
import { ChartSkeleton } from '@/components/ui/feedback/LoadingSkeleton';
import { Users, MessageSquare, Activity, Clock } from 'lucide-react';
import styles from '../page.module.css';

// ── API response shape ──────────────────────────────────────────────
interface UsageAnalyticsData {
  activeUsers: { dau: number; wau: number; mau: number };
  avgQuestionsPerSession: number;
  totalSessionsLast30d: number;
  dailyTrend: Array<{ label: string; value: number }>;
  peakHours: Array<{ hour: number; count: number }>;
  peakDays: Array<{ day: string; count: number }>;
  providerBreakdown: Array<{ label: string; value: number }>;
  levelBreakdown: Array<{ label: string; value: number }>;
}

// ── Provider display-name map ───────────────────────────────────────
const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  'grok-4-fast': 'Grok 4 Fast',
  'gemini-flash': 'Gemini Flash',
  'deepseek-r1': 'DeepSeek R1',
  'claude-sonnet': 'Claude Sonnet',
  'gpt-4o': 'GPT-4o',
};

function humaniseProvider(raw: string): string {
  if (PROVIDER_DISPLAY_NAMES[raw]) return PROVIDER_DISPLAY_NAMES[raw];
  // Title-case fallback: "some-provider" → "Some Provider"
  return raw
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ── Chart colour palettes ───────────────────────────────────────────
const PROVIDER_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4'];
const LEVEL_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899'];
const PEAK_COLOR = '#3B82F6';

// ── Component ───────────────────────────────────────────────────────
export default function UsageAnalytics() {
  const { data, isLoading, isError } = useQuery<UsageAnalyticsData>({
    queryKey: ['admin-sage-usage'],
    queryFn: async () => {
      const res = await fetch('/api/admin/sage/analytics?type=usage');
      if (!res.ok) throw new Error('Failed to fetch usage analytics');
      return res.json();
    },
    staleTime: 30000,
  });

  // ── Loading state ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <>
        <ChartSkeleton height="120px" />
        <div className={styles.chartsSection}>
          <ChartSkeleton height="320px" />
          <ChartSkeleton height="320px" />
        </div>
      </>
    );
  }

  // ── Error state ─────────────────────────────────────────────────
  if (isError || !data) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
        Unable to load usage analytics. Please try again later.
      </div>
    );
  }

  // ── Derived chart data ──────────────────────────────────────────
  const providerData: CategoryData[] = data.providerBreakdown.map((p, i) => ({
    label: humaniseProvider(p.label),
    value: p.value,
    color: PROVIDER_COLORS[i % PROVIDER_COLORS.length],
  }));

  const levelData: CategoryData[] = data.levelBreakdown.map((l, i) => ({
    label: l.label,
    value: l.value,
    color: LEVEL_COLORS[i % LEVEL_COLORS.length],
  }));

  const peakHoursData: CategoryData[] = data.peakHours.map((h) => ({
    label: `${String(h.hour).padStart(2, '0')}:00`,
    value: h.count,
    color: PEAK_COLOR,
  }));

  const peakDaysData: CategoryData[] = data.peakDays.map((d) => ({
    label: d.day,
    value: d.count,
    color: PEAK_COLOR,
  }));

  // ── Render ──────────────────────────────────────────────────────
  return (
    <>
      {/* KPI Cards — Active Users */}
      <HubKPIGrid>
        <HubKPICard
          label="Daily Active Users"
          value={data.activeUsers.dau}
          sublabel="Last 24 hours"
          icon={Users}
        />
        <HubKPICard
          label="Weekly Active Users"
          value={data.activeUsers.wau}
          sublabel="Last 7 days"
          icon={Users}
        />
        <HubKPICard
          label="Monthly Active Users"
          value={data.activeUsers.mau}
          sublabel="Last 30 days"
          icon={Users}
        />
        <HubKPICard
          label="Avg Questions/Session"
          value={data.avgQuestionsPerSession.toFixed(1)}
          sublabel={`${data.totalSessionsLast30d.toLocaleString()} sessions (30d)`}
          icon={MessageSquare}
        />
      </HubKPIGrid>

      {/* Charts */}
      <div className={styles.chartsSection}>
        {/* Session Trend — last 30 days */}
        <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load session trend chart</div>}>
          <HubTrendChart
            data={data.dailyTrend}
            title="Session Trend"
            subtitle="Last 30 days"
            valueName="Sessions"
            lineColor="#3B82F6"
          />
        </ErrorBoundary>

        {/* Provider Breakdown */}
        <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load provider breakdown chart</div>}>
          <h2 className={styles.sectionHeading}>Provider Breakdown</h2>
          <HubCategoryBreakdownChart
            data={providerData}
            title="AI Provider Usage"
            subtitle="Requests handled by provider"
          />
        </ErrorBoundary>

        {/* Level Breakdown */}
        <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load level breakdown chart</div>}>
          <h2 className={styles.sectionHeading}>Level Breakdown</h2>
          <HubCategoryBreakdownChart
            data={levelData}
            title="Curriculum Level Distribution"
            subtitle="Sessions by curriculum level"
          />
        </ErrorBoundary>

        {/* Peak Hours */}
        <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load peak hours chart</div>}>
          <h2 className={styles.sectionHeading}>Peak Hours</h2>
          <HubCategoryBreakdownChart
            data={peakHoursData}
            title="Sessions by Hour of Day"
            subtitle="UTC hour distribution"
          />
        </ErrorBoundary>

        {/* Peak Days */}
        <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load peak days chart</div>}>
          <h2 className={styles.sectionHeading}>Peak Days</h2>
          <HubCategoryBreakdownChart
            data={peakDaysData}
            title="Sessions by Day of Week"
            subtitle="Weekly distribution"
          />
        </ErrorBoundary>
      </div>
    </>
  );
}
