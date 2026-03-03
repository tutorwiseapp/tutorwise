/**
 * Session handlers:
 *
 * session.create
 *   Creates a VirtualSpace session for the booking and stores the session ID in context.
 *   Calls the virtualspace_sessions table directly via service role client.
 *   Context inputs:  { booking_id: string }
 *   Context outputs: { session_id, join_url }
 *
 * session.wait
 *   Marks the workflow as waiting for session completion.
 *   The WorkflowCompiler intercepts this via completion_mode='hitl' (assigned_role='tutor').
 *   This handler runs AFTER the interrupt resumes — it confirms session outcome.
 *   Context inputs:  { session_id: string, session_outcome?: string }
 *   Context outputs: { session_duration, outcome }
 */

import { createServiceRoleClient } from '@/utils/supabase/server';
import type { HandlerContext, HandlerOptions } from '../NodeHandlerRegistry';

// ---------------------------------------------------------------------------
// session.create
// Creates a VirtualSpace session record and associates it with the booking.
// In Phase 4 live mode: session is ready for tutor/student to join.
// ---------------------------------------------------------------------------

export async function handleSessionCreate(
  context: HandlerContext,
  _opts: HandlerOptions
): Promise<Record<string, unknown>> {
  const bookingId = context.booking_id as string | undefined;
  if (!bookingId) throw new Error('session.create: booking_id required in context');

  const supabase = createServiceRoleClient();

  // Fetch booking for context fields
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, service_name, client_id, tutor_id, session_start_time')
    .eq('id', bookingId)
    .single();

  if (bookingError || !booking) {
    throw new Error(`session.create: booking ${bookingId} not found — ${bookingError?.message}`);
  }

  // Create virtualspace session record
  const { data: session, error: sessionError } = await supabase
    .from('virtualspace_sessions')
    .insert({
      booking_id: bookingId,
      host_id: booking.tutor_id,
      title: booking.service_name ?? 'Tutoring Session',
      status: 'pending',
      scheduled_at: booking.session_start_time ?? null,
    })
    .select('id, invite_token')
    .single();

  if (sessionError || !session) {
    throw new Error(`session.create: failed to create session — ${sessionError?.message}`);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tutorwise.io';
  const joinUrl = `${appUrl}/virtualspace/${session.id}?token=${session.invite_token}`;

  console.log(`[session.create] Session ${session.id} created for booking ${bookingId}`);

  return {
    session_id: session.id as string,
    join_url: joinUrl,
  };
}

// ---------------------------------------------------------------------------
// session.wait
// Post-interrupt confirmation handler: reads outcome from resume payload.
// The WorkflowCompiler suspends execution (completion_mode='hitl') before this
// node runs in live mode; it resumes when the tutor marks the session complete.
// ---------------------------------------------------------------------------

export async function handleSessionWait(
  context: HandlerContext,
  _opts: HandlerOptions
): Promise<Record<string, unknown>> {
  const sessionId = context.session_id as string | undefined;
  const outcome = (context.session_outcome as string | undefined) ?? 'completed';

  if (sessionId) {
    const supabase = createServiceRoleClient();
    const { data: session } = await supabase
      .from('virtualspace_sessions')
      .select('id, status, duration_minutes')
      .eq('id', sessionId)
      .single();

    return {
      session_duration: session?.duration_minutes ?? null,
      outcome,
    };
  }

  return { session_duration: null, outcome };
}
