/**
 * Filename: api/ai-agents/sessions/[sessionId]/end/route.ts
 * Purpose: End AI tutor session and calculate billing
 * Created: 2026-02-23
 * Version: v1.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * PATCH /api/ai-agents/sessions/[sessionId]/end
 * End session and calculate duration/billing
 */
export async function PATCH(
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
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify user is client
    if (session.client_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Prevent double-ending
    if (session.status !== 'active') {
      return NextResponse.json(
        { error: 'Session is already ended', status: session.status },
        { status: 400 }
      );
    }

    // Calculate duration in minutes
    const startedAt = new Date(session.started_at);
    const endedAt = new Date();
    const durationMinutes = Math.ceil(
      (endedAt.getTime() - startedAt.getTime()) / (1000 * 60)
    );

    // Update session
    await supabase
      .from('ai_tutor_sessions')
      .update({
        ended_at: endedAt.toISOString(),
        duration_minutes: durationMinutes,
        status: 'completed',
      })
      .eq('id', sessionId);

    // Update AI tutor stats (increment session count and revenue)
    await supabase.rpc('ai_tutor_increment_session_stats', {
      p_agent_id: session.agent_id,
      p_revenue: session.owner_earnings,
    });

    return NextResponse.json(
      {
        sessionId,
        durationMinutes,
        endedAt: endedAt.toISOString(),
        status: 'completed',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error ending session:', error);
    return NextResponse.json(
      { error: 'Failed to end session' },
      { status: 500 }
    );
  }
}
