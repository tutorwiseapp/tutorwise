/**
 * Filename: src/app/(admin)/admin/ai-agents/components/SessionAnalyticsPanel.tsx
 * Purpose: Session analytics tab for AI Agents admin — DAU/WAU/MAU, session trends,
 *          status breakdown, peak hours/days, top agents, escalation rate
 * Created: 2026-03-16
 * Pattern: Adapted from Sage UsageAnalytics.tsx
 */
'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { HubKPIGrid, HubKPICard, HubTrendChart, HubCategoryBreakdownChart } from '@/components/hub/charts';
import type { CategoryData } from '@/components/hub/charts';
import ErrorBoundary from '@/components/ui/feedback/ErrorBoundary';
import { ChartSkeleton } from '@/components/ui/feedback/LoadingSkeleton';
import { Users, Clock, AlertTriangle, Activity } from 'lucide-react';
import styles from '../page.module.css';

// ── API response shape ──────────────────────────────────────────────
interface SessionAnalyticsData {
  activeUsers: { dau: number; wau: number; mau: number };
  avgDurationMinutes: number;
  totalSessionsLast30d: number;
  escalatedCount: number;
  escalationRate: number;
  dailyTrend: Array<{ label: string; value: number }>;
  peakHours: Array<{ hour: number; count: number }>;
  peakDays: Array<{ day: string; count: number }>;
  statusBreakdown: Array<{ label: string; value: number }>;
  topAgents: Array<{ id: string; name: string; sessions: number }>;
}

// ── Chart colour palettes ───────────────────────────────────────────
const STATUS_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
const PEAK_COLOR = '#3B82F6';

function humaniseStatus(raw: string): string {
  const map: Record<string, string> = {
    active: 'Active',
    completed: 'Completed',
    ended: 'Ended',
    abandoned: 'Abandoned',
    unknown: 'Unknown',
  };
  return map[raw] || raw.charAt(0).toUpperCase() + raw.slice(1);
}

// ── Component ───────────────────────────────────────────────────────
export default function SessionAnalyticsPanel() {
  const { data, isLoading, isError } = useQuery<SessionAnalyticsData>({
    queryKey: ['admin-ai-agents-sessions'],
    queryFn: async () => {
      const res = await fetch('/api/admin/ai-agents/analytics?type=sessions');
      if (!res.ok) throw new Error('Failed to fetch session analytics');
      return res.json();
    },
    staleTime: 30000,
  });

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

  if (isError || !data) {
    return (
      <div className={styles.fallbackMessage}>
        Unable to load session analytics. Please try again later.
      </div>
    );
  }

  // ── Derived chart data ──────────────────────────────────────────
  const statusData: CategoryData[] = data.statusBreakdown.map((s, i) => ({
    label: humaniseStatus(s.label),
    value: s.value,
    color: STATUS_COLORS[i % STATUS_COLORS.length],
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

  return (
    <>
      {/* KPI Cards */}
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
          label="Avg Duration"
          value={`${data.avgDurationMinutes.toFixed(1)} min`}
          sublabel={`${data.totalSessionsLast30d.toLocaleString()} sessions (30d)`}
          icon={Clock}
        />
        <HubKPICard
          label="Escalation Rate"
          value={`${data.escalationRate}%`}
          sublabel={`${data.escalatedCount} escalated to human`}
          icon={AlertTriangle}
        />
        <HubKPICard
          label="Sessions (30d)"
          value={data.totalSessionsLast30d.toLocaleString()}
          icon={Activity}
        />
      </HubKPIGrid>

      {/* Charts */}
      <div className={styles.chartsSection}>
        {/* Session Trend — last 30 days */}
        <ErrorBoundary fallback={<div className={styles.fallbackMessage}>Unable to load session trend chart</div>}>
          <HubTrendChart
            data={data.dailyTrend}
            title="Session Trend"
            subtitle="Last 30 days"
            valueName="Sessions"
            lineColor="#3B82F6"
          />
        </ErrorBoundary>

        {/* Status Breakdown */}
        <ErrorBoundary fallback={<div className={styles.fallbackMessage}>Unable to load status breakdown</div>}>
          <HubCategoryBreakdownChart
            data={statusData}
            title="Session Status"
            subtitle="Completion vs abandonment"
          />
        </ErrorBoundary>

        {/* Peak Hours */}
        <ErrorBoundary fallback={<div className={styles.fallbackMessage}>Unable to load peak hours</div>}>
          <HubCategoryBreakdownChart
            data={peakHoursData}
            title="Sessions by Hour"
            subtitle="UTC hour distribution"
          />
        </ErrorBoundary>

        {/* Peak Days */}
        <ErrorBoundary fallback={<div className={styles.fallbackMessage}>Unable to load peak days</div>}>
          <HubCategoryBreakdownChart
            data={peakDaysData}
            title="Sessions by Day"
            subtitle="Weekly distribution"
          />
        </ErrorBoundary>

        {/* Top Agents by Sessions */}
        {data.topAgents.length > 0 && (
          <div>
            <h2 className={styles.placeholderTitle} style={{ textAlign: 'left', color: 'var(--color-text-primary, #1e293b)' }}>
              Top Agents by Sessions
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {data.topAgents.map((agent) => (
                <div
                  key={agent.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.625rem 0.75rem',
                    borderBottom: '1px solid var(--color-border-light, #f1f5f9)',
                  }}
                >
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary, #1e293b)' }}>
                    {agent.name}
                  </span>
                  <span style={{
                    display: 'inline-block',
                    minWidth: '2.5rem',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textAlign: 'center',
                    color: '#1e40af',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                  }}>
                    {agent.sessions}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
