/**
 * Filename: apps/web/src/app/components/feature/reviews/ProfileReviewCard.tsx
 * Purpose: Card component for displaying received/given reviews in detail card format with HubDetailCard
 * Created: 2025-11-08
 * Updated: 2025-12-05 - Migrated to HubDetailCard standard (consistent with BookingCard/WiselistCard)
 */

'use client';

import React from 'react';
import { Star } from 'lucide-react';
import type { ProfileReview } from '@/types/reviews';
import HubDetailCard from '@/app/components/hub/content/HubDetailCard/HubDetailCard';
import getProfileImageUrl from '@/lib/utils/image';

interface Props {
  review: ProfileReview;
  variant: 'received' | 'given';
}

export default function ProfileReviewCard({ review, variant }: Props) {
  // Determine profile: reviewer (if received) or reviewee (if given)
  const reviewer = review.reviewer;
  const reviewee = review.reviewee;
  const profile = variant === 'received' ? reviewer : reviewee;

  if (!profile) {
    return null;
  }

  // Check if review is pending publication
  const isPending = review.session?.status === 'pending';

  // Format date helper (en-GB standard)
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Map status based on publication state
  const getStatus = (): { label: string; variant: 'success' | 'warning' | 'error' | 'neutral' | 'info' } => {
    if (isPending) {
      return { label: 'Pending Approval', variant: 'warning' };
    }
    return { label: 'Verified Booking', variant: 'success' };
  };

  // Get image properties
  const avatarUrl = getProfileImageUrl({
    id: profile.id,
    avatar_url: profile.avatar_url ?? undefined,
    full_name: profile.full_name || undefined, // Use reviewer name for initials
  });
  const fallbackChar = profile.full_name?.charAt(0).toUpperCase() || '?';

  // Build title
  const title = profile.full_name || 'Anonymous User';

  // Build description (comment)
  const description = review.comment || undefined;

  // Build star rating display
  const starRatingDisplay = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          style={{
            width: '16px',
            height: '16px',
            fill: i < review.rating ? '#FBBF24' : '#E5E7EB',
            color: i < review.rating ? '#FBBF24' : '#E5E7EB',
          }}
        />
      ))}
      <span style={{ fontWeight: 'bold', color: '#111827', marginLeft: '4px' }}>
        {review.rating}.0
      </span>
    </div>
  );

  // Build details grid - 3x3 grid for balance with 160px avatar
  // Migration 105: Use snapshot fields from review (preferred) or fallback to session.booking
  const serviceName = review.service_name || review.session?.booking?.service_name || 'Unknown Service';
  const primarySubject = review.subjects?.[0] || 'Not specified';
  const sessionDate = review.session_date || review.created_at;

  const details = [
    // Row 1: Rating, Subject, Service
    { label: 'Rating', value: starRatingDisplay },
    { label: 'Subject', value: primarySubject },
    { label: 'Service', value: serviceName },
    // Row 2: From/To, Session Date, Location
    { label: variant === 'received' ? 'From' : 'To', value: profile.full_name || 'Anonymous' },
    { label: 'Session', value: formatDate(sessionDate) },
    { label: 'Location', value: review.delivery_mode || 'N/A' },
    // Row 3: Verified, Levels, Status
    { label: 'Verified', value: isPending ? 'No' : 'Yes' },
    { label: 'Levels', value: review.levels?.join(', ') || 'N/A' },
    { label: 'Status', value: getStatus().label },
  ];

  return (
    <HubDetailCard
      image={{
        src: avatarUrl,
        alt: title,
        fallbackChar: fallbackChar,
      }}
      imageHref={`/public-profile/${profile.id}`}
      title={title}
      titleHref={`/public-profile/${profile.id}`}
      status={getStatus()}
      description={description}
      details={details}
    />
  );
}
