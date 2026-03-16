/*
 * Filename: src/app/(admin)/admin/sage/page.tsx
 * Purpose: Sage AI Tutor Analytics Dashboard
 * Created: 2026-02-17
 * Updated: 2026-03-16 - Full redesign: 9 tabs, expanded subjects, SEN/SEND, safety, outcomes
 *
 * Pattern: Follows Admin Dashboard pattern (Listings/Bookings/AI Tutors)
 */
'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { HubPageLayout, HubHeader, HubTabs } from '@/components/hub/layout';
import HubSidebar from '@/components/hub/sidebar/HubSidebar';
import { HubKPIGrid, HubKPICard, HubTrendChart, HubCategoryBreakdownChart, type CategoryData } from '@/components/hub/charts';
import { AdminStatsWidget, AdminHelpWidget, AdminTipWidget } from '@/components/admin/widgets';
import { useAdminMetric, formatMetricChange } from '@/hooks/useAdminMetric';
import { useAdminTrendData } from '@/hooks/useAdminTrendData';
import ErrorBoundary from '@/components/ui/feedback/ErrorBoundary';
import { ChartSkeleton } from '@/components/ui/feedback/LoadingSkeleton';
import {
  Bot, Users, MessageSquare, DollarSign, TrendingUp, BookOpen,
  AlertTriangle, ShieldAlert, Accessibility, Award,
} from 'lucide-react';
import Button from '@/components/ui/actions/Button';
import SageProSubscriptionsTable from './components/SageProSubscriptionsTable';
import CurriculumTable from './components/CurriculumTable';
import UsageAnalytics from './components/UsageAnalytics';
import CurriculumCoverage from './components/CurriculumCoverage';
import SENDashboard from './components/SENDashboard';
import SafetyMonitor from './components/SafetyMonitor';
import OutcomesPanel from './components/OutcomesPanel';
import styles from './page.module.css';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

type TabFilter =
  | 'overview' | 'usage' | 'quota' | 'subjects'
  | 'outcomes' | 'curriculum' | 'sen' | 'safety' | 'subscriptions';

// All 10 SageSubject values
const ALL_SUBJECTS = [
  'maths', 'english', 'science', 'computing', 'humanities',
  'languages', 'social-sciences', 'business', 'arts', 'general',
] as const;

const SUBJECT_LABELS: Record<string, string> = {
  maths: 'Mathematics',
  english: 'English',
  science: 'Science',
  computing: 'Computing',
  humanities: 'Humanities',
  languages: 'Languages',
  'social-sciences': 'Social Sciences',
  business: 'Business',
  arts: 'Arts',
  general: 'General',
};

const SUBJECT_COLORS: Record<string, string> = {
  maths: '#3B82F6',
  english: '#8B5CF6',
  science: '#10B981',
  computing: '#06B6D4',
  humanities: '#F59E0B',
  languages: '#EC4899',
  'social-sciences': '#6366F1',
  business: '#14B8A6',
  arts: '#F97316',
  general: '#6B7280',
};

