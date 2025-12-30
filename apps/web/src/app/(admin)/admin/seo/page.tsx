/*
 * Filename: src/app/(admin)/admin/seo/page.tsx
 * Purpose: SEO Management overview page
 * Created: 2025-12-23
 * Updated: 2025-12-29 - Added real charts and activity feed
 * Phase: 1 - SEO Management
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
import Button from '@/app/components/ui/actions/Button';
import { FileText, Link as LinkIcon, ExternalLink, TrendingUp, Plus } from 'lucide-react';
import Link from 'next/link';
import { usePermission } from '@/lib/rbac';
import { HubKPIGrid, HubKPICard, HubTrendChart, HubCategoryBreakdownChart } from '@/app/components/hub/charts';
import { useAdminMetric, formatMetricChange } from '@/hooks/useAdminMetric';
import { ChartSkeleton } from '@/app/components/ui/feedback/LoadingSkeleton';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import styles from './page.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function AdminSeoOverviewPage() {
  const router = useRouter();
  const canCreate = usePermission('seo', 'create');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview'>('overview');

  // Fetch SEO metrics with trend data from statistics table
  const totalHubsMetric = useAdminMetric({ metric: 'seo_total_hubs', compareWith: 'last_month' });
  const publishedHubsMetric = useAdminMetric({ metric: 'seo_published_hubs', compareWith: 'last_month' });
  const totalSpokesMetric = useAdminMetric({ metric: 'seo_total_spokes', compareWith: 'last_month' });
  const publishedSpokesMetric = useAdminMetric({ metric: 'seo_published_spokes', compareWith: 'last_month' });
  const totalCitationsMetric = useAdminMetric({ metric: 'seo_total_citations', compareWith: 'last_month' });
  const activeCitationsMetric = useAdminMetric({ metric: 'seo_active_citations', compareWith: 'last_month' });

  // Fetch SEO stats for charts and activity feed
  const { data: seoStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['admin', 'seo-stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/seo/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch SEO stats');
      }
      return response.json();
    },
  });

  // Header actions with primary CTA and secondary dropdown
  const getHeaderActions = () => {
    if (!canCreate) return undefined;

    return (
      <div className={styles.headerActions}>
        {/* Primary Action: Create Hub */}
        <Link href="/admin/seo/hubs?action=create">
          <Button variant="primary" size="sm">
            Create Hub
          </Button>
        </Link>

        {/* Secondary Actions: Dropdown Menu */}
        <div className={actionStyles.dropdownContainer}>
          <Button
            variant="secondary"
            size="sm"
            square
            onClick={() => setShowActionsMenu(!showActionsMenu)}
          >
            ⋮
          </Button>

          {showActionsMenu && (
            <>
              {/* Backdrop to close menu */}
              <div
                className={actionStyles.backdrop}
                onClick={() => setShowActionsMenu(false)}
              />

              {/* Dropdown Menu */}
              <div className={actionStyles.dropdownMenu}>
                <button
                  onClick={() => {
                    router.push('/admin/seo/spokes?action=create');
                    setShowActionsMenu(false);
                  }}
                  className={actionStyles.menuButton}
                >
                  Create Spoke
                </button>
                <button
                  onClick={() => {
                    router.push('/admin/seo/citations?action=create');
                    setShowActionsMenu(false);
                  }}
                  className={actionStyles.menuButton}
                >
                  Add Citation
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="SEO Management"
          subtitle="Manage your hub-and-spoke content strategy for better search rankings"
          actions={getHeaderActions()}
          className={styles.seoHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'overview', label: 'Overview', active: activeTab === 'overview' }
          ]}
          onTabChange={(tabId) => setActiveTab(tabId as 'overview')}
          className={styles.seoTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="Content Overview"
            stats={[
              { label: 'Total Hubs', value: totalHubsMetric.value },
              { label: 'Published Hubs', value: publishedHubsMetric.value },
              { label: 'Total Spokes', value: totalSpokesMetric.value },
              { label: 'Published Spokes', value: publishedSpokesMetric.value },
            ]}
          />
          <AdminHelpWidget
            title="SEO Strategy Help"
            items={[
              { question: 'What is Hub & Spoke SEO?', answer: 'A content strategy where hub pages cover broad topics and spoke pages dive deep into specific subtopics, all linked together.' },
              { question: 'Why use this model?', answer: 'It creates a strong internal linking structure, improves topical authority, and helps search engines understand your content hierarchy.' },
              { question: 'Best practices?', answer: 'Start with 3-5 hub topics, create 10-15 spokes per hub, ensure all spokes link back to their hub, and update content regularly.' },
            ]}
          />
          <AdminTipWidget
            title="SEO Tips"
            tips={[
              'Focus on one topic per hub',
              'Keep hub content evergreen',
              'Update old content regularly',
              'Monitor performance metrics',
            ]}
          />
        </HubSidebar>
      }
    >

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Cards - Hub Pattern (8 cards like Bookings) */}
          <HubKPIGrid>
            <HubKPICard
              label="Total Hubs"
              value={totalHubsMetric.value}
              sublabel={formatMetricChange(totalHubsMetric.change, totalHubsMetric.changePercent, 'last_month')}
              icon={FileText}
              trend={totalHubsMetric.trend}
            />
            <HubKPICard
              label="Published Hubs"
              value={publishedHubsMetric.value}
              sublabel={formatMetricChange(publishedHubsMetric.change, publishedHubsMetric.changePercent, 'last_month')}
              icon={FileText}
              trend={publishedHubsMetric.trend}
            />
            <HubKPICard
              label="Total Spokes"
              value={totalSpokesMetric.value}
              sublabel={formatMetricChange(totalSpokesMetric.change, totalSpokesMetric.changePercent, 'last_month')}
              icon={LinkIcon}
              trend={totalSpokesMetric.trend}
            />
            <HubKPICard
              label="Published Spokes"
              value={publishedSpokesMetric.value}
              sublabel={formatMetricChange(publishedSpokesMetric.change, publishedSpokesMetric.changePercent, 'last_month')}
              icon={LinkIcon}
              trend={publishedSpokesMetric.trend}
            />
            <HubKPICard
              label="Total Citations"
              value={totalCitationsMetric.value}
              sublabel={formatMetricChange(totalCitationsMetric.change, totalCitationsMetric.changePercent, 'last_month')}
              icon={ExternalLink}
              trend={totalCitationsMetric.trend}
            />
            <HubKPICard
              label="Active Citations"
              value={activeCitationsMetric.value}
              sublabel={formatMetricChange(activeCitationsMetric.change, activeCitationsMetric.changePercent, 'last_month')}
              icon={ExternalLink}
              trend={activeCitationsMetric.trend}
            />
            <HubKPICard
              label="Avg. Spokes/Hub"
              value={
                totalHubsMetric.value > 0
                  ? Math.round((totalSpokesMetric.value / totalHubsMetric.value) * 10) / 10
                  : 0
              }
              sublabel={
                totalHubsMetric.previousValue && totalHubsMetric.previousValue > 0
                  ? `${Math.round((totalSpokesMetric.previousValue! / totalHubsMetric.previousValue!) * 10) / 10} last month`
                  : 'Average per hub'
              }
              icon={TrendingUp}
            />
            <HubKPICard
              label="Publication Rate"
              value={
                totalHubsMetric.value + totalSpokesMetric.value > 0
                  ? `${Math.round(((publishedHubsMetric.value + publishedSpokesMetric.value) / (totalHubsMetric.value + totalSpokesMetric.value)) * 100)}%`
                  : '0%'
              }
              sublabel={
                totalHubsMetric.previousValue && totalSpokesMetric.previousValue
                  ? `${Math.round(((publishedHubsMetric.previousValue! + publishedSpokesMetric.previousValue!) / (totalHubsMetric.previousValue! + totalSpokesMetric.previousValue!)) * 100)}% last month`
                  : 'Content published'
              }
              icon={FileText}
            />
          </HubKPIGrid>

          {/* Charts Section - Real Data Visualization */}
          <div className={styles.chartsGrid}>
            {/* Hub Performance Trend Chart */}
            <ErrorBoundary fallback={<ChartSkeleton title="Hub Performance Trend" />}>
              {isLoadingStats ? (
                <ChartSkeleton title="Hub Performance Trend" />
              ) : (
                <HubTrendChart
                  title="Hub Performance Trend"
                  subtitle="Hub views over the last 30 days"
                  data={seoStats?.hubViewsTrend || []}
                  color="#10B981"
                />
              )}
            </ErrorBoundary>

            {/* Content Status Breakdown Chart */}
            <ErrorBoundary fallback={<ChartSkeleton title="Content Status" />}>
              {isLoadingStats ? (
                <ChartSkeleton title="Content Status" />
              ) : (
                <HubCategoryBreakdownChart
                  title="Content Status"
                  subtitle="Published vs Draft content"
                  data={seoStats?.contentStatusBreakdown || []}
                />
              )}
            </ErrorBoundary>

            {/* Recent Activity Feed */}
            <div className={styles.recentActivityWidget}>
              <h3 className={styles.widgetTitle}>Recent SEO Activity</h3>
              {isLoadingStats ? (
                <div className={styles.activityLoading}>Loading activity...</div>
              ) : seoStats?.recentActivity && seoStats.recentActivity.length > 0 ? (
                <div className={styles.activityFeed}>
                  {seoStats.recentActivity.map((activity: any) => (
                    <div key={activity.id} className={styles.activityItem}>
                      <div className={styles.activityIcon}>
                        {activity.type === 'hub' ? <FileText size={16} /> :
                         activity.type === 'spoke' ? <LinkIcon size={16} /> :
                         <ExternalLink size={16} />}
                      </div>
                      <div className={styles.activityContent}>
                        <div className={styles.activityTitle}>
                          <span className={styles.activityType}>{activity.type}</span>
                          <span className={styles.activityAction}>{activity.action}</span>
                        </div>
                        <div className={styles.activityText}>{activity.title}</div>
                        <div className={styles.activityTimestamp}>
                          {new Date(activity.timestamp).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.emptyMessage}>No recent SEO activity to display.</p>
              )}
            </div>
          </div>
        </>
      )}
    </HubPageLayout>
  );
}
