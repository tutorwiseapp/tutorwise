/**
 * Filename: AdminReviewDetailModal.tsx
 * Purpose: Review detail modal with 6 sections and 6 admin actions
 * Created: 2025-12-27
 * Pattern: Mirrors AdminListingDetailModal.tsx
 */

'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { HubDetailModal } from '@/app/components/hub/modal';
import { formatIdForDisplay } from '@/lib/utils/formatId';
import type { ProfileReview } from '@/types/reviews';
import styles from './AdminReviewDetailModal.module.css';
import {
  Star,
  StarOff,
  CheckCircle,
  XCircle,
  Flag,
  Eye,
  MessageCircle,
  Trash2,
  ThumbsUp,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

// Local date formatting helper
const formatDate = (dateString: string, format?: string): string => {
  const date = new Date(dateString);

  if (format?.includes('HH:mm')) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    if (format.includes('HH:mm:ss')) {
      const seconds = date.getSeconds().toString().padStart(2, '0');
      return `${day} ${month} ${year} ${hours}:${minutes}:${seconds}`;
    }
    return `${day} ${month} ${year} ${hours}:${minutes}`;
  }

  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

interface AdminReviewDetailModalProps {
  review: ProfileReview;
  onClose: () => void;
  onUpdate: () => void;
}

export function AdminReviewDetailModal({
  review,
  onClose,
  onUpdate,
}: AdminReviewDetailModalProps) {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);

  // Helper to calculate sentiment
  const getSentiment = (rating: number): 'positive' | 'neutral' | 'negative' => {
    if (rating >= 4) return 'positive';
    if (rating >= 3) return 'neutral';
    return 'negative';
  };

  const sentiment = getSentiment(review.rating);
  const status = review.session?.status || 'pending';

  // Approve/Unapprove mutation
  const toggleApprovalMutation = useMutation({
    mutationFn: async () => {
      if (!review.session?.id) throw new Error('No session found');

      const newStatus = status === 'published' ? 'pending' : 'published';
      const updates: any = { status: newStatus };

      if (newStatus === 'published') {
        updates.published_at = new Date().toISOString();
      } else {
        updates.published_at = null;
      }

      const { error } = await supabase
        .from('booking_review_sessions')
        .update(updates)
        .eq('id', review.session.id);

      if (error) throw error;
    },
    onSuccess: () => {
      onUpdate();
    },
  });

  // Flag mutation
  const flagMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profile_reviews')
        .update({
          metadata: {
            ...review.metadata,
            flagged: true,
            flagged_at: new Date().toISOString(),
          },
        })
        .eq('id', review.id);

      if (error) throw error;
    },
    onSuccess: () => {
      onUpdate();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('profile_reviews').delete().eq('id', review.id);

      if (error) throw error;
    },
    onSuccess: () => {
      onUpdate();
      onClose();
    },
  });

  // Action handlers
  const handleApprove = () => {
    const action = status === 'published' ? 'unapprove' : 'approve';
    if (window.confirm(`Are you sure you want to ${action} this review?`)) {
      toggleApprovalMutation.mutate();
    }
  };

  const handleFlag = () => {
    if (window.confirm('Flag this review for moderation?')) {
      flagMutation.mutate();
    }
  };

  const handleViewBooking = () => {
    if (review.booking_id) {
      window.open(`/admin/bookings?id=${review.booking_id}`, '_blank');
    }
  };

  const handleContactReviewer = () => {
    if (review.reviewer_id) {
      window.open(`/messages?userId=${review.reviewer_id}`, '_blank');
    }
  };

  const handleContactReviewee = () => {
    if (review.reviewee_id) {
      window.open(`/messages?userId=${review.reviewee_id}`, '_blank');
    }
  };

  const handleDelete = () => {
    if (
      window.confirm(
        'Are you sure you want to permanently delete this review? This action cannot be undone.'
      )
    ) {
      deleteMutation.mutate();
    }
  };

  // Section 1: Review Content
  const reviewContentSection = (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Review Content</h3>

      <div className={styles.field}>
        <label>Rating</label>
        <div className={styles.ratingDisplay}>
          <div className={styles.stars}>
            {Array.from({ length: 5 }, (_, i) =>
              i < review.rating ? (
                <Star key={i} className={styles.starFilled} size={20} />
              ) : (
                <StarOff key={i} className={styles.starEmpty} size={20} />
              )
            )}
          </div>
          <span className={styles.ratingValue}>{review.rating.toFixed(1)} / 5.0</span>
        </div>
      </div>

      {review.comment && (
        <div className={styles.field}>
          <label>Comment</label>
          <div className={styles.commentBox}>{review.comment}</div>
        </div>
      )}

      <div className={styles.field}>
        <label>Sentiment</label>
        <span className={styles[`sentiment${sentiment.charAt(0).toUpperCase()}${sentiment.slice(1)}`]}>
          {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
        </span>
      </div>

      <div className={styles.field}>
        <label>Verified</label>
        <div className={styles.verifiedDisplay}>
          {review.metadata?.verified ? (
            <>
              <CheckCircle className={styles.verifiedIcon} size={18} />
              <span>Verified Booking</span>
            </>
          ) : (
            <>
              <XCircle className={styles.unverifiedIcon} size={18} />
              <span>Not Verified</span>
            </>
          )}
        </div>
      </div>

      {review.metadata?.helpful_count !== undefined && (
        <div className={styles.field}>
          <label>Helpful Votes</label>
          <div className={styles.helpfulDisplay}>
            <ThumbsUp size={16} />
            <span>{review.metadata.helpful_count}</span>
          </div>
        </div>
      )}
    </div>
  );

  // Section 2: Reviewer Information
  const reviewerSection = (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Reviewer Information</h3>

      {review.reviewer && (
        <>
          <div className={styles.field}>
            <label>Name</label>
            <div className={styles.profileDisplay}>
              {review.reviewer.avatar_url && (
                <img
                  src={review.reviewer.avatar_url}
                  alt={review.reviewer.full_name || 'Reviewer'}
                  className={styles.avatar}
                />
              )}
              <span>{review.reviewer.full_name || '—'}</span>
            </div>
          </div>

          {review.reviewer.active_role && (
            <div className={styles.field}>
              <label>Role</label>
              <span className={styles.roleBadge}>{review.reviewer.active_role}</span>
            </div>
          )}

          <div className={styles.field}>
            <label>Profile ID</label>
            <span className={styles.idText}>{formatIdForDisplay(review.reviewer_id)}</span>
          </div>
        </>
      )}
    </div>
  );

  // Section 3: Reviewee Information
  const revieweeSection = (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Reviewee Information</h3>

      {review.reviewee && (
        <>
          <div className={styles.field}>
            <label>Name</label>
            <div className={styles.profileDisplay}>
              {review.reviewee.avatar_url && (
                <img
                  src={review.reviewee.avatar_url}
                  alt={review.reviewee.full_name || 'Reviewee'}
                  className={styles.avatar}
                />
              )}
              <span>{review.reviewee.full_name || '—'}</span>
            </div>
          </div>

          {review.reviewee.active_role && (
            <div className={styles.field}>
              <label>Role</label>
              <span className={styles.roleBadge}>{review.reviewee.active_role}</span>
            </div>
          )}

          <div className={styles.field}>
            <label>Profile ID</label>
            <span className={styles.idText}>{formatIdForDisplay(review.reviewee_id)}</span>
          </div>
        </>
      )}
    </div>
  );

  // Section 4: Service Context (Snapshot fields)
  const serviceContextSection = (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Service Context</h3>

      {review.service_name && (
        <div className={styles.field}>
          <label>Service Name</label>
          <span>{review.service_name}</span>
        </div>
      )}

      {review.subjects && review.subjects.length > 0 && (
        <div className={styles.field}>
          <label>Subjects</label>
          <div className={styles.badgeList}>
            {review.subjects.map((subject, idx) => (
              <span key={idx} className={styles.badge}>
                {subject}
              </span>
            ))}
          </div>
        </div>
      )}

      {review.levels && review.levels.length > 0 && (
        <div className={styles.field}>
          <label>Levels</label>
          <div className={styles.badgeList}>
            {review.levels.map((level, idx) => (
              <span key={idx} className={styles.badge}>
                {level}
              </span>
            ))}
          </div>
        </div>
      )}

      {review.session_date && (
        <div className={styles.field}>
          <label>Session Date</label>
          <span>{formatDate(review.session_date, 'dd MMM yyyy')}</span>
        </div>
      )}

      {review.location_type && (
        <div className={styles.field}>
          <label>Location Type</label>
          <span className={styles.locationBadge}>{review.location_type}</span>
        </div>
      )}
    </div>
  );

  // Section 5: Session Information
  const sessionInfoSection = (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Session Information</h3>

      {review.session && (
        <>
          <div className={styles.field}>
            <label>Session ID</label>
            <span className={styles.idText}>{formatIdForDisplay(review.session.id)}</span>
          </div>

          <div className={styles.field}>
            <label>Status</label>
            <span className={styles[`status${status.charAt(0).toUpperCase()}${status.slice(1)}`]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>

          {review.session.publish_at && (
            <div className={styles.field}>
              <label>Publish Date</label>
              <span>{formatDate(review.session.publish_at, 'dd MMM yyyy HH:mm')}</span>
            </div>
          )}

          {review.session.published_at && (
            <div className={styles.field}>
              <label>Published At</label>
              <span>{formatDate(review.session.published_at, 'dd MMM yyyy HH:mm')}</span>
            </div>
          )}

          {review.booking_id && (
            <div className={styles.field}>
              <label>Booking ID</label>
              <button onClick={handleViewBooking} className={styles.linkButton}>
                {formatIdForDisplay(review.booking_id)}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );

  // Section 6: System Information
  const systemInfoSection = (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>System Information</h3>

      <div className={styles.field}>
        <label>Review ID</label>
        <span className={styles.idText}>{formatIdForDisplay(review.id, 'full')}</span>
      </div>

      <div className={styles.field}>
        <label>Created At</label>
        <span>{formatDate(review.created_at, 'dd MMM yyyy HH:mm:ss')}</span>
      </div>

      <div className={styles.field}>
        <label>Updated At</label>
        <span>{formatDate(review.updated_at, 'dd MMM yyyy HH:mm:ss')}</span>
      </div>

      {review.metadata && Object.keys(review.metadata).length > 0 && (
        <div className={styles.field}>
          <label>Metadata</label>
          <pre className={styles.jsonDisplay}>{JSON.stringify(review.metadata, null, 2)}</pre>
        </div>
      )}
    </div>
  );

  // Actions
  const actions = (
    <div className={styles.actionsWrapper}>
      <button onClick={handleApprove} className={styles.primaryButton} disabled={isLoading}>
        {status === 'published' ? 'Unapprove' : 'Approve'}
      </button>

      <button onClick={handleFlag} className={styles.secondaryButton} disabled={isLoading}>
        <Flag size={16} />
        Flag for Review
      </button>

      <button
        onClick={handleViewBooking}
        className={styles.secondaryButton}
        disabled={!review.booking_id}
      >
        <Eye size={16} />
        View Booking
      </button>

      <button
        onClick={handleContactReviewer}
        className={styles.secondaryButton}
        disabled={!review.reviewer_id}
      >
        <MessageCircle size={16} />
        Contact Reviewer
      </button>

      <button
        onClick={handleContactReviewee}
        className={styles.secondaryButton}
        disabled={!review.reviewee_id}
      >
        <MessageCircle size={16} />
        Contact Reviewee
      </button>

      <button onClick={handleDelete} className={styles.dangerButton} disabled={isLoading}>
        <Trash2 size={16} />
        Delete
      </button>
    </div>
  );

  return (
    <HubDetailModal
      title={`Review ${formatIdForDisplay(review.id)}`}
      onClose={onClose}
      actions={actions}
    >
      {reviewContentSection}
      {reviewerSection}
      {revieweeSection}
      {serviceContextSection}
      {sessionInfoSection}
      {systemInfoSection}
    </HubDetailModal>
  );
}
