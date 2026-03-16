/**
 * AI Agent Admin Analytics API
 *
 * GET /api/admin/ai-agents/analytics?type=sessions|revenue|quality
 *
 * Provides admin-level analytics for AI Tutor Studio dashboard.
 * Adapted from Sage analytics route pattern.
 *
 * @module api/admin/ai-agents/analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

type SupabaseClient = ReturnType<typeof createServerClient>;

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, admin_role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile || !profile.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'sessions';

    switch (type) {
      case 'sessions':
        return await getSessionStats(supabase);
      case 'revenue':
        return await getRevenueStats(supabase);
      case 'quality':
        return await getQualityStats(supabase);
      default:
        return NextResponse.json({ error: 'Invalid analytics type' }, { status: 400 });
    }
  } catch (error) {
    console.error('[AI Agent Admin Analytics] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Session analytics — DAU/WAU/MAU, session trends, subject/status breakdown, peak hours
 */
async function getSessionStats(supabase: SupabaseClient) {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // DAU/WAU/MAU from sessions
  const [dailyRes, weeklyRes, monthlyRes] = await Promise.all([
    supabase.from('ai_agent_sessions').select('client_id').gte('started_at', dayAgo),
    supabase.from('ai_agent_sessions').select('client_id').gte('started_at', weekAgo),
    supabase.from('ai_agent_sessions').select('client_id').gte('started_at', monthAgo),
  ]);

  const dau = new Set((dailyRes.data || []).map((s: { client_id: string }) => s.client_id)).size;
  const wau = new Set((weeklyRes.data || []).map((s: { client_id: string }) => s.client_id)).size;
  const mau = new Set((monthlyRes.data || []).map((s: { client_id: string }) => s.client_id)).size;

  // All sessions in last 30 days
  const { data: recentSessions } = await supabase
    .from('ai_agent_sessions')
    .select('started_at, status, duration_minutes, agent_id, escalated_to_human')
    .gte('started_at', monthAgo)
    .order('started_at', { ascending: true });

  const sessions = recentSessions || [];

  // Daily session counts for trend chart
  const dailyCounts: Record<string, number> = {};
  const hourCounts: number[] = new Array(24).fill(0);
  const dayOfWeekCounts: number[] = new Array(7).fill(0);
  const statusCounts: Record<string, number> = {};
  let totalDuration = 0;
  let sessionsWithDuration = 0;
  let escalatedCount = 0;

  sessions.forEach((s: { started_at: string; status: string; duration_minutes: number; escalated_to_human: boolean }) => {
    const date = new Date(s.started_at);
    const dayKey = date.toISOString().split('T')[0];
    dailyCounts[dayKey] = (dailyCounts[dayKey] || 0) + 1;

    hourCounts[date.getUTCHours()]++;
    dayOfWeekCounts[date.getUTCDay()]++;

    const status = s.status || 'unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    if (s.duration_minutes) {
      totalDuration += s.duration_minutes;
      sessionsWithDuration++;
    }

    if (s.escalated_to_human) escalatedCount++;
  });

  const avgDurationMinutes = sessionsWithDuration > 0 ? totalDuration / sessionsWithDuration : 0;

  // Build daily trend array
  const dailyTrend: { label: string; value: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split('T')[0];
    dailyTrend.push({
      label: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      value: dailyCounts[key] || 0,
    });
  }

  // Peak hours/days
  const peakHours = hourCounts.map((count, hour) => ({ hour, count }));
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const peakDays = dayOfWeekCounts.map((count, day) => ({ day: dayNames[day], count }));

  // Status breakdown
  const statusBreakdown = Object.entries(statusCounts)
    .map(([status, count]) => ({ label: status, value: count }))
    .sort((a, b) => b.value - a.value);

  // Top agents by session count
  const agentSessionCounts: Record<string, number> = {};
  sessions.forEach((s: { agent_id: string }) => {
    agentSessionCounts[s.agent_id] = (agentSessionCounts[s.agent_id] || 0) + 1;
  });
  const topAgentIds = Object.entries(agentSessionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([id]) => id);

  // Fetch agent names for top agents
  let topAgents: { id: string; name: string; sessions: number }[] = [];
  if (topAgentIds.length > 0) {
    const { data: agentData } = await supabase
      .from('ai_agents')
      .select('id, display_name')
      .in('id', topAgentIds);

    topAgents = topAgentIds.map(id => {
      const agent = (agentData || []).find((a: { id: string }) => a.id === id);
      return {
        id,
        name: agent ? (agent as { display_name: string }).display_name : id.slice(0, 8),
        sessions: agentSessionCounts[id],
      };
    });
  }

  return NextResponse.json({
    activeUsers: { dau, wau, mau },
    avgDurationMinutes,
    totalSessionsLast30d: sessions.length,
    escalatedCount,
    escalationRate: sessions.length > 0 ? Math.round((escalatedCount / sessions.length) * 100) : 0,
    dailyTrend,
    peakHours,
    peakDays,
    statusBreakdown,
    topAgents,
  });
}

/**
 * Revenue analytics — subscriptions, bundle purchases, earnings breakdown
 */
