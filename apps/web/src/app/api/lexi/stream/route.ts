/**
 * Lexi Streaming API
 *
 * POST /api/lexi/stream - Send a message and receive streamed response
 *
 * Uses Server-Sent Events (SSE) for streaming responses.
 * This provides a better UX for longer responses by showing
 * the response as it's being generated.
 *
 * @module api/lexi/stream
 */

import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { lexiOrchestrator } from '@lexi/core/orchestrator';
import { sessionStore } from '@lexi/services/session-store';
import { rateLimiter, rateLimitHeaders, rateLimitError } from '@lexi/services/rate-limiter';

interface StreamRequestBody {
  sessionId: string;
  message: string;
}

/**
 * POST /api/lexi/stream
 * Send a message to Lexi and receive a streamed response via SSE (supports both authenticated and guest users)
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

    // Determine user ID for rate limiting (authenticated user or guest via IP)
    let rateLimitId: string;
    if (user) {
      rateLimitId = user.id;
    } else {
      const forwardedFor = request.headers.get('x-forwarded-for');
      const ip = forwardedFor?.split(',')[0]?.trim() || 'unknown';
      rateLimitId = `guest:${ip}`;
    }

    // Parse request body
    const body: StreamRequestBody = await request.json();
    const { sessionId, message } = body;

    if (!sessionId || !message) {
      return new Response(
        JSON.stringify({ error: 'Session ID and message are required', code: 'MISSING_PARAMS' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (message.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Message too long (max 2000 characters)', code: 'MESSAGE_TOO_LONG' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit for messages (best-effort if Redis is down)
    const rateLimitResult = await rateLimiter.checkLimit(rateLimitId, 'message').catch(() => ({ allowed: true } as { allowed: true }));
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify(rateLimitError(rateLimitResult)),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...rateLimitHeaders(rateLimitResult),
          },
        }
      );
    }

    // Verify session exists (Redis first, fall back to in-memory orchestrator)
    let sessionVerified = false;
    const session = await sessionStore.getSession(sessionId).catch(() => null);
    if (session) {
      const expectedUserId = user?.id || rateLimitId;
      if (session.userId !== expectedUserId) {
        return new Response(
          JSON.stringify({ error: 'Session does not belong to user', code: 'SESSION_MISMATCH' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
      sessionVerified = true;
    } else if (lexiOrchestrator.hasSession(sessionId)) {
      const sessionUserId = lexiOrchestrator.getSessionUserId(sessionId);
      const expectedUserId = user?.id || rateLimitId;
      if (sessionUserId && sessionUserId !== expectedUserId) {
        return new Response(
          JSON.stringify({ error: 'Session does not belong to user', code: 'SESSION_MISMATCH' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
      sessionVerified = true;
    }

    if (!sessionVerified) {
      return new Response(
        JSON.stringify({ error: 'Session not found or expired', code: 'SESSION_NOT_FOUND' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create a ReadableStream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // Helper to send SSE events
        const sendEvent = (event: string, data: unknown) => {
          const eventStr = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(eventStr));
        };

        try {
          // Send start event
          sendEvent('start', {
            messageId: `msg_${Date.now().toString(36)}`,
            timestamp: new Date().toISOString(),
          });

          // Process message through Lexi
          const result = await lexiOrchestrator.processMessage(sessionId, message);

          // Simulate streaming by sending response in chunks
          // In production with an actual LLM, this would stream real tokens
          const responseText = result.response.content;
          const words = responseText.split(' ');
          const chunkSize = 3; // Send 3 words at a time

          for (let i = 0; i < words.length; i += chunkSize) {
            const chunk = words.slice(i, i + chunkSize).join(' ');
            const isLast = i + chunkSize >= words.length;

            sendEvent('chunk', {
              content: chunk + (isLast ? '' : ' '),
              done: false,
            });

            // Small delay to simulate streaming
            await new Promise(resolve => setTimeout(resolve, 50));
          }

          // Update session activity (best-effort if Redis is down)
          await sessionStore.touchSession(sessionId).catch(() => {});

          // Save conversation if active (best-effort if Redis is down)
          if (session?.activeConversation?.id) {
            await sessionStore.addMessage(session.activeConversation.id, result.response).catch(() => {});
          }

          // Send completion event with metadata
          sendEvent('done', {
            id: result.response.id,
            timestamp: result.response.timestamp.toISOString(),
            metadata: result.response.metadata,
            suggestions: result.actions?.[0]?.nextSteps || [],
          });

          controller.close();
        } catch (error) {
          console.error('[Lexi Stream] Error:', error);
          sendEvent('error', {
            error: 'Failed to process message',
            code: 'PROCESSING_ERROR',
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });
  } catch (error) {
    console.error('[Lexi Stream] Request error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
