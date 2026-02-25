/*
 * Filename: src/app/(admin)/admin/sage/page.tsx
 * Purpose: Sage AI Tutor Analytics Dashboard
 * Created: 2026-02-17
 * Updated: 2026-02-25 - Refactored to use Hub architecture components
 *
 * Pattern: Follows Admin Dashboard pattern (Listings/Bookings/AI Tutors)
 */
'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import { HubKPIGrid, HubKPICard, HubTrendChart, HubCategoryBreakdownChart, type CategoryData } from '@/app/components/hub/charts';
import { AdminStatsWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import { useAdminMetric, formatMetricChange } from '@/hooks/useAdminMetric';
import { useAdminTrendData } from '@/hooks/useAdminTrendData';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import { ChartSkeleton } from '@/app/components/ui/feedback/LoadingSkeleton';
import { Bot, Users, MessageSquare, DollarSign, TrendingUp, BookOpen, Clock, AlertTriangle } from 'lucide-react';
import Button from '@/app/components/ui/actions/Button';
import SageProSubscriptionsTable from './components/SageProSubscriptionsTable';
import styles from './page.module.css';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

type TabFilter = 'overview' | 'usage' | 'quota' | 'subjects' | 'subscriptions';

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

export default function SageAnalyticsPage() {
  const _router = useRouter();
  const searchParams = useSearchParams();

  const tabFilter = (searchParams?.get('tab') as TabFilter) || 'overview';

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (tabId === 'overview') {
      params.delete('tab');
    } else {
      params.set('tab', tabId);
    }
    window.location.href = `/admin/sage${params.toString() ? `?${params.toString()}` : ''}`;
  };

  // Fetch historical metrics from platform_statistics_daily
  const sessionsMetric = useAdminMetric({ metric: 'sage_sessions_total', compareWith: 'last_month' });
  const questionsMetric = useAdminMetric({ metric: 'sage_questions_total', compareWith: 'last_month' });
  const uniqueUsersMetric = useAdminMetric({ metric: 'sage_unique_users', compareWith: 'last_month' });
  const freeUsersMetric = useAdminMetric({ metric: 'sage_free_users', compareWith: 'last_month' });
  const proUsersMetric = useAdminMetric({ metric: 'sage_pro_users', compareWith: 'last_month' });
  const proSubscriptionsMetric = useAdminMetric({ metric: 'sage_pro_subscriptions', compareWith: 'last_month' });
  const proMrrMetric = useAdminMetric({ metric: 'sage_pro_mrr', compareWith: 'last_month' });

  // Subject metrics
  const subjectMathsMetric = useAdminMetric({ metric: 'sage_subject_maths', compareWith: 'last_month' });
  const subjectEnglishMetric = useAdminMetric({ metric: 'sage_subject_english', compareWith: 'last_month' });
  const subjectScienceMetric = useAdminMetric({ metric: 'sage_subject_science', compareWith: 'last_month' });
  const subjectGeneralMetric = useAdminMetric({ metric: 'sage_subject_general', compareWith: 'last_month' });

  // Quota metrics
  const freeDailyUsageMetric = useAdminMetric({ metric: 'sage_free_daily_usage', compareWith: 'last_month' });
  const freeLimitHitsMetric = useAdminMetric({ metric: 'sage_free_limit_hits', compareWith: 'last_month' });
  const freeAvgQuestionsMetric = useAdminMetric({ metric: 'sage_free_avg_questions', compareWith: 'last_month' });
  const proMonthlyUsageMetric = useAdminMetric({ metric: 'sage_pro_monthly_usage', compareWith: 'last_month' });
  const proAvgQuestionsMetric = useAdminMetric({ metric: 'sage_pro_avg_questions', compareWith: 'last_month' });

  // Cost metrics
  const totalAICostMetric = useAdminMetric({ metric: 'sage_total_ai_cost', compareWith: 'last_month' });
  const costPerQuestionMetric = useAdminMetric({ metric: 'sage_cost_per_question', compareWith: 'last_month' });
  const marginFreeMetric = useAdminMetric({ metric: 'sage_margin_free', compareWith: 'last_month' });
  const marginProMetric = useAdminMetric({ metric: 'sage_margin_pro', compareWith: 'last_month' });

  // Fetch trend data for charts (last 7 days)
  const sessionsTrendsQuery = useAdminTrendData({ metric: 'sage_sessions_total', days: 7 });
  const questionsTrendsQuery = useAdminTrendData({ metric: 'sage_questions_total', days: 7 });

  const isLoadingCharts = sessionsTrendsQuery.isLoading || questionsTrendsQuery.isLoading;

  // User type breakdown data
  const userTypeData: CategoryData[] = [
    { label: 'Free Users', value: freeUsersMetric.value, color: '#3B82F6' },
    { label: 'Pro Users', value: proUsersMetric.value, color: '#10B981' },
  ];

  // Subject breakdown data
  const subjectBreakdownData: CategoryData[] = [
    { label: 'Mathematics', value: subjectMathsMetric.value, color: '#3B82F6' },
    { label: 'English', value: subjectEnglishMetric.value, color: '#10B981' },
    { label: 'Science', value: subjectScienceMetric.value, color: '#F59E0B' },
    { label: 'General', value: subjectGeneralMetric.value, color: '#8B5CF6' },
  ];

  // Fetch summary stats (for subjects/levels data)
  const { data: summaryData } = useQuery({
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

  // Note: Quota and subject data now come from platform_statistics_daily via useAdminMetric hooks
  // No longer need separate API queries for these tabs

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

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
              { id: 'subscriptions', label: 'Subscriptions', active: tabFilter === 'subscriptions' },
            ]}
            onTabChange={handleTabChange}
          />
        }
        sidebar={
          <HubSidebar>
            <AdminStatsWidget
              title="Quick Stats"
              stats={[
                { label: 'Total Questions', value: questionsMetric.value },
                { label: 'Total Sessions', value: sessionsMetric.value },
                { label: 'Active Users', value: uniqueUsersMetric.value },
                { label: 'Pro Subscriptions', value: proSubscriptionsMetric.value },
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
        {/* Overview Tab */}
        {tabFilter === 'overview' && (
          <>
            {/* KPI Cards Grid */}
            <HubKPIGrid>
              <HubKPICard
                label="Total Sessions"
                value={sessionsMetric.value}
                sublabel={formatMetricChange(
                  sessionsMetric.change,
                  sessionsMetric.changePercent,
                  'last_month'
                )}
                icon={Bot}
                trend={sessionsMetric.trend}
              />
              <HubKPICard
                label="Total Questions"
                value={questionsMetric.value}
                sublabel={formatMetricChange(
                  questionsMetric.change,
                  questionsMetric.changePercent,
                  'last_month'
                )}
                icon={MessageSquare}
                trend={questionsMetric.trend}
              />
              <HubKPICard
                label="Unique Users"
                value={uniqueUsersMetric.value}
                sublabel={formatMetricChange(
                  uniqueUsersMetric.change,
                  uniqueUsersMetric.changePercent,
                  'last_month'
                )}
                icon={Users}
                trend={uniqueUsersMetric.trend}
              />
              <HubKPICard
                label="Avg Questions/Session"
                value={
                  sessionsMetric.value > 0
                    ? (questionsMetric.value / sessionsMetric.value).toFixed(1)
                    : '0'
                }
                sublabel={
                  sessionsMetric.previousValue && sessionsMetric.previousValue > 0
                    ? `${(questionsMetric.previousValue! / sessionsMetric.previousValue!).toFixed(1)} last month`
                    : undefined
                }
                icon={TrendingUp}
              />
              <HubKPICard
                label="Free Users"
                value={freeUsersMetric.value}
                sublabel={formatMetricChange(
                  freeUsersMetric.change,
                  freeUsersMetric.changePercent,
                  'last_month'
                )}
                icon={Users}
                trend={freeUsersMetric.trend}
              />
              <HubKPICard
                label="Pro Users"
                value={proUsersMetric.value}
                sublabel={formatMetricChange(
                  proUsersMetric.change,
                  proUsersMetric.changePercent,
                  'last_month'
                )}
                icon={Users}
                trend={proUsersMetric.trend}
              />
              <HubKPICard
                label="Pro Subscriptions"
                value={proSubscriptionsMetric.value}
                sublabel={formatMetricChange(
                  proSubscriptionsMetric.change,
                  proSubscriptionsMetric.changePercent,
                  'last_month'
                )}
                icon={DollarSign}
                trend={proSubscriptionsMetric.trend}
              />
              <HubKPICard
                label="Monthly Recurring Revenue"
                value={formatCurrency(proMrrMetric.value)}
                sublabel={
                  proMrrMetric.change !== null
                    ? `${proMrrMetric.change >= 0 ? '+' : ''}${formatCurrency(proMrrMetric.change)} vs last month`
                    : undefined
                }
                icon={DollarSign}
                trend={proMrrMetric.trend}
              />
            </HubKPIGrid>

            {/* Charts Section */}
            <div className={styles.chartsSection}>
              {/* Session Trends Chart */}
              <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load session trends chart</div>}>
                {isLoadingCharts ? (
                  <ChartSkeleton height="320px" />
                ) : (
                  <HubTrendChart
                    data={sessionsTrendsQuery.data}
                    title="Session Trends"
                    subtitle="Last 7 days"
                    valueName="Sessions"
                    lineColor="#3B82F6"
                  />
                )}
              </ErrorBoundary>

              {/* Questions Trends Chart */}
              <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load questions trends chart</div>}>
                {isLoadingCharts ? (
                  <ChartSkeleton height="320px" />
                ) : (
                  <HubTrendChart
                    data={questionsTrendsQuery.data}
                    title="Questions Trends"
                    subtitle="Last 7 days"
                    valueName="Questions"
                    lineColor="#10B981"
                  />
                )}
              </ErrorBoundary>

              {/* User Type Breakdown */}
              <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load user breakdown chart</div>}>
                <HubCategoryBreakdownChart
                  data={userTypeData}
                  title="User Type Breakdown"
                  subtitle="Free vs Pro users"
                />
              </ErrorBoundary>
            </div>

          </>
        )}

        {/* Usage Tab - Coming Soon */}
        {tabFilter === 'usage' && (
          <HubEmptyState
            title="Usage Analytics Coming Soon"
            description="Detailed usage patterns, peak times, and session analytics will be available here."
          />
        )}

        {/* Quota & Costs Tab */}
        {tabFilter === 'quota' && (
          <>
            {/* Free Tier Analytics Section */}
            <h2 className={styles.sectionHeading}>Free Tier Analytics</h2>
            <HubKPIGrid>
              <HubKPICard
                label="Free Users"
                value={freeUsersMetric.value}
                sublabel={formatMetricChange(
                  freeUsersMetric.change,
                  freeUsersMetric.changePercent,
                  'last_month'
                )}
                icon={Users}
                trend={freeUsersMetric.trend}
              />
              <HubKPICard
                label="Daily Usage"
                value={freeDailyUsageMetric.value}
                sublabel={formatMetricChange(
                  freeDailyUsageMetric.change,
                  freeDailyUsageMetric.changePercent,
                  'last_month'
                )}
                icon={MessageSquare}
                trend={freeDailyUsageMetric.trend}
              />
              <HubKPICard
                label="Limit Hits"
                value={freeLimitHitsMetric.value}
                sublabel={formatMetricChange(
                  freeLimitHitsMetric.change,
                  freeLimitHitsMetric.changePercent,
                  'last_month'
                )}
                icon={AlertTriangle}
                trend={freeLimitHitsMetric.trend}
              />
              <HubKPICard
                label="Avg Questions/User"
                value={freeAvgQuestionsMetric.value > 0 ? freeAvgQuestionsMetric.value.toFixed(1) : '0'}
                sublabel={
                  freeAvgQuestionsMetric.previousValue
                    ? `${freeAvgQuestionsMetric.previousValue.toFixed(1)} last month`
                    : 'Questions per free user'
                }
                icon={TrendingUp}
              />
            </HubKPIGrid>

            {/* Sage Pro Analytics Section */}
            <h2 className={styles.sectionHeading}>Sage Pro Analytics</h2>
            <HubKPIGrid>
              <HubKPICard
                label="Pro Subscriptions"
                value={proSubscriptionsMetric.value}
                sublabel={formatMetricChange(
                  proSubscriptionsMetric.change,
                  proSubscriptionsMetric.changePercent,
                  'last_month'
                )}
                icon={Users}
                trend={proSubscriptionsMetric.trend}
              />
              <HubKPICard
                label="Monthly Usage"
                value={proMonthlyUsageMetric.value}
                sublabel={formatMetricChange(
                  proMonthlyUsageMetric.change,
                  proMonthlyUsageMetric.changePercent,
                  'last_month'
                )}
                icon={MessageSquare}
                trend={proMonthlyUsageMetric.trend}
              />
              <HubKPICard
                label="Monthly Recurring Revenue"
                value={formatCurrency(proMrrMetric.value)}
                sublabel={
                  proMrrMetric.change !== null
                    ? `${proMrrMetric.change >= 0 ? '+' : ''}${formatCurrency(proMrrMetric.change)} vs last month`
                    : undefined
                }
                icon={DollarSign}
                trend={proMrrMetric.trend}
              />
              <HubKPICard
                label="Avg Questions/User"
                value={proAvgQuestionsMetric.value > 0 ? proAvgQuestionsMetric.value.toFixed(0) : '0'}
                sublabel={
                  proAvgQuestionsMetric.previousValue
                    ? `${proAvgQuestionsMetric.previousValue.toFixed(0)} last month`
                    : 'Questions per Pro user'
                }
                icon={TrendingUp}
              />
            </HubKPIGrid>

            {/* Cost Analysis Section */}
            <h2 className={styles.sectionHeading}>Cost Analysis</h2>
            <HubKPIGrid>
              <HubKPICard
                label="Total AI Cost"
                value={formatCurrency(totalAICostMetric.value)}
                sublabel={formatMetricChange(
                  totalAICostMetric.change,
                  totalAICostMetric.changePercent,
                  'last_month'
                )}
                icon={DollarSign}
                trend={totalAICostMetric.trend}
              />
              <HubKPICard
                label="Cost per Question"
                value={costPerQuestionMetric.value > 0 ? formatCurrency(costPerQuestionMetric.value) : '£0.00'}
                sublabel={
                  costPerQuestionMetric.previousValue
                    ? `${formatCurrency(costPerQuestionMetric.previousValue)} last month`
                    : 'Average AI cost'
                }
                icon={DollarSign}
              />
              <HubKPICard
                label="Free Tier Margin"
                value={formatCurrency(marginFreeMetric.value)}
                sublabel={
                  marginFreeMetric.change !== null
                    ? `${marginFreeMetric.change >= 0 ? '+' : ''}${formatCurrency(marginFreeMetric.change)} vs last month`
                    : 'Loss on free tier'
                }
                icon={DollarSign}
                trend={marginFreeMetric.trend}
              />
              <HubKPICard
                label="Pro Tier Margin"
                value={formatCurrency(marginProMetric.value)}
                sublabel={
                  marginProMetric.change !== null
                    ? `${marginProMetric.change >= 0 ? '+' : ''}${formatCurrency(marginProMetric.change)} vs last month`
                    : 'Profit from Pro tier'
                }
                icon={DollarSign}
                trend={marginProMetric.trend}
              />
            </HubKPIGrid>
          </>
        )}

        {/* Subjects Tab */}
        {tabFilter === 'subjects' && (
          <>
            {/* Subject KPI Cards */}
            <HubKPIGrid>
              <HubKPICard
                label="Mathematics"
                value={subjectMathsMetric.value}
                sublabel={formatMetricChange(
                  subjectMathsMetric.change,
                  subjectMathsMetric.changePercent,
                  'last_month'
                )}
                icon={BookOpen}
                trend={subjectMathsMetric.trend}
              />
              <HubKPICard
                label="English"
                value={subjectEnglishMetric.value}
                sublabel={formatMetricChange(
                  subjectEnglishMetric.change,
                  subjectEnglishMetric.changePercent,
                  'last_month'
                )}
                icon={BookOpen}
                trend={subjectEnglishMetric.trend}
              />
              <HubKPICard
                label="Science"
                value={subjectScienceMetric.value}
                sublabel={formatMetricChange(
                  subjectScienceMetric.change,
                  subjectScienceMetric.changePercent,
                  'last_month'
                )}
                icon={BookOpen}
                trend={subjectScienceMetric.trend}
              />
              <HubKPICard
                label="General"
                value={subjectGeneralMetric.value}
                sublabel={formatMetricChange(
                  subjectGeneralMetric.change,
                  subjectGeneralMetric.changePercent,
                  'last_month'
                )}
                icon={BookOpen}
                trend={subjectGeneralMetric.trend}
              />
            </HubKPIGrid>

            {/* Subject Breakdown Chart */}
            <div className={styles.chartsSection}>
              <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load subject breakdown chart</div>}>
                <HubCategoryBreakdownChart
                  data={subjectBreakdownData}
                  title="Subject Distribution"
                  subtitle="Questions asked by subject"
                />
              </ErrorBoundary>
            </div>
          </>
        )}

        {/* Subscriptions Tab */}
        {tabFilter === 'subscriptions' && (
          <div className={styles.subscriptionsView}>
            <SageProSubscriptionsTable />
          </div>
        )}
      </HubPageLayout>
    </ErrorBoundary>
  );
}
