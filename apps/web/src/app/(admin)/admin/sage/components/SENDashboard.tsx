/*
 * Filename: src/app/(admin)/admin/sage/components/SENDashboard.tsx
 * Purpose: SEN (Special Educational Needs) analytics dashboard for Sage admin.
 *          Shows aggregate SEN usage data in compliance with UK GDPR Children's Code.
 * Created: 2026-03-16
 */
'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { HubKPIGrid, HubKPICard, HubCategoryBreakdownChart } from '@/components/hub/charts';
import type { CategoryData } from '@/components/hub/charts';
import HubEmptyState from '@/components/hub/content/HubEmptyState';
import ErrorBoundary from '@/components/ui/feedback/ErrorBoundary';
import { ChartSkeleton } from '@/components/ui/feedback/LoadingSkeleton';
import { Users, Shield, Info } from 'lucide-react';
import styles from '../page.module.css';

// ── API response shape ──────────────────────────────────────────────
interface SENAnalyticsData {
  totalSENUsers: number;
  totalSENSessions: number;
  totalSENMessages: number;
  percentageOfSessions: number;
  categoryBreakdown: Array<{ category: string; sessionCount: number }>;
  avgMessagesPerSENSession: number;
}

// ── SEN category display-name map ───────────────────────────────────
const SEN_CATEGORY_NAMES: Record<string, string> = {
  'dyslexia': 'Dyslexia',
  'dyscalculia': 'Dyscalculia',
  'adhd': 'ADHD',
  'asd': 'Autism Spectrum',
  'visual-impairment': 'Visual Impairment',
  'hearing-impairment': 'Hearing Impairment',
  'speech-language': 'Speech & Language',
  'social-emotional': 'SEMH',
  'moderate-learning': 'Moderate Learning',
  'specific-learning': 'Specific Learning',
  'dyspraxia': 'Dyspraxia',
};

function humaniseSENCategory(slug: string): string {
  return SEN_CATEGORY_NAMES[slug] || slug
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ── Chart colour palette ────────────────────────────────────────────
const SEN_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444',
  '#06B6D4', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
];

// ── Component ───────────────────────────────────────────────────────
export default function SENDashboard() {
  const { data, isLoading, isError } = useQuery<SENAnalyticsData>({
    queryKey: ['admin-sage-sen'],
    queryFn: async () => {
      const res = await fetch('/api/admin/sage/analytics?type=sen');
      if (!res.ok) throw new Error('Failed to fetch SEN analytics');
      return res.json();
    },
    staleTime: 30000,
  });

  // ── Loading state ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <>
        <ChartSkeleton height="120px" />
        <div className={styles.chartsSection}>
          <ChartSkeleton height="320px" />
        </div>
      </>
    );
  }

  // ── Error state ───────────────────────────────────────────────────
  if (isError || !data) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
        Unable to load SEN analytics. Please try again later.
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────
  if (data.totalSENUsers === 0) {
    return (
      <HubEmptyState
        title="No SEN Data"
        description="No SEN profiles active yet. SEN support is configured per student in their learning profile."
        icon={<Shield size={32} />}
      />
    );
  }

  // ── Derived chart data ────────────────────────────────────────────
  const categoryData: CategoryData[] = data.categoryBreakdown.map((c, i) => ({
    label: humaniseSENCategory(c.category),
    value: c.sessionCount,
    color: SEN_COLORS[i % SEN_COLORS.length],
  }));

  // ── Render ────────────────────────────────────────────────────────
  return (
    <>
      {/* KPI Cards */}
      <HubKPIGrid>
        <HubKPICard
          label="Total SEN Users"
          value={data.totalSENUsers.toLocaleString()}
          icon={Users}
        />
        <HubKPICard
          label="Total SEN Sessions"
          value={data.totalSENSessions.toLocaleString()}
          icon={Shield}
        />
        <HubKPICard
          label="% of All Sessions"
          value={`${data.percentageOfSessions.toFixed(1)}%`}
          sublabel="SEN proportion"
        />
        <HubKPICard
          label="Avg Messages/SEN Session"
          value={data.avgMessagesPerSENSession.toFixed(1)}
          sublabel={`${data.totalSENMessages.toLocaleString()} total messages`}
        />
      </HubKPIGrid>

      {/* Category Breakdown */}
      <div className={styles.chartsSection}>
        <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load SEN category breakdown</div>}>
          <h2 className={styles.sectionHeading}>SEN Category Breakdown</h2>
          <HubCategoryBreakdownChart
            data={categoryData}
            title="Sessions by SEN Category"
            subtitle="Distribution of sessions across SEN categories"
          />
        </ErrorBoundary>
      </div>

      {/* GDPR Privacy Notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          marginTop: '1.5rem',
          padding: '1rem 1.25rem',
          background: 'var(--color-background-subtle, #f8f9fa)',
          border: '1px solid var(--color-border-light, #e2e8f0)',
          borderRadius: '8px',
          fontSize: '0.8125rem',
          color: 'var(--color-text-secondary, #64748b)',
          lineHeight: 1.5,
        }}
      >
        <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
        <span>
          SEN data shown in aggregate only. Individual student SEN categories are
          not displayed in compliance with UK GDPR Children&apos;s Code.
        </span>
      </div>
    </>
  );
}
