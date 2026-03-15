/**
 * AI Agent Referrals API
 *
 * POST /api/ai-agents/referrals - Create a referral from one agent to another
 * GET  /api/ai-agents/referrals - Get referral stats (for creators)
 *
 * Tracks agent-to-agent referrals with 5% revenue share on conversion.
 *
 * @module api/ai-agents/referrals
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface ReferralBody {
  source_agent_id: string;
  target_agent_id: string;
  session_id?: string;
  topic_context?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ReferralBody = await request.json();

    if (!body.source_agent_id || !body.target_agent_id) {
      return NextResponse.json({ error: 'source_agent_id and target_agent_id required' }, { status: 400 });
    }

    if (body.source_agent_id === body.target_agent_id) {
      return NextResponse.json({ error: 'Cannot refer to the same agent' }, { status: 400 });
    }

    // Verify both agents exist
    const { data: agents } = await supabase
      .from('ai_agents')
      .select('id')
      .in('id', [body.source_agent_id, body.target_agent_id]);

    if (!agents || agents.length < 2) {
      return NextResponse.json({ error: 'One or both agents not found' }, { status: 404 });
    }

    const { data: referral, error } = await supabase
      .from('ai_agent_referrals')
      .insert({
        source_agent_id: body.source_agent_id,
        target_agent_id: body.target_agent_id,
        student_id: user.id,
        session_id: body.session_id || null,
        topic_context: body.topic_context?.substring(0, 200) || null,
      })
      .select('id, created_at')
      .single();

    if (error) {
      console.error('[AI Agent Referrals] Insert error:', error);
      return NextResponse.json({ error: 'Failed to create referral' }, { status: 500 });
    }

    return NextResponse.json({ referral }, { status: 201 });
  } catch (error) {
    console.error('[AI Agent Referrals] Error:', error);
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

    // Get creator's agents
    const { data: myAgents } = await supabase
      .from('ai_agents')
      .select('id, display_name')
      .eq('owner_id', user.id);

    if (!myAgents || myAgents.length === 0) {
      return NextResponse.json({ referrals: { outbound: [], inbound: [], stats: {} } });
    }

    const agentIds = myAgents.map(a => a.id);

    // Outbound referrals (from my agents to others)
    const { data: outbound } = await supabase
      .from('ai_agent_referrals')
      .select(`
        id, topic_context, converted, created_at, converted_at,
        target_agent:ai_agents!target_agent_id (display_name, subject)
      `)
      .in('source_agent_id', agentIds)
      .order('created_at', { ascending: false })
      .limit(50);

    // Inbound referrals (from others to my agents)
    const { data: inbound } = await supabase
      .from('ai_agent_referrals')
      .select(`
        id, topic_context, converted, created_at, converted_at,
        source_agent:ai_agents!source_agent_id (display_name, subject)
      `)
      .in('target_agent_id', agentIds)
      .order('created_at', { ascending: false })
      .limit(50);

    const outboundList = outbound || [];
    const inboundList = inbound || [];

    const stats = {
      outbound_total: outboundList.length,
      outbound_converted: outboundList.filter(r => r.converted).length,
      outbound_conversion_rate: outboundList.length > 0
        ? Math.round((outboundList.filter(r => r.converted).length / outboundList.length) * 100)
        : 0,
      inbound_total: inboundList.length,
      inbound_converted: inboundList.filter(r => r.converted).length,
    };

    return NextResponse.json({
      referrals: { outbound: outboundList, inbound: inboundList, stats },
    });
  } catch (error) {
    console.error('[AI Agent Referrals] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
