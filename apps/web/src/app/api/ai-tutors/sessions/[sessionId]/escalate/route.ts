/**
 * Filename: api/ai-tutors/sessions/[sessionId]/escalate/route.ts
 * Purpose: Escalate AI tutor session to human tutor
 * Created: 2026-02-23
 * Version: v1.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/ai-tutors/sessions/[sessionId]/escalate
 * Mark session as escalated and create human tutor request
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('ai_tutor_sessions')
      .select(
        `
        *,
        ai_tutors (
          id,
          display_name,
          subject,
          owner_id
        )
      `
      )
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify user is client
    if (session.client_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify session is active
    if (session.status !== 'active') {
      return NextResponse.json(
        { error: 'Session is not active' },
        { status: 403 }
      );
    }

    // Calculate session duration and cost
    const startedAt = new Date(session.started_at);
    const endedAt = new Date();
    const durationMinutes = Math.ceil((endedAt.getTime() - startedAt.getTime()) / (1000 * 60));
    const costPounds = (durationMinutes / 60) * session.price_per_hour;

    // Update session status to escalated
    const { data: updatedSession, error: updateError } = await supabase
      .from('ai_tutor_sessions')
      .update({
        status: 'escalated',
        ended_at: endedAt.toISOString(),
        duration_minutes: durationMinutes,
        cost_pounds: costPounds,
        escalated_to_human: true,
      })
      .eq('id', sessionId)
      .select(
        `
        *,
        ai_tutors (
          id,
          display_name,
          subject,
          description,
          price_per_hour,
          owner_id
        )
      `
      )
      .single();

    if (updateError) {
      console.error('Error updating session:', updateError);
      return NextResponse.json(
        { error: 'Failed to escalate session' },
        { status: 500 }
      );
    }

    // TODO: Create notification for AI tutor owner about escalation
    // TODO: Create booking/session request for human tutor (optional feature)

    return NextResponse.json(
      {
        session: updatedSession,
        message: 'Session escalated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error escalating session:', error);
    return NextResponse.json(
      { error: 'Failed to escalate session' },
      { status: 500 }
    );
  }
}
