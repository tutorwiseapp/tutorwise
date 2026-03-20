/**
 * POST /api/sage/virtualspace/observe
 *
 * Canvas Observe: Sage reviews the student's whiteboard via vision model.
 * Accepts a base64 PNG snapshot of the canvas and returns an SSE stream
 * with Sage's pedagogical feedback on what the student has drawn.
 *
 * Triggers: 'manual' (Review my work button), 'stuck' (auto-triggered by idle detector)
 *
 * Response: Server-Sent Events stream (same chunk/done format as /api/sage/stream)
 *
 * @module api/sage/virtualspace/observe
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getCanvasSystemPrompt } from '@/components/feature/virtualspace/agent/prompt-parts/CanvasSystemPromptPart';

const VISION_MODEL = 'gemini-2.0-flash';

/**
 * Build the observe system prompt for a given session context.
 * The [CANVAS] types section is generated from the AgentActionRegistry so it
 * always stays in sync with registered ActionUtils — no more hardcoded lists.
 */
async function buildObserveSystemPrompt(
  subject: string,
  level: string,
  trigger: string,
): Promise<string> {
  const canvasSection = await getCanvasSystemPrompt();

  return [
    `You are Sage, an expert AI tutor specialising in ${subject} at ${level} level.`,
    '',
    `A student is working on a collaborative whiteboard. ${
      trigger === 'stuck'
        ? 'They have been working quietly for a while and may be stuck.'
        : 'They have asked you to review their work.'
    }`,
    '',
    'Here is a screenshot of their current canvas. Review it carefully and respond directly to the student:',
    '',
    '1. What has the student done? Briefly describe their approach and what they\'ve attempted.',
    '2. Where have they gone wrong, if anywhere? Be specific about the error — not vague.',
    '3. What do they need next — a hint, a correction, encouragement, or a new challenge? Give them something actionable.',
    '4. If a visual aid would genuinely help, include one [CANVAS] block. JSON must have exactly "type" and "props" keys.',
    '',
    canvasSection,
    '',
    'Additional rules for observe responses:',
    '- Be encouraging and conversational — this is a live tutoring session.',
    '- Keep total response to 3–5 sentences plus any [CANVAS] block.',
    '- If the whiteboard is blank or unclear, ask the student to describe what they are working on.',
    '- Address the student directly — say "you", not "the student".',
  ].join('\n');
}

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
    const { sageSessionId, canvasSnapshot, trigger = 'manual' } = body as {
      sageSessionId?: string;
      canvasSnapshot?: string;
      trigger?: 'manual' | 'stuck';
    };

    if (!sageSessionId) {
      return new Response(
        JSON.stringify({ error: 'sageSessionId is required', code: 'MISSING_FIELDS' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Guard: reject snapshots larger than 512 KB (design §7.1)
    // Base64 encodes ~4/3 the binary size; limit base64 string to ~683 KB chars to stay under 512 KB binary
    const MAX_SNAPSHOT_BYTES = 512 * 1024;
    const MAX_B64_CHARS = Math.ceil(MAX_SNAPSHOT_BYTES * (4 / 3));
    if (canvasSnapshot && canvasSnapshot.length > MAX_B64_CHARS) {
      return new Response(
        JSON.stringify({ error: 'Canvas snapshot too large (max 512 KB)', code: 'canvas_too_large' }),
        { status: 413, headers: { 'Content-Type': 'application/json' } }
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

    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_AI_AI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Vision model not configured', code: 'PROVIDER_UNAVAILABLE' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const subject = sageSession.subject ?? 'general';
    const level = sageSession.level ?? 'GCSE';
    const systemPrompt = await buildObserveSystemPrompt(subject, level, trigger);

    const messageId = `obs_${Date.now()}`;
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(`event: start\ndata: ${JSON.stringify({ messageId })}\n\n`)
          );

          const client = new GoogleGenerativeAI(apiKey);
          const model = client.getGenerativeModel({
            model: VISION_MODEL,
            generationConfig: {
              temperature: 0.5,
              maxOutputTokens: 512,
            },
          });

          // Build content parts — with or without image
          const contentParts: Parameters<typeof model.generateContentStream>[0] = [];

          if (canvasSnapshot) {
            // Strip data URL prefix if present (accept both raw base64 and data URLs)
            const base64Data = canvasSnapshot.replace(/^data:[^;]+;base64,/, '');
            contentParts.push(
              { text: systemPrompt },
              { inlineData: { mimeType: 'image/png', data: base64Data } },
              { text: trigger === 'stuck'
                ? "The student has been working on their whiteboard for a while. Please review what they've done and provide helpful guidance."
                : "Please review the student's whiteboard work and provide feedback." }
            );
          } else {
            // No snapshot — ask student to describe their work
            contentParts.push(
              { text: systemPrompt },
              { text: "The whiteboard snapshot wasn't available. Please encourage the student to describe what they're working on so you can help." }
            );
          }

          const result = await model.generateContentStream(contentParts);

          for await (const chunk of result.stream) {
            try {
              const content = chunk.text();
              if (content) {
                controller.enqueue(
                  encoder.encode(`event: chunk\ndata: ${JSON.stringify({ content })}\n\n`)
                );
              }
            } catch {
              // Skip malformed chunks
            }
          }

          controller.enqueue(
            encoder.encode(`event: done\ndata: ${JSON.stringify({
              id: messageId,
              timestamp: new Date().toISOString(),
              trigger,
            })}\n\n`)
          );

          controller.close();

          // Update session activity (async, non-blocking)
          supabase.from('sage_sessions')
            .update({ last_activity_at: new Date().toISOString() })
            .eq('id', sageSessionId)
            .then(() => {});

        } catch (err) {
          console.error('[Sage Observe] Vision model error:', err);
          const errMsg = err instanceof Error ? err.message : 'Vision model error';
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ error: errMsg, recoverable: false })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });

  } catch (error) {
    console.error('[Sage Observe] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
