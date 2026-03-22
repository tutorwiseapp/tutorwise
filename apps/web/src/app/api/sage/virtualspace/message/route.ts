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
import { resolvePhaseContext } from '@/lib/virtualspace/PhaseContextResolver';
import type { SessionWorkflow } from '@/components/feature/virtualspace/workflow/types';

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
    const { sageSessionId, message, conversationHistory, extraContext, virtualspaceSessionId } = body as {
      sageSessionId?: string;
      message?: string;
      conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
      /** Additional context injected by the client (multi-student signals, lesson plan phase). */
      extraContext?: string;
      /** VirtualSpace session ID — used to resolve active workflow phase context for Sage. */
      virtualspaceSessionId?: string;
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

    // Resolve active workflow phase context if a virtualspace session is provided.
    // PhaseContextResolver is pure — no DB calls, just schema transformation.
    let phaseBlock: string | null = null;
    if (virtualspaceSessionId) {
      try {
        const { data: vsSession } = await supabase
          .from('virtualspace_sessions')
          .select('workflow_id, workflow_state, owner_id')
          .eq('id', virtualspaceSessionId)
          .single();

        if (vsSession?.workflow_id && vsSession?.workflow_state) {
          const { data: workflow } = await supabase
            .from('session_workflows')
            .select('*')
            .eq('id', vsSession.workflow_id)
            .single();

          if (workflow) {
            const role = vsSession.owner_id === user.id ? 'owner' : 'collaborator';
            const state = vsSession.workflow_state as { currentPhaseIndex: number };
            const phaseCtx = resolvePhaseContext(
              workflow as SessionWorkflow,
              state.currentPhaseIndex,
              role,
              { senFocus: (workflow as SessionWorkflow).sen_focus }
            );
            phaseBlock = phaseCtx.sageSystemBlock;
          }
        }
      } catch {
        // Phase context is best-effort — never block the message
      }
    }

    // Combine canvas instructions + phase block + any extra context from the client
    const contextParts = [CANVAS_INSTRUCTIONS];
    if (phaseBlock) contextParts.push(phaseBlock);
    if (extraContext) contextParts.push(extraContext);
    const combinedSystemContext = contextParts.join('\n\n');

    // Forward to the existing /api/sage/stream endpoint.
    // We reconstruct the request with the correct sessionId, subject, level
    // so all the existing safety, RAG, curriculum, and streaming logic runs as-is.
    const streamPayload = {
      sessionId: sageSessionId,
      message,
      subject: sageSession.subject,
      level: sageSession.level,
      conversationHistory: conversationHistory ?? [],
      extraSystemContext: combinedSystemContext,
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
