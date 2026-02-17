/**
 * Lexi Message API
 *
 * POST /api/lexi/message - Send a message to Lexi
 *
 * @module api/lexi/message
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { lexiOrchestrator } from '@lexi/core/orchestrator';
import { sessionStore } from '@lexi/services/session-store';
import { checkAIAgentRateLimit, incrementAIAgentUsage } from '@/lib/ai-agents/rate-limiter';

interface MessageRequestBody {
  sessionId: string;
  message: string;
}

/**
 * POST /api/lexi/message
 * Send a message to Lexi and get a response (supports both authenticated and guest users)
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user (optional - guests allowed)
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

    // Require authentication for Lexi (no guest access)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: MessageRequestBody = await request.json();
    const { sessionId, message } = body;

    if (!sessionId || !message) {
      return NextResponse.json(
        { error: 'Session ID and message are required', code: 'MISSING_PARAMS' },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: 'Message too long (max 2000 characters)', code: 'MESSAGE_TOO_LONG' },
        { status: 400 }
      );
    }

    // Check rate limit (10 questions/day for authenticated users)
    const rateLimit = await checkAIAgentRateLimit('lexi', user.id);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: rateLimit.error,
          message: rateLimit.message,
          rateLimit: {
            tier: rateLimit.tier,
            limit: rateLimit.limit,
            used: rateLimit.used,
            remaining: rateLimit.remaining,
            resetAt: rateLimit.resetAt.toISOString(),
          },
        },
        { status: 429 }
      );
    }

    // Verify session exists (Redis first, fall back to in-memory orchestrator)
    let sessionVerified = false;
    const session = await sessionStore.getSession(sessionId).catch(() => null);
    if (session) {
      // Verify session belongs to this user
      if (session.userId !== user.id) {
        return NextResponse.json(
          { error: 'Session does not belong to user', code: 'SESSION_MISMATCH' },
          { status: 403 }
        );
      }
      sessionVerified = true;
    } else if (lexiOrchestrator.hasSession(sessionId)) {
      // Redis unavailable — verify against in-memory session
      const sessionUserId = lexiOrchestrator.getSessionUserId(sessionId);
      if (sessionUserId && sessionUserId !== user.id) {
        return NextResponse.json(
          { error: 'Session does not belong to user', code: 'SESSION_MISMATCH' },
          { status: 403 }
        );
      }
      sessionVerified = true;
    }

    if (!sessionVerified) {
      return NextResponse.json(
        { error: 'Session not found or expired', code: 'SESSION_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Process message through Lexi (authenticated users only)
    const result = await lexiOrchestrator.processMessage(sessionId, message);

    // Update session activity (best-effort if Redis is down)
    await sessionStore.touchSession(sessionId).catch(() => {});

    // Save conversation if active (best-effort if Redis is down)
    if (session?.activeConversation?.id) {
      await sessionStore.addMessage(session.activeConversation.id, result.response).catch(() => {});
    }

    // Increment usage counter (async, don't block response)
    incrementAIAgentUsage('lexi', user.id);

    return NextResponse.json({
      response: {
        id: result.response.id,
        content: result.response.content,
        timestamp: result.response.timestamp.toISOString(),
        metadata: result.response.metadata,
      },
      suggestions: result.actions?.[0]?.nextSteps || [],
      rateLimit: {
        tier: rateLimit.tier,
        limit: rateLimit.limit,
        used: rateLimit.used + 1,
        remaining: rateLimit.remaining - 1,
        resetAt: rateLimit.resetAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[Lexi API] Message processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
