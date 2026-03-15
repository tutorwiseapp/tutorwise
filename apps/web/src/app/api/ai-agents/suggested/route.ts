/**
 * Suggested Agents API
 *
 * GET /api/ai-agents/suggested - Get suggested agents based on session context
 *
 * After a session ends, suggests related agents covering topics the
 * current agent doesn't specialise in. Powers the "Suggested Agents"
 * section in the post-session UI.
 *
 * @module api/ai-agents/suggested
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const agentId = searchParams.get('agentId');
    const subject = searchParams.get('subject');

    if (!agentId) {
      return NextResponse.json({ error: 'agentId required' }, { status: 400 });
    }

    // Get the current agent to know what to exclude
    const { data: currentAgent } = await supabase
      .from('ai_agents')
      .select('id, owner_id, subject, expertise_topics')
      .eq('id', agentId)
      .single();

    if (!currentAgent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Get session topics if sessionId provided
    let topicsDiscussed: string[] = [];
    if (sessionId) {
      const { data: session } = await supabase
        .from('ai_agent_sessions')
        .select('topics_discussed')
        .eq('id', sessionId)
        .single();

      topicsDiscussed = (session?.topics_discussed as string[]) || [];
    }

    // Find agents that cover different subjects or have complementary expertise
    let suggestedQuery = supabase
      .from('ai_agents')
      .select('id, display_name, subject, description, price_per_hour, expertise_topics')
      .eq('status', 'published')
      .neq('id', agentId)
      .neq('owner_id', currentAgent.owner_id) // Don't suggest own agents
      .limit(5);

    // If we know the subject, prioritise same subject (different expertise) or related subjects
    if (subject) {
      suggestedQuery = suggestedQuery.or(`subject.eq.${subject},subject.neq.${subject}`);
    }

    const { data: candidates } = await suggestedQuery;

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ suggested: [] });
    }

    // Score candidates: prefer agents covering topics discussed but not in current agent's expertise
    const currentExpertise = new Set((currentAgent.expertise_topics as string[]) || []);

    const scored = candidates.map(agent => {
      let score = 0;
      const agentTopics = (agent.expertise_topics as string[]) || [];

      // Boost if agent covers topics the student discussed but current agent doesn't specialise in
      for (const topic of topicsDiscussed) {
        if (!currentExpertise.has(topic) && agentTopics.includes(topic)) {
          score += 3;
        }
      }

      // Boost same subject (complementary coverage)
      if (agent.subject === currentAgent.subject) {
        score += 1;
      }

      return { ...agent, relevance_score: score };
    });

    // Sort by relevance and take top 3
    scored.sort((a, b) => b.relevance_score - a.relevance_score);
    const suggested = scored.slice(0, 3).map(({ relevance_score, expertise_topics, ...agent }) => agent);

    return NextResponse.json({ suggested });
  } catch (error) {
    console.error('[AI Agent Suggested] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
