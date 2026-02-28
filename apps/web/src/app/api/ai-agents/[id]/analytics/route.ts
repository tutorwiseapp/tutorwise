/**
 * Filename: api/ai-agents/[id]/analytics/route.ts
 * Purpose: Analytics data for AI tutor dashboard
 * Created: 2026-02-23
 * Version: v1.1 (Phase 2)
 * Updated: 2026-02-24 - Added skill performance analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const { data: tutor, error: fetchError } = await supabase
      .from('ai_agents')
      .select('id, total_sessions, total_revenue, avg_rating, total_reviews')
      .eq('id', id)
      .eq('owner_id', user.id)
      .single();

    if (fetchError || !tutor) {
      return NextResponse.json({ error: 'AI tutor not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get sessions within period
    const { data: sessions } = await supabase
      .from('ai_agent_sessions')
      .select('started_at, price_paid, platform_fee, owner_earnings, rating, reviewed, fallback_to_sage_count')
      .eq('agent_id', id)
      .gte('started_at', startDate.toISOString())
      .order('started_at', { ascending: true });

    // Aggregate session data by day
    const sessionsByDay = new Map<string, { count: number; revenue: number }>();
    let totalFallbacks = 0;

    for (const session of sessions || []) {
      const day = new Date(session.started_at).toISOString().split('T')[0];
      const existing = sessionsByDay.get(day) || { count: 0, revenue: 0 };
      existing.count += 1;
      existing.revenue += Number(session.owner_earnings || 0);
      sessionsByDay.set(day, existing);
      totalFallbacks += session.fallback_to_sage_count || 0;
    }

    // Build daily arrays
    const sessionTrend: { date: string; count: number }[] = [];
    const revenueTrend: { date: string; amount: number }[] = [];

    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      const dayData = sessionsByDay.get(key) || { count: 0, revenue: 0 };
      sessionTrend.push({ date: key, count: dayData.count });
      revenueTrend.push({ date: key, amount: dayData.revenue });
    }

    // Rating distribution
    const ratingDist = [0, 0, 0, 0, 0]; // 1-5 stars
    for (const session of sessions || []) {
      if (session.reviewed && session.rating) {
        ratingDist[session.rating - 1]++;
      }
    }

    // Get skill performance analytics
    const { data: skillStats } = await supabase.rpc('get_ai_agent_skill_analytics', {
      p_agent_id: id,
      p_start_date: startDate.toISOString(),
    });

    // Get session heatmap data (last 90 days for calendar view)
    const heatmapStartDate = new Date();
    heatmapStartDate.setDate(heatmapStartDate.getDate() - 90);

    const { data: heatmapSessions } = await supabase
      .from('ai_agent_sessions')
      .select('started_at')
      .eq('agent_id', id)
      .gte('started_at', heatmapStartDate.toISOString());

    // Aggregate heatmap data by day
    const heatmapData = new Map<string, number>();
    for (const session of heatmapSessions || []) {
      const day = new Date(session.started_at).toISOString().split('T')[0];
      heatmapData.set(day, (heatmapData.get(day) || 0) + 1);
    }

    return NextResponse.json({
      summary: {
        total_sessions: tutor.total_sessions || 0,
        total_revenue: tutor.total_revenue || 0,
        avg_rating: tutor.avg_rating,
        total_reviews: tutor.total_reviews || 0,
        sage_fallback_count: totalFallbacks,
        period_sessions: (sessions || []).length,
        period_revenue: (sessions || []).reduce((sum, s) => sum + Number(s.owner_earnings || 0), 0),
      },
      sessions: sessionTrend,
      revenue: revenueTrend,
      ratings: ratingDist.map((count, i) => ({ stars: i + 1, count })),
      skillPerformance: skillStats || [],
      heatmap: Array.from(heatmapData.entries()).map(([date, count]) => ({ date, count })),
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
