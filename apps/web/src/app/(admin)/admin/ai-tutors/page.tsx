/*
 * Filename: src/app/(admin)/admin/ai-tutors/page.tsx
 * Purpose: Admin AI Tutors overview page - manage platform and user AI tutors
 * Created: 2026-02-24
 * Pattern: Follows Admin Listings pattern with 3 tabs (Overview + All AI Tutors + Create New)
 */
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import HubPageLayout from '@/app/components/hub/layout/HubPageLayout';
import HubHeader from '@/app/components/hub/layout/HubHeader';
import HubTabs from '@/app/components/hub/layout/HubTabs';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { AdminStatsWidget, AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import { Bot, Activity, Users, TrendingUp, DollarSign, Star } from 'lucide-react';
import { HubKPIGrid, HubKPICard, HubCategoryBreakdownChart, type CategoryData } from '@/app/components/hub/charts';
// TODO: Add AI tutor metrics and re-enable these imports
// import { useAdminMetric, formatMetricChange } from '@/hooks/useAdminMetric';
// import { useAdminTrendData } from '@/hooks/useAdminTrendData';
import AITutorsTable from './components/AITutorsTable';
import AdminAITutorCreateTab from './components/AdminAITutorCreateTab';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import styles from './page.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function AdminAITutorsOverviewPage() {
  const _router = useRouter();
  // TODO: Add 'ai_tutors' to AdminResource type in lib/rbac/types.ts
  // const _canViewAITutors = usePermission('ai_tutors', 'view');
  // const _canManageAITutors = usePermission('ai_tutors', 'manage');
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

  // TODO: Add AI tutor metrics to platform statistics collection
  // For now, using real-time stats from Supabase instead of historical metrics
  // const totalAITutorsMetric = useAdminMetric({ metric: 'ai_tutors_total', compareWith: 'last_month' });
  // const activeAITutorsMetric = useAdminMetric({ metric: 'ai_tutors_active', compareWith: 'last_month' });
  // etc...

  // Header actions
  const getHeaderActions = () => {
    return undefined;
  };

  // TODO: Add AI tutor metrics to platform_statistics_daily for trend charts
  // const aiTutorTrendsQuery = useAdminTrendData({ metric: 'ai_tutors_total', days: 7 });
  // const sessionsTrendsQuery = useAdminTrendData({ metric: 'ai_tutor_sessions_total', days: 7 });
  // const revenueTrendsQuery = useAdminTrendData({ metric: 'ai_tutor_revenue_total', days: 7 });

  const isLoadingCharts = false; // Set to false until metrics are implemented

  // AI Tutor ownership breakdown data (using real-time counts)
  const ownershipData: CategoryData[] = [
    { label: 'Platform-Owned', value: aiTutorStats?.platform ?? 0, color: '#3B82F6' },
    { label: 'User-Created', value: aiTutorStats?.user ?? 0, color: '#10B981' },
  ];

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
          {/* KPI Cards - Simplified without historical metrics */}
          <HubKPIGrid>
            <HubKPICard
              label="Total AI Tutors"
              value={aiTutorStats?.total ?? 0}
              sublabel="Current total"
              icon={Bot}
            />
            <HubKPICard
              label="Active"
              value={aiTutorStats?.active ?? 0}
              sublabel="Published AI tutors"
              icon={Activity}
            />
            <HubKPICard
              label="Platform-Owned"
              value={aiTutorStats?.platform ?? 0}
              sublabel="Admin-created"
              icon={Bot}
            />
            <HubKPICard
              label="User-Created"
              value={aiTutorStats?.user ?? 0}
              sublabel="Created by users"
              icon={Users}
            />
          </HubKPIGrid>

          {/* Charts Section - Simplified */}
          <div className={styles.chartsSection}>
            {/* Ownership Breakdown - Only chart that works without historical data */}
            <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load ownership breakdown chart</div>}>
              <HubCategoryBreakdownChart
                data={ownershipData}
                title="Ownership Breakdown"
                subtitle="Platform vs User-created"
              />
            </ErrorBoundary>

            {/* Placeholder for future charts */}
            <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--color-background-secondary)', borderRadius: '8px' }}>
              <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-text-secondary)' }}>Metrics Coming Soon</h3>
              <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.9rem' }}>
                Add AI tutor metrics to platform statistics collection to view growth trends and session analytics.
              </p>
            </div>
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
