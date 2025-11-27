/**
 * Filename: apps/web/src/app/components/reviews/ProfileReviewCard.tsx
 * Purpose: Card component for displaying received/given reviews
 * Created: 2025-11-08
 * Updated: 2025-11-24 - Migrated to HubRowCard standard
 * Specification: SDD v4.5 - Horizontal card layout with HubRowCard component
 */

'use client';

import React from 'react';
import { Star } from 'lucide-react';
import type { ProfileReview } from '@/types/reviews';
import HubRowCard from '@/app/components/ui/hub-row-card/HubRowCard';
import StatsRow from '@/app/components/ui/hub-row-card/StatsRow';
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
  });
  const fallbackChar = profile.full_name?.charAt(0).toUpperCase() || '?';

  // Build title
  const title = profile.full_name || 'Anonymous User';

  // Build description (comment)
  const description = review.comment || undefined;

  // Build metadata array
  const serviceName = review.session?.booking?.service_name || 'Unknown Service';
  const meta = [serviceName, formatDate(review.created_at)];

  // Build stats (star rating display with optional future stats)
  const starRating = (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'
            }`}
          />
        ))}
      </div>
      <span className="font-bold text-gray-900">{review.rating}.0</span>
    </div>
  );

  const stats = (
    <StatsRow
      stats={[
        { value: starRating, hideLabel: true },
        // Future: Add more stats here
        // { label: 'Helpful', value: review.helpful_count },
        // { label: 'Verified', value: review.verified ? 'Yes' : 'No' },
      ]}
    />
  );

  return (
    <HubRowCard
      image={{
        src: avatarUrl,
        alt: title,
        fallbackChar: fallbackChar,
      }}
      title={title}
      status={getStatus()}
      description={description}
      meta={meta}
      stats={stats}
      imageHref={`/public-profile/${profile.id}`}
      titleHref={`/public-profile/${profile.id}`}
    />
  );
}
