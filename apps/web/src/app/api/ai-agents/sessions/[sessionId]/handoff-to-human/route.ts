/**
 * Filename: api/ai-agents/sessions/[sessionId]/handoff-to-human/route.ts
 * Purpose: Seamless handoff from AI tutor to human tutor in same VirtualSpace session
 * Created: 2026-02-24
 * Phase: 3B - VirtualSpace Integration
 *
 * Allows clients to request a human tutor join their AI video session.
 * The AI can remain in the session (hybrid mode) or be dismissed.
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface HandoffRequest {
  human_tutor_id?: string; // Optional specific tutor, otherwise finds available tutor
  keep_ai?: boolean; // If true, AI stays in session (hybrid mode). Default: false
  message?: string; // Optional message to human tutor explaining what help is needed
}

/**
 * POST /api/ai-agents/sessions/[sessionId]/handoff-to-human
 * Request human tutor to join VirtualSpace session
 *
 * Body: {
 *   human_tutor_id?: string,
 *   keep_ai?: boolean,
 *   message?: string
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const supabase = await createClient();
  const { sessionId } = await params;

  try {
    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body: HandoffRequest = await request.json();
    const { human_tutor_id, keep_ai = false, message } = body;

    // 3. Fetch AI tutor session with VirtualSpace details
    const { data: aiSession, error: sessionError } = await supabase
      .from('ai_agent_sessions')
      .select(`
        *,
        ai_agent:ai_agents!agent_id(
          id,
          name,
          owner_id
        )
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !aiSession) {
      return NextResponse.json({ error: 'AI tutor session not found' }, { status: 404 });
    }

    // 4. Verify authorization (must be the client)
    if (user.id !== aiSession.client_id) {
      return NextResponse.json(
        { error: 'Only the session client can request handoff' },
        { status: 403 }
      );
    }

    // 5. Verify session is in video or hybrid mode
    if (!aiSession.virtualspace_session_id) {
      return NextResponse.json(
        { error: 'Session must be in video mode for handoff. Call /join-video first.' },
        { status: 400 }
      );
    }

    if (aiSession.session_mode === 'chat') {
      return NextResponse.json(
        { error: 'Session is not in video mode' },
        { status: 400 }
      );
    }

    // 6. Check if already in hybrid mode with human tutor
    if (aiSession.session_mode === 'hybrid') {
      return NextResponse.json(
        { error: 'Session already has a human tutor' },
        { status: 400 }
      );
    }

    // 7. Determine which human tutor to invite
    let tutorId = human_tutor_id;

    // If no specific tutor requested, use AI tutor's owner as default
    if (!tutorId) {
      const aiTutor = (aiSession.ai_tutor as any)?.[0];
      tutorId = aiTutor?.owner_id;

      if (!tutorId) {
        return NextResponse.json(
          { error: 'No human tutor available. Please specify human_tutor_id.' },
          { status: 400 }
        );
      }
    }

    // 8. Verify tutor exists and is available
    const { data: tutorProfile, error: tutorError } = await supabase
      .from('profiles')
      .select('id, full_name, active_role, roles')
      .eq('id', tutorId)
      .single();

    if (tutorError || !tutorProfile) {
      return NextResponse.json({ error: 'Human tutor not found' }, { status: 404 });
    }

    // Verify they are a tutor
    if (tutorProfile.active_role !== 'tutor' && !tutorProfile.roles?.includes('tutor')) {
      return NextResponse.json(
        { error: 'Selected user is not a tutor' },
        { status: 400 }
      );
    }

    // 9. Create VirtualSpace invitation for human tutor
    const { data: invitation, error: inviteError } = await supabase
      .from('virtualspace_invitations')
      .insert({
        session_id: aiSession.virtualspace_session_id,
        invitee_id: tutorId,
        inviter_id: user.id,
        role: 'tutor',
        status: 'pending',
        message: message || 'Client has requested assistance from AI tutor session',
        metadata: {
          session_id: sessionId,
          handoff_requested: true,
          keep_ai: keep_ai
        }
      })
      .select()
      .single();

    if (inviteError) {
      console.error('[Handoff] Failed to create invitation:', inviteError);
      throw inviteError;
    }

    // 10. Update AI session to hybrid mode
    const newMode = keep_ai ? 'hybrid' : 'video'; // Will transition to hybrid when human joins

    const { error: updateError } = await supabase
      .from('ai_agent_sessions')
      .update({
        session_mode: newMode,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('[Handoff] Failed to update session mode:', updateError);
      throw updateError;
    }

    // 11. Log handoff event
    await supabase
      .from('ai_agent_virtualspace_events')
      .insert({
        session_id: sessionId,
        virtualspace_session_id: aiSession.virtualspace_session_id,
        event_type: 'handoff_requested',
        event_data: {
          timestamp: new Date().toISOString(),
          human_tutor_id: tutorId,
          keep_ai: keep_ai,
          requested_by: user.id
        }
      });

    console.log('[Handoff] Handoff requested:', {
      aiSessionId: sessionId,
      virtualspaceSessionId: aiSession.virtualspace_session_id,
      humanTutorId: tutorId,
      keepAi: keep_ai
    });

    // 12. TODO: Send notification to human tutor (push, email, SMS)
    // This would be handled by a notification service

    return NextResponse.json({
      success: true,
      invitation_id: invitation.id,
      human_tutor_id: tutorId,
      human_tutor_name: tutorProfile.full_name,
      session_mode: newMode,
      message: `Handoff requested. ${tutorProfile.full_name} has been invited to join the session.`,
      keep_ai: keep_ai
    });

  } catch (error) {
    console.error('[Handoff] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
