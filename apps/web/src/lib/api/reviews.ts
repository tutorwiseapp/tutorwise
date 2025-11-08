/**
 * Reviews API utilities
 * Handles review fetching and submission
 */

import type {
  PendingReviewTask,
  ProfileReview,
  PendingTasksResponse,
  ReceivedReviewsResponse,
  GivenReviewsResponse,
} from '@/types/reviews';

/**
 * Get pending review tasks for current user
 */
export async function getPendingReviewTasks(): Promise<PendingTasksResponse> {
  const response = await fetch('/api/reviews/pending-tasks');
  if (!response.ok) {
    throw new Error('Failed to fetch pending review tasks');
  }
  return response.json();
}

/**
 * Get reviews received by current user
 */
export async function getReceivedReviews(): Promise<ReceivedReviewsResponse> {
  const response = await fetch('/api/reviews/received');
  if (!response.ok) {
    throw new Error('Failed to fetch received reviews');
  }
  return response.json();
}

/**
 * Get reviews given by current user
 */
export async function getGivenReviews(): Promise<GivenReviewsResponse> {
  const response = await fetch('/api/reviews/given');
  if (!response.ok) {
    throw new Error('Failed to fetch given reviews');
  }
  return response.json();
}

/**
 * Submit a review for a session
 */
export async function submitReview(data: {
  session_id: string;
  rating: number;
  comment?: string;
}): Promise<any> {
  const response = await fetch('/api/reviews/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to submit review');
  }

  return response.json();
}