async function getRevenueStats(supabase: SupabaseClient) {
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Subscription stats
  const { data: allSubs } = await supabase
    .from('ai_agent_subscriptions')
    .select('status, price_per_month, created_at, canceled_at, current_period_start, current_period_end');

  const subs = allSubs || [];
  const activeSubs = subs.filter((s: { status: string }) => s.status === 'active');
  const canceledSubs = subs.filter((s: { status: string }) => s.status === 'canceled');
  const pastDueSubs = subs.filter((s: { status: string }) => s.status === 'past_due');

  // MRR = sum of active subscription prices
  const mrr = activeSubs.reduce((sum: number, s: { price_per_month: number }) => sum + (s.price_per_month || 10), 0);

  // Subscription status breakdown
  const subStatusCounts: Record<string, number> = {};
  subs.forEach((s: { status: string }) => {
    subStatusCounts[s.status] = (subStatusCounts[s.status] || 0) + 1;
  });
  const subscriptionStatusBreakdown = Object.entries(subStatusCounts)
    .map(([status, count]) => ({ label: status, value: count }))
    .sort((a, b) => b.value - a.value);

  // Session revenue (from ai_agent_sessions — platform fee + owner earnings)
  const { data: recentSessionRevenue } = await supabase
    .from('ai_agent_sessions')
    .select('price_paid, platform_fee, owner_earnings, started_at')
    .gte('started_at', monthAgo);

  const revenueSessions = recentSessionRevenue || [];
  const totalSessionRevenue = revenueSessions.reduce(
    (sum: number, s: { price_paid: number }) => sum + (s.price_paid || 0), 0
  );
  const totalPlatformFees = revenueSessions.reduce(
    (sum: number, s: { platform_fee: number }) => sum + (s.platform_fee || 0), 0
  );
  const totalOwnerEarnings = revenueSessions.reduce(
    (sum: number, s: { owner_earnings: number }) => sum + (s.owner_earnings || 0), 0
  );

  // Bundle purchases
  const { data: bundles, count: totalBundlePurchases } = await supabase
    .from('ai_agent_bundle_purchases')
    .select('*', { count: 'exact' });

  const recentBundles = (bundles || []).filter(
    (b: { created_at: string }) => new Date(b.created_at) >= new Date(monthAgo)
  );

  // Revenue trend from daily analytics
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const { data: dailyAnalytics } = await supabase
    .from('ai_agent_analytics_daily')
    .select('date, total_revenue_pence, ai_cost_pence, sessions_count')
    .gte('date', thirtyDaysAgo)
    .order('date', { ascending: true });

  // Aggregate daily revenue into trend
  const dailyRevenue: Record<string, { revenue: number; cost: number; sessions: number }> = {};
  (dailyAnalytics || []).forEach((d: { date: string; total_revenue_pence: number; ai_cost_pence: number; sessions_count: number }) => {
    if (!dailyRevenue[d.date]) {
      dailyRevenue[d.date] = { revenue: 0, cost: 0, sessions: 0 };
    }
    dailyRevenue[d.date].revenue += d.total_revenue_pence || 0;
    dailyRevenue[d.date].cost += d.ai_cost_pence || 0;
    dailyRevenue[d.date].sessions += d.sessions_count || 0;
  });

  const revenueTrend: { label: string; value: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split('T')[0];
    revenueTrend.push({
      label: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      value: (dailyRevenue[key]?.revenue || 0) / 100, // pence → pounds
    });
  }

  // Top earning agents
  const agentRevenue: Record<string, number> = {};
  (dailyAnalytics || []).forEach((d: { date: string; total_revenue_pence: number }) => {
    // We need agent_id — re-query with agent_id
  });

  const { data: agentDailyRevenue } = await supabase
    .from('ai_agent_analytics_daily')
    .select('agent_id, total_revenue_pence')
    .gte('date', thirtyDaysAgo);

  (agentDailyRevenue || []).forEach((d: { agent_id: string; total_revenue_pence: number }) => {
    agentRevenue[d.agent_id] = (agentRevenue[d.agent_id] || 0) + (d.total_revenue_pence || 0);
  });

  const topEarnerIds = Object.entries(agentRevenue)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([id]) => id);

  let topEarners: { id: string; name: string; revenue: number }[] = [];
  if (topEarnerIds.length > 0) {
    const { data: agentData } = await supabase
      .from('ai_agents')
      .select('id, display_name')
      .in('id', topEarnerIds);

    topEarners = topEarnerIds.map(id => {
      const agent = (agentData || []).find((a: { id: string }) => a.id === id);
      return {
        id,
        name: agent ? (agent as { display_name: string }).display_name : id.slice(0, 8),
        revenue: (agentRevenue[id] || 0) / 100,
      };
    });
  }

  return NextResponse.json({
    subscriptions: {
      total: subs.length,
      active: activeSubs.length,
      canceled: canceledSubs.length,
      pastDue: pastDueSubs.length,
    },
    mrr,
    totalSessionRevenue30d: totalSessionRevenue,
    platformFees30d: totalPlatformFees,
    ownerEarnings30d: totalOwnerEarnings,
    avgRevenuePerSession: revenueSessions.length > 0 ? totalSessionRevenue / revenueSessions.length : 0,
    bundlePurchases: {
      total: totalBundlePurchases || 0,
      last30d: recentBundles.length,
    },
    subscriptionStatusBreakdown,
    revenueTrend,
    topEarners,
  });
}

