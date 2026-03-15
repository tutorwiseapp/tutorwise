/**
 * AI Agent Ratings API
 *
 * POST /api/ai-agents/ratings - Submit a rating for a session
 * GET  /api/ai-agents/ratings - Get ratings for an agent (creator only)
 *
 * @module api/ai-agents/ratings
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface RatingBody {
  agent_id: string;
  session_id: string;
  rating: number;
  feedback?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: RatingBody = await request.json();

    if (!body.agent_id || !body.session_id || !body.rating) {
      return NextResponse.json({ error: 'agent_id, session_id, and rating required' }, { status: 400 });
    }

    if (body.rating < 1 || body.rating > 5 || !Number.isInteger(body.rating)) {
      return NextResponse.json({ error: 'Rating must be an integer between 1 and 5' }, { status: 400 });
    }

    // Verify the session belongs to this user
    const { data: session } = await supabase
      .from('ai_agent_sessions')
      .select('id, client_id')
      .eq('id', body.session_id)
      .eq('client_id', user.id)
      .single();

    if (!session) {
      return NextResponse.json({ error: 'Session not found or not yours' }, { status: 404 });
    }

    const { data: rating, error } = await supabase
      .from('ai_agent_ratings')
      .upsert({
        agent_id: body.agent_id,
        session_id: body.session_id,
        student_id: user.id,
        rating: body.rating,
        feedback: body.feedback?.substring(0, 1000) || null,
      }, { onConflict: 'session_id,student_id' })
      .select('id, rating, created_at')
      .single();

    if (error) {
      console.error('[AI Agent Ratings] Error:', error);
      return NextResponse.json({ error: 'Failed to submit rating' }, { status: 500 });
    }

    return NextResponse.json({ rating }, { status: 201 });
  } catch (error) {
    console.error('[AI Agent Ratings] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json({ error: 'agentId required' }, { status: 400 });
    }

    // Verify ownership
    const { data: agent } = await supabase
      .from('ai_agents')
      .select('id')
      .eq('id', agentId)
      .eq('owner_id', user.id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found or not yours' }, { status: 404 });
    }

    const { data: ratings } = await supabase
      .from('ai_agent_ratings')
      .select('id, rating, feedback, created_at')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(50);

    // Distribution
    const dist = [0, 0, 0, 0, 0];
    for (const r of ratings || []) {
      dist[r.rating - 1]++;
    }

    const total = (ratings || []).length;
    const average = total > 0
      ? Math.round((ratings || []).reduce((sum, r) => sum + r.rating, 0) / total * 10) / 10
      : null;

    return NextResponse.json({
      ratings: ratings || [],
      summary: { average, total, distribution: dist },
    });
  } catch (error) {
    console.error('[AI Agent Ratings] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
