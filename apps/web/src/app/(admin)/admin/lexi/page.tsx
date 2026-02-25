/*
 * Filename: src/app/(admin)/admin/lexi/page.tsx
 * Purpose: Lexi AI Assistant Analytics Dashboard
 * Created: 2026-02-13
 * Updated: 2026-02-25 - Refactored to use Hub architecture components
 *
 * Pattern: Follows Admin Dashboard pattern (Sage/Listings/Bookings)
 */
'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import { HubKPIGrid, HubKPICard, HubTrendChart, HubCategoryBreakdownChart, type CategoryData } from '@/app/components/hub/charts';
import { AdminStatsWidget, AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import { useAdminMetric, formatMetricChange } from '@/hooks/useAdminMetric';
import { useAdminTrendData } from '@/hooks/useAdminTrendData';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import { ChartSkeleton } from '@/app/components/ui/feedback/LoadingSkeleton';
import Button from '@/app/components/ui/actions/Button';
import { MessageSquare, FileText, Users, BarChart, ThumbsUp, ThumbsDown, FileCheck, Bot, Sparkles, Settings, DollarSign, TrendingUp, AlertCircle, Calendar, Activity, Clock, RefreshCw } from 'lucide-react';
import styles from './page.module.css';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

type TabFilter = 'overview' | 'conversations' | 'feedback' | 'providers' | 'quota';

interface ProviderInfo {
  type: string;
  name: string;
  description: string;
  available: boolean;
  requiresApiKey: boolean;
  envVar?: string;
  current: boolean;
}

interface ProviderData {
  current: string;
  currentName: string;
  providers: ProviderInfo[];
}

export default function LexiAnalyticsPage() {
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
    window.location.href = `/admin/lexi${params.toString() ? `?${params.toString()}` : ''}`;
  };

  // Fetch real-time counts from lexi tables
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { data: lexiStats } = useQuery({
    queryKey: ['admin-lexi-stats'],
    queryFn: async () => {
      const [conversationsRes, messagesRes, usersRes] = await Promise.all([
        supabase.from('lexi_conversations').select('id', { count: 'exact', head: true }),
        supabase.from('lexi_messages').select('id', { count: 'exact', head: true }),
        supabase.from('lexi_conversations').select('user_id'),
      ]);
      const uniqueUsers = new Set(usersRes.data?.map((s: { user_id: string }) => s.user_id) || []).size;
      return {
        totalConversations: conversationsRes.count || 0,
        totalMessages: messagesRes.count || 0,
        uniqueUsers,
      };
    },
    staleTime: 30000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Fetch historical metrics from platform_statistics_daily
  const conversationsMetric = useAdminMetric({ metric: 'lexi_conversations_total', compareWith: 'last_month' });
  const messagesMetric = useAdminMetric({ metric: 'lexi_messages_total', compareWith: 'last_month' });
  const uniqueUsersMetric = useAdminMetric({ metric: 'lexi_unique_users', compareWith: 'last_month' });
  const avgMessagesMetric = useAdminMetric({ metric: 'lexi_avg_messages_per_conversation', compareWith: 'last_month' });

  // Feedback metrics
  const feedbackPositiveMetric = useAdminMetric({ metric: 'lexi_feedback_positive', compareWith: 'last_month' });
  const feedbackNegativeMetric = useAdminMetric({ metric: 'lexi_feedback_negative', compareWith: 'last_month' });
  const satisfactionRateMetric = useAdminMetric({ metric: 'lexi_satisfaction_rate', compareWith: 'last_month' });

  // Persona metrics
  const personaStudentMetric = useAdminMetric({ metric: 'lexi_persona_student', compareWith: 'last_month' });
  const personaTutorMetric = useAdminMetric({ metric: 'lexi_persona_tutor', compareWith: 'last_month' });
  const personaClientMetric = useAdminMetric({ metric: 'lexi_persona_client', compareWith: 'last_month' });
  const personaAgentMetric = useAdminMetric({ metric: 'lexi_persona_agent', compareWith: 'last_month' });
  const personaOrganisationMetric = useAdminMetric({ metric: 'lexi_persona_organisation', compareWith: 'last_month' });

  // Provider metrics
  const providerRulesMetric = useAdminMetric({ metric: 'lexi_provider_rules', compareWith: 'last_month' });
  const providerClaudeMetric = useAdminMetric({ metric: 'lexi_provider_claude', compareWith: 'last_month' });
  const providerGeminiMetric = useAdminMetric({ metric: 'lexi_provider_gemini', compareWith: 'last_month' });

  // Quota metrics - Free Tier
  const dailyUsageMetric = useAdminMetric({ metric: 'lexi_daily_usage', compareWith: 'last_month' });
  const limitHitsMetric = useAdminMetric({ metric: 'lexi_limit_hits', compareWith: 'last_month' });
  const totalUsersMetric = useAdminMetric({ metric: 'lexi_total_users', compareWith: 'last_month' });
  const avgConversationsPerUserMetric = useAdminMetric({ metric: 'lexi_avg_conversations_per_user', compareWith: 'last_month' });

  // Quota metrics - Usage Limits
  const dailyQuotaUsedMetric = useAdminMetric({ metric: 'lexi_daily_quota_used', compareWith: 'last_month' });
  const dailyQuotaRemainingMetric = useAdminMetric({ metric: 'lexi_daily_quota_remaining', compareWith: 'last_month' });
  const quotaResetRateMetric = useAdminMetric({ metric: 'lexi_quota_reset_rate', compareWith: 'last_month' });

  // Cost metrics
  const aiCostTotalMetric = useAdminMetric({ metric: 'lexi_ai_cost_total', compareWith: 'last_month' });
  const costPerConversationMetric = useAdminMetric({ metric: 'lexi_cost_per_conversation', compareWith: 'last_month' });
  const _freeUsagePercentMetric = useAdminMetric({ metric: 'lexi_free_usage_percent', compareWith: 'last_month' });
  const paidUsagePercentMetric = useAdminMetric({ metric: 'lexi_paid_usage_percent', compareWith: 'last_month' });
  const monthlyProjectionMetric = useAdminMetric({ metric: 'lexi_monthly_projection', compareWith: 'last_month' });

  // Fetch trend data for charts (last 7 days)
  const conversationsTrendsQuery = useAdminTrendData({ metric: 'lexi_conversations_total', days: 7 });
  const messagesTrendsQuery = useAdminTrendData({ metric: 'lexi_messages_total', days: 7 });

  const isLoadingCharts = conversationsTrendsQuery.isLoading || messagesTrendsQuery.isLoading;

  // Persona breakdown data
  const personaBreakdownData: CategoryData[] = [
    { label: 'Student', value: personaStudentMetric.value, color: '#3B82F6' },
    { label: 'Tutor', value: personaTutorMetric.value, color: '#10B981' },
    { label: 'Parent', value: personaClientMetric.value, color: '#F59E0B' },
    { label: 'Agent', value: personaAgentMetric.value, color: '#8B5CF6' },
    { label: 'Organisation', value: personaOrganisationMetric.value, color: '#EC4899' },
  ];

  // Provider breakdown data
  const providerBreakdownData: CategoryData[] = [
    { label: 'Rules', value: providerRulesMetric.value, color: '#10B981' },
    { label: 'Claude', value: providerClaudeMetric.value, color: '#F59E0B' },
    { label: 'Gemini', value: providerGeminiMetric.value, color: '#3B82F6' },
  ];

  // Calculate feedback rate
  const feedbackTotal = feedbackPositiveMetric.value + feedbackNegativeMetric.value;
  const feedbackRate = feedbackTotal > 0
    ? Math.round((feedbackPositiveMetric.value / feedbackTotal) * 100)
    : 0;

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
            title="Lexi Analytics"
            subtitle="AI Assistant Usage & Performance"
            className={styles.lexiHeader}
            actions={
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button variant="secondary" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['admin'] })}>
                  Refresh Data
                </Button>
                <Button variant="secondary" size="sm" onClick={() => router.push('/admin')}>
                  Back to Dashboard
                </Button>
              </div>
            }
          />
        }
        tabs={
          <HubTabs
            tabs={[
              { id: 'overview', label: 'Overview', active: tabFilter === 'overview' },
              { id: 'conversations', label: 'Conversations', active: tabFilter === 'conversations' },
              { id: 'feedback', label: 'Feedback', active: tabFilter === 'feedback' },
              { id: 'providers', label: 'Providers', active: tabFilter === 'providers' },
              { id: 'quota', label: 'Quota & Costs', active: tabFilter === 'quota' },
            ]}
            onTabChange={handleTabChange}
            className={styles.lexiTabs}
          />
        }
        sidebar={
          <HubSidebar>
            <AdminStatsWidget
              title="Quick Stats"
              stats={[
                { label: 'Total Conversations', value: lexiStats?.totalConversations ?? 0 },
                { label: 'Total Messages', value: lexiStats?.totalMessages ?? 0 },
                { label: 'Unique Users', value: lexiStats?.uniqueUsers ?? 0 },
                { label: 'Satisfaction Rate', value: `${feedbackRate}%`, valueColor: feedbackRate >= 80 ? 'green' : feedbackRate >= 50 ? 'orange' : 'default' },
              ]}
            />
            <AdminHelpWidget
              title="Lexi Help"
              items={[
                { question: 'What is Lexi?', answer: 'Lexi is the AI help assistant that answers platform questions for users.' },
                { question: 'How do providers work?', answer: 'Lexi can use Rules (free), Claude, or Gemini as its AI backend. Switch in the Providers tab.' },
                { question: 'What are limit hits?', answer: 'When users reach their daily free conversation limit, tracked to identify upgrade opportunities.' },
              ]}
            />
            <AdminTipWidget
              title="Analytics Tips"
              tips={[
                'Monitor feedback rates to identify areas for improvement',
                'Track provider usage for cost optimization',
                'Review persona distribution to understand user needs',
                'Check limit hits to identify upgrade opportunities',
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
                label="Total Conversations"
                value={conversationsMetric.value}
                sublabel={formatMetricChange(
                  conversationsMetric.change,
                  conversationsMetric.changePercent,
                  'last_month'
                )}
                icon={MessageSquare}
                trend={conversationsMetric.trend}
              />
              <HubKPICard
                label="Total Messages"
                value={messagesMetric.value}
                sublabel={formatMetricChange(
                  messagesMetric.change,
                  messagesMetric.changePercent,
                  'last_month'
                )}
                icon={FileText}
                trend={messagesMetric.trend}
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
                label="Avg Messages/Conv"
                value={avgMessagesMetric.value > 0 ? avgMessagesMetric.value.toFixed(1) : '0'}
                sublabel={
                  avgMessagesMetric.previousValue
                    ? `${avgMessagesMetric.previousValue.toFixed(1)} last month`
                    : undefined
                }
                icon={BarChart}
              />
              <HubKPICard
                label="Satisfaction Rate"
                value={`${satisfactionRateMetric.value.toFixed(0)}%`}
                sublabel={formatMetricChange(
                  satisfactionRateMetric.change,
                  satisfactionRateMetric.changePercent,
                  'last_month'
                )}
                icon={ThumbsUp}
                trend={satisfactionRateMetric.trend}
                variant={satisfactionRateMetric.value >= 80 ? 'success' : satisfactionRateMetric.value >= 50 ? 'info' : 'warning'}
              />
              <HubKPICard
                label="Positive Feedback"
                value={feedbackPositiveMetric.value}
                sublabel={formatMetricChange(
                  feedbackPositiveMetric.change,
                  feedbackPositiveMetric.changePercent,
                  'last_month'
                )}
                icon={ThumbsUp}
                trend={feedbackPositiveMetric.trend}
                variant="success"
              />
              <HubKPICard
                label="Negative Feedback"
                value={feedbackNegativeMetric.value}
                sublabel={formatMetricChange(
                  feedbackNegativeMetric.change,
                  feedbackNegativeMetric.changePercent,
                  'last_month'
                )}
                icon={ThumbsDown}
                trend={feedbackNegativeMetric.trend}
                variant="warning"
              />
              <HubKPICard
                label="Total Users"
                value={totalUsersMetric.value}
                sublabel={formatMetricChange(
                  totalUsersMetric.change,
                  totalUsersMetric.changePercent,
                  'last_month'
                )}
                icon={Users}
                trend={totalUsersMetric.trend}
              />
            </HubKPIGrid>

            {/* Charts Section */}
            <div className={styles.chartsSection}>
              {/* Conversation Trends Chart */}
              <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load conversation trends chart</div>}>
                {isLoadingCharts ? (
                  <ChartSkeleton height="320px" />
                ) : (
                  <HubTrendChart
                    data={conversationsTrendsQuery.data}
                    title="Conversation Trends"
                    subtitle="Last 7 days"
                    valueName="Conversations"
                    lineColor="#3B82F6"
                  />
                )}
              </ErrorBoundary>

              {/* Messages Trends Chart */}
              <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load messages trends chart</div>}>
                {isLoadingCharts ? (
                  <ChartSkeleton height="320px" />
                ) : (
                  <HubTrendChart
                    data={messagesTrendsQuery.data}
                    title="Messages Trends"
                    subtitle="Last 7 days"
                    valueName="Messages"
                    lineColor="#10B981"
                  />
                )}
              </ErrorBoundary>

              {/* Persona Breakdown */}
              <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load persona breakdown chart</div>}>
                <HubCategoryBreakdownChart
                  data={personaBreakdownData}
                  title="Conversations by Persona"
                  subtitle="User type distribution"
                />
              </ErrorBoundary>
            </div>
          </>
        )}

        {/* Conversations Tab - Coming Soon */}
        {tabFilter === 'conversations' && (
          <HubEmptyState
            title="Conversation Browser"
            description="Browse and review individual conversations. Coming in next update."
            icon={<MessageSquare size={48} />}
          />
        )}

        {/* Feedback Tab */}
        {tabFilter === 'feedback' && (
          <>
            <HubKPIGrid>
              <HubKPICard
                label="Positive Feedback"
                value={feedbackPositiveMetric.value}
                sublabel={formatMetricChange(
                  feedbackPositiveMetric.change,
                  feedbackPositiveMetric.changePercent,
                  'last_month'
                )}
                icon={ThumbsUp}
                trend={feedbackPositiveMetric.trend}
                variant="success"
              />
              <HubKPICard
                label="Negative Feedback"
                value={feedbackNegativeMetric.value}
                sublabel={formatMetricChange(
                  feedbackNegativeMetric.change,
                  feedbackNegativeMetric.changePercent,
                  'last_month'
                )}
                icon={ThumbsDown}
                trend={feedbackNegativeMetric.trend}
                variant="warning"
              />
              <HubKPICard
                label="Satisfaction Rate"
                value={`${satisfactionRateMetric.value.toFixed(0)}%`}
                sublabel={formatMetricChange(
                  satisfactionRateMetric.change,
                  satisfactionRateMetric.changePercent,
                  'last_month'
                )}
                icon={BarChart}
                trend={satisfactionRateMetric.trend}
                variant={satisfactionRateMetric.value >= 80 ? 'success' : satisfactionRateMetric.value >= 50 ? 'info' : 'warning'}
              />
            </HubKPIGrid>

            {/* HubEmptyState renders directly - no section wrapper for "coming soon" features */}
            <HubEmptyState
              title="Feedback Review"
              description="Detailed feedback review with comments coming soon."
              icon={<MessageSquare size={48} />}
            />
          </>
        )}

        {/* Providers Tab */}
        {tabFilter === 'providers' && (
          <ProvidersTab
            providerBreakdownData={providerBreakdownData}
          />
        )}

        {/* Quota & Costs Tab */}
        {tabFilter === 'quota' && (
          <>
            {/* Free Tier Analytics Section */}
            <h2 className={styles.sectionHeading}>Free Tier Analytics</h2>
            <HubKPIGrid>
              <HubKPICard
                label="Total Users"
                value={totalUsersMetric.value}
                sublabel={formatMetricChange(
                  totalUsersMetric.change,
                  totalUsersMetric.changePercent,
                  'last_month'
                )}
                icon={Users}
                trend={totalUsersMetric.trend}
              />
              <HubKPICard
                label="Daily Usage"
                value={dailyUsageMetric.value}
                sublabel={formatMetricChange(
                  dailyUsageMetric.change,
                  dailyUsageMetric.changePercent,
                  'last_month'
                )}
                icon={Calendar}
                trend={dailyUsageMetric.trend}
              />
              <HubKPICard
                label="Limit Hits"
                value={limitHitsMetric.value}
                sublabel={formatMetricChange(
                  limitHitsMetric.change,
                  limitHitsMetric.changePercent,
                  'last_month'
                )}
                icon={AlertCircle}
                trend={limitHitsMetric.trend}
                variant={limitHitsMetric.value > 0 ? 'warning' : 'neutral'}
              />
              <HubKPICard
                label="Avg Conversations/User"
                value={avgConversationsPerUserMetric.value > 0 ? avgConversationsPerUserMetric.value.toFixed(1) : '0'}
                sublabel={
                  avgConversationsPerUserMetric.previousValue
                    ? `${avgConversationsPerUserMetric.previousValue.toFixed(1)} last month`
                    : 'Conversations per user'
                }
                icon={TrendingUp}
              />
            </HubKPIGrid>

            {/* Usage Limits Section */}
            <h2 className={styles.sectionHeading}>Usage Limits</h2>
            <HubKPIGrid>
              <HubKPICard
                label="Daily Quota Used"
                value={dailyQuotaUsedMetric.value}
                sublabel={formatMetricChange(
                  dailyQuotaUsedMetric.change,
                  dailyQuotaUsedMetric.changePercent,
                  'last_month'
                )}
                icon={Activity}
                trend={dailyQuotaUsedMetric.trend}
              />
              <HubKPICard
                label="Daily Quota Remaining"
                value={dailyQuotaRemainingMetric.value}
                sublabel={formatMetricChange(
                  dailyQuotaRemainingMetric.change,
                  dailyQuotaRemainingMetric.changePercent,
                  'last_month'
                )}
                icon={Clock}
                trend={dailyQuotaRemainingMetric.trend}
              />
              <HubKPICard
                label="Limit Hits"
                value={limitHitsMetric.value}
                sublabel={formatMetricChange(
                  limitHitsMetric.change,
                  limitHitsMetric.changePercent,
                  'last_month'
                )}
                icon={AlertCircle}
                trend={limitHitsMetric.trend}
                variant={limitHitsMetric.value > 0 ? 'warning' : 'neutral'}
              />
              <HubKPICard
                label="Quota Reset Rate"
                value={`${quotaResetRateMetric.value.toFixed(1)}%`}
                sublabel={
                  quotaResetRateMetric.previousValue !== null
                    ? `${quotaResetRateMetric.previousValue.toFixed(1)}% last month`
                    : 'Users hitting daily reset'
                }
                icon={RefreshCw}
              />
            </HubKPIGrid>

            {/* Cost Analysis Section */}
            <h2 className={styles.sectionHeading}>Cost Analysis</h2>
            <HubKPIGrid>
              <HubKPICard
                label="Total AI Cost"
                value={formatCurrency(aiCostTotalMetric.value)}
                sublabel={formatMetricChange(
                  aiCostTotalMetric.change,
                  aiCostTotalMetric.changePercent,
                  'last_month'
                )}
                icon={DollarSign}
                trend={aiCostTotalMetric.trend}
              />
              <HubKPICard
                label="Cost per Conversation"
                value={costPerConversationMetric.value > 0 ? formatCurrency(costPerConversationMetric.value) : '£0.00'}
                sublabel={
                  costPerConversationMetric.previousValue
                    ? `${formatCurrency(costPerConversationMetric.previousValue)} last month`
                    : 'Average AI cost'
                }
                icon={DollarSign}
              />
              <HubKPICard
                label="Paid Usage %"
                value={`${paidUsagePercentMetric.value.toFixed(1)}%`}
                sublabel={
                  paidUsagePercentMetric.previousValue !== null
                    ? `${paidUsagePercentMetric.previousValue.toFixed(1)}% last month`
                    : 'AI provider usage'
                }
                icon={Sparkles}
              />
              <HubKPICard
                label="Monthly Projection"
                value={formatCurrency(monthlyProjectionMetric.value)}
                sublabel={
                  monthlyProjectionMetric.change !== null
                    ? `${monthlyProjectionMetric.change >= 0 ? '+' : ''}${formatCurrency(monthlyProjectionMetric.change)} vs last month`
                    : 'Estimated monthly cost'
                }
                icon={TrendingUp}
                trend={monthlyProjectionMetric.trend}
              />
            </HubKPIGrid>
          </>
        )}
      </HubPageLayout>
    </ErrorBoundary>
  );
}

