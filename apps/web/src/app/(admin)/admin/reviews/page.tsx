/*
 * Filename: src/app/(admin)/admin/reviews/page.tsx
 * Purpose: Admin Reviews overview page
 * Created: 2025-12-24
 * Phase: 2 - Platform Management
 */
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
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
import { ChartSkeleton } from '@/app/components/ui/feedback/LoadingSkeleton';
import { ReviewsTable } from './components/ReviewsTable';
import styles from './page.module.css';

// Types for chart data
interface TrendDataPoint {
  label: string;
  value: number;
}

interface CategoryData {
  label: string;
  value: number;
  color?: string;
}

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

  // Fetch real reviews metrics from database
  const { data: metricsData } = useQuery({
    queryKey: ['admin-reviews-metrics'],
    queryFn: async () => {
      const response = await fetch('/api/admin/reviews');
      if (!response.ok) throw new Error('Failed to fetch reviews');
      const data = await response.json();

      // Calculate additional metrics
      const fiveStarCount = data.reviews?.filter((r: any) => r.rating === 5).length || 0;
      const fourStarCount = data.reviews?.filter((r: any) => r.rating === 4).length || 0;
      const threeStarCount = data.reviews?.filter((r: any) => r.rating === 3).length || 0;
      const twoStarCount = data.reviews?.filter((r: any) => r.rating === 2).length || 0;
      const oneStarCount = data.reviews?.filter((r: any) => r.rating === 1).length || 0;

      const totalCount = data.reviews?.length || 0;
      const fiveStarPercentage = totalCount > 0 ? (fiveStarCount / totalCount) * 100 : 0;

      return {
        total: totalCount,
        fiveStarPercentage,
        fiveStarCount,
        fourStarCount,
        threeStarCount,
        twoStarCount,
        oneStarCount,
        reviews: data.reviews || [],
      };
    },
    staleTime: 60 * 1000,
  });

  // Fetch chart data - Review Trends (last 7 days)
  const { data: reviewTrendsData = [], isLoading: isLoadingTrends } = useQuery<TrendDataPoint[]>({
    queryKey: ['admin-reviews-trends'],
    queryFn: async () => {
      const response = await fetch('/api/admin/reviews');
      if (!response.ok) throw new Error('Failed to fetch reviews');
      const data = await response.json();

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Group by date
      const groupedByDate: Record<string, number> = {};
      data.reviews?.forEach((review: any) => {
        const reviewDate = new Date(review.created_at);
        if (reviewDate >= sevenDaysAgo) {
          const dateStr = reviewDate.toISOString().split('T')[0];
          groupedByDate[dateStr] = (groupedByDate[dateStr] || 0) + 1;
        }
      });

      // Create trend data for last 7 days
      const trendPoints: TrendDataPoint[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const label = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

        trendPoints.push({
          label,
          value: groupedByDate[dateStr] || 0,
        });
      }

      return trendPoints;
    },
    staleTime: 60 * 1000,
    retry: 2,
  });

  // Fetch chart data - Status Breakdown
  const { data: statusBreakdownData = [], isLoading: isLoadingStatus } = useQuery<CategoryData[]>({
    queryKey: ['admin-reviews-status-breakdown'],
    queryFn: async () => {
      const response = await fetch('/api/admin/reviews');
      if (!response.ok) throw new Error('Failed to fetch reviews');
      const data = await response.json();

      const published = data.reviews?.filter((r: any) => r.status === 'published').length || 0;
      const pending = data.reviews?.filter((r: any) => r.status === 'pending').length || 0;
      const rejected = data.reviews?.filter((r: any) => r.status === 'rejected').length || 0;

      return [
        { label: 'Published', value: published, color: '#10B981' },
        { label: 'Pending', value: pending, color: '#F59E0B' },
        { label: 'Rejected', value: rejected, color: '#EF4444' },
      ];
    },
    staleTime: 60 * 1000,
    retry: 2,
  });

  // Fetch chart data - Rating Distribution
  const { data: ratingDistributionData = [], isLoading: isLoadingRatings } = useQuery<CategoryData[]>({
    queryKey: ['admin-reviews-rating-distribution'],
    queryFn: async () => {
      return [
        { label: '5 Stars', value: metricsData?.fiveStarCount || 0, color: '#10B981' },
        { label: '4 Stars', value: metricsData?.fourStarCount || 0, color: '#3B82F6' },
        { label: '3 Stars', value: metricsData?.threeStarCount || 0, color: '#F59E0B' },
        { label: '2 Stars', value: metricsData?.twoStarCount || 0, color: '#F97316' },
        { label: '1 Star', value: metricsData?.oneStarCount || 0, color: '#EF4444' },
      ];
    },
    enabled: !!metricsData,
    staleTime: 60 * 1000,
    retry: 2,
  });

  const isLoadingCharts = isLoadingTrends || isLoadingStatus || isLoadingRatings;

  // Header actions - removed redundant Filters button (now in table toolbar)
  const getHeaderActions = () => {
    return undefined;
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
          {/* KPI Cards - 8 total to match Bookings */}
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
              label="5-Star Reviews"
              value={`${(metricsData?.fiveStarPercentage || 0).toFixed(1)}%`}
              sublabel={`${metricsData?.fiveStarCount || 0} reviews`}
              icon={Star}
            />
            <HubKPICard
              label="New This Month"
              value={totalReviewsMetric.change !== null && totalReviewsMetric.change >= 0 ? totalReviewsMetric.change : 0}
              sublabel={
                totalReviewsMetric.changePercent !== null
                  ? `${totalReviewsMetric.changePercent.toFixed(1)}% vs last month`
                  : undefined
              }
              icon={Star}
              trend={totalReviewsMetric.trend}
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
            <HubKPICard
              label="Published"
              value={statusBreakdownData.find(s => s.label === 'Published')?.value || 0}
              sublabel="live reviews"
              icon={Star}
            />
            <HubKPICard
              label="Pending Approval"
              value={statusBreakdownData.find(s => s.label === 'Pending')?.value || 0}
              sublabel="awaiting review"
              icon={Star}
            />
          </HubKPIGrid>

          {/* Charts Section */}
          <div className={styles.chartsSection}>
            {/* Review Trends Chart */}
            <ErrorBoundary
              fallback={
                <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                  Unable to load review trends chart
                </div>
              }
            >
              {isLoadingCharts ? (
                <ChartSkeleton height="320px" />
              ) : (
                <HubTrendChart
                  data={reviewTrendsData}
                  title="Review Trends"
                  subtitle="Last 7 days"
                  valueName="Reviews"
                  lineColor="#fbbf24"
                />
              )}
            </ErrorBoundary>

            {/* Status Breakdown Chart */}
            <ErrorBoundary
              fallback={
                <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                  Unable to load status breakdown chart
                </div>
              }
            >
              {isLoadingCharts ? (
                <ChartSkeleton height="320px" />
              ) : (
                <HubCategoryBreakdownChart
                  data={statusBreakdownData}
                  title="Status Breakdown"
                  subtitle="Current distribution"
                />
              )}
            </ErrorBoundary>

            {/* Rating Distribution Chart */}
            <ErrorBoundary
              fallback={
                <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                  Unable to load rating distribution chart
                </div>
              }
            >
              {isLoadingCharts ? (
                <ChartSkeleton height="320px" />
              ) : (
                <HubCategoryBreakdownChart
                  data={ratingDistributionData}
                  title="Rating Distribution"
                  subtitle="All time"
                />
              )}
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
