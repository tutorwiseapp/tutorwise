/**
 * Handler: review.request
 *
 * Requests a post-session review by updating the booking to 'Completed' status.
 * The DB trigger `create_review_session_on_booking_complete` (migration 045) automatically
 * creates a booking_review_session record with a 7-day publish window.
 *
 * Context inputs:  { booking_id: string }
 * Context outputs: { review_task_id, booking_status }
 */

import { createServiceRoleClient } from '@/utils/supabase/server';
import type { HandlerContext, HandlerOptions } from '../NodeHandlerRegistry';

// ---------------------------------------------------------------------------
// review.request
// Marks the booking as Completed, which triggers the DB review session trigger.
// ---------------------------------------------------------------------------

export async function handleReviewRequest(
  context: HandlerContext,
  _opts: HandlerOptions
): Promise<Record<string, unknown>> {
  const bookingId = context.booking_id as string | undefined;
  if (!bookingId) throw new Error('review.request: booking_id required in context');

  const supabase = createServiceRoleClient();

  // Update booking to Completed — triggers create_review_session_on_booking_complete
  const { data: booking, error } = await supabase
    .from('bookings')
    .update({
      status: 'Completed',
      payment_status: 'Confirmed',
    })
    .eq('id', bookingId)
    .select('id, status')
    .single();

  if (error) {
    throw new Error(`review.request: failed to update booking ${bookingId} — ${error.message}`);
  }

  // Verify review session was created by the trigger
  const { data: reviewSession } = await supabase
    .from('booking_review_sessions')
    .select('id')
    .eq('booking_id', bookingId)
    .single();

  console.log(
    `[review.request] Booking ${bookingId} marked Completed.` +
    (reviewSession ? ` Review session ${reviewSession.id} created.` : ' No review session yet (may be async).')
  );

  return {
    review_task_id: reviewSession?.id ?? bookingId,
    booking_status: booking?.status ?? 'Completed',
  };
}
