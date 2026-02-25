/*
 * Filename: src/app/(admin)/admin/ai-tutors/page.tsx
 * Purpose: Admin AI Tutors overview page - manage platform and user AI tutors
 * Created: 2026-02-24
 * Pattern: Follows Admin Listings pattern with 3 tabs (Overview + All AI Tutors + Create New)
 */
'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import HubPageLayout from '@/app/components/hub/layout/HubPageLayout';
import HubHeader from '@/app/components/hub/layout/HubHeader';
import HubTabs from '@/app/components/hub/layout/HubTabs';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { AdminStatsWidget, AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import { Bot, Activity, Users, FileEdit, MessageSquare, TrendingUp } from 'lucide-react';
import { usePermission } from '@/lib/rbac';
import { HubKPIGrid, HubKPICard, HubCategoryBreakdownChart, HubTrendChart, type CategoryData } from '@/app/components/hub/charts';
import { useAdminMetric, formatMetricChange } from '@/hooks/useAdminMetric';
import { useAdminTrendData } from '@/hooks/useAdminTrendData';
import AITutorsTable from './components/AITutorsTable';
import AdminAITutorCreateTab from './components/AdminAITutorCreateTab';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import { ChartSkeleton } from '@/app/components/ui/feedback/LoadingSkeleton';
import styles from './page.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function AdminAITutorsOverviewPage() {
  const canViewAITutors = usePermission('ai_tutors', 'view');
  const [activeTab, setActiveTab] = useState<'overview' | 'all-ai-tutors' | 'create-new'>('overview');

  // Fetch real-time AI tutor counts from ai_tutors table
  const supabase = createClient();
  const { data: aiTutorStats } = useQuery({
    queryKey: ['admin-ai-tutor-stats'],
    queryFn: async () => {
      const [totalRes, activeRes, platformRes, userRes] = await Promise.all([
        supabase.from('ai_tutors').select('id', { count: 'exact', head: true }),
        supabase.from('ai_tutors').select('id', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('ai_tutors').select('id', { count: 'exact', head: true }).eq('is_platform_owned', true),
        supabase.from('ai_tutors').select('id', { count: 'exact', head: true }).eq('is_platform_owned', false),
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
  const totalAITutorsMetric = useAdminMetric({ metric: 'ai_tutors_total', compareWith: 'last_month' });
  const activeAITutorsMetric = useAdminMetric({ metric: 'ai_tutors_active', compareWith: 'last_month' });
  const platformAITutorsMetric = useAdminMetric({ metric: 'ai_tutors_platform', compareWith: 'last_month' });
  const userAITutorsMetric = useAdminMetric({ metric: 'ai_tutors_user', compareWith: 'last_month' });
  const draftAITutorsMetric = useAdminMetric({ metric: 'ai_tutors_draft', compareWith: 'last_month' });
  const totalSessionsMetric = useAdminMetric({ metric: 'ai_tutor_sessions_total', compareWith: 'last_month' });
  const activeRateMetric = useAdminMetric({ metric: 'ai_tutors_active_rate', compareWith: 'last_month' });

  // Header actions
  const getHeaderActions = () => {
    return undefined;
  };

  // Fetch trend data from platform_statistics_daily (last 7 days)
  const aiTutorTrendsQuery = useAdminTrendData({ metric: 'ai_tutors_total', days: 7 });
  const sessionsTrendsQuery = useAdminTrendData({ metric: 'ai_tutor_sessions_total', days: 7 });

  const isLoadingCharts = aiTutorTrendsQuery.isLoading || sessionsTrendsQuery.isLoading;

  // AI Tutor ownership breakdown data (using real-time counts)
  const ownershipData: CategoryData[] = [
    { label: 'Platform-Owned', value: aiTutorStats?.platform ?? 0, color: '#3B82F6' },
    { label: 'User-Created', value: aiTutorStats?.user ?? 0, color: '#10B981' },
  ];

  // Authorization check (after all hooks)
  if (!canViewAITutors) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '1rem' }}>Unauthorized Access</h2>
        <p style={{ color: '#6b7280' }}>You don't have permission to view AI Tutors.</p>
      </div>
    );
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="AI Tutors"
          subtitle="Manage platform and user AI tutors"
          actions={getHeaderActions()}
          className={styles.aiTutorsHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'overview', label: 'Overview', active: activeTab === 'overview' },
            { id: 'all-ai-tutors', label: 'All AI Tutors', count: aiTutorStats?.total, active: activeTab === 'all-ai-tutors' },
            { id: 'create-new', label: 'Create New', active: activeTab === 'create-new' }
          ]}
          onTabChange={(tabId) => setActiveTab(tabId as 'overview' | 'all-ai-tutors' | 'create-new')}
          className={styles.aiTutorsTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="AI Tutor Breakdown"
            stats={[
              { label: 'Total AI Tutors', value: aiTutorStats?.total ?? 0 },
              { label: 'Active', value: aiTutorStats?.active ?? 0 },
              { label: 'Platform-Owned', value: aiTutorStats?.platform ?? 0 },
              { label: 'User-Created', value: aiTutorStats?.user ?? 0 },
            ]}
          />
          <AdminHelpWidget
            title="AI Tutors Help"
            items={[
              { question: 'What is a platform AI tutor?', answer: 'AI tutors created and owned by the platform, available to all users in the marketplace.' },
              { question: 'Why create platform AI tutors?', answer: 'Fill market gaps, showcase platform capabilities, and generate direct revenue.' },
              { question: 'How do platform tutors differ?', answer: 'Platform tutors have special badges, can be featured, and platform keeps 100% revenue.' },
            ]}
          />
          <AdminTipWidget
            title="AI Tutor Tips"
            tips={[
              'Create platform AI tutors for high-demand subjects',
              'Monitor user-created AI tutors for quality and compliance',
              'Platform AI tutors can be featured in marketplace',
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
              label="Total AI Tutors"
              value={totalAITutorsMetric.value}
              sublabel={formatMetricChange(
                totalAITutorsMetric.change,
                totalAITutorsMetric.changePercent,
                'last_month'
              )}
              icon={Bot}
              trend={totalAITutorsMetric.trend}
            />
            <HubKPICard
              label="Active"
              value={activeAITutorsMetric.value}
              sublabel={formatMetricChange(
                activeAITutorsMetric.change,
                activeAITutorsMetric.changePercent,
                'last_month'
              )}
              icon={Activity}
              trend={activeAITutorsMetric.trend}
            />
            <HubKPICard
              label="Platform-Owned"
              value={platformAITutorsMetric.value}
              sublabel={formatMetricChange(
                platformAITutorsMetric.change,
                platformAITutorsMetric.changePercent,
                'last_month'
              )}
              icon={Bot}
              trend={platformAITutorsMetric.trend}
            />
            <HubKPICard
              label="User-Created"
              value={userAITutorsMetric.value}
              sublabel={formatMetricChange(
                userAITutorsMetric.change,
                userAITutorsMetric.changePercent,
                'last_month'
              )}
              icon={Users}
              trend={userAITutorsMetric.trend}
            />
            <HubKPICard
              label="Draft"
              value={draftAITutorsMetric.value}
              sublabel={formatMetricChange(
                draftAITutorsMetric.change,
                draftAITutorsMetric.changePercent,
                'last_month'
              )}
              icon={FileEdit}
              trend={draftAITutorsMetric.trend}
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
                totalAITutorsMetric.value > 0
                  ? (totalSessionsMetric.value / totalAITutorsMetric.value).toFixed(1)
                  : '0'
              }
              sublabel={
                totalAITutorsMetric.previousValue && totalAITutorsMetric.previousValue > 0
                  ? `${(totalSessionsMetric.previousValue! / totalAITutorsMetric.previousValue!).toFixed(1)} last month`
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
            <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load AI tutor trends chart</div>}>
              {isLoadingCharts ? (
                <ChartSkeleton height="320px" />
              ) : (
                <HubTrendChart
                  data={aiTutorTrendsQuery.data}
                  title="AI Tutor Growth"
                  subtitle="Last 7 days"
                  valueName="AI Tutors"
                  lineColor="#3B82F6"
                />
              )}
            </ErrorBoundary>

            {/* Ownership Breakdown */}
            <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load ownership breakdown chart</div>}>
              <HubCategoryBreakdownChart
                data={ownershipData}
                title="Ownership Breakdown"
                subtitle="Platform vs User-created"
              />
            </ErrorBoundary>

            {/* Session Activity Trend */}
            <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load session trends chart</div>}>
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

      {/* All AI Tutors Tab */}
      {activeTab === 'all-ai-tutors' && (
        <AITutorsTable />
      )}

      {/* Create New Tab */}
      {activeTab === 'create-new' && (
        <AdminAITutorCreateTab onSuccess={() => setActiveTab('all-ai-tutors')} />
      )}
    </HubPageLayout>
  );
}
