/**
 * Handler: scheduling.negotiate
 *
 * Initiates the 5-stage scheduling negotiation flow for a Human Tutor booking.
 * Sends a notification to the tutor to propose a session time via
 * POST /api/bookings/[id]/schedule/propose. The WorkflowCompiler then suspends
 * the workflow via completion_mode='hitl' (assigned_role='tutor').
 *
 * The workflow resumes when:
 *   1. Tutor proposes a time  → POST /api/bookings/[id]/schedule/propose
 *   2. Client confirms the time → POST /api/bookings/[id]/schedule/confirm
 *
 * Context inputs:  { booking_id: string }
 * Context outputs: { scheduling_status, session_start_time? }
 */

import { createServiceRoleClient } from '@/utils/supabase/server';
import type { HandlerContext, HandlerOptions } from '../NodeHandlerRegistry';

// ---------------------------------------------------------------------------
// scheduling.negotiate
// Updates booking.scheduling_status to 'unscheduled' and notifies the tutor.
// Execution then suspends via hitl interrupt until schedule is confirmed.
// ---------------------------------------------------------------------------

export async function handleSchedulingNegotiate(
  context: HandlerContext,
  _opts: HandlerOptions
): Promise<Record<string, unknown>> {
  const bookingId = context.booking_id as string | undefined;
  if (!bookingId) throw new Error('scheduling.negotiate: booking_id required in context');

  const supabase = createServiceRoleClient();

  // Fetch booking with tutor details for notification
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select(`
      id, service_name, tutor_id, client_id, scheduling_status,
      tutor:tutor_id(email, full_name),
      client:client_id(full_name)
    `)
    .eq('id', bookingId)
    .single();

  if (bookingError || !booking) {
    throw new Error(`scheduling.negotiate: booking ${bookingId} not found — ${bookingError?.message}`);
  }

  // Only update if not already in a scheduling state
  if (!booking.scheduling_status || booking.scheduling_status === 'unscheduled') {
    await supabase
      .from('bookings')
      .update({ scheduling_status: 'unscheduled' })
      .eq('id', bookingId);
  }

  const tutor = booking.tutor as unknown as { email?: string; full_name?: string } | null;
  const client = booking.client as unknown as { full_name?: string } | null;

  // Read resume payload if already negotiated (workflow resuming after hitl)
  const schedulingStatus = (context.scheduling_status as string | undefined) ?? booking.scheduling_status;
  const sessionStartTime = context.session_start_time as string | undefined;

  if (schedulingStatus === 'scheduled') {
    console.log(`[scheduling.negotiate] Booking ${bookingId} already scheduled at ${sessionStartTime}`);
    return {
      scheduling_status: 'scheduled',
      session_start_time: sessionStartTime,
    };
  }

  console.log(
    `[scheduling.negotiate] Booking ${bookingId} awaiting schedule negotiation. ` +
    `Tutor: ${tutor?.email ?? 'unknown'}. Client: ${client?.full_name ?? 'unknown'}.`
  );

  // Execution suspends here via hitl interrupt (assigned_role: tutor).
  // Resume is triggered when /api/bookings/[id]/schedule/confirm is called,
  // which should call POST /api/admin/workflow/execute/[threadId]/resume.
  return {
    scheduling_status: 'pending_tutor_proposal',
    booking_id: bookingId,
  };
}
