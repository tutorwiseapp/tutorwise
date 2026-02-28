/**
 * Filename: api/ai-agents/sessions/[sessionId]/stream/route.ts
 * Purpose: SSE streaming endpoint for AI agent sessions
 * Created: 2026-02-28
 *
 * Streams AI agent responses token-by-token using Server-Sent Events.
 * Follows the same SSE pattern as /api/sage/stream.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { retrieveContext } from '@/lib/ai-agents/rag-retrieval';
import { runQualityLoopWorkflow, runStudentJourneyWorkflow } from '@/lib/ai-agents/workflows';

interface StreamRequestBody {
  message: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * POST /api/ai-agents/sessions/[sessionId]/stream
 * Send message and receive streamed AI response via SSE
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body: StreamRequestBody = await request.json();

    if (!body.message?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get session with agent details
    const { data: session, error: sessionError } = await supabase
      .from('ai_agent_sessions')
      .select(`
        *,
        ai_agent:ai_agents!agent_id (
          id,
          display_name,
          subject,
          description,
          owner_id,
          agent_type
        )
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (session.client_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (session.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Session is not active' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const trimmedMessage = body.message.trim();
    const messageId = `msg_${Date.now()}`;

    // RAG retrieval (before streaming starts)
    const ragResult = await retrieveContext(trimmedMessage, session.agent_id, 5);

    // Build system prompt
    const agent = session.ai_agent;
    const systemPrompt = buildSystemPrompt(agent, ragResult);

    // Build Gemini contents array
    const contents = buildGeminiContents(
      systemPrompt,
      agent.display_name,
      body.conversationHistory || [],
      trimmedMessage
    );

    // Get API key
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'AI provider not configured' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create SSE stream
    const encoder = new TextEncoder();
    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send start event
          controller.enqueue(
            encoder.encode(`event: start\ndata: ${JSON.stringify({ messageId })}\n\n`)
          );

          // Stream from Gemini REST API
          const model = 'gemini-2.0-flash';
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

          const geminiResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.7,
              },
              safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
              ],
            }),
          });

          if (!geminiResponse.ok) {
            const errData = await geminiResponse.json().catch(() => ({}));
            throw new Error(`Gemini API error: ${(errData as any).error?.message || geminiResponse.statusText}`);
          }

          // Parse SSE stream from Gemini
          const reader = geminiResponse.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process complete SSE events from buffer
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6).trim();
                if (!jsonStr || jsonStr === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(jsonStr);
                  const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (text) {
                    fullResponse += text;
                    controller.enqueue(
                      encoder.encode(`event: chunk\ndata: ${JSON.stringify({ content: text })}\n\n`)
                    );
                  }
                } catch {
                  // Skip unparseable chunks
                }
              }
            }
          }

          // Send done event
          controller.enqueue(
            encoder.encode(`event: done\ndata: ${JSON.stringify({
              id: messageId,
              content: fullResponse,
              timestamp: new Date().toISOString(),
              metadata: {
                sources: ragResult.chunks.map((chunk, idx) => ({
                  index: idx + 1,
                  source: chunk.source,
                  similarity: chunk.similarity,
                  metadata: chunk.metadata,
                })),
                usedFallback: ragResult.usedFallback,
                provider: 'gemini',
                model: 'gemini-2.0-flash',
              },
            })}\n\n`)
          );

          controller.close();

          // Save messages to ai_agent_messages table (async, don't block stream)
          supabase.from('ai_agent_messages').insert([
            {
              id: `${messageId}_user`,
              session_id: sessionId,
              role: 'user',
              content: trimmedMessage,
            },
            {
              id: `${messageId}_asst`,
              session_id: sessionId,
              role: 'assistant',
              content: fullResponse,
              sources: ragResult.chunks.map((chunk, idx) => ({
                index: idx + 1,
                source: chunk.source,
                metadata: chunk.metadata,
              })),
              rag_tier_used: ragResult.usedFallback ? 'sage_fallback' : 'materials',
              metadata: { provider: 'gemini', model: 'gemini-2.0-flash' },
            },
          ]).then(({ error }) => {
            if (error) {
              console.warn('[AI Agent Stream] Could not store messages:', error.message);
            }
          });

          // Update fallback count if needed
          if (ragResult.usedFallback) {
            supabase
              .from('ai_agent_sessions')
              .update({
                fallback_to_sage_count: (session.fallback_to_sage_count || 0) + 1,
              })
              .eq('id', sessionId)
              .then(({ error }) => {
                if (error) {
                  console.warn('[AI Agent Stream] Could not update fallback count:', error.message);
                }
              });
          }

          // Fire-and-forget: Quality scoring workflow
          runQualityLoopWorkflow({
            messageId: `${messageId}_asst`,
            sessionId,
            agentId: session.agent_id,
            userMessage: trimmedMessage,
            assistantResponse: fullResponse,
            ragSources: ragResult.chunks.map(c => ({
              text: c.text,
              source: c.source,
              similarity: c.similarity,
            })),
          }).catch(err => console.warn('[AI Agent Stream] Quality loop error:', err));

          // Fire-and-forget: Student journey tracking
          runStudentJourneyWorkflow({
            sessionId,
            agentId: session.agent_id,
            studentId: session.client_id,
            userMessage: trimmedMessage,
            assistantResponse: fullResponse,
          }).catch(err => console.warn('[AI Agent Stream] Student journey error:', err));

        } catch (error) {
          console.error('[AI Agent Stream] Error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Stream error';

          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({
              error: errorMessage,
              recoverable: false,
            })}\n\n`)
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
    console.error('[AI Agent Stream] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Build system prompt from agent config and RAG context
 */
function buildSystemPrompt(
  agent: { display_name: string; subject: string; description: string; agent_type?: string },
  ragResult: { chunks: Array<{ text: string }>; usedFallback: boolean }
): string {
  let prompt = `You are ${agent.display_name}, a specialized ${agent.agent_type || 'tutor'} for ${agent.subject}.

Your role: ${agent.description || 'Help students learn and understand concepts.'}

Context sources available:
${ragResult.chunks
  .map((chunk, idx) => `[${idx + 1}] ${chunk.text.substring(0, 200)}...`)
  .join('\n')}

Instructions:
- Use the context above to answer the question accurately
- If the context doesn't have the answer, use your general knowledge
- Always cite sources using [1], [2], etc. when using context
- Be educational, patient, and encouraging
- Break down complex concepts step-by-step
- Ask follow-up questions to check understanding`;

  if (ragResult.usedFallback) {
    prompt += '\n\nNote: Using general knowledge fallback (custom materials did not contain relevant information)';
  }

  return prompt;
}

/**
 * Build Gemini contents array with system prompt injection
 */
function buildGeminiContents(
  systemPrompt: string,
  agentName: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  currentMessage: string
): Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> {
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  // System prompt injection
  contents.push({
    role: 'user',
    parts: [{ text: `System instructions:\n\n${systemPrompt}\n\nPlease acknowledge these guidelines.` }],
  });
  contents.push({
    role: 'model',
    parts: [{ text: `I understand. I am ${agentName}. I will follow these guidelines. How can I help you today?` }],
  });

  // Conversation history (last 10)
  for (const msg of conversationHistory.slice(-10)) {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    });
  }

  // Current message
  contents.push({
    role: 'user',
    parts: [{ text: currentMessage }],
  });

  return contents;
}
