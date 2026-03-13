/**
 * Filename: apps/web/src/app/(admin)/admin/resources/page.tsx
 * Purpose: Admin resource management - Overview + All Articles
 * Created: 2026-01-15
 * Updated: 2026-03-12 — KPI cards, trend charts, category breakdown
 */
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { HubPageLayout, HubHeader, HubTabs } from '@/components/hub/layout';
import HubSidebar from '@/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/components/hub/content/HubEmptyState';
import { AdminStatsWidget, AdminHelpWidget, AdminTipWidget } from '@/components/admin/widgets';
import { HubKPIGrid, HubKPICard, HubTrendChart, HubCategoryBreakdownChart, type TrendDataPoint, type CategoryData } from '@/components/hub/charts';
import ErrorBoundary from '@/components/ui/feedback/ErrorBoundary';
import { ChartSkeleton } from '@/components/ui/feedback/LoadingSkeleton';
import Button from '@/components/ui/actions/Button';
import { FileText, TrendingUp, AlertTriangle, Star, Eye, Clock } from 'lucide-react';
import ArticlesTable from './components/ArticlesTable';
import styles from './page.module.css';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

type TabFilter = 'overview' | 'all' | 'published' | 'draft' | 'scheduled';

export default function AdminBlogPage() {
  const router = useRouter();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<TabFilter>('overview');

  // Real-time article counts (direct from resource_articles table)
  const { data: counts } = useQuery({
    queryKey: ['admin-resource-counts'],
    queryFn: async () => {
      const [totalRes, publishedRes, draftRes, scheduledRes] = await Promise.all([
        supabase.from('resource_articles').select('id', { count: 'exact', head: true }),
        supabase.from('resource_articles').select('id', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('resource_articles').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
        supabase.from('resource_articles').select('id', { count: 'exact', head: true }).eq('status', 'scheduled'),
      ]);
      // Category count
      const { data: catRows } = await supabase
        .from('resource_articles')
        .select('category');
      const categories = new Set((catRows || []).map((r: { category: string }) => r.category)).size;

      return {
        total: totalRes.count || 0,
        published: publishedRes.count || 0,
        draft: draftRes.count || 0,
        scheduled: scheduledRes.count || 0,
        categories,
      };
    },
    staleTime: 30000,
    refetchOnMount: 'always' as const,
    refetchOnWindowFocus: true,
  });

  // Resources platform metrics (current + previous for trend comparison)
  const { data: metrics } = useQuery({
    queryKey: ['admin-resources-metrics'],
    queryFn: async () => {
      // Latest metrics row
      const { data: current } = await supabase
        .from('resources_platform_metrics_daily')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Previous month row for comparison
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const lastMonthStr = lastMonth.toISOString().split('T')[0];

      const { data: previous } = await supabase
        .from('resources_platform_metrics_daily')
        .select('*')
        .lte('metric_date', lastMonthStr)
        .order('metric_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      return { current, previous };
    },
    staleTime: 5 * 60 * 1000,
    refetchOnMount: 'always' as const,
    refetchOnWindowFocus: true,
  });

  // Trend data (last 7 days from resources_platform_metrics_daily)
  const { data: trendData, isLoading: isLoadingCharts } = useQuery({
    queryKey: ['admin-resources-trends'],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 6);

      const { data: rows } = await supabase
        .from('resources_platform_metrics_daily')
        .select('metric_date, total_published, total_drafts, avg_readiness_score')
        .gte('metric_date', startDate.toISOString().split('T')[0])
        .lte('metric_date', endDate.toISOString().split('T')[0])
        .order('metric_date', { ascending: true });

      // Fill missing dates
      const publishedTrend: TrendDataPoint[] = [];
      const readinessTrend: TrendDataPoint[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        const row = (rows || []).find((r: any) => r.metric_date === dateStr);
        publishedTrend.push({ date: dateStr, value: row?.total_published || 0, label });
        readinessTrend.push({ date: dateStr, value: Math.round(row?.avg_readiness_score || 0), label });
      }
      return { publishedTrend, readinessTrend };
    },
    staleTime: 5 * 60 * 1000,
    refetchOnMount: 'always' as const,
  });

  // Helpers
  const cur = metrics?.current;
  const prev = metrics?.previous;

  const calcChange = (field: string): { change: number | null; percent: number | null; trend: 'up' | 'down' | 'neutral' } => {
    const c = (cur as any)?.[field] ?? 0;
    const p = (prev as any)?.[field];
    if (p == null) return { change: null, percent: null, trend: 'neutral' };
    const diff = c - p;
    return {
      change: diff,
      percent: p > 0 ? (diff / p) * 100 : null,
      trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral',
    };
  };

  const fmtChange = (change: number | null): string | undefined => {
    if (change === null || change === 0) return undefined;
    const sign = change > 0 ? '+' : '';
    return `${sign}${change} vs last month`;
  };

  // KPI data
  const publishedChange = calcChange('total_published');
  const draftsChange = calcChange('total_drafts');
  const published30dChange = calcChange('published_last_30d');
  const readinessChange = calcChange('avg_readiness_score');
  const starChange = calcChange('star_articles_count');
  const deadWeightChange = calcChange('dead_weight_count');
  const staleDraftsChange = calcChange('stale_drafts_count');
  const missingMetaChange = calcChange('missing_meta_count');

  // Category breakdown for chart
  const statusBreakdown: CategoryData[] = [
    { label: 'Published', value: counts?.published ?? 0, color: '#10B981' },
    { label: 'Draft', value: counts?.draft ?? 0, color: '#F59E0B' },
    { label: 'Scheduled', value: counts?.scheduled ?? 0, color: '#3B82F6' },
  ];

  return (
    <ErrorBoundary>
      <HubPageLayout
      header={
        <HubHeader
          title="Resource Articles"
          subtitle="Manage resource content and publications"
          actions={
            <Button variant="primary" size="sm" onClick={() => router.push('/admin/resources/create')}>
              Create Article
            </Button>
          }
          className={styles.blogHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'overview', label: 'Overview', active: activeTab === 'overview' },
            { id: 'all', label: 'All Articles', count: counts?.total, active: activeTab === 'all' },
            { id: 'published', label: 'Published', count: counts?.published, active: activeTab === 'published' },
            { id: 'draft', label: 'Drafts', count: counts?.draft, active: activeTab === 'draft' },
            { id: 'scheduled', label: 'Scheduled', count: counts?.scheduled, active: activeTab === 'scheduled' },
          ]}
          onTabChange={(tabId) => setActiveTab(tabId as TabFilter)}
          className={styles.blogTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="Resource Statistics"
            stats={[
              { label: 'Total Articles', value: counts?.total ?? 0 },
              { label: 'Published', value: counts?.published ?? 0 },
              { label: 'Drafts', value: counts?.draft ?? 0 },
              { label: 'Categories', value: counts?.categories ?? 0 },
            ]}
          />
          <AdminHelpWidget
            title="Resource Management"
            items={[
              { question: 'How to create an article?', answer: 'Click "Create Article" button to create a new resource article with our MDX editor.' },
              { question: 'What are categories?', answer: 'Categories help organize articles by audience (For Clients, For Tutors, etc.).' },
              { question: 'Can I schedule posts?', answer: 'Yes, set a future publish date when creating or editing an article.' },
            ]}
          />
          <AdminTipWidget
            title="Content Tips"
            tips={[
              'Use clear, descriptive titles for better SEO',
              'Include featured images for social sharing',
              'Add meta descriptions under 160 characters',
              'Publish consistently to build audience engagement',
            ]}
          />
        </HubSidebar>
      }
    >
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          <HubKPIGrid>
            <HubKPICard
              label="Published"
              value={cur?.total_published ?? counts?.published ?? 0}
              sublabel={fmtChange(publishedChange.change)}
              icon={FileText}
              trend={publishedChange.trend}
            />
            <HubKPICard
              label="Drafts"
              value={cur?.total_drafts ?? counts?.draft ?? 0}
              sublabel={fmtChange(draftsChange.change)}
              icon={FileText}
              trend={draftsChange.trend}
            />
            <HubKPICard
              label="Published (30d)"
              value={cur?.published_last_30d ?? 0}
              sublabel={fmtChange(published30dChange.change)}
              icon={TrendingUp}
              trend={published30dChange.trend}
            />
            <HubKPICard
              label="SEO Readiness"
              value={cur?.avg_readiness_score != null ? `${Math.round(cur.avg_readiness_score)}%` : '—'}
              sublabel={readinessChange.change != null ? fmtChange(Math.round(readinessChange.change)) : undefined}
              icon={Eye}
              trend={readinessChange.trend}
            />
            <HubKPICard
              label="Star Articles"
              value={cur?.star_articles_count ?? 0}
              sublabel={fmtChange(starChange.change)}
              icon={Star}
              trend={starChange.trend}
            />
            <HubKPICard
              label="Dead Weight"
              value={cur?.dead_weight_count ?? 0}
              sublabel={fmtChange(deadWeightChange.change)}
              icon={AlertTriangle}
              trend={deadWeightChange.trend}
            />
            <HubKPICard
              label="Missing Meta"
              value={cur?.missing_meta_count ?? 0}
              sublabel={fmtChange(missingMetaChange.change)}
              icon={FileText}
              trend={missingMetaChange.trend}
            />
            <HubKPICard
              label="Stale Drafts"
              value={cur?.stale_drafts_count ?? 0}
              sublabel={fmtChange(staleDraftsChange.change)}
              icon={Clock}
              trend={staleDraftsChange.trend}
            />
          </HubKPIGrid>

          <div className={styles.chartsSection}>
            <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load published articles chart</div>}>
              {isLoadingCharts ? (
                <ChartSkeleton height="320px" />
              ) : (
                <HubTrendChart
                  data={trendData?.publishedTrend || []}
                  title="Published Articles"
                  subtitle="Last 7 days"
                  valueName="Articles"
                  lineColor="#10B981"
                />
              )}
            </ErrorBoundary>

            <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load readiness chart</div>}>
              {isLoadingCharts ? (
                <ChartSkeleton height="320px" />
              ) : (
                <HubTrendChart
                  data={trendData?.readinessTrend || []}
                  title="SEO Readiness Score"
                  subtitle="Last 7 days"
                  valueName="Score"
                  lineColor="#3B82F6"
                />
              )}
            </ErrorBoundary>

            <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load status breakdown</div>}>
              {isLoadingCharts ? (
                <ChartSkeleton height="320px" />
              ) : (
                <HubCategoryBreakdownChart
                  data={statusBreakdown}
                  title="Article Status Breakdown"
                  subtitle="Current distribution"
                />
              )}
            </ErrorBoundary>
          </div>
        </>
      )}

      {/* Articles Tabs */}
      {(activeTab === 'all' || activeTab === 'published') && (
        <ArticlesTable />
      )}

      {(activeTab === 'draft' || activeTab === 'scheduled') && (
        <HubEmptyState
          title={`No ${activeTab} articles`}
          description={activeTab === 'draft' ? 'You don\'t have any draft articles yet. Click "Create Article" to start writing.' : 'No scheduled articles at this time.'}
        />
      )}
      </HubPageLayout>
    </ErrorBoundary>
  );
}
