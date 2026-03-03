/**
 * Filename: api/marketplace/ai-agents/route.ts
 * Purpose: Marketplace API for AI agents
 * Created: 2026-02-23
 * Version: v1.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/marketplace/ai-agents
 * Fetch published AI agents for marketplace
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const subject = searchParams.get('subject');
    const minPrice = searchParams.get('min_price');
    const maxPrice = searchParams.get('max_price');

    // Build query
    let query = supabase
      .from('ai_agents')
      .select(
        `
        id,
        display_name,
        name,
        description,
        avatar_url,
        subject,
        price_per_hour,
        status,
        avg_rating,
        total_reviews,
        total_sessions,
        total_revenue
      `
      )
      .eq('status', 'published')
      .eq('subscription_status', 'active');

    // Apply filters
    if (subject) {
      query = query.eq('subject', subject);
    }

    if (minPrice) {
      query = query.gte('price_per_hour', parseFloat(minPrice));
    }

    if (maxPrice) {
      query = query.lte('price_per_hour', parseFloat(maxPrice));
    }

    // Execute with pagination
    const { data: aiAgents, error, count } = await query
      .order('total_sessions', { ascending: false }) // Popular first
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Fetch skills for each AI agent
    const agentsWithSkills = await Promise.all(
      (aiAgents || []).map(async (agent) => {
        const { data: skills } = await supabase
          .from('ai_agent_skills')
          .select('skill_name')
          .eq('agent_id', agent.id);

        return {
          ...agent,
          skills: skills?.map((s) => s.skill_name) || [],
        };
      })
    );

    return NextResponse.json(
      {
        aiAgents: agentsWithSkills,
        total: count || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching marketplace AI agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI agents', aiAgents: [], total: 0 },
      { status: 500 }
    );
  }
}
