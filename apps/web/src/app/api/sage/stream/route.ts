/**
 * Sage Streaming API
 *
 * POST /api/sage/stream - Send a message and receive streamed response
 *
 * Uses Server-Sent Events (SSE) for streaming responses from Gemini.
 *
 * @module api/sage/stream
 */

import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SageGeminiProvider } from '@sage/providers/gemini-provider';
import type { SagePersona, SageSubject, SageLevel } from '@sage/types';
import type { LLMMessage } from '@sage/providers/types';
import type { AgentContext, UserRole } from '@cas/packages/core/src/context';

interface StreamRequestBody {
  sessionId: string;
  message: string;
  subject?: SageSubject;
  level?: SageLevel;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
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

    // Get user profile for role
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role, display_name')
      .eq('id', user.id)
      .single();

    const userRole = (profileData?.role || 'student') as UserRole;
    const persona = mapRoleToPersona(userRole);
    const userName = profileData?.display_name || undefined;

    // Initialize provider
    const provider = new SageGeminiProvider({ type: 'gemini' });

    if (!provider.isAvailable()) {
      return new Response(
        JSON.stringify({ error: 'AI provider not configured', code: 'PROVIDER_UNAVAILABLE' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build messages array
    const messages: LLMMessage[] = [];

    // Add conversation history if provided
    if (body.conversationHistory?.length) {
      for (const msg of body.conversationHistory.slice(-10)) { // Last 10 messages
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }
    }

    // Add current message
    messages.push({
      role: 'user',
      content: body.message,
    });

    // Build context
    const context: AgentContext = {
      mode: 'user',
      user: {
        id: user.id,
        role: userRole,
        permissions: ['read:knowledge', 'write:progress'],
        metadata: { displayName: userName },
      },
      session: {
        sessionId: body.sessionId,
        startedAt: new Date(),
        lastActivityAt: new Date(),
      },
      traceId: `sage_${Date.now()}`,
    };

    const messageId = `msg_${Date.now()}`;

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

          // Stream from Gemini
          const streamGenerator = provider.stream({
            messages,
            persona,
            subject: body.subject,
            level: body.level,
            context,
          });

          for await (const chunk of streamGenerator) {
            if (chunk.content) {
              fullResponse += chunk.content;
              controller.enqueue(
                encoder.encode(`event: chunk\ndata: ${JSON.stringify({ content: chunk.content })}\n\n`)
              );
            }

            if (chunk.done) {
              break;
            }
          }

          // Send done event with suggestions
          const suggestions = getSuggestions(body.message, persona, body.subject);
          controller.enqueue(
            encoder.encode(`event: done\ndata: ${JSON.stringify({
              id: messageId,
              content: fullResponse,
              timestamp: new Date().toISOString(),
              metadata: { persona, subject: body.subject, level: body.level, provider: 'gemini' },
              suggestions,
            })}\n\n`)
          );

          controller.close();

          // Store messages in database (async, don't block stream)
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
              content: fullResponse,
              timestamp: new Date().toISOString(),
              metadata: { persona, subject: body.subject, level: body.level },
            },
          ]).then(({ error }) => {
            if (error) {
              console.warn('[Sage Stream] Could not store messages:', error.message);
            }
          });

          // Update session activity
          supabase.from('sage_sessions')
            .update({ last_activity_at: new Date().toISOString() })
            .eq('id', body.sessionId)
            .then(() => {});

        } catch (error) {
          console.error('[Sage Stream] Provider error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Stream error';

          // Send error event
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ error: errorMessage })}\n\n`)
          );

          // Try to recover with fallback response
          const fallbackResponse = getFallbackResponse(body.message);
          controller.enqueue(
            encoder.encode(`event: done\ndata: ${JSON.stringify({
              id: messageId,
              content: fallbackResponse,
              timestamp: new Date().toISOString(),
              metadata: { persona, fallback: true },
              suggestions: getSuggestions(body.message, persona, body.subject),
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
    console.error('[Sage Stream] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Map user role to Sage persona
 */
function mapRoleToPersona(role: UserRole): SagePersona {
  switch (role) {
    case 'student':
      return 'student';
    case 'tutor':
      return 'tutor';
    case 'client':
      return 'client';
    case 'agent':
      return 'agent';
    default:
      return 'student';
  }
}

/**
 * Get follow-up suggestions based on the conversation
 */
function getSuggestions(_message: string, persona: SagePersona, subject?: SageSubject): string[] {
  const baseSuggestions: Record<SagePersona, string[]> = {
    student: ['Explain differently', 'Give me an example', 'Practice problem'],
    tutor: ['Create worksheet', 'Common mistakes', 'Assessment ideas'],
    client: ['Progress summary', 'How to help at home', 'What topics next?'],
    agent: ['More details', 'Resources available', 'Contact support'],
  };

  const subjectSuggestions: Record<SageSubject, string[]> = {
    maths: ['Step-by-step solution', 'Similar problems', 'Show the formula'],
    english: ['Writing tips', 'Grammar check', 'Vocabulary help'],
    science: ['Explain concept', 'Real-world example', 'Experiment ideas'],
    general: ['Tell me more', 'Practice questions', 'Study tips'],
  };

  if (subject && subjectSuggestions[subject]) {
    return subjectSuggestions[subject];
  }

  return baseSuggestions[persona] || baseSuggestions.student;
}

/**
 * Fallback response if provider fails
 */
function getFallbackResponse(_message: string): string {
  return "I'm having a bit of trouble right now, but I'm still here to help! Could you try rephrasing your question, or let me know what subject you'd like to focus on? I can help with maths, English, science, and more.";
}
