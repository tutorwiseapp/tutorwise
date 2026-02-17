/*
 * Filename: src/app/(admin)/admin/sage/page.tsx
 * Purpose: Sage AI Tutor Analytics Dashboard
 * Created: 2026-02-17
 *
 * Pattern: Follows Admin Dashboard pattern with HubPageLayout + HubTabs + 4-card sidebar
 */
'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import { AdminStatsWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import Button from '@/app/components/ui/actions/Button';
import styles from './page.module.css';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

type TabFilter = 'overview' | 'usage' | 'quota' | 'subjects';

interface SummaryStats {
  totalSessions: number;
  totalQuestions: number;
  uniqueUsers: number;
  avgQuestionsPerSession: number;
  freeUsers: number;
  proUsers: number;
  topSubjects: Array<{ subject: string; count: number }>;
  topLevels: Array<{ level: string; count: number }>;
}

interface QuotaStats {
  freeTier: {
    totalUsers: number;
    dailyUsage: number;
    limitHits: number;
    avgQuestionsPerUser: number;
  };
  proTier: {
    totalSubscriptions: number;
    monthlyUsage: number;
    avgQuestionsPerUser: number;
    revenue: number;
  };
  costAnalysis: {
    totalCost: number;
    costPerQuestion: number;
    marginFree: number;
    marginPro: number;
  };
}

interface SubjectBreakdown {
  maths: number;
  english: number;
  science: number;
  general: number;
}

