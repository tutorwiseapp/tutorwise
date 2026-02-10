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
  const [isLoading, _setIsLoading] = useState(false);

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
  const reviewContentFields = [
    {
      label: 'Rating',
      value: (
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
      ),
    },
    ...(review.comment
      ? [
          {
            label: 'Comment',
            value: <div className={styles.commentBox}>{review.comment}</div>,
          },
        ]
      : []),
    {
      label: 'Sentiment',
      value: (
        <span className={styles[`sentiment${sentiment.charAt(0).toUpperCase()}${sentiment.slice(1)}`]}>
          {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
        </span>
      ),
    },
    {
      label: 'Verified',
      value: (
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
      ),
    },
    ...(review.metadata?.helpful_count !== undefined
      ? [
          {
            label: 'Helpful Votes',
            value: (
              <div className={styles.helpfulDisplay}>
                <ThumbsUp size={16} />
                <span>{review.metadata.helpful_count}</span>
              </div>
            ),
          },
        ]
      : []),
  ];

  // Section 2: Reviewer Information
  const reviewerFields = review.reviewer
    ? [
        {
          label: 'Name',
          value: (
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
          ),
        },
        ...(review.reviewer.active_role
          ? [
              {
                label: 'Role',
                value: <span className={styles.roleBadge}>{review.reviewer.active_role}</span>,
              },
            ]
          : []),
        {
          label: 'Profile ID',
          value: <span className={styles.idText}>{formatIdForDisplay(review.reviewer_id)}</span>,
        },
      ]
    : [];

  // Section 3: Reviewee Information
  const revieweeFields = review.reviewee
    ? [
        {
          label: 'Name',
          value: (
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
          ),
        },
        ...(review.reviewee.active_role
          ? [
              {
                label: 'Role',
                value: <span className={styles.roleBadge}>{review.reviewee.active_role}</span>,
              },
            ]
          : []),
        {
          label: 'Profile ID',
          value: <span className={styles.idText}>{formatIdForDisplay(review.reviewee_id)}</span>,
        },
      ]
    : [];

  // Section 4: Service Context (Snapshot fields)
  const serviceContextFields = [
    ...(review.service_name
      ? [
          {
            label: 'Service Name',
            value: review.service_name,
          },
        ]
      : []),
    ...(review.subjects && review.subjects.length > 0
      ? [
          {
            label: 'Subjects',
            value: (
              <div className={styles.badgeList}>
                {review.subjects.map((subject, idx) => (
                  <span key={idx} className={styles.badge}>
                    {subject}
                  </span>
                ))}
              </div>
            ),
          },
        ]
      : []),
    ...(review.levels && review.levels.length > 0
      ? [
          {
            label: 'Levels',
            value: (
              <div className={styles.badgeList}>
                {review.levels.map((level, idx) => (
                  <span key={idx} className={styles.badge}>
                    {level}
                  </span>
                ))}
              </div>
            ),
          },
        ]
      : []),
    ...(review.session_date
      ? [
          {
            label: 'Session Date',
            value: formatDate(review.session_date, 'dd MMM yyyy'),
          },
        ]
      : []),
    ...(review.delivery_mode
      ? [
          {
            label: 'Location Type',
            value: <span className={styles.locationBadge}>{review.delivery_mode}</span>,
          },
        ]
      : []),
  ];

  // Section 5: Session Information
  const sessionInfoFields = review.session
    ? [
        {
          label: 'Session ID',
          value: <span className={styles.idText}>{formatIdForDisplay(review.session.id)}</span>,
        },
        {
          label: 'Status',
          value: (
            <span className={styles[`status${status.charAt(0).toUpperCase()}${status.slice(1)}`]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          ),
        },
        ...(review.session.publish_at
          ? [
              {
                label: 'Publish Date',
                value: formatDate(review.session.publish_at, 'dd MMM yyyy HH:mm'),
              },
            ]
          : []),
        ...(review.session.published_at
          ? [
              {
                label: 'Published At',
                value: formatDate(review.session.published_at, 'dd MMM yyyy HH:mm'),
              },
            ]
          : []),
        ...(review.booking_id
          ? [
              {
                label: 'Booking ID',
                value: (
                  <button onClick={handleViewBooking} className={styles.linkButton}>
                    {formatIdForDisplay(review.booking_id)}
                  </button>
                ),
              },
            ]
          : []),
      ]
    : [];

  // Section 6: System Information
  const systemInfoFields = [
    {
      label: 'Review ID',
      value: <span className={styles.idText}>{formatIdForDisplay(review.id, 'full')}</span>,
    },
    {
      label: 'Created At',
      value: formatDate(review.created_at, 'dd MMM yyyy HH:mm:ss'),
    },
    {
      label: 'Updated At',
      value: formatDate(review.updated_at, 'dd MMM yyyy HH:mm:ss'),
    },
    ...(review.metadata && Object.keys(review.metadata).length > 0
      ? [
          {
            label: 'Metadata',
            value: <pre className={styles.jsonDisplay}>{JSON.stringify(review.metadata, null, 2)}</pre>,
          },
        ]
      : []),
  ];

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

  // Build sections array
  const sections = [
    {
      title: 'Review Content',
      fields: reviewContentFields,
    },
    ...(reviewerFields.length > 0
      ? [
          {
            title: 'Reviewer Information',
            fields: reviewerFields,
          },
        ]
      : []),
    ...(revieweeFields.length > 0
      ? [
          {
            title: 'Reviewee Information',
            fields: revieweeFields,
          },
        ]
      : []),
    ...(serviceContextFields.length > 0
      ? [
          {
            title: 'Service Context',
            fields: serviceContextFields,
          },
        ]
      : []),
    ...(sessionInfoFields.length > 0
      ? [
          {
            title: 'Session Information',
            fields: sessionInfoFields,
          },
        ]
      : []),
    {
      title: 'System Information',
      fields: systemInfoFields,
    },
  ];

  return (
    <HubDetailModal
      isOpen={true}
      title={`Review ${formatIdForDisplay(review.id)}`}
      onClose={onClose}
      sections={sections}
      actions={actions}
    />
  );
}
