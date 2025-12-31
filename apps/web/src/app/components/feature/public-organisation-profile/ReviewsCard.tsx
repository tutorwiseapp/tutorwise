/**
 * Filename: ReviewsCard.tsx
 * Purpose: Reviews card for public profiles
 * Created: 2025-11-12
 *
 * Displays user reviews with star ratings for the profile.
 * Shows verified reviews from users who have booked sessions.
 */

import type { Profile } from '@/types';
import Image from 'next/image';
import Card from '@/app/components/ui/data-display/Card';
import { Star } from 'lucide-react';
import { getInitials } from '@/lib/utils/initials';
import styles from './ReviewsCard.module.css';

interface ReviewsCardProps {
  profile: Profile;
  reviews?: Review[];
}

interface Review {
  id: string;
  reviewer_id: string;
  reviewer_name: string;
  reviewer_avatar_url?: string;
  rating: number;
  title?: string;
  comment: string;
  verified_booking: boolean;
  created_at: string;
}

export function ReviewsCard({ profile, reviews = [] }: ReviewsCardProps) {
  const firstName = profile.first_name || profile.full_name?.split(' ')[0] || profile.full_name;

  // Empty state
  if (!reviews || reviews.length === 0) {
    return (
      <Card className={styles.reviewsCard}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Reviews</h2>
        </div>
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>
            {firstName} doesn&apos;t have any reviews yet.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={styles.reviewsCard}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Reviews ({reviews.length})</h2>
      </div>
      <div className={styles.cardContent}>
        <div className={styles.reviewsContainer}>
        {reviews.map((review) => (
          <div key={review.id} className={styles.reviewItem}>
            {/* Review Header: Avatar, Name, Date, Stars */}
            <div className={styles.reviewHeader}>
              <div className={styles.reviewerInfo}>
                {/* Avatar */}
                {review.reviewer_avatar_url ? (
                  <Image
                    src={review.reviewer_avatar_url}
                    width={48}
                    height={48}
                    alt={review.reviewer_name}
                    className={styles.avatar}
                  />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {getInitials(review.reviewer_name, false)}
                  </div>
                )}

                {/* Name and Date */}
                <div className={styles.reviewerDetails}>
                  <div className={styles.reviewerName}>
                    {review.reviewer_name}
                    {review.verified_booking && (
                      <span className={styles.verifiedBadge}>Verified</span>
                    )}
                  </div>
                  <div className={styles.reviewDate}>
                    {new Date(review.created_at).toLocaleDateString('en-GB', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              </div>

              {/* Star Rating */}
              <div className={styles.starRating}>
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    size={16}
                    className={index < review.rating ? styles.starFilled : styles.starEmpty}
                    fill={index < review.rating ? '#fbbf24' : 'none'}
                    stroke={index < review.rating ? '#fbbf24' : '#d1d5db'}
                  />
                ))}
              </div>
            </div>

            {/* Review Title (optional) */}
            {review.title && (
              <h4 className={styles.reviewTitle}>{review.title}</h4>
            )}

            {/* Review Comment */}
            <p className={styles.reviewComment}>{review.comment}</p>
          </div>
        ))}
        </div>
      </div>
    </Card>
  );
}