export default function SageAnalyticsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabFilter = (searchParams?.get('tab') as TabFilter) || 'overview';

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (tabId === 'overview') {
      params.delete('tab');
    } else {
      params.set('tab', tabId);
    }
    router.push(`/admin/sage${params.toString() ? `?${params.toString()}` : ''}`);
  };

  // Fetch summary stats
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['admin', 'sage', 'summary'],
    queryFn: async () => {
      const response = await fetch('/api/admin/sage/analytics?type=summary');
      if (!response.ok) throw new Error('Failed to fetch summary');
      const data = await response.json();
      return data as SummaryStats;
    },
    staleTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
    refetchOnMount: true,
  });

  // Fetch quota stats
  const { data: quotaData, isLoading: quotaLoading } = useQuery({
    queryKey: ['admin', 'sage', 'quota'],
    queryFn: async () => {
      const response = await fetch('/api/admin/sage/analytics?type=quota');
      if (!response.ok) throw new Error('Failed to fetch quota stats');
      const data = await response.json();
      return data as QuotaStats;
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    enabled: tabFilter === 'quota',
  });

  // Fetch subject breakdown
  const { data: subjectData, isLoading: subjectLoading } = useQuery({
    queryKey: ['admin', 'sage', 'subjects'],
    queryFn: async () => {
      const response = await fetch('/api/admin/sage/analytics?type=subjects');
      if (!response.ok) throw new Error('Failed to fetch subject breakdown');
      const data = await response.json();
      return data as SubjectBreakdown;
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    enabled: tabFilter === 'subjects',
  });

  const isLoading = summaryLoading || (tabFilter === 'quota' && quotaLoading) || (tabFilter === 'subjects' && subjectLoading);

  return (
    <ErrorBoundary>
      <HubPageLayout
        header={
          <HubHeader
            title="Sage Analytics"
            subtitle="AI Tutor usage and performance metrics"
            actions={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.location.reload()}
              >
                Refresh Data
              </Button>
            }
          />
        }
        tabs={
          <HubTabs
            tabs={[
              { id: 'overview', label: 'Overview', active: tabFilter === 'overview' },
              { id: 'usage', label: 'Usage', active: tabFilter === 'usage' },
              { id: 'quota', label: 'Quota & Costs', active: tabFilter === 'quota' },
              { id: 'subjects', label: 'Subjects', active: tabFilter === 'subjects' },
            ]}
            onTabChange={handleTabChange}
          />
        }
        sidebar={
          <HubSidebar>
            <AdminStatsWidget
              title="Quick Stats"
              stats={summaryData ? [
                { label: 'Total Questions', value: summaryData.totalQuestions },
                { label: 'Total Sessions', value: summaryData.totalSessions },
                { label: 'Active Users', value: summaryData.uniqueUsers },
                { label: 'Avg Questions/Session', value: summaryData.avgQuestionsPerSession.toFixed(1) },
              ] : [
                { label: 'Total Questions', value: '...' },
                { label: 'Total Sessions', value: '...' },
                { label: 'Active Users', value: '...' },
                { label: 'Avg Questions/Session', value: '...' },
              ]}
            />
            <AdminTipWidget
              title="Cost Control"
              tips={[
                'Monitor free tier usage to control AI costs',
                'Track Pro subscriptions for revenue growth',
                'Review subject breakdown to optimize content',
                'Promote upgrades when users hit daily limits',
              ]}
            />
          </HubSidebar>
        }
      >
        <div className={styles.content}>
          {isLoading && (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <p>Loading analytics...</p>
            </div>
          )}

          {!isLoading && tabFilter === 'overview' && summaryData && (
            <div className={styles.overview}>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <h3>Total Sessions</h3>
                  <p className={styles.statValue}>{summaryData.totalSessions.toLocaleString()}</p>
                  <span className={styles.statLabel}>Learning sessions started</span>
                </div>
                <div className={styles.statCard}>
                  <h3>Total Questions</h3>
                  <p className={styles.statValue}>{summaryData.totalQuestions.toLocaleString()}</p>
                  <span className={styles.statLabel}>AI-powered responses</span>
                </div>
                <div className={styles.statCard}>
                  <h3>Unique Users</h3>
                  <p className={styles.statValue}>{summaryData.uniqueUsers.toLocaleString()}</p>
                  <span className={styles.statLabel}>Active learners</span>
                </div>
                <div className={styles.statCard}>
                  <h3>Avg Questions/Session</h3>
                  <p className={styles.statValue}>{summaryData.avgQuestionsPerSession.toFixed(1)}</p>
                  <span className={styles.statLabel}>Engagement metric</span>
                </div>
              </div>

              <div className={styles.section}>
                <h2>Popular Subjects</h2>
                <div className={styles.list}>
                  {summaryData.topSubjects.map((item, idx) => (
                    <div key={idx} className={styles.listItem}>
                      <span className={styles.listLabel}>{item.subject}</span>
                      <span className={styles.listValue}>{item.count} questions</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.section}>
                <h2>Study Levels</h2>
                <div className={styles.list}>
                  {summaryData.topLevels.map((item, idx) => (
                    <div key={idx} className={styles.listItem}>
                      <span className={styles.listLabel}>{item.level}</span>
                      <span className={styles.listValue}>{item.count} questions</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!isLoading && tabFilter === 'quota' && quotaData && (
            <div className={styles.quotaView}>
              <div className={styles.section}>
                <h2>Free Tier Analytics</h2>
                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <h3>Free Users</h3>
                    <p className={styles.statValue}>{quotaData.freeTier.totalUsers}</p>
                    <span className={styles.statLabel}>10 questions/day limit</span>
                  </div>
                  <div className={styles.statCard}>
                    <h3>Daily Usage</h3>
                    <p className={styles.statValue}>{quotaData.freeTier.dailyUsage}</p>
                    <span className={styles.statLabel}>Questions today</span>
                  </div>
                  <div className={styles.statCard}>
                    <h3>Limit Hits</h3>
                    <p className={styles.statValue}>{quotaData.freeTier.limitHits}</p>
                    <span className={styles.statLabel}>Users hitting daily limit</span>
                  </div>
                  <div className={styles.statCard}>
                    <h3>Avg Usage</h3>
                    <p className={styles.statValue}>{quotaData.freeTier.avgQuestionsPerUser.toFixed(1)}</p>
                    <span className={styles.statLabel}>Questions per free user</span>
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <h2>Sage Pro Analytics</h2>
                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <h3>Pro Subscriptions</h3>
                    <p className={styles.statValue}>{quotaData.proTier.totalSubscriptions}</p>
                    <span className={styles.statLabel}>5,000 questions/month</span>
                  </div>
                  <div className={styles.statCard}>
                    <h3>Monthly Usage</h3>
                    <p className={styles.statValue}>{quotaData.proTier.monthlyUsage}</p>
                    <span className={styles.statLabel}>Questions this month</span>
                  </div>
                  <div className={styles.statCard}>
                    <h3>MRR</h3>
                    <p className={styles.statValue}>£{(quotaData.proTier.revenue / 100).toFixed(0)}</p>
                    <span className={styles.statLabel}>Monthly recurring revenue</span>
                  </div>
                  <div className={styles.statCard}>
                    <h3>Avg Usage</h3>
                    <p className={styles.statValue}>{quotaData.proTier.avgQuestionsPerUser.toFixed(0)}</p>
                    <span className={styles.statLabel}>Questions per Pro user</span>
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <h2>Cost Analysis</h2>
                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <h3>Total AI Cost</h3>
                    <p className={styles.statValue}>£{quotaData.costAnalysis.totalCost.toFixed(2)}</p>
                    <span className={styles.statLabel}>Gemini API usage</span>
                  </div>
                  <div className={styles.statCard}>
                    <h3>Cost per Question</h3>
                    <p className={styles.statValue}>£{quotaData.costAnalysis.costPerQuestion.toFixed(4)}</p>
                    <span className={styles.statLabel}>Average token cost</span>
                  </div>
                  <div className={styles.statCard}>
                    <h3>Free Margin</h3>
                    <p className={styles.statValue} style={{ color: quotaData.costAnalysis.marginFree < 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                      £{quotaData.costAnalysis.marginFree.toFixed(2)}
                    </p>
                    <span className={styles.statLabel}>Loss on free tier</span>
                  </div>
                  <div className={styles.statCard}>
                    <h3>Pro Margin</h3>
                    <p className={styles.statValue} style={{ color: 'var(--color-success)' }}>
                      £{quotaData.costAnalysis.marginPro.toFixed(2)}
                    </p>
                    <span className={styles.statLabel}>Profit from Pro tier</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isLoading && tabFilter === 'subjects' && subjectData && (
            <div className={styles.subjectsView}>
              <h2>Subject Distribution</h2>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <h3>Mathematics</h3>
                  <p className={styles.statValue}>{subjectData.maths}</p>
                  <span className={styles.statLabel}>Questions asked</span>
                </div>
                <div className={styles.statCard}>
                  <h3>English</h3>
                  <p className={styles.statValue}>{subjectData.english}</p>
                  <span className={styles.statLabel}>Questions asked</span>
                </div>
                <div className={styles.statCard}>
                  <h3>Science</h3>
                  <p className={styles.statValue}>{subjectData.science}</p>
                  <span className={styles.statLabel}>Questions asked</span>
                </div>
                <div className={styles.statCard}>
                  <h3>General</h3>
                  <p className={styles.statValue}>{subjectData.general}</p>
                  <span className={styles.statLabel}>Questions asked</span>
                </div>
              </div>
            </div>
          )}

          {!isLoading && tabFilter === 'usage' && (
            <HubEmptyState
              title="Usage Analytics Coming Soon"
              description="Detailed usage patterns, peak times, and session analytics will be available here."
            />
          )}
        </div>
      </HubPageLayout>
    </ErrorBoundary>
  );
}
