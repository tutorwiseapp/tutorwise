/**
 * AI Agent Creator Analytics API
 *
 * GET /api/ai-agents/analytics - Get analytics for the creator's agents
 *
 * Returns revenue, session metrics, ratings, escalation rates,
 * returning student rates, and cost/ROI analysis.
 *
 * @module api/ai-agents/analytics
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
    const agentId = searchParams.get('agentId');
    const period = searchParams.get('period') || '30';
    const periodDays = parseInt(period, 10);
    const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

    // Get creator's agents
    let agentsQuery = supabase
      .from('ai_agents')
      .select('id, display_name, subject')
      .eq('owner_id', user.id);

    if (agentId) agentsQuery = agentsQuery.eq('id', agentId);

    const { data: agents } = await agentsQuery;

    if (!agents || agents.length === 0) {
      return NextResponse.json({ analytics: { agents: [], totals: {} } });
    }

    const agentIds = agents.map(a => a.id);

    // Fetch all data in parallel
    const [
      { data: sessions },
      { data: ratings },
      { data: dailyAnalytics },
    ] = await Promise.all([
      supabase
        .from('ai_agent_sessions')
        .select('id, agent_id, client_id, status, started_at, ended_at, duration_minutes, cost_pounds, escalated_to_human')
        .in('agent_id', agentIds)
        .gte('started_at', since),
      supabase
        .from('ai_agent_ratings')
        .select('agent_id, rating, created_at')
        .in('agent_id', agentIds)
        .gte('created_at', since),
      supabase
        .from('ai_agent_analytics_daily')
        .select('*')
        .in('agent_id', agentIds)
        .gte('date', since.split('T')[0])
        .order('date', { ascending: true }),
    ]);

    const sessionList = sessions || [];
    const ratingList = ratings || [];

    // Per-agent analytics
    const agentAnalytics = agents.map(agent => {
      const agentSessions = sessionList.filter(s => s.agent_id === agent.id);
      const agentRatings = ratingList.filter(r => r.agent_id === agent.id);

      const totalSessions = agentSessions.length;
      const completedSessions = agentSessions.filter(s => s.status === 'completed').length;
      const escalatedSessions = agentSessions.filter(s => s.escalated_to_human).length;
      const uniqueStudents = new Set(agentSessions.map(s => s.client_id)).size;

      // Returning students: those with 2+ sessions
      const studentSessionCounts = new Map<string, number>();
      for (const s of agentSessions) {
        studentSessionCounts.set(s.client_id, (studentSessionCounts.get(s.client_id) || 0) + 1);
      }
      const returningStudents = [...studentSessionCounts.values()].filter(c => c >= 2).length;

      // Revenue
      const totalRevenue = agentSessions.reduce((sum, s) => sum + (s.cost_pounds || 0), 0);

      // Average session duration
      const sessionsWithDuration = agentSessions.filter(s => s.duration_minutes);
      const avgDuration = sessionsWithDuration.length > 0
        ? Math.round(sessionsWithDuration.reduce((sum, s) => sum + s.duration_minutes, 0) / sessionsWithDuration.length)
        : 0;

      // Ratings
      const avgRating = agentRatings.length > 0
        ? Math.round(agentRatings.reduce((sum, r) => sum + r.rating, 0) / agentRatings.length * 10) / 10
        : null;

      return {
        agent_id: agent.id,
        display_name: agent.display_name,
        subject: agent.subject,
        sessions: {
          total: totalSessions,
          completed: completedSessions,
          completion_rate: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
          escalated: escalatedSessions,
          escalation_rate: totalSessions > 0 ? Math.round((escalatedSessions / totalSessions) * 100) : 0,
        },
        students: {
          unique: uniqueStudents,
          returning: returningStudents,
          returning_rate: uniqueStudents > 0 ? Math.round((returningStudents / uniqueStudents) * 100) : 0,
        },
        revenue: {
          total_pounds: Math.round(totalRevenue * 100) / 100,
          avg_per_session: totalSessions > 0 ? Math.round((totalRevenue / totalSessions) * 100) / 100 : 0,
        },
        engagement: {
          avg_duration_minutes: avgDuration,
        },
        ratings: {
          average: avgRating,
          count: agentRatings.length,
        },
      };
    });

    // Totals across all agents
    const totals = {
      total_sessions: sessionList.length,
      total_revenue_pounds: Math.round(sessionList.reduce((sum, s) => sum + (s.cost_pounds || 0), 0) * 100) / 100,
      unique_students: new Set(sessionList.map(s => s.client_id)).size,
      avg_rating: ratingList.length > 0
        ? Math.round(ratingList.reduce((sum, r) => sum + r.rating, 0) / ratingList.length * 10) / 10
        : null,
      total_ratings: ratingList.length,
    };

    // Daily trend (from pre-aggregated table)
    const trend = (dailyAnalytics || []).map(d => ({
      date: d.date,
      sessions: d.sessions_count,
      revenue_pence: d.total_revenue_pence,
      students: d.unique_students,
      rating: d.avg_rating,
    }));

    return NextResponse.json({
      analytics: {
        period_days: periodDays,
        agents: agentAnalytics,
        totals,
        trend,
      },
    });
  } catch (error) {
    console.error('[AI Agent Analytics] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
