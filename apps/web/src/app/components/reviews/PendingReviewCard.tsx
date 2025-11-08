/**
 * Filename: apps/web/src/app/components/reviews/PendingReviewCard.tsx
 * Purpose: Card component for pending review tasks
 * Created: 2025-11-08
 */

'use client';

import React from 'react';
import type { PendingReviewTask } from '@/types/reviews';
import styles from './PendingReviewCard.module.css';

interface Props {
  task: PendingReviewTask;
  currentUserId: string;
  onSubmit: (sessionId: string) => void;
}

export default function PendingReviewCard({ task, currentUserId, onSubmit }: Props) {
  const booking = task.booking;

  // Determine display name and role based on booking participants
  const getOtherParticipants = () => {
    const participants = [];

    if (booking?.student && booking.student.id !== currentUserId) {
      participants.push({ name: booking.student.full_name || 'Client', role: 'Client' });
    }
    if (booking?.tutor && booking.tutor.id !== currentUserId) {
      participants.push({ name: booking.tutor.full_name || 'Tutor', role: 'Tutor' });
    }
    if (booking?.referrer && booking.referrer.id !== currentUserId) {
      participants.push({ name: booking.referrer.full_name || 'Agent', role: 'Agent' });
    }

    return participants;
  };

  const participants = getOtherParticipants();
  const urgencyClass = task.days_remaining <= 1 ? styles.urgent : task.days_remaining <= 3 ? styles.warning : '';

  return (
    <div className={`${styles.card} ${urgencyClass}`}>
      <div className={styles.content}>
        {/* Left Section - Booking Info */}
        <div className={styles.bookingInfo}>
          <h3 className={styles.serviceName}>{booking?.service_name || 'Unknown Service'}</h3>
          <p className={styles.date}>
            Session: {booking?.session_start_time
              ? new Date(booking.session_start_time).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })
              : 'Unknown date'
            }
          </p>
          <div className={styles.participants}>
            <span className={styles.label}>Review {participants.length} {participants.length === 1 ? 'person' : 'people'}:</span>
            {participants.map((p, i) => (
              <span key={i} className={styles.participantName}>
                {p.name}
              </span>
            ))}
          </div>
        </div>

        {/* Right Section - Action & Deadline */}
        <div className={styles.actions}>
          <div className={styles.deadline}>
            <span className={styles.deadlineLabel}>
              {task.days_remaining === 0 ? 'Due today' : `${task.days_remaining} days left`}
            </span>
            <span className={styles.deadlineSubtext}>
              Auto-publish: {new Date(task.publish_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </div>
          <button
            onClick={() => onSubmit(task.id)}
            className={styles.submitButton}
          >
            Write Reviews
          </button>
        </div>
      </div>
    </div>
  );
}
