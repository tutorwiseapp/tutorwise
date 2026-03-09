/**
 * POST /api/admin/agents/[id]/stream
 * Streams a specialist agent response as SSE (Server-Sent Events).
 * Event format: start | chunk | done | error
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { specialistAgentRunner } from '@/lib/agent-studio/SpecialistAgentRunner';

export const dynamic = 'force-dynamic';

function sseEvent(type: string, data: unknown): string {
  return `data: ${JSON.stringify({ type, data })}\n\n`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { prompt?: string };

  if (!body.prompt) {
    return new Response('prompt is required', { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(sseEvent('start', { agent_id: id })));

        for await (const chunk of specialistAgentRunner.stream(id, body.prompt!)) {
          controller.enqueue(encoder.encode(sseEvent('chunk', { content: chunk })));
        }

        controller.enqueue(encoder.encode(sseEvent('done', {})));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        controller.enqueue(encoder.encode(sseEvent('error', { message })));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
