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
import {
  classifyInput,
  stripPII,
  getBlockMessage,
  detectWellbeing,
  shouldBlockTutoring,
  validateOutput,
  stripOutputPII,
} from '@sage/safety';
import { StudentModelService } from '@sage/services/student-model';
import { AgentMemoryService } from '@/lib/agent-studio/AgentMemoryService';

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

    // Get session with agent details (including custom prompt + guardrails)
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
          agent_type,
          system_prompt,
          guardrail_config
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

    // --- SAFETY PIPELINE (shared with Sage) ---
    const inputClassification = classifyInput(trimmedMessage);

    if (!inputClassification.safe && inputClassification.category !== 'pii_exposure') {
      const wellbeingAlert = detectWellbeing(trimmedMessage);
      const blockMessage = wellbeingAlert.detected && wellbeingAlert.severity === 'high'
        ? wellbeingAlert.supportMessage!
        : getBlockMessage(inputClassification.category);

      // Log safeguarding event
      supabase.from('sage_safeguarding_events').insert({
        user_id: user.id,
        session_id: sessionId,
        event_type: 'input_blocked',
        severity: wellbeingAlert.detected ? wellbeingAlert.severity : 'low',
        category: inputClassification.category,
        details: { reason: inputClassification.reason, agent_id: session.agent_id },
      }).then(({ error: e }) => {
        if (e) console.warn('[AI Agent Safety] Could not log event:', e.message);
      });

      return new Response(
        JSON.stringify({ blocked: true, message: blockMessage, category: inputClassification.category }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'X-Agent-Safety': 'blocked' } }
      );
    }

    const wellbeingAlert = detectWellbeing(trimmedMessage);
    if (shouldBlockTutoring(wellbeingAlert)) {
      supabase.from('sage_safeguarding_events').insert({
        user_id: user.id,
        session_id: sessionId,
        event_type: 'wellbeing_alert',
        severity: 'high',
        category: wellbeingAlert.category || 'distress',
        details: { keywords: wellbeingAlert.keywords, agent_id: session.agent_id },
      }).then(({ error: e }) => {
        if (e) console.warn('[AI Agent Safety] Could not log event:', e.message);
      });

      return new Response(
        JSON.stringify({ blocked: true, message: wellbeingAlert.supportMessage, category: 'wellbeing' }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'X-Agent-Safety': 'wellbeing-alert' } }
      );
    }

    // Strip PII before LLM
    const sanitisedMessage = stripPII(trimmedMessage);

    // --- PHASE A4: Per-Student Adaptation ---
    // Fetch student model, agent memory, and RAG context in parallel
    const studentModelService = new StudentModelService(supabase);
    const agentMemoryService = new AgentMemoryService();
    const agentMemorySlug = `ai-agent-${session.agent_id}`;

    const [ragResult, studentProfile, memoryBlock] = await Promise.all([
      retrieveContext(sanitisedMessage, session.agent_id, 5),
      studentModelService.getOrCreateProfile(user.id).catch(() => null),
      agentMemoryService.fetchMemoryBlock(agentMemorySlug, sanitisedMessage).catch(() => undefined),
    ]);

    // Build student context block for system prompt
    let studentContextBlock = '';
    if (studentProfile) {
      studentContextBlock = studentModelService.buildContextBlock(studentProfile);
      // Inject adaptive difficulty
      const diffLevel = session.difficulty_level || 3;
      studentContextBlock += `\nCurrent Difficulty: ${diffLevel}/5. Adjust question complexity accordingly.`;
    }

    // Build system prompt (uses custom prompt if creator set one)
    const agent = session.ai_agent;
    const guardrails = agent.guardrail_config || {};
    const systemPrompt = buildSystemPrompt(agent, ragResult, guardrails, studentContextBlock, memoryBlock);

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

          // Post-stream background tasks — all fire-and-forget to avoid blocking SSE.
          // Each logs with session context for debugging failed writes.
          const bgCtx = { sessionId, agentId: session.agent_id, messageId };

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
          }).catch(err => console.error('[AI Agent Stream] Quality loop failed:', { error: err instanceof Error ? err.message : err, ...bgCtx }));

          runStudentJourneyWorkflow({
            sessionId,
            agentId: session.agent_id,
            studentId: session.client_id,
            userMessage: trimmedMessage,
            assistantResponse: fullResponse,
          }).catch(err => console.error('[AI Agent Stream] Student journey failed:', { error: err instanceof Error ? err.message : err, ...bgCtx }));

          agentMemoryService.recordEpisode({
            agentSlug: agentMemorySlug,
            runId: messageId,
            task: sanitisedMessage,
            outputText: fullResponse,
          }).catch(err => console.error('[AI Agent Stream] Memory episode failed:', { error: err instanceof Error ? err.message : err, ...bgCtx }));

          if (fullResponse.length > 200) {
            agentMemoryService.extractAndStoreFacts({
              agentSlug: agentMemorySlug,
              runId: messageId,
              outputText: fullResponse,
            }).catch(err => console.error('[AI Agent Stream] Memory facts failed:', { error: err instanceof Error ? err.message : err, ...bgCtx }));
          }

          // Fire-and-forget: Adaptive difficulty tracking (Phase A4)
          // Heuristic: if response contains positive affirmation patterns, student may have answered correctly
          const correctIndicators = /\b(correct|well done|exactly|right|great|brilliant|perfect)\b/i;
          const hintIndicators = /\b(hint|try again|not quite|almost|think about|consider)\b/i;
          const currentDifficulty = session.difficulty_level || 3;
          let newDifficulty = currentDifficulty;
          if (correctIndicators.test(fullResponse) && !hintIndicators.test(fullResponse)) {
            newDifficulty = Math.min(5, currentDifficulty + 1);
          } else if (hintIndicators.test(fullResponse)) {
            // Only decrease if multiple hints detected
            const hintCount = (fullResponse.match(hintIndicators) || []).length;
            if (hintCount >= 2) {
              newDifficulty = Math.max(1, currentDifficulty - 1);
            }
          }
          if (newDifficulty !== currentDifficulty) {
            supabase.from('ai_agent_sessions')
              .update({ difficulty_level: newDifficulty })
              .eq('id', sessionId)
              .then(({ error: e }) => {
                if (e) console.warn('[AI Agent Stream] Difficulty update error:', e.message);
              });
          }

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
        'X-Agent-Safety': 'checked',
        'X-Agent-Age-Restriction': guardrails.age_restriction || 'secondary',
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
 * Build system prompt from agent config, custom prompt, guardrails, and RAG context
 */
