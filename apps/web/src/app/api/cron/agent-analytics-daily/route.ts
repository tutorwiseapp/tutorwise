/**
 * Agent Analytics Daily Aggregation Cron
 *
 * POST /api/cron/agent-analytics-daily - Aggregate daily agent metrics
 *
 * Runs daily at 02:00 UTC via pg_cron. Aggregates yesterday's session data
 * into ai_agent_analytics_daily for fast creator dashboard queries.
 *
 * @module api/cron/agent-analytics-daily
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const cronSecret = request.headers.get('x-cron-secret');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServiceRoleClient();

    // Yesterday's date range
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    const dayStart = `${dateStr}T00:00:00.000Z`;
    const dayEnd = `${dateStr}T23:59:59.999Z`;

    // Get all sessions from yesterday
    const { data: sessions } = await supabase
      .from('ai_agent_sessions')
      .select('id, agent_id, client_id, status, duration_minutes, cost_pounds, escalated_to_human, started_at')
      .gte('started_at', dayStart)
      .lte('started_at', dayEnd);

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ message: 'No sessions yesterday', aggregated: 0 });
    }

    // Get messages count per session
    const sessionIds = sessions.map(s => s.id);
    const { data: messages } = await supabase
      .from('ai_agent_messages')
      .select('session_id')
      .in('session_id', sessionIds);

    const messageCounts = new Map<string, number>();
    for (const m of messages || []) {
      messageCounts.set(m.session_id, (messageCounts.get(m.session_id) || 0) + 1);
    }

    // Get ratings from yesterday
    const { data: ratings } = await supabase
      .from('ai_agent_ratings')
      .select('agent_id, rating')
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd);

    const ratingsByAgent = new Map<string, number[]>();
    for (const r of ratings || []) {
      const existing = ratingsByAgent.get(r.agent_id) || [];
      existing.push(r.rating);
      ratingsByAgent.set(r.agent_id, existing);
    }

    // Group sessions by agent
    const agentSessions = new Map<string, typeof sessions>();
    for (const s of sessions) {
      const existing = agentSessions.get(s.agent_id) || [];
      existing.push(s);
      agentSessions.set(s.agent_id, existing);
    }

    // Aggregate and upsert
    let aggregatedCount = 0;

    for (const [agentId, agentSessionList] of agentSessions) {
      const uniqueStudents = new Set(agentSessionList.map(s => s.client_id));

      // Check for returning students (have prior sessions before yesterday)
      let returningCount = 0;
      for (const studentId of uniqueStudents) {
        const { count } = await supabase
          .from('ai_agent_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('agent_id', agentId)
          .eq('client_id', studentId)
          .lt('started_at', dayStart);

        if (count && count > 0) returningCount++;
      }

      const totalMessages = agentSessionList.reduce(
        (sum, s) => sum + (messageCounts.get(s.id) || 0), 0
      );

      const sessionsWithDuration = agentSessionList.filter(s => s.duration_minutes);
      const avgMinutes = sessionsWithDuration.length > 0
        ? Math.round(sessionsWithDuration.reduce((s, x) => s + x.duration_minutes, 0) / sessionsWithDuration.length * 10) / 10
        : 0;

      const agentRatings = ratingsByAgent.get(agentId) || [];
      const avgRating = agentRatings.length > 0
        ? Math.round(agentRatings.reduce((s, r) => s + r, 0) / agentRatings.length * 100) / 100
        : null;

      await supabase.from('ai_agent_analytics_daily').upsert({
        agent_id: agentId,
        date: dateStr,
        sessions_count: agentSessionList.length,
        unique_students: uniqueStudents.size,
        returning_students: returningCount,
        total_messages: totalMessages,
        avg_session_minutes: avgMinutes,
        escalation_count: agentSessionList.filter(s => s.escalated_to_human).length,
        completion_count: agentSessionList.filter(s => s.status === 'completed').length,
        total_revenue_pence: Math.round(agentSessionList.reduce((s, x) => s + (x.cost_pounds || 0), 0) * 100),
        ai_cost_pence: 0, // TODO: integrate with AI cost tracking
        avg_rating: avgRating,
        ratings_count: agentRatings.length,
      }, { onConflict: 'agent_id,date' });

      aggregatedCount++;
    }

    return NextResponse.json({ message: 'Analytics aggregated', date: dateStr, agents: aggregatedCount });
  } catch (error) {
    console.error('[Agent Analytics Daily] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
