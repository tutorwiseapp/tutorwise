/**
 * POST /api/sage/virtualspace/message
 *
 * Send a message to Sage in a VirtualSpace session.
 * Looks up the sage_session, then proxies the request to the existing
 * /api/sage/stream SSE handler with the correct sessionId, subject, and level.
 *
 * Response: Server-Sent Events stream (same format as /api/sage/stream)
 *
 * @module api/sage/virtualspace/message
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getCanvasSystemPrompt } from '@/components/feature/virtualspace/agent/prompt-parts/CanvasSystemPromptPart';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required', code: 'UNAUTHORIZED' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { sageSessionId, message, conversationHistory } = body as {
      sageSessionId?: string;
      message?: string;
      conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    if (!sageSessionId || !message) {
      return new Response(
        JSON.stringify({ error: 'sageSessionId and message are required', code: 'MISSING_FIELDS' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Look up the sage_session to get subject/level context
    const { data: sageSession, error: sessionError } = await supabase
      .from('sage_sessions')
      .select('id, user_id, subject, level, status')
      .eq('id', sageSessionId)
      .single();

    if (sessionError || !sageSession) {
      return new Response(
        JSON.stringify({ error: 'Sage session not found', code: 'SESSION_NOT_FOUND' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (sageSession.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Access denied', code: 'FORBIDDEN' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (sageSession.status === 'ended') {
      return new Response(
        JSON.stringify({ error: 'Sage session has ended', code: 'SESSION_ENDED' }),
        { status: 410, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Canvas writing instructions — generated from the AgentActionRegistry so
    // type lists and examples always stay in sync with registered ActionUtils.
    const CANVAS_INSTRUCTIONS = await getCanvasSystemPrompt();

    // Forward to the existing /api/sage/stream endpoint.
    // We reconstruct the request with the correct sessionId, subject, level
    // so all the existing safety, RAG, curriculum, and streaming logic runs as-is.
    const streamPayload = {
      sessionId: sageSessionId,
      message,
      subject: sageSession.subject,
      level: sageSession.level,
      conversationHistory: conversationHistory ?? [],
      extraSystemContext: CANVAS_INSTRUCTIONS,
    };

    // Build a new Request object targeting the stream route
    const streamUrl = new URL('/api/sage/stream', request.url);
    const streamRequest = new Request(streamUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward cookies for auth re-verification inside the stream route
        cookie: request.headers.get('cookie') ?? '',
      },
      body: JSON.stringify(streamPayload),
    });

    // Dynamically import the stream route handler to avoid duplication
    const { POST: streamHandler } = await import('@/app/api/sage/stream/route');
    return streamHandler(streamRequest as NextRequest);

  } catch (error) {
    console.error('[Sage Virtualspace Message] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
