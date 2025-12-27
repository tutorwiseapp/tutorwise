/*
 * Filename: src/app/(admin)/admin/reviews/page.tsx
 * Purpose: Admin Reviews overview page
 * Created: 2025-12-24
 * Phase: 2 - Platform Management
 */
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import HubPageLayout from '@/app/components/hub/layout/HubPageLayout';
import HubHeader from '@/app/components/hub/layout/HubHeader';
import HubTabs from '@/app/components/hub/layout/HubTabs';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { AdminStatsWidget, AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import Button from '@/app/components/ui/actions/Button';
import { Star, Users, Filter } from 'lucide-react';
import Link from 'next/link';
import { usePermission } from '@/lib/rbac';
import { HubKPIGrid, HubKPICard, HubTrendChart, HubCategoryBreakdownChart } from '@/app/components/hub/charts';
import { useAdminMetric, formatMetricChange } from '@/hooks/useAdminMetric';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import { ReviewsTable } from './components/ReviewsTable';
import styles from './page.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function AdminReviewsOverviewPage() {
  const router = useRouter();
  const canViewReviews = usePermission('reviews', 'view');
  const canManageReviews = usePermission('reviews', 'manage');
  const [activeTab, setActiveTab] = useState<'overview' | 'all-reviews'>('overview');

  // Fetch reviews metrics with trend data from statistics table
  const totalReviewsMetric = useAdminMetric({ metric: 'reviews_total', compareWith: 'last_month' });
  const avgRatingMetric = useAdminMetric({ metric: 'reviews_avg_rating', compareWith: 'last_month' });
  const tutorsReviewedMetric = useAdminMetric({ metric: 'reviews_tutors_reviewed', compareWith: 'last_month' });
  const clientsReviewedMetric = useAdminMetric({ metric: 'reviews_clients_reviewed', compareWith: 'last_month' });

  // Header actions
  const getHeaderActions = () => {
    if (!canManageReviews.hasAccess) return undefined;

    return (
      <div className={styles.headerActions}>
        <Button variant="secondary" size="sm">
          <Filter className={styles.buttonIcon} />
          Filters
        </Button>
      </div>
    );
  };

  // Format rating
  const formatRating = (rating: number) => {
    return rating.toFixed(2);
  };

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Reviews"
          subtitle="Manage platform reviews and quality"
          actions={getHeaderActions()}
          className={styles.reviewsHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'overview', label: 'Overview', active: activeTab === 'overview' },
            { id: 'all-reviews', label: 'All Reviews', active: activeTab === 'all-reviews' }
          ]}
          onTabChange={(tabId) => setActiveTab(tabId as 'overview' | 'all-reviews')}
          className={styles.reviewsTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="Review Breakdown"
            stats={[
              { label: 'Total Reviews', value: totalReviewsMetric.value },
              { label: 'Avg. Rating', value: formatRating(avgRatingMetric.value) },
              { label: 'Tutors Reviewed', value: tutorsReviewedMetric.value },
              { label: 'Clients Reviewed', value: clientsReviewedMetric.value },
            ]}
          />
          <AdminHelpWidget
            title="Reviews Help"
            items={[
              { question: 'Why are reviews important?', answer: 'Reviews build trust, help users make decisions, and provide quality feedback for tutors.' },
              { question: 'How to encourage reviews?', answer: 'Send timely reminders, make the process simple, and highlight review value in communications.' },
              { question: 'What is a good average rating?', answer: 'A rating above 4.0 indicates high satisfaction. Monitor trends and address outliers.' },
            ]}
          />
          <AdminTipWidget
            title="Review Tips"
            tips={[
              'High review rates indicate engagement',
              'Average rating reflects platform quality',
              'Monitor low ratings for quality issues',
              'Encourage detailed, constructive feedback',
            ]}
          />
        </HubSidebar>
      }
    >
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Cards */}
          <HubKPIGrid>
            <HubKPICard
              label="Total Reviews"
              value={totalReviewsMetric.value}
              sublabel={formatMetricChange(
                totalReviewsMetric.change,
                totalReviewsMetric.changePercent,
                'last_month'
              )}
              icon={Star}
              trend={totalReviewsMetric.trend}
            />
            <HubKPICard
              label="Average Rating"
              value={formatRating(avgRatingMetric.value)}
              sublabel={
                avgRatingMetric.change !== null
                  ? `${avgRatingMetric.change >= 0 ? '+' : ''}${formatRating(avgRatingMetric.change)} vs last month`
                  : undefined
              }
              icon={Star}
              trend={avgRatingMetric.trend}
            />
            <HubKPICard
              label="Tutors Reviewed"
              value={tutorsReviewedMetric.value}
              sublabel={formatMetricChange(
                tutorsReviewedMetric.change,
                tutorsReviewedMetric.changePercent,
                'last_month'
              )}
              icon={Users}
              trend={tutorsReviewedMetric.trend}
            />
            <HubKPICard
              label="Clients Who Reviewed"
              value={clientsReviewedMetric.value}
              sublabel={formatMetricChange(
                clientsReviewedMetric.change,
                clientsReviewedMetric.changePercent,
                'last_month'
              )}
              icon={Users}
              trend={clientsReviewedMetric.trend}
            />
          </HubKPIGrid>

          {/* Charts Section */}
          <div className={styles.chartsSection}>
            <ErrorBoundary>
              <HubTrendChart
                title="Review Trends"
                subtitle="Last 7 days"
                metric="reviews_total"
                height={300}
              />
            </ErrorBoundary>

            <ErrorBoundary>
              <HubCategoryBreakdownChart
                title="Status Breakdown"
                subtitle="Current distribution"
                categories={[
                  { label: 'Pending', value: 'pending', color: '#fbbf24' },
                  { label: 'Published', value: 'published', color: '#10b981' },
                  { label: 'Expired', value: 'expired', color: '#6b7280' },
                ]}
                metric="reviews_total"
                height={300}
              />
            </ErrorBoundary>

            <ErrorBoundary>
              <HubCategoryBreakdownChart
                title="Rating Distribution"
                subtitle="All time"
                categories={[
                  { label: '1 Star', value: '1', color: '#ef4444' },
                  { label: '2 Stars', value: '2', color: '#f97316' },
                  { label: '3 Stars', value: '3', color: '#fbbf24' },
                  { label: '4 Stars', value: '4', color: '#84cc16' },
                  { label: '5 Stars', value: '5', color: '#10b981' },
                ]}
                metric="reviews_total"
                height={300}
              />
            </ErrorBoundary>
          </div>
        </>
      )}

      {/* All Reviews Tab */}
      {activeTab === 'all-reviews' && (
        <div className={styles.tableContainer}>
          <ReviewsTable />
        </div>
      )}
    </HubPageLayout>
  );
}
