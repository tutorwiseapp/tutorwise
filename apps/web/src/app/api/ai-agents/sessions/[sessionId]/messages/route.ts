/**
 * Filename: api/ai-agents/sessions/[sessionId]/messages/route.ts
 * Purpose: Send message in AI tutor session
 * Created: 2026-02-23
 * Version: v1.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { retrieveContext } from '@/lib/ai-agents/rag-retrieval';
import { GeminiProvider } from '@/lib/ai-agents/gemini-provider';

/**
 * POST /api/ai-agents/sessions/[sessionId]/messages
 * Send message and get AI tutor response
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, conversationHistory } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get session with agent details
    const { data: session, error: sessionError } = await supabase
      .from('ai_agent_sessions')
      .select(
        `
        *,
        ai_agent:ai_agents!agent_id (
          id,
          display_name,
          subject,
          description,
          owner_id
        )
      `
      )
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify user is client
    if (session.client_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify session is active
    if (session.status !== 'active') {
      return NextResponse.json(
        { error: 'Session is not active' },
        { status: 403 }
      );
    }

    // Retrieve context using RAG (AI tutor materials → links → Sage fallback)
    const ragResult = await retrieveContext(message.trim(), session.agent_id, 5);

    // Build system prompt
    const agent = session.ai_agent;
    const systemPrompt = `You are ${agent.display_name}, an AI tutor specializing in ${agent.subject}.

Your role: ${agent.description}

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
- Ask follow-up questions to check understanding

${ragResult.usedFallback ? 'Note: Using general knowledge fallback (custom materials did not contain relevant information)' : ''}`;

    // Generate response using Gemini
    const provider = new GeminiProvider();

    const history = conversationHistory?.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    })) || [];

    const result = await provider.chat(message.trim(), history, systemPrompt);
    const response = result.content;

    // Save messages to ai_agent_messages table
    const userMsgId = `msg_${Date.now()}_user`;
    const assistantMsgId = `msg_${Date.now()}_asst`;

    await supabase.from('ai_agent_messages').insert([
      {
        id: userMsgId,
        session_id: sessionId,
        role: 'user',
        content: message.trim(),
      },
      {
        id: assistantMsgId,
        session_id: sessionId,
        role: 'assistant',
        content: response,
        sources: ragResult.chunks.map((chunk, idx) => ({
          index: idx + 1,
          source: chunk.source,
          metadata: chunk.metadata,
        })),
        rag_tier_used: ragResult.usedFallback ? 'sage_fallback' : 'materials',
        metadata: { provider: 'gemini', model: 'gemini-2.0-flash' },
      },
    ]);

    // Update fallback count on session
    if (ragResult.usedFallback) {
      await supabase
        .from('ai_agent_sessions')
        .update({
          fallback_to_sage_count: session.fallback_to_sage_count + 1,
        })
        .eq('id', sessionId);
    }

    return NextResponse.json(
      {
        response: {
          id: `msg_${Date.now()}`,
          content: response,
          timestamp: new Date().toISOString(),
          metadata: {
            sources: ragResult.chunks.map((chunk, idx) => ({
              index: idx + 1,
              source: chunk.source,
              similarity: chunk.similarity,
              metadata: chunk.metadata,
            })),
            usedFallback: ragResult.usedFallback,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
