/**
 * Filename: src/app/(admin)/admin/ai-agents/components/QualityPanel.tsx
 * Purpose: Quality & ratings analytics tab for AI Agents admin — rating distribution,
 *          top/bottom performers, recent feedback, completion rate
 * Created: 2026-03-16
 * Pattern: Adapted from Sage OutcomesPanel.tsx
 */
'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { HubKPIGrid, HubKPICard, HubTrendChart, HubCategoryBreakdownChart } from '@/components/hub/charts';
import type { CategoryData } from '@/components/hub/charts';
import HubEmptyState from '@/components/hub/content/HubEmptyState';
import ErrorBoundary from '@/components/ui/feedback/ErrorBoundary';
import { ChartSkeleton } from '@/components/ui/feedback/LoadingSkeleton';
import { Star, ThumbsDown, CheckCircle, MessageSquare, TrendingUp } from 'lucide-react';
import styles from '../page.module.css';

// ── API response shape ──────────────────────────────────────────────
interface QualityData {
  totalRatings: number;
  avgRating: number;
  lowRatingPercent: number;
  completionRate: number;
  distribution: number[]; // [1-star, 2-star, 3-star, 4-star, 5-star]
  ratingTrend: Array<{ label: string; value: number }>;
  topRated: Array<{ id: string; name: string; avgRating: number; ratingCount: number; feedbackCount: number }>;
  bottomRated: Array<{ id: string; name: string; avgRating: number; ratingCount: number; feedbackCount: number }>;
  recentFeedback: Array<{ agentId: string; agentName: string; rating: number; feedback: string; createdAt: string }>;
}

// ── Chart colours ───────────────────────────────────────────────────
const RATING_COLORS = ['#EF4444', '#F97316', '#F59E0B', '#10B981', '#059669'];

function renderStars(rating: number): string {
  const full = Math.round(rating);
  return '\u2605'.repeat(full) + '\u2606'.repeat(5 - full);
}

// ── Component ───────────────────────────────────────────────────────
export default function QualityPanel() {
  const { data, isLoading, isError } = useQuery<QualityData>({
    queryKey: ['admin-ai-agents-quality'],
    queryFn: async () => {
      const res = await fetch('/api/admin/ai-agents/analytics?type=quality');
      if (!res.ok) throw new Error('Failed to fetch quality analytics');
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
        Unable to load quality analytics. Please try again later.
      </div>
    );
  }

  if (data.totalRatings === 0) {
    return (
      <HubEmptyState
        title="No Ratings Yet"
        description="No AI agent ratings have been submitted yet. Quality data will populate as students rate their sessions."
        icon={<Star size={32} />}
      />
    );
  }

  // ── Derived chart data ──────────────────────────────────────────
  const distributionData: CategoryData[] = data.distribution.map((count, i) => ({
    label: `${i + 1} Star${i === 0 ? '' : 's'}`,
    value: count,
    color: RATING_COLORS[i],
  }));

  return (
    <>
      {/* KPI Cards */}
      <HubKPIGrid>
        <HubKPICard
          label="Average Rating"
          value={`${data.avgRating.toFixed(1)} / 5`}
          sublabel={`${data.totalRatings.toLocaleString()} total ratings`}
          icon={Star}
        />
        <HubKPICard
          label="Below 3 Stars"
          value={`${data.lowRatingPercent}%`}
          sublabel="Percentage of low ratings"
          icon={ThumbsDown}
        />
        <HubKPICard
          label="Completion Rate"
          value={`${data.completionRate}%`}
          sublabel="Sessions completed successfully"
          icon={CheckCircle}
        />
        <HubKPICard
          label="Written Feedback"
          value={data.recentFeedback.length}
          sublabel="Recent reviews with text"
          icon={MessageSquare}
        />
        <HubKPICard
          label="Agents Rated"
          value={data.topRated.length + data.bottomRated.length}
          sublabel="With 2+ ratings"
          icon={TrendingUp}
        />
      </HubKPIGrid>

      {/* Charts */}
      <div className={styles.chartsSection}>
        {/* Rating Distribution */}
        <ErrorBoundary fallback={<div className={styles.fallbackMessage}>Unable to load rating distribution</div>}>
          <HubCategoryBreakdownChart
            data={distributionData}
            title="Rating Distribution"
            subtitle="1-5 star breakdown"
          />
        </ErrorBoundary>

        {/* Rating Trend */}
        <ErrorBoundary fallback={<div className={styles.fallbackMessage}>Unable to load rating trend</div>}>
          <HubTrendChart
            data={data.ratingTrend}
            title="Ratings Submitted"
            subtitle="Last 30 days"
            valueName="Ratings"
            lineColor="#F59E0B"
          />
        </ErrorBoundary>

        {/* Top Rated Agents */}
        {data.topRated.length > 0 && (
          <div>
            <h2 className={styles.placeholderTitle} style={{ textAlign: 'left', color: 'var(--color-text-primary, #1e293b)' }}>
              Top Rated Agents
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {data.topRated.map((agent) => (
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
                  <span style={{ fontSize: '0.8125rem', color: '#F59E0B' }}>
                    {renderStars(agent.avgRating)} {agent.avgRating.toFixed(1)} ({agent.ratingCount})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Rated Agents */}
        {data.bottomRated.length > 0 && (
          <div>
            <h2 className={styles.placeholderTitle} style={{ textAlign: 'left', color: 'var(--color-text-primary, #1e293b)' }}>
              Lowest Rated Agents
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {data.bottomRated.map((agent) => (
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
                  <span style={{ fontSize: '0.8125rem', color: '#EF4444' }}>
                    {renderStars(agent.avgRating)} {agent.avgRating.toFixed(1)} ({agent.ratingCount})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Feedback */}
        {data.recentFeedback.length > 0 && (
          <div>
            <h2 className={styles.placeholderTitle} style={{ textAlign: 'left', color: 'var(--color-text-primary, #1e293b)' }}>
              Recent Feedback
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {data.recentFeedback.map((fb, i) => (
                <div
                  key={i}
                  style={{
                    padding: '0.75rem',
                    borderBottom: '1px solid var(--color-border-light, #f1f5f9)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary, #1e293b)' }}>
                      {fb.agentName}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#F59E0B' }}>
                      {renderStars(fb.rating)}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary, #64748b)', margin: 0, lineHeight: 1.5 }}>
                    {fb.feedback}
                  </p>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary, #94a3b8)', marginTop: '0.25rem', display: 'block' }}>
                    {new Date(fb.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
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
