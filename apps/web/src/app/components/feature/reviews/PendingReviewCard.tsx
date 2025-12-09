/**
 * Filename: apps/web/src/app/components/feature/reviews/PendingReviewCard.tsx
 * Purpose: Card component for pending review tasks in detail card format with HubDetailCard
 * Created: 2025-11-08
 * Updated: 2025-12-05 - Migrated to HubDetailCard standard (consistent with BookingCard/WiselistCard)
 */

'use client';

import React from 'react';
import type { PendingReviewTask } from '@/types/reviews';
import HubDetailCard from '@/app/components/hub/content/HubDetailCard/HubDetailCard';
import Button from '@/app/components/ui/actions/Button';
import getProfileImageUrl from '@/lib/utils/image';

interface Props {
  task: PendingReviewTask;
  currentUserId: string;
  onSubmit: (sessionId: string) => void;
}

export default function PendingReviewCard({ task, currentUserId, onSubmit }: Props) {
  const booking = task.booking;

  if (!booking) {
    return null;
  }

  // Determine subject: person to be reviewed (if currentUser === tutor, subject is client)
  const subject = booking.tutor?.id === currentUserId ? booking.client : booking.tutor;

  if (!subject) {
    return null;
  }

  // Format date helper (en-GB standard)
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Map status based on urgency (days_remaining)
  const getStatus = (): { label: string; variant: 'success' | 'warning' | 'error' | 'neutral' | 'info' } => {
    if (task.days_remaining <= 1) {
      return { label: 'Due Today', variant: 'error' };
    }
    if (task.days_remaining <= 3) {
      return { label: 'Due Soon', variant: 'warning' };
    }
    return { label: 'Pending', variant: 'neutral' };
  };

  // Get image properties
  const avatarUrl = getProfileImageUrl({
    id: subject.id,
    avatar_url: subject.avatar_url ?? undefined,
    full_name: subject.full_name, // Use subject name for initials
  });
  const fallbackChar = subject.full_name?.charAt(0).toUpperCase() || '?';

  // Build title (booking.service_name)
  const title = booking.service_name || 'Unknown Service';

  // Build description
  const description = `Rate your experience with ${subject.full_name}`;

  // Build details grid - 3x3 grid for balance with 160px avatar
  const details = [
    // Row 1: Subject, Session Date, Days Remaining
    { label: 'Subject', value: subject.full_name || 'Unknown' },
    { label: 'Session', value: formatDate(booking.session_start_time) },
    { label: 'Due In', value: `${task.days_remaining} ${task.days_remaining === 1 ? 'day' : 'days'}` },
    // Row 2: Service, Status, Task ID
    { label: 'Service', value: booking.service_name || 'Unknown Service' },
    { label: 'Status', value: getStatus().label },
    { label: 'Task ID', value: task.id.substring(0, 8) },
    // Row 3: Subject ID (full width)
    { label: 'Subject ID', value: subject.id.substring(0, 16), fullWidth: true },
  ];

  // Build actions
  const actions = (
    <Button variant="primary" size="sm" onClick={() => onSubmit(task.id)}>
      Write Review
    </Button>
  );

  return (
    <HubDetailCard
      image={{
        src: avatarUrl,
        alt: subject.full_name || 'Subject',
        fallbackChar: fallbackChar,
      }}
      imageHref={`/public-profile/${subject.id}`}
      title={title}
      titleHref={`/public-profile/${subject.id}`}
      status={getStatus()}
      description={description}
      details={details}
      actions={actions}
    />
  );
}
