/**
 * Filename: apps/web/src/app/components/feature/reviews/PendingReviewCard.tsx
 * Purpose: Card component for pending review tasks
 * Created: 2025-11-08
 * Updated: 2025-11-24 - Migrated to HubRowCard standard
 * Specification: SDD v4.5 - Horizontal card layout with HubRowCard component
 */

'use client';

import React from 'react';
import type { PendingReviewTask } from '@/types/reviews';
import HubRowCard from '@/app/components/hub/content/HubRowCard/HubRowCard';
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
  });
  const fallbackChar = subject.full_name?.charAt(0).toUpperCase() || '?';

  // Build title (booking.service_name)
  const title = booking.service_name || 'Unknown Service';

  // Build description
  const description = `Rate your experience with ${subject.full_name}`;

  // Build metadata array
  const meta = [`Session: ${formatDate(booking.session_start_time)}`];

  // Build actions
  const actions = (
    <Button variant="primary" size="sm" onClick={() => onSubmit(task.id)}>
      Write Review
    </Button>
  );

  return (
    <HubRowCard
      image={{
        src: avatarUrl,
        alt: subject.full_name || 'Subject',
        fallbackChar: fallbackChar,
      }}
      title={title}
      status={getStatus()}
      description={description}
      meta={meta}
      actions={actions}
      imageHref={`/public-profile/${subject.id}`}
      titleHref={`/public-profile/${subject.id}`}
    />
  );
}
