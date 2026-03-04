/*
 * Filename: src/app/(admin)/admin/growth/page.tsx
 * Purpose: Growth Agent Analytics Dashboard
 * Created: 2026-03-05
 *
 * Pattern: Mirrors admin/sage/page.tsx — customised for Growth metrics
 */
'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import { HubKPIGrid, HubKPICard } from '@/app/components/hub/charts';
import { AdminStatsWidget, AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import { useAdminMetric, formatMetricChange } from '@/hooks/useAdminMetric';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import { TrendingUp, Users, MessageSquare, DollarSign } from 'lucide-react';
import Button from '@/app/components/ui/actions/Button';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

type TabFilter = 'overview' | 'usage' | 'subscriptions';

export default function GrowthAnalyticsPage() {
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
    window.location.href = `/admin/growth${params.toString() ? `?${params.toString()}` : ''}`;
  };

  const supabase = createClient();

  // Fetch real-time stats from growth tables
  const { data: growthStats } = useQuery({
    queryKey: ['admin-growth-stats'],
    queryFn: async () => {
      const [usageRes, subsRes, usersRes] = await Promise.all([
        supabase.from('growth_usage_log').select('id', { count: 'exact', head: true }),
        supabase.from('growth_pro_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('growth_usage_log').select('user_id'),
      ]);
      const uniqueUsers = new Set(usersRes.data?.map((r: { user_id: string }) => r.user_id) || []).size;
      return {
        totalQuestions: usageRes.count || 0,
        activeSubscriptions: subsRes.count || 0,
        uniqueUsers,
        mrr: (subsRes.count || 0) * 10,
      };
    },
    staleTime: 30000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Historical metrics (will show 0 until platform_statistics_daily tracks growth_*)
  const questionsMetric = useAdminMetric({ metric: 'growth_questions_total', compareWith: 'last_month' });
  const uniqueUsersMetric = useAdminMetric({ metric: 'growth_unique_users', compareWith: 'last_month' });
  const proSubscriptionsMetric = useAdminMetric({ metric: 'growth_pro_subscriptions', compareWith: 'last_month' });
  const proMrrMetric = useAdminMetric({ metric: 'growth_pro_mrr', compareWith: 'last_month' });
  const freeUsersMetric = useAdminMetric({ metric: 'growth_free_users', compareWith: 'last_month' });
  const proUsersMetric = useAdminMetric({ metric: 'growth_pro_users', compareWith: 'last_month' });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);

  return (
    <ErrorBoundary>
      <HubPageLayout
        header={
          <HubHeader
            title="Growth Analytics"
            subtitle="Growth Agent usage and subscription metrics"
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
                { label: 'Total Questions', value: growthStats?.totalQuestions ?? 0 },
                { label: 'Unique Users', value: growthStats?.uniqueUsers ?? 0 },
                { label: 'Pro Subscribers', value: growthStats?.activeSubscriptions ?? 0 },
                { label: 'Monthly Revenue', value: `£${growthStats?.mrr ?? 0}` },
              ]}
            />
            <AdminHelpWidget
              title="Growth Help"
              items={[
                { question: 'What is Growth?', answer: 'Growth is the AI-powered business growth advisor for tutors, agents, and organisations on Tutorwise.' },
                { question: 'Free vs Pro?', answer: 'Free users get 10 questions/day. Growth Pro users get 5,000/month for £10/month.' },
                { question: 'Who uses Growth?', answer: 'Tutors and agents use Growth to optimise their income, pricing, referrals, and business strategy.' },
              ]}
            />
            <AdminTipWidget
              title="Growth Insights"
              tips={[
                'Monitor limit hits to identify upsell opportunities',
                'Track Pro conversion rate to measure paywall effectiveness',
                'Review top questions to improve Growth personas',
                'Growth is role-adaptive: tutor / agent / client / organisation',
              ]}
            />
          </HubSidebar>
        }
      >
        {/* Overview Tab */}
        {tabFilter === 'overview' && (
          <HubKPIGrid>
            <HubKPICard
              label="Total Questions"
              value={questionsMetric.value || (growthStats?.totalQuestions ?? 0)}
              sublabel={formatMetricChange(questionsMetric.change, questionsMetric.changePercent, 'last_month')}
              icon={MessageSquare}
              trend={questionsMetric.trend}
            />
            <HubKPICard
              label="Unique Users"
              value={uniqueUsersMetric.value || (growthStats?.uniqueUsers ?? 0)}
              sublabel={formatMetricChange(uniqueUsersMetric.change, uniqueUsersMetric.changePercent, 'last_month')}
              icon={Users}
              trend={uniqueUsersMetric.trend}
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
              value={proUsersMetric.value || (growthStats?.activeSubscriptions ?? 0)}
              sublabel={formatMetricChange(proUsersMetric.change, proUsersMetric.changePercent, 'last_month')}
              icon={Users}
              trend={proUsersMetric.trend}
            />
            <HubKPICard
              label="Pro Subscriptions"
              value={proSubscriptionsMetric.value || (growthStats?.activeSubscriptions ?? 0)}
              sublabel={formatMetricChange(proSubscriptionsMetric.change, proSubscriptionsMetric.changePercent, 'last_month')}
              icon={TrendingUp}
              trend={proSubscriptionsMetric.trend}
            />
            <HubKPICard
              label="Monthly Revenue"
              value={formatCurrency(proMrrMetric.value || (growthStats?.mrr ?? 0))}
              sublabel={
                proMrrMetric.change !== null
                  ? `${proMrrMetric.change >= 0 ? '+' : ''}${formatCurrency(proMrrMetric.change)} vs last month`
                  : undefined
              }
              icon={DollarSign}
              trend={proMrrMetric.trend}
            />
          </HubKPIGrid>
        )}

        {tabFilter === 'usage' && (
          <HubEmptyState
            title="Usage Analytics Coming Soon"
            description="Detailed usage patterns, role breakdown, and session analytics will be available here."
          />
        )}

        {tabFilter === 'subscriptions' && (
          <HubEmptyState
            title="Subscriptions View Coming Soon"
            description="Growth Pro subscription management table will be available here."
          />
        )}
      </HubPageLayout>
    </ErrorBoundary>
  );
}
