/*
 * Filename: src/app/(admin)/admin/ai-agents/page.tsx
 * Purpose: Admin AI Agents overview page - manage platform and user AI agents
 * Created: 2026-02-24
 * Pattern: Follows Admin Listings pattern with 3 tabs (Overview + All AI Agents + Create New)
 */
'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import HubPageLayout from '@/components/hub/layout/HubPageLayout';
import HubHeader from '@/components/hub/layout/HubHeader';
import HubTabs from '@/components/hub/layout/HubTabs';
import HubSidebar from '@/components/hub/sidebar/HubSidebar';
import { AdminStatsWidget, AdminHelpWidget, AdminTipWidget } from '@/components/admin/widgets';
import { Bot, Activity, Users, FileEdit, MessageSquare, TrendingUp } from 'lucide-react';
import { usePermission } from '@/lib/rbac';
import { HubKPIGrid, HubKPICard, HubCategoryBreakdownChart, HubTrendChart, type CategoryData } from '@/components/hub/charts';
import { useAdminMetric, formatMetricChange } from '@/hooks/useAdminMetric';
import { useAdminTrendData } from '@/hooks/useAdminTrendData';
import AIAgentsTable from './components/AIAgentsTable';
import AdminAIAgentCreateTab from './components/AdminAIAgentCreateTab';
import ErrorBoundary from '@/components/ui/feedback/ErrorBoundary';
import { ChartSkeleton } from '@/components/ui/feedback/LoadingSkeleton';
import styles from './page.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function AdminAIAgentsOverviewPage() {
  const canViewAIAgents = usePermission('ai_agents', 'view');
  const [activeTab, setActiveTab] = useState<'overview' | 'all-ai-agents' | 'create-new'>('overview');

  // Fetch real-time AI tutor counts from ai_agents table
  const supabase = createClient();
  const { data: aiTutorStats } = useQuery({
    queryKey: ['admin-ai-tutor-stats'],
    queryFn: async () => {
      const [totalRes, activeRes, platformRes, userRes] = await Promise.all([
        supabase.from('ai_agents').select('id', { count: 'exact', head: true }),
        supabase.from('ai_agents').select('id', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('ai_agents').select('id', { count: 'exact', head: true }).eq('is_platform_owned', true),
        supabase.from('ai_agents').select('id', { count: 'exact', head: true }).eq('is_platform_owned', false),
      ]);
      return {
        total: totalRes.count || 0,
        active: activeRes.count || 0,
        platform: platformRes.count || 0,
        user: userRes.count || 0,
      };
    },
    staleTime: 30000, // 30 seconds
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Fetch AI tutor metrics with historical comparison
  const totalAIAgentsMetric = useAdminMetric({ metric: 'ai_agents_total', compareWith: 'last_month' });
  const activeAIAgentsMetric = useAdminMetric({ metric: 'ai_agents_active', compareWith: 'last_month' });
  const platformAIAgentsMetric = useAdminMetric({ metric: 'ai_agents_platform', compareWith: 'last_month' });
  const userAIAgentsMetric = useAdminMetric({ metric: 'ai_agents_user', compareWith: 'last_month' });
  const draftAIAgentsMetric = useAdminMetric({ metric: 'ai_agents_draft', compareWith: 'last_month' });
  const totalSessionsMetric = useAdminMetric({ metric: 'ai_agent_sessions_total', compareWith: 'last_month' });
  const activeRateMetric = useAdminMetric({ metric: 'ai_agents_active_rate', compareWith: 'last_month' });

  // Fetch trend data from platform_statistics_daily (last 7 days)
  const aiTutorTrendsQuery = useAdminTrendData({ metric: 'ai_agents_total', days: 7 });
  const sessionsTrendsQuery = useAdminTrendData({ metric: 'ai_agent_sessions_total', days: 7 });

  const isLoadingCharts = aiTutorTrendsQuery.isLoading || sessionsTrendsQuery.isLoading;

  // AI Tutor ownership breakdown data (using real-time counts)
  const ownershipData: CategoryData[] = [
    { label: 'Platform-Owned', value: aiTutorStats?.platform ?? 0, color: '#3B82F6' },
    { label: 'User-Created', value: aiTutorStats?.user ?? 0, color: '#10B981' },
  ];

  // Authorization check (after all hooks)
  if (!canViewAIAgents) {
    return (
      <div className={styles.unauthorizedContainer}>
        <h2>Unauthorized Access</h2>
        <p>You don&apos;t have permission to view AI Agents.</p>
      </div>
    );
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="AI Agents"
          subtitle="Manage platform and user AI agents"
          actions={undefined}
          className={styles.aiAgentsHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'overview', label: 'Overview', active: activeTab === 'overview' },
            { id: 'all-ai-agents', label: 'All AI Agents', count: aiTutorStats?.total, active: activeTab === 'all-ai-agents' },
            { id: 'create-new', label: 'Create New', active: activeTab === 'create-new' }
          ]}
          onTabChange={(tabId) => setActiveTab(tabId as 'overview' | 'all-ai-agents' | 'create-new')}
          className={styles.aiAgentsTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="AI Tutor Breakdown"
            stats={[
              { label: 'Total AI Agents', value: aiTutorStats?.total ?? 0 },
              { label: 'Active', value: aiTutorStats?.active ?? 0 },
              { label: 'Platform-Owned', value: aiTutorStats?.platform ?? 0 },
              { label: 'User-Created', value: aiTutorStats?.user ?? 0 },
            ]}
          />
          <AdminHelpWidget
            title="AI Agents Help"
            items={[
              { question: 'What is a platform AI tutor?', answer: 'AI agents created and owned by the platform, available to all users in the marketplace.' },
              { question: 'Why create platform AI agents?', answer: 'Fill market gaps, showcase platform capabilities, and generate direct revenue.' },
              { question: 'How do platform tutors differ?', answer: 'Platform tutors have special badges, can be featured, and platform keeps 100% revenue.' },
            ]}
          />
          <AdminTipWidget
            title="AI Tutor Tips"
            tips={[
              'Create platform AI agents for high-demand subjects',
              'Monitor user-created AI agents for quality and compliance',
              'Platform AI agents can be featured in marketplace',
              'Track session metrics to optimize pricing',
            ]}
          />
        </HubSidebar>
      }
    >
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Cards - With historical metrics and trends */}
          <HubKPIGrid>
            <HubKPICard
              label="Total AI Agents"
              value={totalAIAgentsMetric.value}
              sublabel={formatMetricChange(
                totalAIAgentsMetric.change,
                totalAIAgentsMetric.changePercent,
                'last_month'
              )}
              icon={Bot}
              trend={totalAIAgentsMetric.trend}
            />
            <HubKPICard
              label="Active"
              value={activeAIAgentsMetric.value}
              sublabel={formatMetricChange(
                activeAIAgentsMetric.change,
                activeAIAgentsMetric.changePercent,
                'last_month'
              )}
              icon={Activity}
              trend={activeAIAgentsMetric.trend}
            />
            <HubKPICard
              label="Platform-Owned"
              value={platformAIAgentsMetric.value}
              sublabel={formatMetricChange(
                platformAIAgentsMetric.change,
                platformAIAgentsMetric.changePercent,
                'last_month'
              )}
              icon={Bot}
              trend={platformAIAgentsMetric.trend}
            />
            <HubKPICard
              label="User-Created"
              value={userAIAgentsMetric.value}
              sublabel={formatMetricChange(
                userAIAgentsMetric.change,
                userAIAgentsMetric.changePercent,
                'last_month'
              )}
              icon={Users}
              trend={userAIAgentsMetric.trend}
            />
            <HubKPICard
              label="Draft"
              value={draftAIAgentsMetric.value}
              sublabel={formatMetricChange(
                draftAIAgentsMetric.change,
                draftAIAgentsMetric.changePercent,
                'last_month'
              )}
              icon={FileEdit}
              trend={draftAIAgentsMetric.trend}
            />
            <HubKPICard
              label="Total Sessions"
              value={totalSessionsMetric.value}
              sublabel={formatMetricChange(
                totalSessionsMetric.change,
                totalSessionsMetric.changePercent,
                'last_month'
              )}
              icon={MessageSquare}
              trend={totalSessionsMetric.trend}
            />
            <HubKPICard
              label="Avg Sessions/Tutor"
              value={
                totalAIAgentsMetric.value > 0
                  ? (totalSessionsMetric.value / totalAIAgentsMetric.value).toFixed(1)
                  : '0'
              }
              sublabel={
                totalAIAgentsMetric.previousValue && totalAIAgentsMetric.previousValue > 0
                  ? `${(totalSessionsMetric.previousValue! / totalAIAgentsMetric.previousValue!).toFixed(1)} last month`
                  : undefined
              }
              icon={TrendingUp}
            />
            <HubKPICard
              label="Active Rate"
              value={`${activeRateMetric.value}%`}
              sublabel={formatMetricChange(
                activeRateMetric.change,
                activeRateMetric.changePercent,
                'last_month'
              )}
              icon={Activity}
              trend={activeRateMetric.trend}
            />
          </HubKPIGrid>

          {/* Charts Section */}
          <div className={styles.chartsSection}>
            {/* AI Tutor Growth Trend */}
            <ErrorBoundary fallback={<div className={styles.fallbackMessage}>Unable to load AI tutor trends chart</div>}>
              {isLoadingCharts ? (
                <ChartSkeleton height="320px" />
              ) : (
                <HubTrendChart
                  data={aiTutorTrendsQuery.data}
                  title="AI Tutor Growth"
                  subtitle="Last 7 days"
                  valueName="AI Agents"
                  lineColor="#3B82F6"
                />
              )}
            </ErrorBoundary>

            {/* Ownership Breakdown */}
            <ErrorBoundary fallback={<div className={styles.fallbackMessage}>Unable to load ownership breakdown chart</div>}>
              <HubCategoryBreakdownChart
                data={ownershipData}
                title="Ownership Breakdown"
                subtitle="Platform vs User-created"
              />
            </ErrorBoundary>

            {/* Session Activity Trend */}
            <ErrorBoundary fallback={<div className={styles.fallbackMessage}>Unable to load session trends chart</div>}>
              {isLoadingCharts ? (
                <ChartSkeleton height="320px" />
              ) : (
                <HubTrendChart
                  data={sessionsTrendsQuery.data}
                  title="Session Activity"
                  subtitle="Last 7 days"
                  valueName="Sessions"
                  lineColor="#10B981"
                />
              )}
            </ErrorBoundary>
          </div>

        </>
      )}

      {/* All AI Agents Tab */}
      {activeTab === 'all-ai-agents' && (
        <AIAgentsTable />
      )}

      {/* Create New Tab */}
      {activeTab === 'create-new' && (
        <AdminAIAgentCreateTab onSuccess={() => setActiveTab('all-ai-agents')} />
      )}
    </HubPageLayout>
  );
}
