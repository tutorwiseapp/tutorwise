/**
 * Sage Session API
 *
 * POST /api/sage/session - Start a new Sage tutoring session
 * GET /api/sage/session - Get current/recent sessions
 * DELETE /api/sage/session - End a Sage session
 *
 * @module api/sage/session
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

type SageSubject = 'maths' | 'english' | 'science' | 'general';
type SageLevel = 'primary' | 'ks3' | 'gcse' | 'a-level' | 'university' | 'adult';
type SessionGoal = 'homework' | 'exam-prep' | 'concept-review' | 'practice' | 'general';

// Database enum values (must match Supabase sage_level, sage_session_goal, sage_persona enums)
type DbSageLevel = 'GCSE' | 'A-Level' | 'University' | 'Other';
type DbSessionGoal = 'homework_help' | 'exam_prep' | 'concept_review' | 'practice' | 'general';
type DbSagePersona = 'student' | 'tutor' | 'client' | 'agent';

interface SessionRequestBody {
  subject?: SageSubject;
  level?: SageLevel;
  sessionGoal?: SessionGoal;
}

/**
 * Map frontend level to database enum value.
 * After migration 270, the DB supports lowercase values directly.
 * This mapping handles both old (uppercase) and new (lowercase) enum values.
 */
function mapLevelToDb(level: SageLevel): DbSageLevel | string {
  // After migration 270_fix_sage_enums.sql, lowercase values are supported directly
  return level;
}

/** Map frontend session goal to database enum value */
function mapGoalToDb(goal: SessionGoal): DbSessionGoal | string {
  // After migration 270_fix_sage_enums.sql, frontend values are supported directly
  return goal;
}

/** Map user role to database persona enum value */
function mapRoleToPersona(role?: string): DbSagePersona {
  if (role === 'tutor') return 'tutor';
  if (role === 'client') return 'client';
  if (role === 'agent') return 'agent';
  return 'student';
}

// Subject-specific greetings
const GREETINGS: Record<SageSubject, string> = {
  maths: "Hi! I'm Sage, your maths tutor. I'm here to help you understand mathematical concepts, work through problems, and build your confidence. What would you like to work on today?",
  english: "Hello! I'm Sage, your English tutor. Whether it's reading comprehension, writing skills, or grammar, I'm here to help. What would you like to focus on?",
  science: "Hi there! I'm Sage, your science tutor. From physics to biology to chemistry, I love making science accessible and engaging. What topic interests you today?",
  general: "Hello! I'm Sage, your AI learning assistant. I'm here to help you learn and understand any subject. What would you like to explore today?",
};

/**
 * POST /api/sage/session
 * Start a new Sage tutoring session (authenticated users only)
 */
export async function POST(request: NextRequest) {
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, active_role')
      .eq('id', user.id)
      .single();

    // Parse request body
    const body: SessionRequestBody = await request.json().catch(() => ({}));
    const subject: SageSubject = body.subject || 'general';
    const level: SageLevel = body.level || 'gcse';

    // Generate session ID
    const sessionId = `sage_${randomUUID()}`;
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    // Map frontend values to database enum values
    const dbLevel = mapLevelToDb(level);
    const dbGoal = mapGoalToDb(body.sessionGoal || 'general');
    const dbPersona = mapRoleToPersona(profile?.active_role);

    // Try to store session in database (gracefully handle if table doesn't exist)
    const { error: insertError } = await supabase
      .from('sage_sessions')
      .insert({
        id: sessionId,
        user_id: user.id,
        persona: dbPersona,
        subject,
        level: dbLevel,
        session_goal: dbGoal,
        topics_covered: [],
        message_count: 0,
        started_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        status: 'active',
      });

    if (insertError) {
      // Log but don't fail - table may not exist yet
      console.warn('[Sage Session] Could not store session (table may not exist):', insertError.message);
    }

    return NextResponse.json({
      sessionId,
      persona: 'sage',
      subject,
      level,
      greeting: GREETINGS[subject],
      capabilities: {
        streaming: true,
        subjects: ['maths', 'english', 'science', 'general'],
        levels: ['primary', 'ks3', 'gcse', 'a-level', 'university', 'adult'],
        features: ['explanation', 'practice', 'feedback'],
      },
      user: {
        name: profile?.full_name || 'Student',
        role: profile?.active_role || 'student',
      },
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('[Sage Session] Creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sage/session
 * Get current active session or list recent sessions
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

    if (sessionId) {
      // Get specific session
      const { data: session, error } = await supabase
        .from('sage_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error || !session) {
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
      });
    }

    // Get recent sessions
    const { data: sessions, error } = await supabase
      .from('sage_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('last_activity_at', { ascending: false })
      .limit(10);

    if (error) {
      // Gracefully handle missing table
      console.warn('[Sage Session] Could not fetch sessions:', error.message);
      return NextResponse.json({ sessions: [] });
    }

    return NextResponse.json({
      sessions: sessions?.map(s => ({
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
      })) || [],
    });
  } catch (error) {
    console.error('[Sage Session] Get error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sage/session
 * End a Sage session
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required', code: 'MISSING_SESSION_ID' },
        { status: 400 }
      );
    }

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

    // Verify session belongs to user and update status
    const { data: session } = await supabase
      .from('sage_sessions')
      .select('user_id')
      .eq('id', sessionId)
      .single();

    if (session && session.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // End session
    const { error } = await supabase
      .from('sage_sessions')
      .update({ status: 'ended', last_activity_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) {
      console.warn('[Sage Session] Could not end session:', error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Sage Session] Delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
