/**
 * Filename: apps/web/src/app/(authenticated)/reviews/page.tsx
 * Purpose: Reviews & Ratings Hub - Mutual review system (v4.5)
 * Created: 2025-11-08
 * Updated: 2025-11-29 - Migrated to Hub Layout Architecture with HubPageLayout, HubHeader, HubTabs
 * Related: reviews-solution-design-v4.5.md
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { getPendingReviewTasks, getReceivedReviews, getGivenReviews, submitReview } from '@/lib/api/reviews';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import PendingReviewCard from '@/app/components/feature/reviews/PendingReviewCard';
import ProfileReviewCard from '@/app/components/feature/reviews/ProfileReviewCard';
import ReviewStatsWidget from '@/app/components/feature/reviews/ReviewStatsWidget';
import ReviewHelpWidget from '@/app/components/feature/reviews/ReviewHelpWidget';
import ReviewTipWidget from '@/app/components/feature/reviews/ReviewTipWidget';
import ReviewVideoWidget from '@/app/components/feature/reviews/ReviewVideoWidget';
import ReviewSubmissionModal from '@/app/components/feature/reviews/ReviewSubmissionModal';
import ReviewsSkeleton from '@/app/components/feature/reviews/ReviewsSkeleton';
import ReviewsError from '@/app/components/feature/reviews/ReviewsError';
import { HubPageLayout, HubHeader, HubTabs, HubPagination } from '@/app/components/hub/layout';
import type { HubTab } from '@/app/components/hub/layout';
import Button from '@/app/components/ui/actions/Button';
import toast from 'react-hot-toast';
import type { PendingReviewTask, ProfileReview } from '@/types/reviews';
import styles from './page.module.css';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';

type TabType = 'pending' | 'received' | 'given';
type RatingFilter = 'all' | '5' | '4' | '3' | '2' | '1';
type DateFilter = 'all' | '7days' | '30days' | '3months' | '6months' | '1year';

const ITEMS_PER_PAGE = 4;

export default function ReviewsPage() {
  const router = useRouter();
  const { profile, isLoading: profileLoading } = useUserProfile();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // React Query: Fetch pending review tasks
  const {
    data: pendingData,
    isLoading: pendingLoading,
    error: pendingError,
    refetch: refetchPending
  } = useQuery({
    queryKey: ['reviews', 'pending', profile?.id],
    queryFn: getPendingReviewTasks,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 2,
  });

  // React Query: Fetch received reviews
  const {
    data: receivedData,
    isLoading: receivedLoading,
    error: receivedError,
    refetch: refetchReceived
  } = useQuery({
    queryKey: ['reviews', 'received', profile?.id],
    queryFn: getReceivedReviews,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 2,
  });

  // React Query: Fetch given reviews
  const {
    data: givenData,
    isLoading: givenLoading,
    error: givenError,
    refetch: refetchGiven
  } = useQuery({
    queryKey: ['reviews', 'given', profile?.id],
    queryFn: getGivenReviews,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 2,
  });

  // Submit review mutation
  const submitMutation = useMutation({
    mutationFn: submitReview,
    onSuccess: () => {
      toast.success('Review submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      setSelectedSessionId(null);
    },
    onError: () => {
      toast.error('Failed to submit review');
    },
  });

  const pendingTasks = pendingData?.tasks || [];
  const receivedReviews = receivedData?.reviews || [];
  const givenReviews = givenData?.reviews || [];

  const stats = useMemo(() => ({
    pendingCount: pendingData?.count || 0,
    receivedCount: receivedData?.stats?.total || 0,
    givenCount: givenData?.stats?.total || 0,
    averageRating: receivedData?.stats?.average || 0,
  }), [pendingData, receivedData, givenData]);

  const isLoading = pendingLoading || receivedLoading || givenLoading;
  const error = pendingError || receivedError || givenError;

  const handleOpenReviewModal = (sessionId: string) => {
    setSelectedSessionId(sessionId);
  };

  const handleCloseModal = () => {
    setSelectedSessionId(null);
  };

  const handleReviewSubmitted = () => {
    setSelectedSessionId(null);
    queryClient.invalidateQueries({ queryKey: ['reviews'] });
    toast.success('Review submitted successfully!');
  };

  const handleRetry = () => {
    refetchPending();
    refetchReceived();
    refetchGiven();
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as TabType);
  };

  // Filter helper function
  const filterReviews = (reviews: ProfileReview[]) => {
    let filtered = [...reviews];

    // Search filtering
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(review => {
        const reviewerName = review.reviewer?.full_name?.toLowerCase() || '';
        const revieweeName = review.reviewee?.full_name?.toLowerCase() || '';
        const comment = review.comment?.toLowerCase() || '';
        return reviewerName.includes(query) || revieweeName.includes(query) || comment.includes(query);
      });
    }

    // Rating filtering
    if (ratingFilter !== 'all') {
      const rating = parseInt(ratingFilter);
      filtered = filtered.filter(review => review.rating === rating);
    }

    // Date filtering
    if (dateFilter !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();

      switch (dateFilter) {
        case '7days':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case '30days':
          cutoffDate.setDate(now.getDate() - 30);
          break;
        case '3months':
          cutoffDate.setMonth(now.getMonth() - 3);
          break;
        case '6months':
          cutoffDate.setMonth(now.getMonth() - 6);
          break;
        case '1year':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      filtered = filtered.filter(review => new Date(review.created_at) >= cutoffDate);
    }

    return filtered;
  };

  const filteredReceivedReviews = filterReviews(receivedReviews);
  const filteredGivenReviews = filterReviews(givenReviews);

  // Pagination logic for each tab
  const getPaginatedItems = <T,>(items: T[]) => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return items.slice(startIndex, endIndex);
  };

  const paginatedPendingTasks = getPaginatedItems(pendingTasks);
  const paginatedReceivedReviews = getPaginatedItems(filteredReceivedReviews);
  const paginatedGivenReviews = getPaginatedItems(filteredGivenReviews);

  // Reset to page 1 when tab changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const handleExportCSV = () => {
    let dataToExport: ProfileReview[] = [];
    let filename = 'reviews';

    switch (activeTab) {
      case 'received':
        dataToExport = filteredReceivedReviews;
        filename = 'received-reviews';
        break;
      case 'given':
        dataToExport = filteredGivenReviews;
        filename = 'given-reviews';
        break;
      default:
        return;
    }

    // Create CSV content
    const headers = ['Reviewer', 'Reviewee', 'Rating', 'Review', 'Date'];
    const rows = dataToExport.map(review => [
      review.reviewer?.full_name || '',
      review.reviewee?.full_name || '',
      review.rating?.toString() || '',
      (review.comment || '').replace(/,/g, ';'), // Replace commas to avoid CSV issues
      new Date(review.created_at).toLocaleDateString('en-GB'),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Reviews exported successfully');
    setShowActionsMenu(false);
  };

  const handleViewPublicProfile = () => {
    if (profile?.id) {
      router.push(`/public-profile/${profile.id}`);
      setShowActionsMenu(false);
    }
  };

  const handleRequestReview = () => {
    toast('Manual review request coming soon!', { icon: '📝' });
    setShowActionsMenu(false);
  };

  const emptyStats = {
    pendingCount: 0,
    receivedCount: 0,
    givenCount: 0,
    averageRating: 0,
  };

  // Show loading state
  if (profileLoading || isLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="Reviews & Ratings" />}
        sidebar={
          <HubSidebar>
            <ReviewStatsWidget stats={emptyStats} averageRating={0} />
            <ReviewHelpWidget />
            <ReviewTipWidget />
            <ReviewVideoWidget />
          </HubSidebar>
        }
      >
        <ReviewsSkeleton />
      </HubPageLayout>
    );
  }

  // Show error state
  if (error) {
    return (
      <HubPageLayout
        header={<HubHeader title="Reviews & Ratings" />}
        sidebar={
          <HubSidebar>
            <ReviewStatsWidget stats={emptyStats} averageRating={0} />
            <ReviewHelpWidget />
            <ReviewTipWidget />
            <ReviewVideoWidget />
          </HubSidebar>
        }
      >
        <ReviewsError error={error as Error} onRetry={handleRetry} />
      </HubPageLayout>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Reviews & Ratings"
          filters={
            <div className={filterStyles.filtersContainer}>
              {/* Search Input */}
              <input
                type="search"
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={filterStyles.searchInput}
              />

              {/* Rating Filter */}
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value as RatingFilter)}
                className={filterStyles.filterSelect}
              >
                <option value="all">All Ratings</option>
                <option value="5">5 Stars ⭐⭐⭐⭐⭐</option>
                <option value="4">4 Stars ⭐⭐⭐⭐</option>
                <option value="3">3 Stars ⭐⭐⭐</option>
                <option value="2">2 Stars ⭐⭐</option>
                <option value="1">1 Star ⭐</option>
              </select>

              {/* Date Range Filter */}
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                className={filterStyles.filterSelect}
              >
                <option value="all">All Time</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="3months">Last 3 Months</option>
                <option value="6months">Last 6 Months</option>
                <option value="1year">Last Year</option>
              </select>
            </div>
          }
          actions={
            <>
              {/* Primary Action: Request Review */}
              <Button
                variant="primary"
                size="sm"
                onClick={handleRequestReview}
              >
                Request Review
              </Button>

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
                    <div className={actionStyles.dropdownMenu} style={{ display: 'block' }}>
                      <button
                        onClick={handleViewPublicProfile}
                        className={actionStyles.menuButton}
                      >
                        View Public Profile
                      </button>
                      <button
                        onClick={handleExportCSV}
                        className={actionStyles.menuButton}
                        disabled={activeTab === 'pending'}
                      >
                        Export CSV
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          }
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'pending', label: 'Pending', count: stats.pendingCount, active: activeTab === 'pending' },
            { id: 'received', label: 'Received', count: stats.receivedCount, active: activeTab === 'received' },
            { id: 'given', label: 'Given', count: stats.givenCount, active: activeTab === 'given' },
          ]}
          onTabChange={handleTabChange}
        />
      }
      sidebar={
        <HubSidebar>
          <ReviewStatsWidget
            stats={stats}
            averageRating={stats.averageRating}
          />
        </HubSidebar>
      }
    >
      <div className={styles.container}>

        {/* Content */}
        {isLoading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Loading reviews...</p>
          </div>
        ) : (
          <>
            {/* Pending Tab */}
            {activeTab === 'pending' && (
              pendingTasks.length === 0 ? (
                <HubEmptyState
                  title="No pending reviews"
                  description="You'll see review requests here when you complete bookings."
                />
              ) : (
                <>
                  <div className={styles.reviewsList}>
                    {paginatedPendingTasks.map((task) => (
                      <PendingReviewCard
                        key={task.id}
                        task={task}
                        currentUserId={profile.id}
                        onSubmit={handleOpenReviewModal}
                      />
                    ))}
                  </div>
                  <HubPagination
                    currentPage={currentPage}
                    totalItems={pendingTasks.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                  />
                </>
              )
            )}

            {/* Received Tab */}
            {activeTab === 'received' && (
              receivedReviews.length === 0 ? (
                <HubEmptyState
                  title="No reviews received yet"
                  description="Reviews from clients and collaborators will appear here."
                />
              ) : (
                <>
                  <div className={styles.reviewsList}>
                    {paginatedReceivedReviews.map((review) => (
                      <ProfileReviewCard
                        key={review.id}
                        review={review}
                        variant="received"
                      />
                    ))}
                  </div>
                  <HubPagination
                    currentPage={currentPage}
                    totalItems={filteredReceivedReviews.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                  />
                </>
              )
            )}

            {/* Given Tab */}
            {activeTab === 'given' && (
              givenReviews.length === 0 ? (
                <HubEmptyState
                  title="No reviews given yet"
                  description="Reviews you write will appear here."
                />
              ) : (
                <>
                  <div className={styles.reviewsList}>
                    {paginatedGivenReviews.map((review) => (
                      <ProfileReviewCard
                        key={review.id}
                        review={review}
                        variant="given"
                      />
                    ))}
                  </div>
                  <HubPagination
                    currentPage={currentPage}
                    totalItems={filteredGivenReviews.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                  />
                </>
              )
            )}
          </>
        )}

        {/* Review Submission Modal */}
        {selectedSessionId && (
          <ReviewSubmissionModal
            sessionId={selectedSessionId}
            currentUserId={profile.id}
            isOpen={true}
            onClose={handleCloseModal}
            onSuccess={handleReviewSubmitted}
          />
        )}
      </div>
    </HubPageLayout>
  );
}