// --- Tab Components ---

interface ProvidersTabProps {
  providerBreakdownData: CategoryData[];
}

function ProvidersTab({ providerBreakdownData }: ProvidersTabProps) {
  const queryClient = useQueryClient();

  // Fetch provider configuration
  const { data: providerData, isLoading: providerLoading } = useQuery({
    queryKey: ['admin', 'lexi', 'providers'],
    queryFn: async () => {
      const response = await fetch('/api/lexi/provider');
      if (!response.ok) throw new Error('Failed to fetch providers');
      return response.json() as Promise<ProviderData>;
    },
    staleTime: 30 * 1000,
  });

  // Mutation to change provider
  const changeProviderMutation = useMutation({
    mutationFn: async (type: string) => {
      const response = await fetch('/api/lexi/provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to change provider');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'lexi', 'providers'] });
    },
  });

  if (providerLoading) {
    return <div className={styles.loading}>Loading provider data...</div>;
  }

  return (
    <div className={styles.chartsSection}>
      {/* Active Provider Selection */}
      <div className={styles.widget}>
        <div className={styles.widgetHeader}>
          <h2>Active Provider</h2>
        </div>

        <div className={styles.providerCards}>
          {providerData?.providers.map((provider) => (
            <button
              key={provider.type}
              className={`${styles.providerCard} ${provider.current ? styles.providerCardActive : ''} ${!provider.available ? styles.providerCardDisabled : ''}`}
              onClick={() => provider.available && !provider.current && changeProviderMutation.mutate(provider.type)}
              disabled={!provider.available || provider.current || changeProviderMutation.isPending}
            >
              <div className={styles.providerCardHeader}>
                <div className={`${styles.providerIcon} ${styles[`providerIcon${capitalize(provider.type)}`]}`}>
                  {React.createElement(getProviderIcon(provider.type), { size: 20 })}
                </div>
                {provider.current && (
                  <span className={styles.activeBadge}>Active</span>
                )}
                {!provider.available && (
                  <span className={styles.unavailableBadge}>Unavailable</span>
                )}
              </div>
              <h4 className={styles.providerCardTitle}>{provider.name}</h4>
              <p className={styles.providerCardDescription}>{provider.description}</p>
              {!provider.available && provider.requiresApiKey && (
                <p className={styles.providerCardHint}>
                  Set {provider.envVar} to enable
                </p>
              )}
              {changeProviderMutation.isPending && changeProviderMutation.variables === provider.type && (
                <span className={styles.switchingIndicator}>Switching...</span>
              )}
            </button>
          ))}
        </div>

        {changeProviderMutation.isError && (
          <div className={styles.errorMessage}>
            {changeProviderMutation.error.message}
          </div>
        )}
      </div>

      {/* Provider Distribution - Using Hub Chart */}
      <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load provider breakdown chart</div>}>
        <HubCategoryBreakdownChart
          data={providerBreakdownData}
          title="Provider Distribution"
          subtitle="Messages by provider"
        />
      </ErrorBoundary>

      {/* Provider Comparison */}
      <div className={styles.widget}>
        <div className={styles.widgetHeader}>
          <h2>Provider Comparison</h2>
        </div>
        <div className={styles.comparisonTable}>
          <div className={styles.comparisonHeader}>
            <span>Feature</span>
            <span>Rules</span>
            <span>Claude</span>
            <span>Gemini</span>
          </div>
          <div className={styles.comparisonRow}>
            <span>API Cost</span>
            <span className={styles.featureGood}>Free</span>
            <span className={styles.featureNeutral}>Per token</span>
            <span className={styles.featureNeutral}>Per token</span>
          </div>
          <div className={styles.comparisonRow}>
            <span>Response Quality</span>
            <span className={styles.featureNeutral}>Basic</span>
            <span className={styles.featureGood}>Excellent</span>
            <span className={styles.featureGood}>Good</span>
          </div>
          <div className={styles.comparisonRow}>
            <span>Streaming</span>
            <span className={styles.featureBad}>No</span>
            <span className={styles.featureGood}>Yes</span>
            <span className={styles.featureGood}>Yes</span>
          </div>
          <div className={styles.comparisonRow}>
            <span>Offline Support</span>
            <span className={styles.featureGood}>Yes</span>
            <span className={styles.featureBad}>No</span>
            <span className={styles.featureBad}>No</span>
          </div>
          <div className={styles.comparisonRow}>
            <span>Best For</span>
            <span>Simple queries</span>
            <span>Complex tasks</span>
            <span>General use</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Helpers ---

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getProviderIcon(type: string) {
  switch (type) {
    case 'rules': return FileCheck;
    case 'claude': return Bot;
    case 'gemini': return Sparkles;
    default: return Settings;
  }
}
