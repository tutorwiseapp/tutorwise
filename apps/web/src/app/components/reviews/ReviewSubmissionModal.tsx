/**
 * Filename: apps/web/src/app/components/reviews/ReviewSubmissionModal.tsx
 * Purpose: Modal for submitting reviews with Junction view (Rebook/Refer CTAs)
 * Created: 2025-11-08
 * Related: reviews-solution-design-v4.5.md
 */

'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import type { SessionDetailsResponse, ReviewSubmission, Profile } from '@/types/reviews';
import styles from './ReviewSubmissionModal.module.css';

interface Props {
  sessionId: string;
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ViewState = 'form' | 'junction';

export default function ReviewSubmissionModal({
  sessionId,
  currentUserId,
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const router = useRouter();
  const [viewState, setViewState] = useState<ViewState>('form');
  const [session, setSession] = useState<SessionDetailsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviews, setReviews] = useState<ReviewSubmission[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchSessionDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sessionId]);

  const fetchSessionDetails = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/reviews/session/${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch session');

      const data: SessionDetailsResponse = await response.json();
      setSession(data);

      // Initialize review forms for each reviewee
      const initialReviews: ReviewSubmission[] = data.session.reviewees_needed.map((revieweeId) => ({
        reviewee_id: revieweeId,
        rating: 5,
        comment: '',
      }));
      setReviews(initialReviews);
    } catch (error) {
      console.error('[ReviewSubmissionModal] Fetch error:', error);
      toast.error('Failed to load session details');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleRatingChange = (revieweeId: string, rating: number) => {
    setReviews((prev) =>
      prev.map((r) => (r.reviewee_id === revieweeId ? { ...r, rating } : r))
    );
  };

  const handleCommentChange = (revieweeId: string, comment: string) => {
    setReviews((prev) =>
      prev.map((r) => (r.reviewee_id === revieweeId ? { ...r, comment } : r))
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          reviews,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const data = await response.json();

      // Show junction view (viral growth CTAs)
      setViewState('junction');
    } catch (error) {
      console.error('[ReviewSubmissionModal] Submit error:', error);
      toast.error('Failed to submit reviews');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRebook = () => {
    // Track analytics event
    if (typeof window !== 'undefined' && (window as any).trackEvent) {
      (window as any).trackEvent('review_junction_rebook_clicked', {
        session_id: sessionId,
        booking_id: session?.session.booking_id,
      });
    }

    // Navigate to bookings page
    router.push('/bookings');
    onSuccess();
  };

  const handleRefer = () => {
    // Track analytics event
    if (typeof window !== 'undefined' && (window as any).trackEvent) {
      (window as any).trackEvent('review_junction_refer_clicked', {
        session_id: sessionId,
        booking_id: session?.session.booking_id,
      });
    }

    // Navigate to referrals page
    router.push('/referrals');
    onSuccess();
  };

  const handleDone = () => {
    onSuccess();
  };

  const getRevieweeProfile = (revieweeId: string): Profile | undefined => {
    if (!session?.session.booking) return undefined;

    const { client, tutor, agent } = session.session.booking;
    if (client?.id === revieweeId) return client;
    if (tutor?.id === revieweeId) return tutor;
    if (agent?.id === revieweeId) return agent;

    return undefined;
  };

  const getContextualPrompts = () => {
    const bookingType = session?.session.booking?.booking_type;
    const currentUserIsClient = session?.session.booking?.client?.id === currentUserId;
    const currentUserIsTutor = session?.session.booking?.tutor?.id === currentUserId;

    if (bookingType === 'agent_job') {
      // Agent hired tutor for a job
      if (currentUserIsClient) {
        return {
          title: 'Review Your Tutor',
          subtitle: 'Share your experience working with this tutor',
          placeholder: 'How was the quality of work? Were they professional and reliable?',
        };
      } else {
        return {
          title: 'Review Your Client',
          subtitle: 'Share your experience working with this client',
          placeholder: 'How was the communication? Were requirements clear?',
        };
      }
    } else if (bookingType === 'direct') {
      // Direct booking: Client ↔ Tutor
      if (currentUserIsClient) {
        return {
          title: 'Review Your Session',
          subtitle: 'Share your learning experience',
          placeholder: 'How was the tutoring session? Did it meet your expectations?',
        };
      } else {
        return {
          title: 'Review Your Student',
          subtitle: 'Share your teaching experience',
          placeholder: 'How was the student? Were they engaged and prepared?',
        };
      }
    } else if (bookingType === 'referred') {
      // Referred: Client ↔ Tutor ↔ Agent (multi-party review)
      return {
        title: 'Write Your Reviews',
        subtitle: 'Share your experience with all participants',
        placeholder: 'Share your experience...',
      };
    }

    // Fallback
    return {
      title: 'Write Your Reviews',
      subtitle: 'Share your experience',
      placeholder: 'Share your experience...',
    };
  };

  const prompts = getContextualPrompts();

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Loading...</p>
          </div>
        ) : viewState === 'form' ? (
          <>
            {/* Form View */}
            <div className={styles.header}>
              <h2 className={styles.title}>{prompts.title}</h2>
              <button onClick={onClose} className={styles.closeButton}>
                ✕
              </button>
            </div>

            <div className={styles.content}>
              <p className={styles.subtitle}>
                {prompts.subtitle}
              </p>
              <p className={styles.publishInfo}>
                Reviews will be published {session?.session.user_has_submitted ? 'when all participants submit' : `in ${session?.session.days_remaining} days or when all participants submit`}
              </p>

              {reviews.map((review) => {
                const reviewee = getRevieweeProfile(review.reviewee_id);
                return (
                  <div key={review.reviewee_id} className={styles.reviewForm}>
                    <div className={styles.revieweeHeader}>
                      {reviewee?.avatar_url && (
                        <Image
                          src={reviewee.avatar_url}
                          alt={reviewee.full_name || 'User'}
                          width={40}
                          height={40}
                          className={styles.avatar}
                        />
                      )}
                      <div>
                        <h4 className={styles.revieweeName}>
                          {reviewee?.full_name || 'Unknown User'}
                        </h4>
                        <p className={styles.revieweeRole}>
                          {reviewee?.active_role || 'Member'}
                        </p>
                      </div>
                    </div>

                    {/* Star Rating */}
                    <div className={styles.ratingSection}>
                      <label className={styles.label}>Rating *</label>
                      <div className={styles.stars}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleRatingChange(review.reviewee_id, star)}
                            className={star <= review.rating ? styles.starActive : styles.starInactive}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Comment */}
                    <div className={styles.commentSection}>
                      <label htmlFor={`comment-${review.reviewee_id}`} className={styles.label}>
                        Comment (optional)
                      </label>
                      <textarea
                        id={`comment-${review.reviewee_id}`}
                        value={review.comment}
                        onChange={(e) => handleCommentChange(review.reviewee_id, e.target.value)}
                        placeholder={prompts.placeholder}
                        className={styles.textarea}
                        rows={4}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={styles.footer}>
              <button onClick={onClose} className={styles.cancelButton} disabled={isSubmitting}>
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className={styles.submitButton}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Reviews'}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Junction View - Viral Growth CTAs */}
            <div className={styles.junctionHeader}>
              <div className={styles.successIcon}>✓</div>
              <h2 className={styles.junctionTitle}>Reviews Submitted!</h2>
              <p className={styles.junctionSubtitle}>
                Your reviews will be published when everyone submits theirs.
              </p>
            </div>

            <div className={styles.junctionContent}>
              <h3 className={styles.junctionPrompt}>What&apos;s next?</h3>

              <div className={styles.ctaCards}>
                {/* Rebook CTA */}
                <button onClick={handleRebook} className={styles.ctaCard}>
                  <div className={styles.ctaIcon}>🔁</div>
                  <h4 className={styles.ctaTitle}>Book Again</h4>
                  <p className={styles.ctaText}>
                    Had a great experience? Book another session
                  </p>
                </button>

                {/* Refer CTA */}
                <button onClick={handleRefer} className={styles.ctaCard}>
                  <div className={styles.ctaIcon}>🎁</div>
                  <h4 className={styles.ctaTitle}>Refer & Earn</h4>
                  <p className={styles.ctaText}>
                    Invite others and earn rewards for successful referrals
                  </p>
                </button>
              </div>
            </div>

            <div className={styles.junctionFooter}>
              <button onClick={handleDone} className={styles.doneButton}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
