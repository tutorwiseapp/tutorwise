/**
 * Filename: CurriculumCoverage.tsx
 * Purpose: Curriculum coverage analytics — KPIs, coverage matrix, exam board chart, popular/unused topics
 * Created: 2026-03-16
 * Pattern: Follows hub chart conventions with React Query data fetching
 */

'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HubKPIGrid, HubKPICard, HubCategoryBreakdownChart } from '@/components/hub/charts';
import type { CategoryData } from '@/components/hub/charts';
import HubEmptyState from '@/components/hub/content/HubEmptyState';
import ErrorBoundary from '@/components/ui/feedback/ErrorBoundary';
import { ChartSkeleton } from '@/components/ui/feedback/LoadingSkeleton';
import StatusBadge from '@/components/admin/badges/StatusBadge';
import { BookOpen, Target, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import styles from './CurriculumCoverage.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CoverageCell {
  total: number;
  used: number;
  percentage: number;
}

interface UnusedTopic {
  name: string;
  subject: string;
  level: string;
}

interface PopularTopic {
  name: string;
  subject: string;
  level: string;
  sessions: number;
}

interface ExamBoardEntry {
  board: string;
  topicCount: number;
}

interface CoverageData {
  totalTopics: number;
  usedTopics: number;
  coveragePercentage: number;
  coverageMatrix: Record<string, Record<string, CoverageCell>>;
  unusedTopics: UnusedTopic[];
  unusedCount: number;
  popularTopics: PopularTopic[];
  examBoardCoverage: ExamBoardEntry[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toTitleCase(str: string): string {
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function cellColor(percentage: number, hasTopics: boolean): string {
  if (!hasTopics) return '#f3f4f6'; // gray — no topics for this combo
  if (percentage === 0) return '#fee2e2'; // light red
  if (percentage <= 50) return '#fef3c7'; // light yellow
  if (percentage < 100) return '#dcfce7'; // light green
  return '#bbf7d0'; // solid green
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CoverageMatrix({
  matrix,
}: {
  matrix: Record<string, Record<string, CoverageCell>>;
}) {
  const levels = Object.keys(matrix);
  if (levels.length === 0) return null;

  // Collect all unique subjects across every level
  const subjectSet = new Set<string>();
  for (const level of levels) {
    for (const subject of Object.keys(matrix[level])) {
      subjectSet.add(subject);
    }
  }
  const subjects = Array.from(subjectSet).sort();

  return (
    <div className={styles.coverageMatrix}>
      <table className={styles.matrixTable}>
        <thead>
          <tr>
            <th className={styles.matrixHeader} style={{ textAlign: 'left' }}>
              Level
            </th>
            {subjects.map((s) => (
              <th key={s} className={styles.matrixHeader}>
                {toTitleCase(s)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {levels.map((level) => (
            <tr key={level}>
              <td className={styles.matrixRowHeader}>{level}</td>
              {subjects.map((subject) => {
                const cell = matrix[level]?.[subject];
                const hasTopics = !!cell && cell.total > 0;
                const pct = cell?.percentage ?? 0;
                return (
                  <td
                    key={subject}
                    className={styles.matrixCell}
                    style={{ background: cellColor(pct, hasTopics) }}
                    title={
                      hasTopics
                        ? `${cell.used}/${cell.total} topics used (${pct}%)`
                        : 'No topics'
                    }
                  >
                    {hasTopics ? `${cell.used} / ${cell.total}` : '-'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PopularTopicsList({ topics }: { topics: PopularTopic[] }) {
  if (topics.length === 0) return null;

  return (
    <ul className={styles.popularList}>
      {topics.map((t, i) => (
        <li key={`${t.name}-${t.subject}-${t.level}`} className={styles.popularItem}>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span className={styles.popularRank}>{i + 1}.</span>
            <span className={styles.popularName}>{t.name}</span>
            <span className={styles.popularMeta}>
              {toTitleCase(t.subject)} &middot; {t.level}
            </span>
          </span>
          <span className={styles.popularSessions}>{t.sessions} sessions</span>
        </li>
      ))}
    </ul>
  );
}

function UnusedTopicsSection({
  topics,
  totalCount,
}: {
  topics: UnusedTopic[];
  totalCount: number;
}) {
  const [expanded, setExpanded] = useState(false);

  if (totalCount === 0) return null;

  const displayed = topics.slice(0, 20);
  const remaining = totalCount - displayed.length;

  return (
    <div className={styles.unusedSection}>
      <button
        className={styles.unusedToggle}
        onClick={() => setExpanded((prev) => !prev)}
        type="button"
      >
        <span>Unused Topics ({totalCount})</span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <>
          <ul className={styles.unusedList}>
            {displayed.map((t) => (
              <li
                key={`${t.name}-${t.subject}-${t.level}`}
                className={styles.unusedItem}
              >
                <StatusBadge label={t.level} variant="inactive" size="xs" shape="rect" />
                <StatusBadge
                  label={toTitleCase(t.subject)}
                  variant="info"
                  size="xs"
                  shape="rect"
                />
                <span>{t.name}</span>
              </li>
            ))}
          </ul>
          {remaining > 0 && (
            <div className={styles.unusedRemaining}>
              ...and {remaining} more unused topic{remaining !== 1 ? 's' : ''}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function CurriculumCoverage() {
  const { data, isLoading, isError } = useQuery<CoverageData>({
    queryKey: ['sage', 'coverage'],
    queryFn: async () => {
      const res = await fetch('/api/admin/sage/analytics?type=coverage');
      if (!res.ok) throw new Error('Failed to fetch coverage data');
      return res.json();
    },
  });

  if (isLoading) {
    return <ChartSkeleton height="400px" />;
  }

  if (isError || !data) {
    return (
      <HubEmptyState
        title="Coverage data unavailable"
        description="Could not load curriculum coverage analytics. Please try again later."
        icon={<BookOpen size={32} />}
      />
    );
  }

  // Transform exam board data for horizontal bar chart
  const examBoardChartData: CategoryData[] = data.examBoardCoverage.map((eb) => ({
    label: eb.board,
    value: eb.topicCount,
  }));

  return (
    <ErrorBoundary>
      <div>
        {/* KPI Cards */}
        <HubKPIGrid>
          <HubKPICard
            label="Total Topics"
            value={data.totalTopics.toLocaleString()}
            icon={BookOpen}
            variant="info"
          />
          <HubKPICard
            label="Used Topics"
            value={data.usedTopics.toLocaleString()}
            sublabel="Topics with at least one session"
            icon={Target}
            variant="success"
          />
          <HubKPICard
            label="Coverage"
            value={`${data.coveragePercentage}%`}
            sublabel={`${data.usedTopics} of ${data.totalTopics} topics`}
            icon={BarChart3}
            variant={data.coveragePercentage >= 50 ? 'success' : 'warning'}
          />
        </HubKPIGrid>

        {/* Coverage Matrix */}
        <div className={styles.widget}>
          <h3 className={styles.widgetTitle}>Coverage Matrix — Level x Subject</h3>
          <CoverageMatrix matrix={data.coverageMatrix} />
        </div>

        {/* Exam Board Coverage */}
        {examBoardChartData.length > 0 && (
          <HubCategoryBreakdownChart
            data={examBoardChartData}
            title="Exam Board Coverage"
            subtitle="Number of topics mapped per exam board"
            type="horizontal-bar"
            showPercentage
            showValue
          />
        )}

        {/* Popular Topics */}
        {data.popularTopics.length > 0 && (
          <div className={styles.widget}>
            <h3 className={styles.widgetTitle}>Popular Topics (Top 20)</h3>
            <PopularTopicsList topics={data.popularTopics} />
          </div>
        )}

        {/* Unused Topics */}
        <UnusedTopicsSection
          topics={data.unusedTopics}
          totalCount={data.unusedCount}
        />
      </div>
    </ErrorBoundary>
  );
}