export default function SageAnalyticsPage() {
  const _router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

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

  // Fetch real-time counts from sage tables
  const supabase = createClient();
  const { data: sageStats } = useQuery({
    queryKey: ['admin-sage-stats'],
    queryFn: async () => {
      const [sessionsRes, questionsRes, usersRes, safetyRes] = await Promise.all([
        supabase.from('sage_sessions').select('id', { count: 'exact', head: true }),
        supabase.from('sage_messages').select('id', { count: 'exact', head: true }).eq('role', 'user'),
        supabase.from('sage_sessions').select('user_id'),
        supabase.from('sage_safeguarding_events').select('id', { count: 'exact', head: true }),
      ]);
      const uniqueUsers = new Set(usersRes.data?.map((s: { user_id: string }) => s.user_id) || []).size;
      return {
        totalSessions: sessionsRes.count || 0,
        totalQuestions: questionsRes.count || 0,
        uniqueUsers,
        safetyEvents: safetyRes.count || 0,
      };
    },
    staleTime: 30000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Fetch historical metrics from platform_statistics_daily
  const sessionsMetric = useAdminMetric({ metric: 'sage_sessions_total', compareWith: 'last_month' });
  const questionsMetric = useAdminMetric({ metric: 'sage_questions_total', compareWith: 'last_month' });
  const uniqueUsersMetric = useAdminMetric({ metric: 'sage_unique_users', compareWith: 'last_month' });
  const freeUsersMetric = useAdminMetric({ metric: 'sage_free_users', compareWith: 'last_month' });
  const proUsersMetric = useAdminMetric({ metric: 'sage_pro_users', compareWith: 'last_month' });
  const proSubscriptionsMetric = useAdminMetric({ metric: 'sage_pro_subscriptions', compareWith: 'last_month' });
  const proMrrMetric = useAdminMetric({ metric: 'sage_pro_mrr', compareWith: 'last_month' });

  // Expanded subject metrics — all 10 subjects
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const subjectMathsMetric = useAdminMetric({ metric: 'sage_subject_maths', compareWith: 'last_month' });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const subjectEnglishMetric = useAdminMetric({ metric: 'sage_subject_english', compareWith: 'last_month' });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const subjectScienceMetric = useAdminMetric({ metric: 'sage_subject_science', compareWith: 'last_month' });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const subjectGeneralMetric = useAdminMetric({ metric: 'sage_subject_general', compareWith: 'last_month' });

  // Map metric hooks to subject names
  const subjectMetricValues: Record<string, { value: number; change: number | null; changePercent: number | null; trend?: 'up' | 'down' | 'neutral' }> = {
    maths: subjectMathsMetric,
    english: subjectEnglishMetric,
    science: subjectScienceMetric,
    general: subjectGeneralMetric,
  };

  // Subject breakdown from live API
  const { data: subjectData } = useQuery({
    queryKey: ['admin-sage-subjects'],
    queryFn: async () => {
      const res = await fetch('/api/admin/sage/analytics?type=subjects');
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 30000,
  });

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

  // Provider cost breakdown from live API
  const { data: quotaData } = useQuery({
    queryKey: ['admin-sage-quota-live'],
    queryFn: async () => {
      const res = await fetch('/api/admin/sage/analytics?type=quota');
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 30000,
    enabled: tabFilter === 'quota',
  });

  // Fetch trend data for charts (last 7 days)
  const sessionsTrendsQuery = useAdminTrendData({ metric: 'sage_sessions_total', days: 7 });
  const questionsTrendsQuery = useAdminTrendData({ metric: 'sage_questions_total', days: 7 });

  const isLoadingCharts = sessionsTrendsQuery.isLoading || questionsTrendsQuery.isLoading;

  // User type breakdown data
  const userTypeData: CategoryData[] = [
    { label: 'Free Users', value: freeUsersMetric.value, color: '#3B82F6' },
    { label: 'Pro Users', value: proUsersMetric.value, color: '#10B981' },
  ];

  // Subject breakdown data — all 10 subjects
  const subjectBreakdownData: CategoryData[] = ALL_SUBJECTS.map(subject => ({
    label: SUBJECT_LABELS[subject],
    value: subjectData?.subjects?.[subject] || subjectMetricValues[subject]?.value || 0,
    color: SUBJECT_COLORS[subject],
  })).filter(d => d.value > 0);

  // If no live data, still show all subjects with metric values
  const allSubjectData: CategoryData[] = ALL_SUBJECTS.map(subject => ({
    label: SUBJECT_LABELS[subject],
    value: subjectData?.subjects?.[subject] || subjectMetricValues[subject]?.value || 0,
    color: SUBJECT_COLORS[subject],
  }));

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Provider breakdown for cost tab
  const providerCostData: CategoryData[] = (quotaData?.costAnalysis?.providerBreakdown || []).map(
    (p: { provider: string; cost: number; percentage: number }) => ({
      label: formatProviderName(p.provider),
      value: p.cost,
      color: getProviderColor(p.provider),
    })
  );

  return (
    <ErrorBoundary>
      <HubPageLayout
        header={
          <HubHeader
            title="Sage Analytics"
            subtitle="AI Tutor usage, performance, and learning outcomes"
            actions={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['admin'] })}
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
              { id: 'outcomes', label: 'Outcomes', active: tabFilter === 'outcomes' },
              { id: 'curriculum', label: 'Curriculum', active: tabFilter === 'curriculum' },
              { id: 'sen', label: 'SEN/SEND', active: tabFilter === 'sen' },
              { id: 'safety', label: 'Safety', active: tabFilter === 'safety' },
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
                { label: 'Total Sessions', value: sageStats?.totalSessions ?? 0 },
                { label: 'Total Questions', value: sageStats?.totalQuestions ?? 0 },
                { label: 'Unique Users', value: sageStats?.uniqueUsers ?? 0 },
                { label: 'Pro Subscriptions', value: proSubscriptionsMetric.value },
                { label: 'Safety Events', value: sageStats?.safetyEvents ?? 0 },
              ]}
            />
            <AdminHelpWidget
              title="Sage Help"
              items={[
                { question: 'What is Sage?', answer: 'Sage is the AI tutor that helps students learn through interactive Q&A sessions across 10 subjects and all UK curriculum levels.' },
                { question: 'Free vs Pro?', answer: 'Free users get 10 questions/day. Pro users get unlimited access with priority support.' },
                { question: 'SEN/SEND Support?', answer: 'Sage adapts teaching for 11 SEN categories including dyslexia, ADHD, and ASD. Data shown in aggregate for GDPR compliance.' },
                { question: 'How are costs calculated?', answer: 'Costs are tracked per question via the 6-tier AI provider chain (Grok → Gemini → DeepSeek → Claude → GPT-4o → Rules).' },
              ]}
            />
            <AdminTipWidget
              title="Dashboard Tips"
              tips={[
                'Check Safety tab regularly for safeguarding events',
                'Monitor provider costs in Quota & Costs tab',
                'Review Outcomes to track student learning progress',
                'Use Coverage in Curriculum tab to find content gaps',
                'Track SEN/SEND adoption in the SEN tab',
              ]}
            />
          </HubSidebar>
        }
      >
        {/* Overview Tab */}
        {tabFilter === 'overview' && (
          <>
            <HubKPIGrid>
              <HubKPICard
                label="Total Sessions"
                value={sessionsMetric.value}
                sublabel={formatMetricChange(sessionsMetric.change, sessionsMetric.changePercent, 'last_month')}
                icon={Bot}
                trend={sessionsMetric.trend}
              />
              <HubKPICard
                label="Total Questions"
                value={questionsMetric.value}
                sublabel={formatMetricChange(questionsMetric.change, questionsMetric.changePercent, 'last_month')}
                icon={MessageSquare}
                trend={questionsMetric.trend}
              />
              <HubKPICard
                label="Unique Users"
                value={uniqueUsersMetric.value}
                sublabel={formatMetricChange(uniqueUsersMetric.change, uniqueUsersMetric.changePercent, 'last_month')}
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
                sublabel={formatMetricChange(freeUsersMetric.change, freeUsersMetric.changePercent, 'last_month')}
                icon={Users}
                trend={freeUsersMetric.trend}
              />
              <HubKPICard
                label="Pro Users"
                value={proUsersMetric.value}
                sublabel={formatMetricChange(proUsersMetric.change, proUsersMetric.changePercent, 'last_month')}
                icon={Users}
                trend={proUsersMetric.trend}
              />
              <HubKPICard
                label="Pro Subscriptions"
                value={proSubscriptionsMetric.value}
                sublabel={formatMetricChange(proSubscriptionsMetric.change, proSubscriptionsMetric.changePercent, 'last_month')}
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
              {(sageStats?.safetyEvents ?? 0) > 0 && (
                <HubKPICard
                  label="Safety Events"
                  value={sageStats?.safetyEvents ?? 0}
                  sublabel="Review in Safety tab"
                  icon={ShieldAlert}
                  trend="up"
                  variant="warning"
                />
              )}
            </HubKPIGrid>

            <div className={styles.chartsSection}>
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

        {/* Usage Tab */}
        {tabFilter === 'usage' && <UsageAnalytics />}

        {/* Quota & Costs Tab */}
        {tabFilter === 'quota' && (
          <>
            <h2 className={styles.sectionHeading}>Free Tier Analytics</h2>
            <HubKPIGrid>
              <HubKPICard
                label="Free Users"
                value={freeUsersMetric.value}
                sublabel={formatMetricChange(freeUsersMetric.change, freeUsersMetric.changePercent, 'last_month')}
                icon={Users}
                trend={freeUsersMetric.trend}
              />
              <HubKPICard
                label="Daily Usage"
                value={freeDailyUsageMetric.value}
                sublabel={formatMetricChange(freeDailyUsageMetric.change, freeDailyUsageMetric.changePercent, 'last_month')}
                icon={MessageSquare}
                trend={freeDailyUsageMetric.trend}
              />
              <HubKPICard
                label="Limit Hits"
                value={freeLimitHitsMetric.value}
                sublabel={formatMetricChange(freeLimitHitsMetric.change, freeLimitHitsMetric.changePercent, 'last_month')}
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

            <h2 className={styles.sectionHeading}>Sage Pro Analytics</h2>
            <HubKPIGrid>
              <HubKPICard
                label="Pro Subscriptions"
                value={proSubscriptionsMetric.value}
                sublabel={formatMetricChange(proSubscriptionsMetric.change, proSubscriptionsMetric.changePercent, 'last_month')}
                icon={Users}
                trend={proSubscriptionsMetric.trend}
              />
              <HubKPICard
                label="Monthly Usage"
                value={proMonthlyUsageMetric.value}
                sublabel={formatMetricChange(proMonthlyUsageMetric.change, proMonthlyUsageMetric.changePercent, 'last_month')}
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

            <h2 className={styles.sectionHeading}>Cost Analysis</h2>
            <HubKPIGrid>
              <HubKPICard
                label="Total AI Cost"
                value={formatCurrency(totalAICostMetric.value)}
                sublabel={formatMetricChange(totalAICostMetric.change, totalAICostMetric.changePercent, 'last_month')}
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

            {/* Provider Cost Breakdown */}
            {providerCostData.length > 0 && (
              <div className={styles.chartsSection}>
                <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load provider breakdown</div>}>
                  <HubCategoryBreakdownChart
                    data={providerCostData}
                    title="Cost by AI Provider"
                    subtitle="Breakdown of AI costs across the 6-tier fallback chain"
                  />
                </ErrorBoundary>
              </div>
            )}
          </>
        )}

        {/* Subjects Tab — Expanded to all 10 */}
        {tabFilter === 'subjects' && (
          <>
            <HubKPIGrid>
              {ALL_SUBJECTS.map(subject => (
                <HubKPICard
                  key={subject}
                  label={SUBJECT_LABELS[subject]}
                  value={subjectData?.subjects?.[subject] || subjectMetricValues[subject]?.value || 0}
                  sublabel={
                    subjectMetricValues[subject]?.change !== null && subjectMetricValues[subject]?.change !== undefined
                      ? formatMetricChange(subjectMetricValues[subject].change, subjectMetricValues[subject].changePercent, 'last_month')
                      : `Sessions in ${SUBJECT_LABELS[subject]}`
                  }
                  icon={BookOpen}
                  trend={subjectMetricValues[subject]?.trend}
                />
              ))}
            </HubKPIGrid>

            <div className={styles.chartsSection}>
              <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load subject breakdown chart</div>}>
                <HubCategoryBreakdownChart
                  data={subjectBreakdownData.length > 0 ? subjectBreakdownData : allSubjectData}
                  title="Subject Distribution"
                  subtitle="Sessions by subject across all curriculum levels"
                />
              </ErrorBoundary>

              {/* Level × Subject heatmap */}
              {subjectData?.subjectByLevel && (
                <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load level breakdown</div>}>
                  <div className={styles.section}>
                    <h2 className={styles.sectionHeading}>Sessions by Level</h2>
                    <div className={styles.levelGrid}>
                      {Object.entries(subjectData.subjectByLevel as Record<string, Record<string, number>>).map(
                        ([subject, levels]) => (
                          <div key={subject} className={styles.levelGridItem}>
                            <span className={styles.levelGridSubject}>{SUBJECT_LABELS[subject] || subject}</span>
                            <div className={styles.levelTags}>
                              {Object.entries(levels).map(([level, count]) => (
                                <span key={level} className={styles.levelTag}>
                                  {level}: {count}
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </ErrorBoundary>
              )}
            </div>
          </>
        )}

        {/* Outcomes Tab */}
        {tabFilter === 'outcomes' && <OutcomesPanel />}

        {/* Curriculum Tab */}
        {tabFilter === 'curriculum' && (
          <div className={styles.curriculumTabs}>
            <CurriculumTable />
            <div style={{ marginTop: '2rem' }}>
              <h2 className={styles.sectionHeading}>Coverage Analysis</h2>
              <CurriculumCoverage />
            </div>
          </div>
        )}

        {/* SEN/SEND Tab */}
        {tabFilter === 'sen' && <SENDashboard />}

        {/* Safety Tab */}
        {tabFilter === 'safety' && <SafetyMonitor />}

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

function formatProviderName(provider: string): string {
  const names: Record<string, string> = {
    'grok-4-fast': 'Grok 4 Fast',
    'gemini-flash': 'Gemini Flash',
    'deepseek-r1': 'DeepSeek R1',
    'claude-sonnet': 'Claude Sonnet',
    'gpt-4o': 'GPT-4o',
    'rules-based': 'Rules-based',
    unknown: 'Unknown',
  };
  return names[provider] || provider.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getProviderColor(provider: string): string {
  const colors: Record<string, string> = {
    'grok-4-fast': '#EF4444',
    'gemini-flash': '#3B82F6',
    'deepseek-r1': '#10B981',
    'claude-sonnet': '#F59E0B',
    'gpt-4o': '#8B5CF6',
    'rules-based': '#6B7280',
  };
  return colors[provider] || '#9CA3AF';
}
