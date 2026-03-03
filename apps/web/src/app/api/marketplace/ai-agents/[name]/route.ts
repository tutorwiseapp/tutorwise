/**
 * Filename: api/marketplace/ai-agents/[name]/route.ts
 * Purpose: Public single AI agent fetch by name slug for public profile page
 * Created: 2026-03-03
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/marketplace/ai-agents/[name]
 * Returns full public profile data for a single published AI agent
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const supabase = await createClient();

    // 1. Fetch agent by name slug
    const { data: agent, error } = await supabase
      .from('ai_agents')
      .select(`
        id, display_name, name, description, avatar_url,
        subject, price_per_hour, status, avg_rating, total_reviews,
        total_sessions, is_platform_owned, created_at, view_count,
        owner_id
      `)
      .eq('name', name)
      .eq('status', 'published')
      .single();

    if (error || !agent) {
      return NextResponse.json({ error: 'AI agent not found' }, { status: 404 });
    }

    // 2. Skills
    const { data: skillRows } = await supabase
      .from('ai_agent_skills')
      .select('skill_name')
      .eq('agent_id', agent.id);

    // 3. Reviews from ai_agent_sessions with reviewer profiles (server-side join — intentional)
    const { data: reviewSessions } = await supabase
      .from('ai_agent_sessions')
      .select('id, rating, review_text, reviewed_at, client_id')
      .eq('agent_id', agent.id)
      .eq('reviewed', true)
      .not('rating', 'is', null)
      .order('reviewed_at', { ascending: false })
      .limit(10);

    const reviews = await Promise.all(
      (reviewSessions || []).map(async (session) => {
        let reviewer_name = 'Verified Student';
        let reviewer_avatar_url: string | null = null;

        if (session.client_id) {
          const { data: reviewer } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', session.client_id)
            .maybeSingle();

          if (reviewer) {
            reviewer_name = reviewer.full_name || 'Verified Student';
            reviewer_avatar_url = reviewer.avatar_url || null;
          }
        }

        return {
          id: session.id,
          rating: session.rating as number,
          comment: session.review_text as string | undefined,
          created_at: session.reviewed_at as string,
          reviewer_name,
          reviewer_avatar_url,
        };
      })
    );

    // 4. Unique students helped
    const { data: studentRows } = await supabase
      .from('ai_agent_sessions')
      .select('client_id')
      .eq('agent_id', agent.id)
      .not('client_id', 'is', null);

    const students_helped = studentRows
      ? new Set(studentRows.map((r) => r.client_id)).size
      : 0;

    // 5. Owner profile (creator attribution)
    let owner: { id: string; full_name: string; avatar_url: string | null; identity_verified: boolean; slug: string | null } | null = null;
    if (agent.owner_id && !agent.is_platform_owned) {
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, identity_verified, slug')
        .eq('id', agent.owner_id)
        .maybeSingle();

      if (ownerProfile) {
        owner = {
          id: ownerProfile.id,
          full_name: ownerProfile.full_name || 'Tutor',
          avatar_url: ownerProfile.avatar_url || null,
          identity_verified: ownerProfile.identity_verified || false,
          slug: ownerProfile.slug || null,
        };
      }
    }

    // 6. Similar AI agents (same subject, different id)
    const { data: similarAgents } = await supabase
      .from('ai_agents')
      .select('id, display_name, name, avatar_url, subject, avg_rating, total_sessions, price_per_hour')
      .eq('status', 'published')
      .eq('subject', agent.subject)
      .neq('id', agent.id)
      .limit(4);

    return NextResponse.json({
      agent: {
        ...agent,
        skills: skillRows?.map((s) => s.skill_name) || [],
      },
      reviews,
      students_helped,
      owner,
      similar_agents: similarAgents || [],
    });
  } catch (error) {
    console.error('Error fetching AI agent public profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
