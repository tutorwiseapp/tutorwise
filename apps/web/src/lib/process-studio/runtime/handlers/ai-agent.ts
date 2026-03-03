/**
 * Handler: ai_agent.invoke
 *
 * Starts an AI Tutor virtualspace session and suspends the workflow until the
 * session ends. The WorkflowCompiler uses completion_mode='ai_session' to issue
 * a LangGraph interrupt; execution resumes when the session-end Realtime event fires.
 *
 * Context inputs:  { booking_id: string, agent_id?: string }
 * Context outputs: { session_id, session_duration, outcome }
 */

import { createServiceRoleClient } from '@/utils/supabase/server';
import type { HandlerContext, HandlerOptions } from '../NodeHandlerRegistry';

// ---------------------------------------------------------------------------
// ai_agent.invoke
// Creates a virtualspace session and associates it with the AI agent for the booking.
// Phase 4 live: session-end Supabase Realtime event resumes the checkpoint.
// ---------------------------------------------------------------------------

export async function handleAiAgentInvoke(
  context: HandlerContext,
  _opts: HandlerOptions
): Promise<Record<string, unknown>> {
  const bookingId = context.booking_id as string | undefined;
  if (!bookingId) throw new Error('ai_agent.invoke: booking_id required in context');

  const supabase = createServiceRoleClient();

  // Fetch booking to get agent and client info
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, service_name, client_id, tutor_id, agent_id')
    .eq('id', bookingId)
    .single();

  if (bookingError || !booking) {
    throw new Error(`ai_agent.invoke: booking ${bookingId} not found — ${bookingError?.message}`);
  }

  // Create virtualspace session for the AI agent
  const { data: session, error: sessionError } = await supabase
    .from('virtualspace_sessions')
    .insert({
      booking_id: bookingId,
      host_id: booking.tutor_id,     // AI agent profile ID as host
      title: booking.service_name ?? 'AI Tutoring Session',
      status: 'active',              // AI session starts immediately
      is_ai_session: true,
    })
    .select('id, invite_token')
    .single();

  if (sessionError || !session) {
    throw new Error(`ai_agent.invoke: failed to create AI session — ${sessionError?.message}`);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tutorwise.io';
  const joinUrl = `${appUrl}/virtualspace/${session.id}?token=${session.invite_token}`;

  console.log(`[ai_agent.invoke] AI session ${session.id} started for booking ${bookingId}`);

  // The workflow suspends here via LangGraph interrupt (completion_mode='ai_session').
  // It will resume when virtualspace_sessions.status → 'completed' event fires via Realtime.
  return {
    session_id: session.id as string,
    join_url: joinUrl,
    ai_session_started: true,
  };
}
