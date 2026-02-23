'use client';

/**
 * Review Modal Component
 *
 * Post-session review modal for AI tutor sessions.
 * Allows users to rate and review their experience.
 *
 * @module components/feature/ai-tutors/session/ReviewModal
 */

import { useState } from 'react';
import styles from './ReviewModal.module.css';

interface ReviewModalProps {
  tutorName: string;
  onSubmit: (rating: number, reviewText: string) => Promise<void>;
  onSkip: () => void;
}

export default function ReviewModal({ tutorName, onSubmit, onSkip }: ReviewModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit(rating, reviewText);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>How was your session?</h2>
        <p className={styles.subtitle}>
          Rate your experience with {tutorName}
        </p>

        {/* Star rating */}
        <div className={styles.ratingContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`${styles.star} ${
                star <= (hoveredRating || rating) ? styles.starFilled : ''
              }`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
              </svg>
            </button>
          ))}
        </div>

        {rating > 0 && (
          <p className={styles.ratingLabel}>
            {getRatingLabel(rating)}
          </p>
        )}

        {/* Review text */}
        <textarea
          className={styles.textarea}
          placeholder="Tell us more about your experience (optional)"
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          maxLength={2000}
          rows={4}
        />

        <p className={styles.charCount}>
          {reviewText.length}/2000 characters
        </p>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.skipButton}
            onClick={onSkip}
            disabled={isSubmitting}
          >
            Skip
          </button>
          <button
            type="button"
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>

        {/* Upsell CTA */}
        <div className={styles.upsell}>
          <p className={styles.upsellText}>
            Need more personalized help? Book a session with a human tutor
          </p>
          <button
            type="button"
            className={styles.upsellButton}
            onClick={() => window.location.href = '/marketplace'}
          >
            Browse Human Tutors
          </button>
        </div>
      </div>
    </div>
  );
}

function getRatingLabel(rating: number): string {
  switch (rating) {
    case 1: return 'Poor';
    case 2: return 'Fair';
    case 3: return 'Good';
    case 4: return 'Very Good';
    case 5: return 'Excellent';
    default: return '';
  }
}
