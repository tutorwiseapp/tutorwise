/**
 * Filename: apps/web/src/app/components/reviews/ProfileReviewCard.tsx
 * Purpose: Card component for displaying received/given reviews
 * Created: 2025-11-08
 */

'use client';

import React from 'react';
import Image from 'next/image';
import type { ProfileReview } from '@/types/reviews';
import styles from './ProfileReviewCard.module.css';

interface Props {
  review: ProfileReview;
  variant: 'received' | 'given';
}

export default function ProfileReviewCard({ review, variant }: Props) {
  const profile = variant === 'received' ? review.reviewer : review.reviewee;
  const isPending = review.session?.status === 'pending';

  const renderStars = (rating: number) => {
    return (
      <div className={styles.stars}>
        {[...Array(5)].map((_, i) => (
          <span key={i} className={i < rating ? styles.starFilled : styles.starEmpty}>
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className={`${styles.card} ${isPending ? styles.pending : ''}`}>
      {/* Header with Avatar and Name */}
      <div className={styles.header}>
        <div className={styles.profile}>
          {profile?.avatar_url && (
            <Image
              src={profile.avatar_url}
              alt={profile.full_name || 'User'}
              width={48}
              height={48}
              className={styles.avatar}
            />
          )}
          <div>
            <h4 className={styles.name}>
              {profile?.full_name || 'Anonymous User'}
            </h4>
            <p className={styles.role}>
              {profile?.active_role
                ? profile.active_role.charAt(0).toUpperCase() + profile.active_role.slice(1)
                : 'Member'}
            </p>
          </div>
        </div>
        <div className={styles.ratingSection}>
          {renderStars(review.rating)}
          <span className={styles.ratingValue}>{review.rating}.0</span>
        </div>
      </div>

      {/* Review Comment */}
      {review.comment && (
        <div className={styles.comment}>
          <p>{review.comment}</p>
        </div>
      )}

      {/* Footer - Booking Context and Date */}
      <div className={styles.footer}>
        <div className={styles.context}>
          <span className={styles.label}>Service:</span>
          <span className={styles.value}>
            {review.session?.booking?.service_name || 'Unknown Service'}
          </span>
        </div>
        <div className={styles.date}>
          {isPending ? (
            <span className={styles.pendingBadge}>Pending Publication</span>
          ) : (
            <span className={styles.dateText}>
              {new Date(review.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
