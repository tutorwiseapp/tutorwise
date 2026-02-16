/**
 * Sage Message API
 *
 * POST /api/sage/message - Send a message and receive non-streaming response
 *
 * @module api/sage/message
 */

import { NextRequest, NextResponse } from 'next/server';
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

interface MessageRequestBody {
  sessionId: string;
  message: string;
  subject?: SageSubject;
  level?: SageLevel;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * POST /api/sage/message
 * Send a message to Sage and receive a complete response (non-streaming)
 */
export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body: MessageRequestBody = await request.json();

    if (!body.sessionId || !body.message) {
      return NextResponse.json(
        { error: 'Session ID and message are required', code: 'MISSING_FIELDS' },
        { status: 400 }
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

    // Initialize provider with automatic fallback (Claude > Gemini > Rules)
    const provider = getDefaultSageProvider();
    console.log(`[Sage Message] Using provider: ${provider.name}`);

    // Initialize knowledge retriever for RAG
    knowledgeRetriever.initialize(supabase);

    // Resolve context for knowledge sources
    const resolvedContext = contextResolver.resolve({
      userId: user.id,
      userRole: userRole,
      subject: body.subject,
      level: body.level,
    });

    // Search knowledge base for relevant context
    let ragContext: string | undefined;
    try {
      const namespaces = resolvedContext.knowledgeSources.map(s => s.namespace);
      const searchResults = await knowledgeRetriever.search(
        {
          query: body.message,
          namespaces,
          subject: body.subject,
          level: body.level,
          topK: 5,
          minScore: 0.6,
        },
        resolvedContext.knowledgeSources
      );

      if (searchResults.chunks.length > 0) {
        ragContext = knowledgeRetriever.formatForContext(searchResults.chunks, 1500);
        console.log(`[Sage Message] RAG: Found ${searchResults.chunks.length} relevant chunks`);
      }
    } catch (ragError) {
      console.warn('[Sage Message] RAG search failed, continuing without context:', ragError);
    }

    if (!provider.isAvailable()) {
      // Fall back to rules provider if no provider available
      console.log('[Sage Message] Primary provider unavailable, using Rules');
      return handleFallbackResponse(body, supabase);
    }

    // Resolve DSPy signature for structured responses
    let signaturePrompt: string | undefined;
    if (body.subject) {
      const intentCategory = detectBasicIntent(body.message);
      const sigContext = getSignatureContext(intentCategory, body.subject, {
        level: body.level,
        userMessage: body.message,
      });
      if (sigContext) {
        signaturePrompt = sigContext.promptEnhancement;
      }
    }

    // Combine RAG context with signature prompt
    const combinedRagContext = [ragContext, signaturePrompt].filter(Boolean).join('\n') || undefined;

    // Build messages array
    const messages: LLMMessage[] = [];

    // Add conversation history if provided
    if (body.conversationHistory?.length) {
      for (const msg of body.conversationHistory.slice(-10)) {
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

    try {
      // Get completion from provider with RAG + DSPy context
      const completion = await provider.complete({
        messages,
        persona,
        subject: body.subject,
        level: body.level,
        context,
        ragContext: combinedRagContext,
      });

      // Store messages (async, don't block response)
      storeMessages(supabase, body.sessionId, body.message, completion.content, messageId, {
        persona,
        subject: body.subject,
        level: body.level,
        provider: provider.type,
      });

      return NextResponse.json({
        response: {
          id: messageId,
          role: 'assistant',
          content: completion.content,
          timestamp: new Date().toISOString(),
          metadata: {
            persona,
            subject: body.subject,
            level: body.level,
            provider: provider.type,
          },
        },
        suggestions: completion.suggestions || getSuggestions(persona, body.subject),
        relatedTopics: completion.relatedTopics,
      });
    } catch (providerError) {
      console.error('[Sage Message] Provider error:', providerError);

      // Try fallback providers: DeepSeek → Claude → Rules
      const fallbackOrder: LLMProviderType[] = ['deepseek', 'claude', 'rules'];
      for (const fbType of fallbackOrder) {
        if (fbType === provider.type) continue;
        try {
          const fbProvider = providerFactory.create({ type: fbType });
          if (!fbProvider.isAvailable()) continue;

          console.log(`[Sage Message] Trying fallback provider: ${fbProvider.name}`);
          const fbCompletion = await fbProvider.complete({
            messages,
            persona,
            subject: body.subject,
            level: body.level,
            context,
            ragContext: combinedRagContext,
          });

          storeMessages(supabase, body.sessionId, body.message, fbCompletion.content, messageId, {
            persona,
            subject: body.subject,
            level: body.level,
            provider: fbType,
            fallback: true,
          });

          return NextResponse.json({
            response: {
              id: messageId,
              role: 'assistant',
              content: fbCompletion.content,
              timestamp: new Date().toISOString(),
              metadata: {
                persona,
                subject: body.subject,
                level: body.level,
                provider: fbType,
                fallback: true,
              },
            },
            suggestions: fbCompletion.suggestions || getSuggestions(persona, body.subject),
          });
        } catch (fbError) {
          console.warn(`[Sage Message] Fallback ${fbType} also failed:`, fbError);
        }
      }

      // All providers failed — use static fallback
      return handleFallbackResponse(body, supabase);
    }
  } catch (error) {
    console.error('[Sage Message] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
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
 * Store messages in database
 */
async function storeMessages(
  supabase: ReturnType<typeof createServerClient>,
  sessionId: string,
  userMessage: string,
  assistantMessage: string,
  messageId: string,
  metadata: Record<string, unknown>
) {
  const { error } = await supabase.from('sage_messages').insert([
    {
      id: `msg_user_${Date.now()}`,
      session_id: sessionId,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    },
    {
      id: messageId,
      session_id: sessionId,
      role: 'assistant',
      content: assistantMessage,
      timestamp: new Date().toISOString(),
      metadata,
    },
  ]);

  if (error) {
    console.warn('[Sage Message] Could not store messages:', error.message);
  } else {
    // Update session activity
    await supabase
      .from('sage_sessions')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', sessionId);
  }
}

/**
 * Handle fallback when provider is unavailable
 */
function handleFallbackResponse(
  body: MessageRequestBody,
  supabase: ReturnType<typeof createServerClient>
) {
  const messageId = `msg_${Date.now()}`;
  const response = getPlaceholderResponse(body.message);

  // Store messages (async)
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
  ]).then(() => {});

  return NextResponse.json({
    response: {
      id: messageId,
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString(),
      metadata: {
        persona: 'sage',
        fallback: true,
      },
    },
    suggestions: ['Tell me more', 'Practice questions', 'Explain differently'],
  });
}

/**
 * Get suggestions based on persona and subject
 */
function getSuggestions(persona: SagePersona, subject?: SageSubject): string[] {
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
 * Fallback placeholder response
 */
function getPlaceholderResponse(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return "Hello! I'm Sage, your AI tutor. I'm here to help you learn and understand any subject. What would you like to explore today?";
  }

  if (lowerMessage.includes('help')) {
    return "I'd be happy to help! I can assist with:\n\n- **Mathematics**: Algebra, geometry, calculus, and more\n- **English**: Writing, grammar, literature analysis\n- **Science**: Physics, chemistry, biology concepts\n- **Study skills**: Exam prep, note-taking, time management\n\nWhat subject would you like to focus on?";
  }

  return "That's a great question! Let me help you think through this. To give you the best guidance, could you share a bit more context about what you're working on?";
}

/**
 * Detect basic intent from message text for DSPy signature selection.
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
