/**
 * Filename: api/ai-agents/sessions/[sessionId]/escalate/route.ts
 * Purpose: Escalate AI tutor session to human tutor
 * Created: 2026-02-23
 * Version: v1.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/ai-agents/sessions/[sessionId]/escalate
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
      .from('ai_agent_sessions')
      .select(
        `
        *,
        ai_agent:ai_agents!agent_id (
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

    // Calculate session duration and cost
    const startedAt = new Date(session.started_at);
    const endedAt = new Date();
    const durationMinutes = Math.ceil((endedAt.getTime() - startedAt.getTime()) / (1000 * 60));
    const costPounds = (durationMinutes / 60) * session.price_per_hour;

    // Atomic update — WHERE status='active' prevents race conditions
    const { data: updatedSession, error: updateError } = await supabase
      .from('ai_agent_sessions')
      .update({
        status: 'escalated',
        ended_at: endedAt.toISOString(),
        duration_minutes: durationMinutes,
        cost_pounds: costPounds,
        escalated_to_human: true,
      })
      .eq('id', sessionId)
      .eq('status', 'active')
      .select(
        `
        *,
        ai_agent:ai_agents!agent_id (
          id,
          display_name,
          subject,
          description,
          price_per_hour,
          owner_id
        )
      `
      )
      .maybeSingle();

    if (updateError) {
      console.error('Error updating session:', updateError);
      return NextResponse.json(
        { error: 'Failed to escalate session' },
        { status: 500 }
      );
    }

    if (!updatedSession) {
      return NextResponse.json(
        { error: 'Session is not active' },
        { status: 400 }
      );
    }

    // Gather escalation context for human tutor (Phase A7)
    const [{ data: conversationMessages }, { data: studentProfile }] = await Promise.all([
      supabase
        .from('ai_agent_messages')
        .select('role, content, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(50),
      supabase
        .from('sage_student_profiles')
        .select('mastery_map, misconceptions, learning_style, current_streak_days')
        .eq('user_id', user.id)
        .single(),
    ]);

    const escalationContext = {
      session_id: sessionId,
      agent_name: session.ai_agent.display_name,
      agent_subject: session.ai_agent.subject,
      duration_minutes: durationMinutes,
      message_count: (conversationMessages || []).length,
      conversation_summary: (conversationMessages || [])
        .slice(-6)
        .map((m: { role: string; content: string }) => `${m.role}: ${m.content.substring(0, 200)}`)
        .join('\n'),
      student_model: studentProfile ? {
        mastery_topics: Object.entries((studentProfile.mastery_map as Record<string, { score: number }>) || {})
          .slice(0, 5)
          .map(([topic, entry]) => `${topic}: ${entry.score}%`),
        active_misconceptions: ((studentProfile.misconceptions as Array<{ resolved: boolean; topic: string; misconception: string }>) || [])
          .filter(m => !m.resolved)
          .slice(0, 3)
          .map(m => `${m.topic}: ${m.misconception}`),
        learning_style: studentProfile.learning_style,
      } : null,
    };

    // Notify the agent owner about escalation
    supabase.from('platform_notifications').insert({
      user_id: session.ai_agent.owner_id,
      type: 'session_escalated',
      title: `Session escalated from ${session.ai_agent.display_name}`,
      message: `A student has requested human tutor help after ${durationMinutes} minutes with your AI agent.`,
      metadata: escalationContext,
    }).then(({ error: e }) => {
      if (e) console.warn('[Escalation] Could not send notification:', e.message);
    });

    return NextResponse.json(
      {
        session: updatedSession,
        escalation_context: escalationContext,
        message: 'Session escalated successfully. The tutor has been notified.',
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
