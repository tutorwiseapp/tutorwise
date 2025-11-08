/**
 * Filename: apps/web/src/app/(authenticated)/reviews/page.tsx
 * Purpose: Reviews & Ratings Hub - Mutual review system (v4.5)
 * Created: 2025-11-08
 * Related: reviews-solution-design-v4.5.md
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import ContextualSidebar from '@/app/components/layout/sidebars/ContextualSidebar';
import PendingReviewCard from '@/app/components/reviews/PendingReviewCard';
import ProfileReviewCard from '@/app/components/reviews/ProfileReviewCard';
import ReviewStatsWidget from '@/app/components/reviews/ReviewStatsWidget';
import ReviewSubmissionModal from '@/app/components/reviews/ReviewSubmissionModal';
import toast from 'react-hot-toast';
import type {
  PendingReviewTask,
  ProfileReview,
  PendingTasksResponse,
  ReceivedReviewsResponse,
  GivenReviewsResponse,
} from '@/types/reviews';
import styles from './page.module.css';

type TabType = 'pending' | 'received' | 'given';

export default function ReviewsPage() {
  const router = useRouter();
  const { profile } = useUserProfile();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [pendingTasks, setPendingTasks] = useState<PendingReviewTask[]>([]);
  const [receivedReviews, setReceivedReviews] = useState<ProfileReview[]>([]);
  const [givenReviews, setGivenReviews] = useState<ProfileReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    pendingCount: 0,
    receivedCount: 0,
    givenCount: 0,
    averageRating: 0,
  });

  useEffect(() => {
    if (profile) {
      fetchAllReviews();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const fetchAllReviews = async () => {
    if (!profile) return;

    setIsLoading(true);
    try {
      // Fetch all review data in parallel
      const [pendingRes, receivedRes, givenRes] = await Promise.all([
        fetch('/api/reviews/pending-tasks'),
        fetch('/api/reviews/received'),
        fetch('/api/reviews/given'),
      ]);

      if (!pendingRes.ok || !receivedRes.ok || !givenRes.ok) {
        throw new Error('Failed to fetch reviews');
      }

      const pendingData: PendingTasksResponse = await pendingRes.json();
      const receivedData: ReceivedReviewsResponse = await receivedRes.json();
      const givenData: GivenReviewsResponse = await givenRes.json();

      setPendingTasks(pendingData.tasks || []);
      setReceivedReviews(receivedData.reviews || []);
      setGivenReviews(givenData.reviews || []);

      setStats({
        pendingCount: pendingData.count || 0,
        receivedCount: receivedData.stats?.total || 0,
        givenCount: givenData.stats?.total || 0,
        averageRating: receivedData.stats?.average || 0,
      });
    } catch (error) {
      console.error('[ReviewsPage] Fetch error:', error);
      toast.error('Failed to load reviews');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenReviewModal = (sessionId: string) => {
    setSelectedSessionId(sessionId);
  };

  const handleCloseModal = () => {
    setSelectedSessionId(null);
  };

  const handleReviewSubmitted = () => {
    setSelectedSessionId(null);
    fetchAllReviews();
    toast.success('Reviews submitted successfully!');
  };

  if (!profile) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
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
