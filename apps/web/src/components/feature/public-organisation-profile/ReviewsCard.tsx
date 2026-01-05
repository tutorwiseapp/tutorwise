/**
 * Filename: ReviewsCard.tsx
 * Purpose: Display aggregate team reviews with tutor attribution
 * Created: 2025-12-31
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Star, ChevronDown } from 'lucide-react';
import { getInitials } from '@/lib/utils/initials';
import styles from './ReviewsCard.module.css';

interface Review {
  id: string;
  reviewer_id: string;
  reviewer_name: string;
  reviewer_avatar_url?: string;
  rating: number;
  comment: string;
  tutor_name?: string;
  verified_booking: boolean;
  created_at: string;
}

interface ReviewsCardProps {
  reviews: Review[];
  organisation: any;
}

export function ReviewsCard({ reviews, organisation }: ReviewsCardProps) {
  const [visibleCount, setVisibleCount] = useState(5);
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');

  // Filter reviews by rating
  const filteredReviews = filterRating === 'all'
    ? reviews
    : reviews.filter(r => r.rating === filterRating);

  // Limit visible reviews
  const visibleReviews = filteredReviews.slice(0, visibleCount);
  const hasMore = filteredReviews.length > visibleCount;

  // Calculate rating distribution
  const ratingCounts = reviews.reduce((acc, review) => {
    acc[review.rating] = (acc[review.rating] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short' });
  };

  // Render stars
  const renderStars = (rating: number) => {
    return (
      <div className={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            fill={star <= rating ? '#fbbf24' : 'none'}
            color={star <= rating ? '#fbbf24' : '#cbd5e1'}
          />
        ))}
      </div>
    );
  };

  if (reviews.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.title}>Reviews</h2>
        </div>
        <div className={styles.emptyState}>
          <p>No reviews yet. Be the first to leave a review!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      {/* Header with teal background */}
      <div className={styles.header}>
        <h2 className={styles.title}>
          Reviews
        </h2>
      </div>

      {/* Content wrapper */}
      <div className={styles.content}>
        {/* Reviews List */}
        <div className={styles.reviewsList}>
        {visibleReviews.map((review) => {
          const reviewerInitials = getInitials(review.reviewer_name);

          return (
            <div key={review.id} className={styles.reviewItem}>
              {/* Reviewer Info */}
              <div className={styles.reviewerSection}>
                <div className={styles.reviewerAvatar}>
                  {review.reviewer_avatar_url ? (
                    <Image
                      src={review.reviewer_avatar_url}
                      alt={review.reviewer_name}
                      width={48}
                      height={48}
                      className={styles.avatar}
                    />
                  ) : (
                    <div className={styles.avatarFallback}>
                      {reviewerInitials}
                    </div>
                  )}
                </div>

                <div className={styles.reviewerInfo}>
                  <div className={styles.reviewerName}>{review.reviewer_name}</div>
                  {review.tutor_name && (
                    <div className={styles.tutorAttribution}>
                      for {review.tutor_name}
                    </div>
                  )}
                  <div className={styles.reviewDate}>{formatDate(review.created_at)}</div>
                </div>

                <div className={styles.ratingSection}>
                  {renderStars(review.rating)}
                </div>
              </div>

              {/* Review Comment */}
              {review.comment && (
                <div className={styles.reviewComment}>
                  {review.comment}
                </div>
              )}

              {/* Verified Badge */}
              {review.verified_booking && (
                <div className={styles.verifiedBadge}>
                  ✓ Verified Booking
                </div>
              )}
            </div>
          );
        })}
      </div>

        {/* Load More Button */}
        {hasMore && (
          <div className={styles.loadMoreSection}>
            <button
              className={styles.loadMoreButton}
              onClick={() => setVisibleCount(prev => prev + 5)}
            >
              Load More Reviews ({filteredReviews.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
