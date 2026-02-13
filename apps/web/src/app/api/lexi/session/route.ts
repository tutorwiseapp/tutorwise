/**
 * Lexi Session API
 *
 * POST /api/lexi/session - Start a new Lexi session
 * DELETE /api/lexi/session - End a Lexi session
 *
 * @module api/lexi/session
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { lexiOrchestrator } from '@lexi/core/orchestrator';
import { sessionStore } from '@lexi/services/session-store';
import { rateLimiter, rateLimitHeaders, rateLimitError } from '@lexi/services/rate-limiter';
import type { UserRole } from '@cas/packages/core/src/context';

/**
 * POST /api/lexi/session
 * Start a new Lexi session for the authenticated user
 */
export async function POST(_request: NextRequest) {
  try {
    // Get authenticated user from Supabase
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
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Check rate limit for session creation
    const rateLimitResult = await rateLimiter.checkLimit(user.id, 'session:start');
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        rateLimitError(rateLimitResult),
        {
          status: 429,
          headers: rateLimitHeaders(rateLimitResult),
        }
      );
    }

    // Get user profile to determine role
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, user_type, organisation_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found', code: 'PROFILE_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Map user_type to UserRole
    const roleMap: Record<string, UserRole> = {
      'tutor': 'tutor',
      'client': 'client',
      'student': 'student',
      'agent': 'agent',
      'organisation': 'organisation',
    };
    const role = roleMap[profile.user_type] || 'client';

    // Start Lexi session
    const session = await lexiOrchestrator.startSession({
      id: user.id,
      role,
      organisationId: profile.organisation_id || undefined,
      permissions: [], // Would be fetched from permissions table
      metadata: {
        displayName: profile.full_name,
        email: user.email,
      },
    });

    // Store session in Redis
    await sessionStore.createSession(session);

    // Get greeting and capabilities
    const greeting = lexiOrchestrator.getGreeting(session.sessionId);
    const capabilities = lexiOrchestrator.getCapabilities(session.sessionId);

    return NextResponse.json({
      sessionId: session.sessionId,
      persona: session.persona,
      greeting,
      capabilities,
      expiresAt: session.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('[Lexi API] Session creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/lexi/session
 * End a Lexi session
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

    // End session in orchestrator
    lexiOrchestrator.endSession(sessionId);

    // Delete from Redis
    await sessionStore.deleteSession(sessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Lexi API] Session deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
