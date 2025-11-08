/**
 * Filename: apps/web/src/app/(authenticated)/reviews/page.tsx
 * Purpose: Reviews & Ratings Hub - Mutual review system (v4.5)
 * Created: 2025-11-08
 * Updated: 2025-11-08 - Migrated to React Query
 * Related: reviews-solution-design-v4.5.md
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { getPendingReviewTasks, getReceivedReviews, getGivenReviews, submitReview } from '@/lib/api/reviews';
import ContextualSidebar from '@/app/components/layout/sidebars/ContextualSidebar';
import PendingReviewCard from '@/app/components/reviews/PendingReviewCard';
import ProfileReviewCard from '@/app/components/reviews/ProfileReviewCard';
import ReviewStatsWidget from '@/app/components/reviews/ReviewStatsWidget';
import ReviewSubmissionModal from '@/app/components/reviews/ReviewSubmissionModal';
import ReviewsSkeleton from '@/app/components/reviews/ReviewsSkeleton';
import ReviewsError from '@/app/components/reviews/ReviewsError';
import toast from 'react-hot-toast';
import type {
  PendingReviewTask,
  ProfileReview,
} from '@/types/reviews';
import styles from './page.module.css';

type TabType = 'pending' | 'received' | 'given';

export default function ReviewsPage() {
  const router = useRouter();
  const { profile, isLoading: profileLoading } = useUserProfile();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // React Query: Fetch pending review tasks
  const {
    data: pendingData,
    isLoading: pendingLoading,
    error: pendingError,
    refetch: refetchPending
  } = useQuery({
    queryKey: ['reviews', 'pending', profile?.id],
    queryFn: getPendingReviewTasks,
    enabled: !!profile && !profileLoading,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
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
    enabled: !!profile && !profileLoading,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
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
    enabled: !!profile && !profileLoading,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
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

  const emptyStats = {
    pendingCount: 0,
    receivedCount: 0,
    givenCount: 0,
    averageRating: 0,
  };

  // Show loading state
  if (profileLoading || isLoading) {
    return (
      <>
        <ReviewsSkeleton />
        <ContextualSidebar>
          <ReviewStatsWidget stats={emptyStats} averageRating={0} />
        </ContextualSidebar>
      </>
    );
  }

  // Show error state
  if (error) {
    return (
      <>
        <ReviewsError error={error as Error} onRetry={handleRetry} />
        <ContextualSidebar>
          <ReviewStatsWidget stats={emptyStats} averageRating={0} />
        </ContextualSidebar>
      </>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Reviews & Ratings</h1>
          <p className={styles.subtitle}>
            Manage your reviews and build your reputation on Tutorwise
          </p>
        </div>

        {/* Filter Tabs */}
        <div className={styles.filterTabs}>
          <button
            onClick={() => setActiveTab('pending')}
            className={`${styles.filterTab} ${
              activeTab === 'pending' ? styles.filterTabActive : ''
            }`}
          >
            Pending ({stats.pendingCount})
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={`${styles.filterTab} ${
              activeTab === 'received' ? styles.filterTabActive : ''
            }`}
          >
            Received ({stats.receivedCount})
          </button>
          <button
            onClick={() => setActiveTab('given')}
            className={`${styles.filterTab} ${
              activeTab === 'given' ? styles.filterTabActive : ''
            }`}
          >
            Given ({stats.givenCount})
          </button>
        </div>

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
                <div className={styles.emptyState}>
                  <h3 className={styles.emptyTitle}>No pending reviews</h3>
                  <p className={styles.emptyText}>
                    You&apos;ll see review requests here when you complete bookings.
                  </p>
                </div>
              ) : (
                <div className={styles.reviewsList}>
                  {pendingTasks.map((task) => (
                    <PendingReviewCard
                      key={task.id}
                      task={task}
                      currentUserId={profile.id}
                      onSubmit={handleOpenReviewModal}
                    />
                  ))}
                </div>
              )
            )}

            {/* Received Tab */}
            {activeTab === 'received' && (
              receivedReviews.length === 0 ? (
                <div className={styles.emptyState}>
                  <h3 className={styles.emptyTitle}>No reviews received yet</h3>
                  <p className={styles.emptyText}>
                    Reviews from clients and collaborators will appear here.
                  </p>
                </div>
              ) : (
                <div className={styles.reviewsList}>
                  {receivedReviews.map((review) => (
                    <ProfileReviewCard
                      key={review.id}
                      review={review}
                      variant="received"
                    />
                  ))}
                </div>
              )
            )}

            {/* Given Tab */}
            {activeTab === 'given' && (
              givenReviews.length === 0 ? (
                <div className={styles.emptyState}>
                  <h3 className={styles.emptyTitle}>No reviews given yet</h3>
                  <p className={styles.emptyText}>
                    Reviews you write will appear here.
                  </p>
                </div>
              ) : (
                <div className={styles.reviewsList}>
                  {givenReviews.map((review) => (
                    <ProfileReviewCard
                      key={review.id}
                      review={review}
                      variant="given"
                    />
                  ))}
                </div>
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

      {/* Contextual Sidebar */}
      <ContextualSidebar>
        <ReviewStatsWidget
          stats={stats}
          averageRating={stats.averageRating}
        />
      </ContextualSidebar>
    </>
  );
}
