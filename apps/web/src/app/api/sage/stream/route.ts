/**
 * Sage Streaming API
 *
 * POST /api/sage/stream - Send a message and receive streamed response
 *
 * Uses Server-Sent Events (SSE) for streaming responses.
 * Automatically selects best available provider: Claude > Gemini > Rules
 *
 * @module api/sage/stream
 */

import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getDefaultSageProvider, providerFactory } from '@sage/providers';
import type { LLMProviderType } from '@sage/providers/types';
import { knowledgeRetriever } from '@sage/knowledge';
import { contextResolver } from '@sage/context';
import { getSignatureContext } from '@sage/subjects/engine-executor';
import type { SagePersona, SageSubject, SageLevel, SageIntentCategory } from '@sage/types';
import type { LLMMessage } from '@sage/providers/types';
import type { AgentContext, UserRole } from '@cas/packages/core/src/context';
import { checkAIAgentRateLimit, incrementAIAgentUsage, getSageSubscription } from '@/lib/ai-agents/rate-limiter';
import { containsMath, solveMathFromMessage, formatSolutionsForContext } from '@sage/math/hybrid-solver';
import { resolveCurriculumContext, formatCurriculumContext } from '@sage/curriculum/resolver';
import { enhancedRetriever } from '@sage/knowledge/enhanced-retriever';
import { recommendMode, getSystemPrompt, estimateStruggleLevel, formatModeContext } from '@sage/teaching/modes';

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

    // Check rate limit
    const subscription = await getSageSubscription(user.id);
    const rateLimit = await checkAIAgentRateLimit('sage', user.id, subscription);

    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: rateLimit.error,
          message: rateLimit.message,
          rateLimit: {
            tier: rateLimit.tier,
            limit: rateLimit.limit,
            used: rateLimit.used,
            remaining: rateLimit.remaining,
            resetAt: rateLimit.resetAt.toISOString(),
          },
          upsell: rateLimit.upsell,
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize provider with automatic fallback (Claude > Gemini > Rules)
    const provider = getDefaultSageProvider();
    console.log(`[Sage Stream] Using provider: ${provider.name}`);

    // Initialize knowledge retriever for RAG
    knowledgeRetriever.initialize(supabase);

    // Resolve context for knowledge sources
    const resolvedContext = contextResolver.resolve({
      userId: user.id,
      userRole: userRole,
      subject: body.subject,
      level: body.level,
    });

    // Enhanced RAG: Multi-tier knowledge retrieval with quality scoring
    // This will be populated after curriculum context is resolved (to use topic-aware retrieval)
    let ragContext: string | undefined;
    let enhancedRagResult: any = null;

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

    // Resolve DSPy signature for structured responses
    let signaturePrompt: string | undefined;
    if (body.subject) {
      // Detect basic intent from message for signature selection
      const intentCategory = detectBasicIntent(body.message);
      const sigContext = getSignatureContext(intentCategory, body.subject, {
        topic: undefined,
        level: body.level,
        userMessage: body.message,
      });
      if (sigContext) {
        signaturePrompt = sigContext.promptEnhancement;
      }
    }

    // Hybrid Math Solver: Check for mathematical expressions and solve them deterministically
    let mathContext: string | undefined;
    try {
      if (containsMath(body.message)) {
        console.log('[Sage Stream] Math detected in message, solving with hybrid solver');
        const solutions = solveMathFromMessage(body.message);
        if (solutions.length > 0) {
          mathContext = formatSolutionsForContext(solutions);
          console.log(`[Sage Stream] Solved ${solutions.length} math problem(s)`);
        }
      }
    } catch (mathError) {
      console.warn('[Sage Stream] Hybrid solver failed, LLM will handle math:', mathError);
    }

    // Curriculum Mapping: Detect curriculum topics and provide context-aware guidance
    let curriculumContext: string | undefined;
    let curriculumTopic: any = undefined;
    try {
      if (body.subject === 'maths') {
        // Default to foundation tier for GCSE students (can be enhanced later with student profile data)
        const tier: 'foundation' | 'higher' = 'foundation';
        const curriculum = resolveCurriculumContext(
          body.message,
          'maths',
          tier
        );
        if (curriculum) {
          curriculumContext = formatCurriculumContext(curriculum);
          curriculumTopic = curriculum.topics[0]?.topic; // Primary topic for RAG
          console.log(`[Sage Stream] Curriculum: Matched ${curriculum.topics.length} topic(s) - ${curriculum.topics[0]?.topic.name}`);
        }
      }
    } catch (curriculumError) {
      console.warn('[Sage Stream] Curriculum resolver failed, continuing without curriculum context:', curriculumError);
    }

    // Enhanced RAG: Multi-tier retrieval with curriculum topic awareness
    try {
      enhancedRagResult = await enhancedRetriever.search({
        query: body.message,
        curriculumTopic,
        userId: user.id,
        subject: body.subject,
        level: body.level,
        maxChunks: 10,
        minSimilarity: 0.6,
        expandContext: true,
      });

      if (enhancedRagResult.chunks.length > 0) {
        ragContext = enhancedRetriever.formatForContext(enhancedRagResult, 1500);
        console.log(`[Sage Stream] Enhanced RAG: ${enhancedRetriever.getRetrievalSummary(enhancedRagResult)}`);
      }
    } catch (ragError) {
      console.warn('[Sage Stream] Enhanced RAG search failed, continuing without context:', ragError);
    }

    // Teaching Mode Selection: Socratic vs Direct vs Adaptive vs Supportive
    let teachingModePrompt: string | undefined;
    try {
      const struggleLevel = estimateStruggleLevel(body.message);
      const intentCategory = detectBasicIntent(body.message);

      const modeRecommendation = recommendMode({
        intent: intentCategory,
        persona,
        struggleLevel,
        topic: curriculumTopic,
        questionsAsked: 0, // TODO: Track from session history
        previouslyStudied: false, // TODO: Check from student progress
      });

      teachingModePrompt = getSystemPrompt(modeRecommendation.mode);
      console.log(`[Sage Stream] ${formatModeContext(modeRecommendation)}`);
    } catch (modeError) {
      console.warn('[Sage Stream] Teaching mode selection failed, using default:', modeError);
    }

    // Combine RAG context with signature prompt, math solutions, curriculum context, and teaching mode
    const combinedRagContext = [ragContext, signaturePrompt, mathContext, curriculumContext, teachingModePrompt].filter(Boolean).join('\n') || undefined;

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

          // Stream from provider with RAG + DSPy context
          const streamGenerator = provider.stream({
            messages,
            persona,
            subject: body.subject,
            level: body.level,
            context,
            ragContext: combinedRagContext,
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

          // Send done event with suggestions and rate limit info
          const suggestions = getSuggestions(body.message, persona, body.subject);
          controller.enqueue(
            encoder.encode(`event: done\ndata: ${JSON.stringify({
              id: messageId,
              content: fullResponse,
              timestamp: new Date().toISOString(),
              metadata: { persona, subject: body.subject, level: body.level, provider: provider.type },
              suggestions,
              rateLimit: {
                tier: rateLimit.tier,
                limit: rateLimit.limit,
                used: rateLimit.used + 1,
                remaining: rateLimit.remaining - 1,
                resetAt: rateLimit.resetAt.toISOString(),
              },
            })}\n\n`)
          );

          controller.close();

          // Increment usage counter (async, don't block)
          incrementAIAgentUsage('sage', user.id, subscription);

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

          // Send error event (informational — frontend will continue reading for fallback)
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ error: errorMessage, recoverable: true })}\n\n`)
          );

          // Try fallback providers: DeepSeek → Claude → Rules → static
          const fallbackOrder: LLMProviderType[] = ['deepseek', 'claude', 'rules'];
          let recovered = false;

          for (const fbType of fallbackOrder) {
            if (fbType === provider.type) continue; // Skip the provider that just failed
            try {
              const fbProvider = providerFactory.create({ type: fbType });
              if (!fbProvider.isAvailable()) continue;

              console.log(`[Sage Stream] Trying fallback provider: ${fbProvider.name}`);
              const fbStream = fbProvider.stream({
                messages,
                persona,
                subject: body.subject,
                level: body.level,
                context,
                ragContext: combinedRagContext,
              });

              let fbResponse = '';
              for await (const chunk of fbStream) {
                if (chunk.content) {
                  fbResponse += chunk.content;
                  controller.enqueue(
                    encoder.encode(`event: chunk\ndata: ${JSON.stringify({ content: chunk.content })}\n\n`)
                  );
                }
                if (chunk.done) break;
              }

              fullResponse = fbResponse;
              controller.enqueue(
                encoder.encode(`event: done\ndata: ${JSON.stringify({
                  id: messageId,
                  content: fbResponse,
                  timestamp: new Date().toISOString(),
                  metadata: { persona, subject: body.subject, level: body.level, provider: fbType, fallback: true },
                  suggestions: getSuggestions(body.message, persona, body.subject),
                  rateLimit: {
                    tier: rateLimit.tier,
                    limit: rateLimit.limit,
                    used: rateLimit.used + 1,
                    remaining: rateLimit.remaining - 1,
                    resetAt: rateLimit.resetAt.toISOString(),
                  },
                })}\n\n`)
              );

              // Increment usage counter
              incrementAIAgentUsage('sage', user.id, subscription);

              recovered = true;
              break;
            } catch (fbError) {
              console.warn(`[Sage Stream] Fallback ${fbType} also failed:`, fbError);
            }
          }

          if (!recovered) {
            // Last resort: static fallback
            const staticFallback = getFallbackResponse(body.message);
            controller.enqueue(
              encoder.encode(`event: done\ndata: ${JSON.stringify({
                id: messageId,
                content: staticFallback,
                timestamp: new Date().toISOString(),
                metadata: { persona, fallback: true, static: true },
                suggestions: getSuggestions(body.message, persona, body.subject),
                rateLimit: {
                  tier: rateLimit.tier,
                  limit: rateLimit.limit,
                  used: rateLimit.used + 1,
                  remaining: rateLimit.remaining - 1,
                  resetAt: rateLimit.resetAt.toISOString(),
                },
              })}\n\n`)
            );

            // Increment usage counter
            incrementAIAgentUsage('sage', user.id, subscription);
          }

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

/**
 * Detect basic intent from message text for DSPy signature selection.
 * Lightweight keyword-based detection used in the stream route.
 */
function detectBasicIntent(message: string): SageIntentCategory {
  const lower = message.toLowerCase();

  if (/solve|calculate|work out|find|what is/.test(lower)) return 'solve';
  if (/explain|how does|what does|why does|tell me about/.test(lower)) return 'explain';
  if (/practice|exercise|quiz|test me|problems/.test(lower)) return 'practice';
  if (/wrong|mistake|error|incorrect|check my/.test(lower)) return 'diagnose';
  if (/review|revise|summary|recap/.test(lower)) return 'review';
  if (/homework|assignment|coursework/.test(lower)) return 'homework';
  if (/exam|test|prepare|revision/.test(lower)) return 'exam';
  if (/resource|material|textbook|video/.test(lower)) return 'resources';

  return 'general';
}
