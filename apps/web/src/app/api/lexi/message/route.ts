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
import { rateLimiter, rateLimitHeaders, rateLimitError } from '@lexi/services/rate-limiter';

interface MessageRequestBody {
  sessionId: string;
  message: string;
}

/**
 * POST /api/lexi/message
 * Send a message to Lexi and get a response
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
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

    // Check rate limit for messages
    const rateLimitResult = await rateLimiter.checkLimit(user.id, 'message');
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        rateLimitError(rateLimitResult),
        {
          status: 429,
          headers: rateLimitHeaders(rateLimitResult),
        }
      );
    }

    // Verify session exists and belongs to user
    const session = await sessionStore.getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found or expired', code: 'SESSION_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (session.userId !== user.id) {
      return NextResponse.json(
        { error: 'Session does not belong to user', code: 'SESSION_MISMATCH' },
        { status: 403 }
      );
    }

    // Process message through Lexi
    const result = await lexiOrchestrator.processMessage(sessionId, message);

    // Update session activity
    await sessionStore.touchSession(sessionId);

    // Save conversation if active
    if (session.activeConversation?.id) {
      await sessionStore.addMessage(session.activeConversation.id, result.response);
    }

    return NextResponse.json({
      response: {
        id: result.response.id,
        content: result.response.content,
        timestamp: result.response.timestamp.toISOString(),
        metadata: result.response.metadata,
      },
      suggestions: result.actions?.[0]?.nextSteps || [],
    });
  } catch (error) {
    console.error('[Lexi API] Message processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
