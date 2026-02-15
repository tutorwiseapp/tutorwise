/**
 * Sage History API
 *
 * GET /api/sage/history - Get session history and messages
 *
 * @module api/sage/history
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * GET /api/sage/history
 * Get user's session history or messages from a specific session
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (sessionId) {
      // Get a specific session with its messages
      const { data: session, error: sessionError } = await supabase
        .from('sage_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        return NextResponse.json(
          { error: 'Session not found', code: 'SESSION_NOT_FOUND' },
          { status: 404 }
        );
      }

      if (session.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Access denied', code: 'FORBIDDEN' },
          { status: 403 }
        );
      }

      // Get messages for this session
      const { data: messages } = await supabase
        .from('sage_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true })
        .limit(limit);

      return NextResponse.json({
        session: {
          sessionId: session.id,
          userId: session.user_id,
          persona: session.persona,
          subject: session.subject,
          level: session.level,
          sessionGoal: session.session_goal,
          topicsCovered: session.topics_covered || [],
          messageCount: session.message_count || 0,
          startedAt: session.started_at,
          lastActivityAt: session.last_activity_at,
          status: session.status,
        },
        messages: messages?.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        })) || [],
        total: messages?.length || 0,
      });
    }

    // Get session history
    const { data: dbSessions, error } = await supabase
      .from('sage_sessions')
      .select(`
        id,
        user_id,
        persona,
        subject,
        level,
        session_goal,
        topics_covered,
        message_count,
        started_at,
        last_activity_at,
        status
      `)
      .eq('user_id', user.id)
      .order('last_activity_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      // If table doesn't exist or other setup issue, return empty results gracefully
      console.warn('[Sage History] Database error (may be missing table):', error.message);
      return NextResponse.json({
        sessions: [],
        total: 0,
        limit,
        offset,
      });
    }

    // Get total count
    const { count } = await supabase
      .from('sage_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const mappedSessions = dbSessions?.map(s => ({
      sessionId: s.id,
      userId: s.user_id,
      persona: s.persona,
      subject: s.subject,
      level: s.level,
      sessionGoal: s.session_goal,
      topicsCovered: s.topics_covered || [],
      messageCount: s.message_count || 0,
      startedAt: s.started_at,
      lastActivityAt: s.last_activity_at,
      status: s.status,
    })) || [];

    return NextResponse.json({
      sessions: mappedSessions,
      total: count || mappedSessions.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Sage History] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
