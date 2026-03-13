/**
 * Filename: AIAgentReviewsCard.tsx
 * Purpose: Reviews card for AI tutor public profile
 * Created: 2026-03-03
 *
 * Copied from ReviewsCard.tsx, customised for AI agent session reviews.
 * Data comes from ai_agent_sessions (reviewed=true, rating, review_text).
 */

import Image from 'next/image';
import Card from '@/components/ui/data-display/Card';
import { Star } from 'lucide-react';
import { getInitials } from '@/lib/utils/initials';
import styles from './AIAgentReviewsCard.module.css';

export interface AIAgentReview {
  id: string;
  reviewer_name: string;
  reviewer_avatar_url?: string | null;
  rating: number;
  comment?: string;
  created_at: string;
}

interface AIAgentReviewsCardProps {
  agentName: string;
  reviews: AIAgentReview[];
}

export function AIAgentReviewsCard({ agentName, reviews = [] }: AIAgentReviewsCardProps) {
  if (!reviews || reviews.length === 0) {
    return (
      <Card className={styles.reviewsCard}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Reviews</h2>
        </div>
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>
            {agentName} doesn&apos;t have any reviews yet.
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
              <div className={styles.reviewHeader}>
                <div className={styles.reviewerInfo}>
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
                  <div className={styles.reviewerDetails}>
                    <div className={styles.reviewerName}>
                      {review.reviewer_name}
                      <span className={styles.verifiedBadge}>Verified</span>
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

                <div className={styles.starRating}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      size={16}
                      fill={index < review.rating ? '#fbbf24' : 'none'}
                      stroke={index < review.rating ? '#fbbf24' : '#d1d5db'}
                    />
                  ))}
                </div>
              </div>

              {review.comment && (
                <p className={styles.reviewComment}>{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
