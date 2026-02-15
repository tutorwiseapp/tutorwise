/**
 * Filename: apps/web/src/app/(authenticated)/sage/progress/page.tsx
 * Purpose: Sage learning progress page
 * Route: /sage/progress
 * Created: 2026-02-14
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import HubStatsCard from '@/app/components/hub/sidebar/cards/HubStatsCard';
import Button from '@/app/components/ui/actions/Button';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import SageHelpWidget from '../../../../components/feature/sage/widgets/SageHelpWidget';
import SageTipsWidget from '../../../../components/feature/sage/widgets/SageTipsWidget';
import SageVideoWidget from '../../../../components/feature/sage/widgets/SageVideoWidget';
import styles from '../page.module.css';
import progressStyles from './page.module.css';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

type PeriodType = '7days' | '30days' | '90days' | 'all';

const PERIODS = [
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
  { value: '90days', label: 'Last 90 Days' },
  { value: 'all', label: 'All Time' },
];

export default function SageProgressPage() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const router = useRouter();
  const [period, setPeriod] = useState<PeriodType>('30days');
  const [searchQuery, setSearchQuery] = useState('');
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Fetch progress with gold standard react-query config
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['sage-progress', profile?.id, period],
    queryFn: async () => {
      const res = await fetch(`/api/sage/progress?period=${period}`);
      if (!res.ok) throw new Error('Failed to fetch progress');
      return res.json();
    },
    enabled: !!profile?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  const progress = data?.progress;

  const handleNewSession = () => {
    router.push('/sage');
    setShowActionsMenu(false);
  };

  const handleExportProgress = () => {
    // TODO: Implement export
    setShowActionsMenu(false);
  };

  // Loading state
  if (profileLoading || isLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="Sage" />}
        sidebar={
          <HubSidebar>
            <div className={styles.skeletonWidget} />
          </HubSidebar>
        }
      >
        <div className={styles.loading}>Loading progress...</div>
      </HubPageLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <HubPageLayout
        header={<HubHeader title="Sage" />}
        sidebar={<HubSidebar><SageHelpWidget /></HubSidebar>}
      >
        <div className={styles.error}>
          <p>Failed to load progress. Please try again.</p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      </HubPageLayout>
    );
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Sage"
          filters={
            <div className={filterStyles.filtersContainer}>
              <input
                type="search"
                placeholder="Search topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={filterStyles.searchInput}
              />
              <UnifiedSelect
                value={period}
                onChange={(v) => setPeriod(v as PeriodType)}
                options={PERIODS}
                placeholder="Time period"
              />
            </div>
          }
          actions={
            <>
              <Button variant="primary" size="sm" onClick={handleNewSession}>
                New Session
              </Button>
              <div className={actionStyles.dropdownContainer}>
                <Button
                  variant="secondary"
                  size="sm"
                  square
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                >
                  ...
                </Button>
                {showActionsMenu && (
                  <>
                    <div
                      className={actionStyles.backdrop}
                      onClick={() => setShowActionsMenu(false)}
                    />
                    <div className={actionStyles.dropdownMenu}>
                      <button
                        onClick={handleExportProgress}
                        className={actionStyles.menuButton}
                      >
                        Export Report
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          }
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'chat', label: 'Chat', href: '/sage' },
            { id: 'history', label: 'History', href: '/sage/history' },
            { id: 'progress', label: 'Progress', active: true },
            { id: 'materials', label: 'Materials', href: '/sage/materials' },
          ]}
          onTabChange={(tabId) => {
            if (tabId !== 'progress') {
              router.push(tabId === 'chat' ? '/sage' : `/sage/${tabId}`);
            }
          }}
        />
      }
      sidebar={
        <HubSidebar>
          <HubStatsCard
            title="Quick Stats"
            stats={[
              {
                label: 'Current Streak',
                value: `${progress?.streakDays || 0} days`,
                valueColor: progress?.streakDays > 0 ? 'orange' : 'default',
              },
              {
                label: 'Total Sessions',
                value: progress?.totalSessions || 0,
                valueColor: 'default',
              },
              {
                label: 'Topics Covered',
                value: progress?.topicsCovered?.length || 0,
                valueColor: 'green',
              },
            ]}
          />
          <SageHelpWidget />
          <SageTipsWidget />
          <SageVideoWidget />
        </HubSidebar>
      }
    >
      {!progress || progress.totalSessions === 0 ? (
        <HubEmptyState
          title="No progress data yet"
          description="Start learning with Sage to track your progress."
          actionLabel="Start Learning"
          onAction={() => router.push('/sage')}
        />
      ) : (
        <div className={progressStyles.progressPage}>
          {/* Stats Cards */}
          <div className={progressStyles.statsGrid}>
            <div className={progressStyles.statCard}>
              <div className={progressStyles.statValue}>{progress.totalSessions}</div>
              <div className={progressStyles.statLabel}>Total Sessions</div>
            </div>
            <div className={progressStyles.statCard}>
              <div className={progressStyles.statValue}>{progress.totalMessages}</div>
              <div className={progressStyles.statLabel}>Messages</div>
            </div>
            <div className={progressStyles.statCard}>
              <div className={progressStyles.statValue}>{progress.streakDays}</div>
              <div className={progressStyles.statLabel}>Day Streak</div>
            </div>
            <div className={progressStyles.statCard}>
              <div className={progressStyles.statValue}>{progress.averageSessionLength}</div>
              <div className={progressStyles.statLabel}>Avg. Minutes</div>
            </div>
          </div>

          {/* Subject Breakdown */}
          {progress.subjectBreakdown?.length > 0 && (
            <div className={progressStyles.section}>
              <h3 className={progressStyles.sectionTitle}>Subjects Studied</h3>
              <div className={progressStyles.subjectList}>
                {progress.subjectBreakdown.map((item: { subject: string; sessions: number; percentage: number }) => (
                  <div key={item.subject} className={progressStyles.subjectItem}>
                    <div className={progressStyles.subjectInfo}>
                      <span className={progressStyles.subjectName}>
                        {item.subject.charAt(0).toUpperCase() + item.subject.slice(1)}
                      </span>
                      <span className={progressStyles.subjectCount}>
                        {item.sessions} sessions
                      </span>
                    </div>
                    <div className={progressStyles.progressBar}>
                      <div
                        className={progressStyles.progressFill}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weekly Activity */}
          {progress.weeklyActivity?.length > 0 && (
            <div className={progressStyles.section}>
              <h3 className={progressStyles.sectionTitle}>Weekly Activity</h3>
              <div className={progressStyles.weeklyChart}>
                {progress.weeklyActivity.map((day: { day: string; sessions: number }) => (
                  <div key={day.day} className={progressStyles.dayColumn}>
                    <div
                      className={progressStyles.dayBar}
                      style={{
                        height: `${Math.min(day.sessions * 20, 100)}%`,
                        backgroundColor: day.sessions > 0 ? '#006c67' : '#e5e7eb',
                      }}
                    />
                    <span className={progressStyles.dayLabel}>{day.day}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Topics Covered */}
          {progress.topicsCovered?.length > 0 && (
            <div className={progressStyles.section}>
              <h3 className={progressStyles.sectionTitle}>Topics Covered</h3>
              <div className={progressStyles.topicsList}>
                {progress.topicsCovered.slice(0, 12).map((topic: string) => (
                  <span key={topic} className={progressStyles.topicChip}>
                    {topic}
                  </span>
                ))}
                {progress.topicsCovered.length > 12 && (
                  <span className={progressStyles.topicMore}>
                    +{progress.topicsCovered.length - 12} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </HubPageLayout>
  );
}