/**
 * Quality & ratings analytics — rating distribution, top/bottom agents, feedback
 */
async function getQualityStats(supabase: SupabaseClient) {
  // All ratings
  const { data: allRatings, count: totalRatings } = await supabase
    .from('ai_agent_ratings')
    .select('agent_id, rating, feedback, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(5000);

  const ratings = allRatings || [];

  // Rating distribution (1-5)
  const distribution = [0, 0, 0, 0, 0];
  ratings.forEach((r: { rating: number }) => {
    if (r.rating >= 1 && r.rating <= 5) {
      distribution[r.rating - 1]++;
    }
  });

  // Average rating
  const avgRating = ratings.length > 0
    ? ratings.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / ratings.length
    : 0;

  // Ratings below 3
  const lowRatings = ratings.filter((r: { rating: number }) => r.rating < 3).length;
  const lowRatingPercent = ratings.length > 0 ? Math.round((lowRatings / ratings.length) * 100) : 0;

  // Per-agent ratings
  const agentRatingMap: Record<string, { total: number; count: number; feedbacks: string[] }> = {};
  ratings.forEach((r: { agent_id: string; rating: number; feedback: string | null }) => {
    if (!agentRatingMap[r.agent_id]) {
      agentRatingMap[r.agent_id] = { total: 0, count: 0, feedbacks: [] };
    }
    agentRatingMap[r.agent_id].total += r.rating;
    agentRatingMap[r.agent_id].count++;
    if (r.feedback) agentRatingMap[r.agent_id].feedbacks.push(r.feedback);
  });

  // Sort agents by average rating
  const agentRatings = Object.entries(agentRatingMap)
    .map(([id, data]) => ({
      id,
      avgRating: data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : 0,
      ratingCount: data.count,
      feedbackCount: data.feedbacks.length,
    }))
    .filter(a => a.ratingCount >= 2); // Only agents with 2+ ratings

  const topRated = [...agentRatings].sort((a, b) => b.avgRating - a.avgRating).slice(0, 10);
  const bottomRated = [...agentRatings].sort((a, b) => a.avgRating - b.avgRating).slice(0, 10);

  // Fetch agent names for top/bottom
  const allAgentIds = [...new Set([
    ...topRated.map(a => a.id),
    ...bottomRated.map(a => a.id),
  ])];

  let agentNames: Record<string, string> = {};
  if (allAgentIds.length > 0) {
    const { data: agentData } = await supabase
      .from('ai_agents')
      .select('id, display_name')
      .in('id', allAgentIds);

    (agentData || []).forEach((a: { id: string; display_name: string }) => {
      agentNames[a.id] = a.display_name;
    });
  }

  const enrichAgent = (a: { id: string; avgRating: number; ratingCount: number; feedbackCount: number }) => ({
    ...a,
    name: agentNames[a.id] || a.id.slice(0, 8),
  });

  // Rating trend — last 30 days
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentRatings = ratings.filter(
    (r: { created_at: string }) => new Date(r.created_at) >= monthAgo
  );
  const dailyRatingCounts: Record<string, number> = {};
  recentRatings.forEach((r: { created_at: string }) => {
    const key = new Date(r.created_at).toISOString().split('T')[0];
    dailyRatingCounts[key] = (dailyRatingCounts[key] || 0) + 1;
  });

  const ratingTrend: { label: string; value: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split('T')[0];
    ratingTrend.push({
      label: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      value: dailyRatingCounts[key] || 0,
    });
  }

  // Recent feedback (last 20 with text)
  const recentFeedback = ratings
    .filter((r: { feedback: string | null }) => r.feedback)
    .slice(0, 20)
    .map((r: { agent_id: string; rating: number; feedback: string; created_at: string }) => ({
      agentId: r.agent_id,
      agentName: agentNames[r.agent_id] || r.agent_id.slice(0, 8),
      rating: r.rating,
      feedback: r.feedback,
      createdAt: r.created_at,
    }));

  // Session completion stats (quality proxy)
  const { data: sessionStats } = await supabase
    .from('ai_agent_sessions')
    .select('status')
    .limit(10000);

  const sessionStatusCounts: Record<string, number> = {};
  (sessionStats || []).forEach((s: { status: string }) => {
    sessionStatusCounts[s.status] = (sessionStatusCounts[s.status] || 0) + 1;
  });

  const totalSessions = Object.values(sessionStatusCounts).reduce((sum: number, c) => sum + c, 0);
  const completedSessions = sessionStatusCounts['completed'] || 0;
  const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

  return NextResponse.json({
    totalRatings: totalRatings || 0,
    avgRating: Math.round(avgRating * 10) / 10,
    lowRatingPercent,
    completionRate,
    distribution,
    ratingTrend,
    topRated: topRated.map(enrichAgent),
    bottomRated: bottomRated.map(enrichAgent),
    recentFeedback,
  });
}
