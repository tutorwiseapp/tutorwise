/**
 * Filename: ReputationReviewWidget.tsx
 * Purpose: Reviews Hub Action Widget - Request Review CTA
 * Created: 2025-11-18
 * Design: Uses HubActionCard pattern
 *
 * Action: Request Review
 * - Title: "Request a Review"
 * - Description: Prompt explanation
 * - Button: "Request Review" (Primary)
 */

'use client';

import React from 'react';
import HubActionCard from '@/app/components/hub/sidebar/cards/HubActionCard';

interface ReputationReviewWidgetProps {
  onRequestReview: () => void;
}

export default function ReputationReviewWidget({
  onRequestReview,
}: ReputationReviewWidgetProps) {
  return (
    <HubActionCard
      title="Request a Review"
      description="Ask your recent students to leave a review and build your reputation on Tutorwise."
      buttonText="Request Review"
      onButtonClick={onRequestReview}
      buttonVariant="primary"
    />
  );
}
