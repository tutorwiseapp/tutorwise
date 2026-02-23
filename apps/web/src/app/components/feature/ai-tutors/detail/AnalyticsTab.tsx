/**
 * Filename: AnalyticsTab.tsx
 * Purpose: AI Tutor Analytics - Charts, stats, fallback tracking
 * Created: 2026-02-23
 * Version: v1.0
 */

'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useState } from 'react';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import styles from './AnalyticsTab.module.css';

interface AnalyticsData {
  summary: {
    total_sessions: number;
    total_revenue: number;
    avg_rating: number | null;
    total_reviews: number;
    sage_fallback_count: number;
    period_sessions: number;
    period_revenue: number;
  };
  sessions: { date: string; count: number }[];
  revenue: { date: string; amount: number }[];
  ratings: { stars: number; count: number }[];
}

export default function AnalyticsTab({ aiTutorId }: { aiTutorId: string }) {
  const [period, setPeriod] = useState('30d');

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['ai-tutor-analytics', aiTutorId, period],
    queryFn: async () => {
      const res = await fetch(`/api/ai-tutors/${aiTutorId}/analytics?period=${period}`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 2,
  });

  if (isLoading) {
    return <div className={styles.loading}>Loading analytics...</div>;
  }

  const summary = analytics?.summary;

  return (
    <div className={styles.container}>
      {/* Period Selector */}
      <div className={styles.periodSelector}>
        <UnifiedSelect
          value={period}
          onChange={(v) => setPeriod(String(v))}
          options={[
            { value: '7d', label: 'Last 7 days' },
            { value: '30d', label: 'Last 30 days' },
            { value: '90d', label: 'Last 90 days' },
          ]}
          placeholder="Period"
        />
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Total Sessions</span>
          <span className={styles.summaryValue}>{summary?.total_sessions ?? 0}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Total Revenue</span>
          <span className={styles.summaryValue}>£{(summary?.total_revenue ?? 0).toFixed(2)}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Avg Rating</span>
          <span className={styles.summaryValue}>
            {summary?.avg_rating ? summary.avg_rating.toFixed(1) : 'N/A'}
          </span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Reviews</span>
          <span className={styles.summaryValue}>{summary?.total_reviews ?? 0}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Period Sessions</span>
          <span className={styles.summaryValue}>{summary?.period_sessions ?? 0}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Period Revenue</span>
          <span className={styles.summaryValue}>£{(summary?.period_revenue ?? 0).toFixed(2)}</span>
        </div>
      </div>

      {/* Sage Fallback Indicator */}
      <div className={styles.section}>
        <h3>Sage Fallback Usage</h3>
        <p className={styles.fallbackCount}>
          {summary?.sage_fallback_count ?? 0} times Sage general knowledge was used as fallback
        </p>
        <p className={styles.fallbackHint}>
          Upload more materials to reduce Sage fallback usage and improve answer quality.
        </p>
      </div>

      {/* Rating Distribution */}
      <div className={styles.section}>
        <h3>Rating Distribution</h3>
        <div className={styles.ratingBars}>
          {(analytics?.ratings || []).reverse().map((r) => {
            const maxCount = Math.max(...(analytics?.ratings || []).map(x => x.count), 1);
            return (
              <div key={r.stars} className={styles.ratingRow}>
                <span className={styles.starLabel}>{r.stars} star{r.stars !== 1 ? 's' : ''}</span>
                <div className={styles.ratingBarTrack}>
                  <div
                    className={styles.ratingBarFill}
                    style={{ width: `${(r.count / maxCount) * 100}%` }}
                  />
                </div>
                <span className={styles.ratingCount}>{r.count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Session Trend */}
      <div className={styles.section}>
        <h3>Session Trend</h3>
        {(analytics?.sessions || []).length > 0 ? (
          <div className={styles.miniChart}>
            {analytics!.sessions.slice(-14).map((s, i) => {
              const max = Math.max(...analytics!.sessions.slice(-14).map(x => x.count), 1);
              return (
                <div key={i} className={styles.barContainer}>
                  <div
                    className={styles.bar}
                    style={{ height: `${Math.max((s.count / max) * 100, 2)}%` }}
                    title={`${s.date}: ${s.count} sessions`}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <p className={styles.noData}>No session data available yet.</p>
        )}
      </div>
    </div>
  );
}
