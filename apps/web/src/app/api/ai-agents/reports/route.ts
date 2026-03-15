/**
 * AI Agent Reports API
 *
 * POST /api/ai-agents/reports - Submit a report for concerning agent behaviour
 *
 * Reports are reviewed by platform admins. Auto-suspend triggers if
 * an agent receives 3+ pending reports in 7 days.
 *
 * @module api/ai-agents/reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface ReportBody {
  agent_id: string;
  session_id?: string;
  reason: 'harmful_content' | 'inappropriate' | 'off_topic' | 'privacy' | 'other';
  description?: string;
  message_content?: string;
}

/**
 * POST /api/ai-agents/reports
 * Submit a report about an agent's behaviour
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ReportBody = await request.json();

    if (!body.agent_id || !body.reason) {
      return NextResponse.json(
        { error: 'agent_id and reason are required' },
        { status: 400 }
      );
    }

    const validReasons = ['harmful_content', 'inappropriate', 'off_topic', 'privacy', 'other'];
    if (!validReasons.includes(body.reason)) {
      return NextResponse.json(
        { error: `Invalid reason. Must be one of: ${validReasons.join(', ')}` },
        { status: 400 }
      );
    }

    // Insert the report
    const { data: report, error: insertError } = await supabase
      .from('ai_agent_reports')
      .insert({
        agent_id: body.agent_id,
        session_id: body.session_id || null,
        reporter_id: user.id,
        reason: body.reason,
        description: body.description?.substring(0, 2000) || null,
        message_content: body.message_content?.substring(0, 5000) || null,
      })
      .select('id, created_at')
      .single();

    if (insertError) {
      console.error('[AI Agent Reports] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
    }

    // Check auto-suspend threshold: 3+ pending reports in 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('ai_agent_reports')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', body.agent_id)
      .eq('status', 'pending')
      .gte('created_at', sevenDaysAgo);

    if (count && count >= 3) {
      // Auto-unpublish the agent
      await supabase
        .from('ai_agents')
        .update({ status: 'unpublished' })
        .eq('id', body.agent_id);

      // Notify the agent owner
      const { data: agentData } = await supabase
        .from('ai_agents')
        .select('owner_id, display_name')
        .eq('id', body.agent_id)
        .single();

      if (agentData) {
        await supabase.from('platform_notifications').insert({
          user_id: agentData.owner_id,
          type: 'agent_suspended',
          title: `Agent "${agentData.display_name}" suspended`,
          message: `Your agent has been automatically unpublished due to multiple reports. Please review and contact support if you believe this is in error.`,
          metadata: { agent_id: body.agent_id, report_count: count },
        });
      }

      console.log(`[AI Agent Reports] Auto-suspended agent ${body.agent_id} (${count} reports in 7 days)`);
    }

    return NextResponse.json(
      { id: report.id, message: 'Report submitted. Thank you for helping keep our platform safe.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('[AI Agent Reports] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
