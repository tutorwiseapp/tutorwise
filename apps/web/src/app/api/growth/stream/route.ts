/**
 * Growth Agent Streaming API
 *
 * POST /api/growth/stream — Send a message and receive streamed response (SSE)
 *
 * Rate limiting: 10 questions/day (free) | 5,000/month (Growth Pro)
 * Provider: getDefaultSageProvider() (shared 6-tier fallback chain)
 *
 * @module api/growth/stream
 */

import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getDefaultSageProvider, providerFactory } from '@sage/providers';
import type { LLMProviderType } from '@sage/providers/types';
import type { LLMMessage } from '@sage/providers/types';
import type { AgentContext } from '@cas/packages/core/src/context';
import { checkAIAgentRateLimit, incrementAIAgentUsage, getGrowthSubscription } from '@/lib/ai-agents/rate-limiter';
import { growthOrchestrator } from '@growth/core/orchestrator';
import type { GrowthUserRole } from '@growth/tools/types';

interface StreamRequestBody {
  sessionId: string;
  message: string;
  role?: GrowthUserRole;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

function mapRoleToGrowthRole(role?: string): GrowthUserRole {
  switch (role) {
    case 'tutor': return 'tutor';
    case 'client': return 'client';
    case 'agent': return 'agent';
    case 'organisation': return 'organisation';
    default: return 'tutor';
  }
}

function getFallbackResponse(): string {
  return "I'm having a little trouble right now — could you try rephrasing your question? I can help with income strategy, pricing, referrals, AI Tutor setup, and growing your tutoring business.";
}

function getSuggestions(role: GrowthUserRole): string[] {
  const suggestions: Record<GrowthUserRole, string[]> = {
    tutor: ['How can I increase my hourly rate?', 'Should I create an AI Tutor?', 'Help me improve my listing'],
    client: ['How do I find the best tutor?', 'What should I look for in a tutor?', 'How do I track progress?'],
    agent: ['How do I grow my tutoring agency?', 'Help me recruit tutors', 'Improve my referral rate'],
    organisation: ['How do I scale my team?', 'Improve our service offering', 'Increase organisation revenue'],
  };
  return suggestions[role] ?? suggestions.tutor;
}

/**
 * POST /api/growth/stream
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
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
      .select('active_role, display_name')
      .eq('id', user.id)
      .single();

    const role = mapRoleToGrowthRole(body.role || profileData?.active_role);

    // Check rate limit
    const subscription = await getGrowthSubscription(user.id);
    const rateLimit = await checkAIAgentRateLimit('growth', user.id, subscription);

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

    // Get or rebuild session (in-memory sessions may have expired on server restart)
    const session = growthOrchestrator.getSession(body.sessionId);
    const sessionMetrics = session?.metrics;

    // Build system prompt
    const systemPrompt = growthOrchestrator.buildSystemPrompt(role, sessionMetrics);

    // Initialize provider
    const provider = getDefaultSageProvider();
    if (!provider.isAvailable()) {
      return new Response(
        JSON.stringify({ error: 'AI provider not configured', code: 'PROVIDER_UNAVAILABLE' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build messages array
    const messages: LLMMessage[] = [];

    if (body.conversationHistory?.length) {
      for (const msg of body.conversationHistory.slice(-10)) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }
    }

    messages.push({ role: 'user', content: body.message });

    // Agent context
    const context: AgentContext = {
      mode: 'user',
      user: {
        id: user.id,
        role: role as import('@cas/packages/core/src/context').UserRole,
        permissions: ['read:data'],
        metadata: { displayName: profileData?.display_name },
      },
      session: {
        sessionId: body.sessionId,
        startedAt: new Date(),
        lastActivityAt: new Date(),
      },
      traceId: `growth_${Date.now()}`,
    };

    const messageId = `msg_${Date.now()}`;

    // SSE stream
    const encoder = new TextEncoder();
    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(`event: start\ndata: ${JSON.stringify({ messageId })}\n\n`)
          );

          const streamGenerator = provider.stream({
            messages,
            persona: 'tutor', // Growth uses tutor persona for provider compatibility
            context,
            ragContext: systemPrompt, // System prompt injected as RAG context
          });

          for await (const chunk of streamGenerator) {
            if (chunk.content) {
              fullResponse += chunk.content;
              controller.enqueue(
                encoder.encode(`event: chunk\ndata: ${JSON.stringify({ content: chunk.content })}\n\n`)
              );
            }
            if (chunk.done) break;
          }

          controller.enqueue(
            encoder.encode(`event: done\ndata: ${JSON.stringify({
              id: messageId,
              content: fullResponse,
              timestamp: new Date().toISOString(),
              metadata: { role, provider: provider.type },
              suggestions: getSuggestions(role),
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

          // Increment usage (async, non-blocking)
          incrementAIAgentUsage('growth', user.id, subscription, body.sessionId);

          // Store messages (async, non-blocking)
          supabase.from('growth_usage_log').insert({
            user_id: user.id,
            session_id: body.sessionId,
            question_count: 1,
            model_used: provider.type,
          }).then(({ error }) => {
            if (error) console.warn('[Growth Stream] Could not log usage:', error.message);
          });

        } catch (error) {
          console.error('[Growth Stream] Provider error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Stream error';

          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ error: errorMessage, recoverable: true })}\n\n`)
          );

          // Fallback providers
          const fallbackOrder: LLMProviderType[] = ['deepseek', 'claude', 'rules'];
          let recovered = false;

          for (const fbType of fallbackOrder) {
            if (fbType === provider.type) continue;
            try {
              const fbProvider = providerFactory.create({ type: fbType });
              if (!fbProvider.isAvailable()) continue;

              const fbStream = fbProvider.stream({
                messages,
                persona: 'tutor',
                context,
                ragContext: systemPrompt,
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
                  metadata: { role, provider: fbType, fallback: true },
                  suggestions: getSuggestions(role),
                  rateLimit: {
                    tier: rateLimit.tier,
                    limit: rateLimit.limit,
                    used: rateLimit.used + 1,
                    remaining: rateLimit.remaining - 1,
                    resetAt: rateLimit.resetAt.toISOString(),
                  },
                })}\n\n`)
              );

              incrementAIAgentUsage('growth', user.id, subscription, body.sessionId);
              recovered = true;
              break;
            } catch (fbError) {
              console.warn(`[Growth Stream] Fallback ${fbType} failed:`, fbError);
            }
          }

          if (!recovered) {
            const staticFallback = getFallbackResponse();
            controller.enqueue(
              encoder.encode(`event: done\ndata: ${JSON.stringify({
                id: messageId,
                content: staticFallback,
                timestamp: new Date().toISOString(),
                metadata: { role, fallback: true, static: true },
                suggestions: getSuggestions(role),
                rateLimit: {
                  tier: rateLimit.tier,
                  limit: rateLimit.limit,
                  used: rateLimit.used + 1,
                  remaining: rateLimit.remaining - 1,
                  resetAt: rateLimit.resetAt.toISOString(),
                },
              })}\n\n`)
            );
            incrementAIAgentUsage('growth', user.id, subscription, body.sessionId);
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
    console.error('[Growth Stream] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
