/**
 * Filename: apps/web/src/types/reviews.ts
 * Purpose: TypeScript type definitions for the mutual review system (v4.5)
 * Created: 2025-11-08
 * Related: reviews-solution-design-v4.5.md
 */

export type BookingReviewStatus = 'pending' | 'published' | 'expired';

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  active_role?: string;
}

export type BookingType = 'direct' | 'referred' | 'agent_job';

export interface Booking {
  id: string;
  service_name: string;
  session_start_time: string;
  session_duration?: number;
  amount?: number;
  booking_type?: BookingType;
  client?: Profile;
  tutor?: Profile;
  agent?: Profile | null;
}

export interface BookingReviewSession {
  id: string;
  booking_id: string;
  status: BookingReviewStatus;
  publish_at: string;
  published_at: string | null;
  participant_ids: string[];
  submitted_ids: string[];
  created_at: string;
  updated_at: string;
  booking?: Booking;
}

export interface ProfileReview {
  id: string;
  session_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;

  // NEW: Snapshot fields from Booking (migration 105) - Copied at review creation time
  service_name?: string;           // Service name (from booking)
  subjects?: string[];             // Subjects taught (from booking)
  levels?: string[];               // Education levels (from booking)
  session_date?: string;           // Session date (from booking.session_start_time)
  location_type?: 'online' | 'in_person' | 'hybrid'; // Delivery mode
  booking_id?: string;             // Reference to booking

  reviewer?: Profile;
  reviewee?: Profile;
  session?: BookingReviewSession;
}

export interface PendingReviewTask extends BookingReviewSession {
  reviewees_count: number;
  days_remaining: number;
}

export interface ReviewSubmission {
  reviewee_id: string;
  rating: number;
  comment?: string;
}

export interface ReviewStats {
  total: number;
  average: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface ReceivedReviewsResponse {
  reviews: ProfileReview[];
  stats: ReviewStats;
}

export interface GivenReviewsResponse {
  reviews: ProfileReview[];
  stats: {
    total: number;
    pending: number;
    published: number;
  };
}

export interface PendingTasksResponse {
  tasks: PendingReviewTask[];
  count: number;
}

export interface SubmitReviewsRequest {
  session_id: string;
  reviews: ReviewSubmission[];
}

export interface SubmitReviewsResponse {
  success: boolean;
  reviews: ProfileReview[];
  session_status: BookingReviewStatus;
  auto_published: boolean;
}

export interface SessionDetailsResponse {
  session: BookingReviewSession & {
    days_remaining: number;
    user_has_submitted: boolean;
    reviewees_needed: string[];
  };
  reviews: ProfileReview[];
}