function buildSystemPrompt(
  agent: {
    display_name: string;
    subject: string;
    description: string;
    agent_type?: string;
    system_prompt?: string | null;
    guardrail_config?: Record<string, any> | null;
  },
  ragResult: { chunks: Array<{ text: string }>; usedFallback: boolean },
  guardrails: Record<string, any> = {},
  studentContext: string = '',
  memoryBlock: string | undefined = undefined,
): string {
  // Start with custom prompt if creator set one, otherwise use default
  let prompt: string;

  if (agent.system_prompt) {
    prompt = `You are ${agent.display_name}.\n\n${agent.system_prompt}`;
  } else {
    prompt = `You are ${agent.display_name}, a specialized ${agent.agent_type || 'tutor'} for ${agent.subject}.

Your role: ${agent.description || 'Help students learn and understand concepts.'}

Instructions:
- Be educational, patient, and encouraging
- Break down complex concepts step-by-step
- Ask follow-up questions to check understanding`;
  }

  // Inject guardrail rules
  const guardrailRules: string[] = [];

  if (guardrails.socratic_mode) {
    guardrailRules.push('- Use Socratic questioning. Guide students to discover answers through questions. Do NOT give direct answers.');
  }

  if (guardrails.allow_direct_answers === false) {
    guardrailRules.push('- NEVER provide direct homework answers. Guide the student to find the answer themselves.');
  }

  if (guardrails.age_restriction === 'primary') {
    guardrailRules.push('- Use simple, clear language suitable for children under 11. Avoid jargon.');
  } else if (guardrails.age_restriction === 'secondary') {
    guardrailRules.push('- Use language appropriate for 11-16 year olds. Introduce technical terms with brief definitions.');
  }

  if (guardrails.blocked_topics?.length > 0) {
    guardrailRules.push(`- Do NOT discuss these topics: ${guardrails.blocked_topics.join(', ')}`);
  }

  if (guardrails.allowed_topics?.length > 0) {
    guardrailRules.push(`- Only discuss these topics: ${guardrails.allowed_topics.join(', ')}. Redirect off-topic questions.`);
  }

  if (guardrails.escalation_message) {
    guardrailRules.push(`- If you cannot help, respond with: "${guardrails.escalation_message}"`);
  }

  if (guardrailRules.length > 0) {
    prompt += '\n\nGUARDRAILS:\n' + guardrailRules.join('\n');
  }

  // Add student context (Phase A4)
  if (studentContext) {
    prompt += '\n\n' + studentContext;
  }

  // Add agent memory (Phase A4)
  if (memoryBlock) {
    prompt += '\n\nPAST EXPERIENCE:\n' + memoryBlock;
  }

  // Add RAG context
  if (ragResult.chunks.length > 0) {
    prompt += '\n\nContext sources:\n' + ragResult.chunks
      .map((chunk, idx) => `[${idx + 1}] ${chunk.text.substring(0, 200)}...`)
      .join('\n');
    prompt += '\n\n- Cite sources using [1], [2], etc. when using context above.';
  }

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
