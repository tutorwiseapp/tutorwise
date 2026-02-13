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
 * Start a new Lexi session for authenticated or anonymous users
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from Supabase (optional - guests allowed)
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

    // Generate a unique identifier for rate limiting
    // For authenticated users, use their ID; for guests, use IP or a generated ID
    let rateLimitId: string;
    let userInfo: {
      id: string;
      role: UserRole;
      organisationId?: string;
      permissions: string[];
      metadata: {
        displayName?: string;
        email?: string;
        isGuest?: boolean;
      };
    };

    if (user) {
      // Authenticated user flow
      rateLimitId = user.id;

      // Get user profile to determine role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, active_role, organisation_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        // User is authenticated but doesn't have a profile yet (e.g., new user)
        // Create session with default client role instead of failing
        console.log('[Lexi API] No profile found for user, using default role:', user.id);
        userInfo = {
          id: user.id,
          role: 'client' as UserRole,
          permissions: [],
          metadata: {
            displayName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            email: user.email,
          },
        };
      } else {
        // Map active_role to UserRole
        const roleMap: Record<string, UserRole> = {
          'tutor': 'tutor',
          'client': 'client',
          'student': 'student',
          'agent': 'agent',
          'organisation': 'organisation',
        };
        const role = roleMap[profile.active_role || ''] || 'client';

        userInfo = {
          id: user.id,
          role,
          organisationId: profile.organisation_id || undefined,
          permissions: [],
          metadata: {
            displayName: profile.full_name,
            email: user.email,
          },
        };
      }
    } else {
      // Guest user flow - create anonymous session
      // Use IP address or generate a guest ID for rate limiting
      const forwardedFor = request.headers.get('x-forwarded-for');
      const ip = forwardedFor?.split(',')[0]?.trim() || 'unknown';
      const guestId = `guest:${ip}`;
      rateLimitId = guestId;

      userInfo = {
        id: guestId,
        role: 'client' as UserRole, // Guests get basic client persona
        permissions: [],
        metadata: {
          displayName: 'Guest',
          isGuest: true,
        },
      };
    }

    // Check rate limit for session creation
    const rateLimitResult = await rateLimiter.checkLimit(rateLimitId, 'session:start');
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        rateLimitError(rateLimitResult),
        {
          status: 429,
          headers: rateLimitHeaders(rateLimitResult),
        }
      );
    }

    // Start Lexi session
    const session = await lexiOrchestrator.startSession(userInfo);

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
