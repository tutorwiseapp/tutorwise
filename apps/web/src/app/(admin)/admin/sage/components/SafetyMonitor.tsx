/*
 * Filename: src/app/(admin)/admin/sage/components/SafetyMonitor.tsx
 * Purpose: Safeguarding event monitor for Sage admin — tracks input blocks,
 *          output rewrites, wellbeing alerts, and age violations.
 * Created: 2026-03-16
 */
'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { HubKPIGrid, HubKPICard, HubTrendChart, HubCategoryBreakdownChart } from '@/components/hub/charts';
import type { CategoryData } from '@/components/hub/charts';
import HubEmptyState from '@/components/hub/content/HubEmptyState';
import ErrorBoundary from '@/components/ui/feedback/ErrorBoundary';
import { ChartSkeleton } from '@/components/ui/feedback/LoadingSkeleton';
import { AlertTriangle, Shield, Eye } from 'lucide-react';
import pageStyles from '../page.module.css';
import styles from './SafetyMonitor.module.css';

// ── API response shape ──────────────────────────────────────────────
interface SafetyEvent {
  id: string;
  eventType: string;
  severity: string;
  category: string;
  createdAt: string;
  sessionId: string;
  details: Record<string, unknown>;
}

interface SafetyAnalyticsData {
  totalEvents: number;
  severityCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  typeCounts: Record<string, number>;
  dailyTrend: Array<{ label: string; value: number }>;
  recentEvents: SafetyEvent[];
}

// ── Event type display-name map ─────────────────────────────────────
const EVENT_TYPE_NAMES: Record<string, string> = {
  'input_blocked': 'Input Blocked',
  'output_rewritten': 'Output Rewritten',
  'wellbeing_alert': 'Wellbeing Alert',
  'age_violation': 'Age Violation',
};

function humaniseEventType(raw: string): string {
  return EVENT_TYPE_NAMES[raw] || raw
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ── Chart colour palettes ───────────────────────────────────────────
const TYPE_COLORS = ['#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6'];

// ── Severity styling ────────────────────────────────────────────────
function severityClass(severity: string): string {
  switch (severity) {
    case 'high': return styles.severityHigh;
    case 'medium': return styles.severityMedium;
    case 'low': return styles.severityLow;
    default: return '';
  }
}

// ── Component ───────────────────────────────────────────────────────
export default function SafetyMonitor() {
  const { data, isLoading, isError } = useQuery<SafetyAnalyticsData>({
    queryKey: ['admin-sage-safety'],
    queryFn: async () => {
      const res = await fetch('/api/admin/sage/analytics?type=safety');
      if (!res.ok) throw new Error('Failed to fetch safety analytics');
      return res.json();
    },
    staleTime: 30000,
  });

  // ── Loading state ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <>
        <ChartSkeleton height="120px" />
        <div className={pageStyles.chartsSection}>
          <ChartSkeleton height="320px" />
          <ChartSkeleton height="320px" />
        </div>
      </>
    );
  }

  // ── Error state ───────────────────────────────────────────────────
  if (isError || !data) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
        Unable to load safety analytics. Please try again later.
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────
  if (data.totalEvents === 0) {
    return (
      <HubEmptyState
        title="No Safety Events"
        description="No safeguarding events recorded. Events will appear here when the safety system flags content."
        icon={<Shield size={32} />}
      />
    );
  }

  // ── Derived chart data ────────────────────────────────────────────
  const highCount = data.severityCounts['high'] ?? 0;
  const todayLabel = new Date().toISOString().slice(0, 10);
  const eventsToday = data.dailyTrend.find((d) => d.label === todayLabel)?.value ?? 0;

  const typeData: CategoryData[] = Object.entries(data.typeCounts).map(([type, count], i) => ({
    label: humaniseEventType(type),
    value: count,
    color: TYPE_COLORS[i % TYPE_COLORS.length],
  }));

  // ── Render ────────────────────────────────────────────────────────
  return (
    <>
      {/* KPI Cards */}
      <HubKPIGrid>
        <HubKPICard
          label="Total Events"
          value={data.totalEvents.toLocaleString()}
          icon={AlertTriangle}
        />
        <HubKPICard
          label="High Severity"
          value={highCount.toLocaleString()}
          variant="warning"
          icon={AlertTriangle}
        />
        <HubKPICard
          label="Events Today"
          value={eventsToday.toLocaleString()}
          icon={Eye}
        />
      </HubKPIGrid>

      <div className={pageStyles.chartsSection}>
        {/* Event Type Breakdown */}
        <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load event type breakdown</div>}>
          <h2 className={pageStyles.sectionHeading}>Event Type Breakdown</h2>
          <HubCategoryBreakdownChart
            data={typeData}
            title="Events by Type"
            subtitle="Distribution across safeguarding event types"
          />
        </ErrorBoundary>

        {/* Severity Breakdown */}
        <div>
          <h2 className={pageStyles.sectionHeading}>Severity Breakdown</h2>
          <div className={styles.severityBadges}>
            <span className={styles.severityLow}>
              Low: {(data.severityCounts['low'] ?? 0).toLocaleString()}
            </span>
            <span className={styles.severityMedium}>
              Medium: {(data.severityCounts['medium'] ?? 0).toLocaleString()}
            </span>
            <span className={styles.severityHigh}>
              High: {(data.severityCounts['high'] ?? 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Daily Trend */}
        <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load trend chart</div>}>
          <HubTrendChart
            data={data.dailyTrend}
            title="Safety Events Trend"
            subtitle="Last 30 days"
            valueName="Events"
            lineColor="#EF4444"
          />
        </ErrorBoundary>

        {/* Recent Events Table */}
        <div>
          <h2 className={pageStyles.sectionHeading}>Recent Events</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.eventsTable}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Category</th>
                  <th>Session ID</th>
                </tr>
              </thead>
              <tbody>
                {data.recentEvents.map((event) => (
                  <tr key={event.id}>
                    <td>{new Date(event.createdAt).toLocaleString()}</td>
                    <td>{humaniseEventType(event.eventType)}</td>
                    <td>
                      <span className={severityClass(event.severity)}>
                        {event.severity}
                      </span>
                    </td>
                    <td>{event.category}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {event.sessionId.slice(0, 8)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
