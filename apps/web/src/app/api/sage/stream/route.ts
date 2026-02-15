/**
 * Sage Streaming API
 *
 * POST /api/sage/stream - Send a message and receive streamed response
 *
 * Uses Server-Sent Events (SSE) for streaming responses.
 *
 * @module api/sage/stream
 */

import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

interface StreamRequestBody {
  sessionId: string;
  message: string;
  subject?: string;
}

/**
 * POST /api/sage/stream
 * Send a message to Sage and receive a streamed response via SSE
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user (required for Sage)
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
      return new Response(
        JSON.stringify({ error: 'Authentication required', code: 'UNAUTHORIZED' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body: StreamRequestBody = await request.json();

    if (!body.sessionId || !body.message) {
      return new Response(
        JSON.stringify({ error: 'Session ID and message are required', code: 'MISSING_FIELDS' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const messageId = `msg_${Date.now()}`;
    const response = getPlaceholderResponse(body.message);

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send start event
          controller.enqueue(
            encoder.encode(`event: start\ndata: ${JSON.stringify({ messageId })}\n\n`)
          );

          // Simulate streaming by sending response in chunks
          const words = response.split(' ');

          for (let i = 0; i < words.length; i++) {

            // Send chunk
            controller.enqueue(
              encoder.encode(`event: chunk\ndata: ${JSON.stringify({ content: words[i] + ' ' })}\n\n`)
            );

            // Small delay to simulate streaming
            await new Promise(resolve => setTimeout(resolve, 30));
          }

          // Send done event
          const suggestions = getSuggestions(body.message);
          controller.enqueue(
            encoder.encode(`event: done\ndata: ${JSON.stringify({
              id: messageId,
              content: response,
              timestamp: new Date().toISOString(),
              metadata: { persona: 'sage', subject: body.subject },
              suggestions,
            })}\n\n`)
          );

          controller.close();

          // Try to store messages (async, don't block stream)
          supabase.from('sage_messages').insert([
            {
              id: `msg_user_${Date.now()}`,
              session_id: body.sessionId,
              role: 'user',
              content: body.message,
              timestamp: new Date().toISOString(),
            },
            {
              id: messageId,
              session_id: body.sessionId,
              role: 'assistant',
              content: response,
              timestamp: new Date().toISOString(),
            },
          ]).then(({ error }) => {
            if (error) {
              console.warn('[Sage Stream] Could not store messages:', error.message);
            }
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Stream error';
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ error: errorMessage })}\n\n`)
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
    console.error('[Sage Stream] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Get a placeholder response based on the message
 */
function getPlaceholderResponse(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return "Hello! I'm Sage, your AI tutor. I'm here to help you learn and understand any subject. What would you like to explore today?";
  }

  if (lowerMessage.includes('help')) {
    return "I'd be happy to help! I can assist with Mathematics (algebra, geometry, calculus), English (writing, grammar, literature), Science (physics, chemistry, biology), and Study skills (exam prep, note-taking). What subject would you like to focus on?";
  }

  if (lowerMessage.includes('math') || lowerMessage.includes('algebra') || lowerMessage.includes('equation')) {
    return "Great question about maths! To help you effectively, could you share the specific problem or concept you're working on? I can walk through problems step-by-step, explain underlying concepts, provide practice questions, and check your work.";
  }

  if (lowerMessage.includes('english') || lowerMessage.includes('essay') || lowerMessage.includes('writing')) {
    return "I'd love to help with English! Whether it's essay writing, grammar, or literature, I'm here to guide you. Could you tell me more about what you're working on? I can help with essay structure, grammar and punctuation, or text analysis.";
  }

  if (lowerMessage.includes('science') || lowerMessage.includes('physics') || lowerMessage.includes('chemistry') || lowerMessage.includes('biology')) {
    return "Science is fascinating! I can help explain concepts in physics, chemistry, and biology. What specific topic are you curious about? Whether you need help understanding a concept, working through a problem, or preparing for an exam, I'm here to help!";
  }

  return "That's a great question! Let me help you think through this. To give you the best guidance, could you share a bit more context about what you're working on? I can explain concepts step-by-step, work through problems with you, provide examples and practice questions, and give feedback on your work.";
}

/**
 * Get follow-up suggestions based on the conversation
 */
function getSuggestions(message: string): string[] {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('math')) {
    return ['Show me an example', 'Practice problems', 'Explain the concept'];
  }

  if (lowerMessage.includes('english') || lowerMessage.includes('essay')) {
    return ['Help with structure', 'Check my grammar', 'Give me feedback'];
  }

  if (lowerMessage.includes('science')) {
    return ['Explain further', 'Show a diagram', 'Practice questions'];
  }

  return ['Tell me more', 'Practice questions', 'Explain differently'];
}
