/*
 * Filename: src/app/(admin)/admin/sage/components/OutcomesPanel.tsx
 * Purpose: Learning outcomes analytics for Sage admin — mastery scores,
 *          assessments, misconceptions, and gamification summary.
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
import { Award, Target, Brain, Flame, Trophy } from 'lucide-react';
import pageStyles from '../page.module.css';
import styles from './OutcomesPanel.module.css';

// ── API response shape ──────────────────────────────────────────────
interface OutcomesData {
  mastery: {
    averageMastery: number;
    totalStudents: number;
    subjectMastery: Array<{ subject: string; avgMastery: number; studentCount: number }>;
  };
  assessments: {
    totalCompleted: number;
    bySubject: Record<string, { total: number; avgScore: number; count: number }>;
  };
  misconceptions: {
    top: Array<{ topic: string; count: number }>;
    totalResolved: number;
  };
  gamification: {
    totalXP: number;
    avgXP: number;
    weeklyXP: number;
    totalBadgesEarned: number;
    activeStudentsWithXP: number;
  };
  engagement: {
    totalStudyMinutes: number;
    avgStreak: number;
    avgStudyMinutes: number;
  };
}

// ── Chart colour palette ────────────────────────────────────────────
const SUBJECT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444',
  '#06B6D4', '#EC4899', '#14B8A6', '#F97316', '#6366F1',
];

// ── Component ───────────────────────────────────────────────────────
export default function OutcomesPanel() {
  const { data, isLoading, isError } = useQuery<OutcomesData>({
    queryKey: ['admin-sage-outcomes'],
    queryFn: async () => {
      const res = await fetch('/api/admin/sage/analytics?type=outcomes');
      if (!res.ok) throw new Error('Failed to fetch outcomes analytics');
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
        Unable to load outcomes analytics. Please try again later.
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────
  if (data.mastery.totalStudents === 0) {
    return (
      <HubEmptyState
        title="No Learning Data"
        description="No student learning data yet. Outcomes will populate as students use Sage."
        icon={<Target size={32} />}
      />
    );
  }

  // ── Derived chart data ────────────────────────────────────────────
  const subjectData: CategoryData[] = data.mastery.subjectMastery.map((s, i) => ({
    label: s.subject,
    value: Math.round(s.avgMastery),
    color: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
  }));

  const assessmentSubjects = Object.entries(data.assessments.bySubject);

  // ── Render ────────────────────────────────────────────────────────
  return (
    <>
      {/* KPI Cards */}
      <HubKPIGrid>
        <HubKPICard
          label="Avg Mastery Score"
          value={`${data.mastery.averageMastery.toFixed(1)}%`}
          icon={Target}
        />
        <HubKPICard
          label="Total Students"
          value={data.mastery.totalStudents.toLocaleString()}
          icon={Award}
        />
        <HubKPICard
          label="Total Study Minutes"
          value={data.engagement.totalStudyMinutes.toLocaleString()}
          sublabel={`${data.engagement.avgStudyMinutes.toFixed(0)} avg/student`}
          icon={Brain}
        />
        <HubKPICard
          label="Avg Streak"
          value={`${data.engagement.avgStreak.toFixed(1)} days`}
          icon={Flame}
        />
        <HubKPICard
          label="Total Badges Earned"
          value={data.gamification.totalBadgesEarned.toLocaleString()}
          icon={Trophy}
        />
      </HubKPIGrid>

      <div className={pageStyles.chartsSection}>
        {/* Subject Mastery Breakdown */}
        <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load subject mastery chart</div>}>
          <h2 className={pageStyles.sectionHeading}>Subject Mastery</h2>
          <HubCategoryBreakdownChart
            data={subjectData}
            title="Average Mastery by Subject"
            subtitle="Percentage mastery across subjects"
          />
        </ErrorBoundary>

        {/* Top Misconceptions */}
        <div>
          <h2 className={pageStyles.sectionHeading}>Top Misconceptions</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary, #64748b)', margin: '0 0 0.75rem' }}>
            {data.misconceptions.totalResolved.toLocaleString()} total resolved
          </p>
          <div className={styles.misconceptionList}>
            {data.misconceptions.top.slice(0, 15).map((m) => (
              <div key={m.topic} className={styles.misconceptionItem}>
                <span className={styles.misconceptionTopic}>{m.topic}</span>
                <span className={styles.misconceptionCount}>{m.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Assessment Stats */}
        <div>
          <h2 className={pageStyles.sectionHeading}>Assessment Stats</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-primary, #1e293b)', marginBottom: '0.75rem' }}>
            <strong>{data.assessments.totalCompleted.toLocaleString()}</strong> assessments completed
          </p>
          {assessmentSubjects.length > 0 && (
            <div className={pageStyles.list}>
              {assessmentSubjects.map(([subject, stats]) => (
                <div key={subject} className={pageStyles.listItem}>
                  <span className={pageStyles.listLabel}>{subject}</span>
                  <span className={pageStyles.listValue}>
                    {stats.avgScore.toFixed(1)}% avg ({stats.count} completed)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gamification Summary */}
        <div>
          <h2 className={pageStyles.sectionHeading}>Gamification Summary</h2>
          <div className={styles.gamificationGrid}>
            <div className={styles.gamificationCard}>
              <div className={styles.gamificationValue}>{data.gamification.totalXP.toLocaleString()}</div>
              <div className={styles.gamificationLabel}>Total XP</div>
            </div>
            <div className={styles.gamificationCard}>
              <div className={styles.gamificationValue}>{data.gamification.avgXP.toLocaleString()}</div>
              <div className={styles.gamificationLabel}>Avg XP/Student</div>
            </div>
            <div className={styles.gamificationCard}>
              <div className={styles.gamificationValue}>{data.gamification.weeklyXP.toLocaleString()}</div>
              <div className={styles.gamificationLabel}>Weekly XP</div>
            </div>
            <div className={styles.gamificationCard}>
              <div className={styles.gamificationValue}>{data.gamification.activeStudentsWithXP.toLocaleString()}</div>
              <div className={styles.gamificationLabel}>Active XP Students</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
