/**
 * Filename: AnalyticsTab.tsx
 * Purpose: AI Tutor Analytics - Charts, stats, fallback tracking
 * Created: 2026-02-23
 * Version: v1.1 (Phase 2)
 * Updated: 2026-02-24 - Added session heatmap and skill performance analytics
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
  skillPerformance: {
    skill_name: string;
    session_count: number;
    avg_rating: number;
    review_count: number;
    escalation_rate: number;
    total_revenue: number;
  }[];
  heatmap: { date: string; count: number }[];
}

export default function AnalyticsTab({ aiAgentId }: { aiAgentId: string }) {
  const [period, setPeriod] = useState('30d');

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['ai-tutor-analytics', aiAgentId, period],
    queryFn: async () => {
      const res = await fetch(`/api/ai-agents/${aiAgentId}/analytics?period=${period}`);
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

  // Generate heatmap calendar (last 90 days)
  const renderHeatmap = () => {
    const heatmapMap = new Map(
      (analytics?.heatmap || []).map((h) => [h.date, h.count])
    );

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 89); // 90 days including today

    const weeks: { date: Date; count: number }[][] = [];
    let currentWeek: { date: Date; count: number }[] = [];

    // Start from the first day of the week containing startDate
    const firstDay = new Date(startDate);
    const dayOfWeek = firstDay.getDay();
    firstDay.setDate(firstDay.getDate() - dayOfWeek);

    for (let i = 0; i < 98; i++) {
      // ~14 weeks
      const date = new Date(firstDay);
      date.setDate(firstDay.getDate() + i);

      const dateKey = date.toISOString().split('T')[0];
      const count = date <= today ? (heatmapMap.get(dateKey) || 0) : -1; // -1 for future dates

      currentWeek.push({ date, count });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return (
      <div className={styles.heatmap}>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className={styles.heatmapWeek}>
            {week.map((day, dayIndex) => {
              let colorClass = styles.heatmapEmpty;
              if (day.count === -1) {
                colorClass = styles.heatmapFuture;
              } else if (day.count > 0) {
                const level = Math.min(4, Math.ceil(day.count / 2));
                colorClass = styles[`heatmapLevel${level}`];
              }

              return (
                <div
                  key={dayIndex}
                  className={`${styles.heatmapDay} ${colorClass}`}
                  title={`${day.date.toLocaleDateString()}: ${day.count >= 0 ? `${day.count} sessions` : 'Future'}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    );
  };

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

      {/* Session Heatmap */}
      <div className={styles.section}>
        <h3>Session Activity (Last 90 Days)</h3>
        <p className={styles.heatmapHint}>Darker colors indicate more sessions</p>
        {renderHeatmap()}
      </div>

      {/* Skill Performance */}
      {analytics?.skillPerformance && analytics.skillPerformance.length > 0 && (
        <div className={styles.section}>
          <h3>Skill Performance</h3>
          <div className={styles.skillTable}>
            <div className={styles.skillTableHeader}>
              <span className={styles.skillNameCol}>Skill</span>
              <span className={styles.skillStatCol}>Sessions</span>
              <span className={styles.skillStatCol}>Avg Rating</span>
              <span className={styles.skillStatCol}>Escalation %</span>
              <span className={styles.skillStatCol}>Revenue</span>
            </div>
            {analytics.skillPerformance
              .filter((skill) => skill.session_count > 0)
              .map((skill) => (
                <div key={skill.skill_name} className={styles.skillTableRow}>
                  <span className={styles.skillNameCol}>{skill.skill_name}</span>
                  <span className={styles.skillStatCol}>{skill.session_count}</span>
                  <span className={styles.skillStatCol}>
                    {skill.avg_rating > 0 ? skill.avg_rating.toFixed(1) : 'N/A'}
                  </span>
                  <span className={styles.skillStatCol}>
                    {skill.escalation_rate.toFixed(1)}%
                  </span>
                  <span className={styles.skillStatCol}>
                    £{Number(skill.total_revenue).toFixed(2)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

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
            const maxCount = Math.max(...(analytics?.ratings || []).map((x) => x.count), 1);
            return (
              <div key={r.stars} className={styles.ratingRow}>
                <span className={styles.starLabel}>
                  {r.stars} star{r.stars !== 1 ? 's' : ''}
                </span>
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
              const max = Math.max(...analytics!.sessions.slice(-14).map((x) => x.count), 1);
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

      {/* Revenue Trend */}
      <div className={styles.section}>
        <h3>Revenue Trend</h3>
        {(analytics?.revenue || []).length > 0 ? (
          <div className={styles.miniChart}>
            {analytics!.revenue.slice(-14).map((r, i) => {
              const max = Math.max(...analytics!.revenue.slice(-14).map((x) => x.amount), 1);
              return (
                <div key={i} className={styles.barContainer}>
                  <div
                    className={styles.bar}
                    style={{
                      height: `${Math.max((r.amount / max) * 100, 2)}%`,
                      backgroundColor: '#0d9488',
                    }}
                    title={`${r.date}: £${r.amount.toFixed(2)}`}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <p className={styles.noData}>No revenue data available yet.</p>
        )}
      </div>
    </div>
  );
}
