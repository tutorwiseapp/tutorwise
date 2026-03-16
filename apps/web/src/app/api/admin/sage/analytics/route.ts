/**
 * Sage Admin Analytics API
 *
 * GET /api/admin/sage/analytics?type=summary|quota|subjects|usage|coverage|safety|outcomes|sen
 *
 * Provides analytics data for Sage AI Tutor admin dashboard.
 *
 * @module api/admin/sage/analytics
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
    const type = searchParams.get('type') || 'summary';

    switch (type) {
      case 'summary':
        return await getSummaryStats(supabase);
      case 'quota':
        return await getQuotaStats(supabase);
      case 'subjects':
        return await getSubjectStats(supabase);
      case 'usage':
        return await getUsageStats(supabase);
      case 'coverage':
        return await getCoverageStats(supabase);
      case 'safety':
        return await getSafetyStats(supabase);
      case 'outcomes':
        return await getOutcomesStats(supabase);
      case 'sen':
        return await getSENStats(supabase);
      default:
        return NextResponse.json({ error: 'Invalid analytics type' }, { status: 400 });
    }
  } catch (error) {
    console.error('[Sage Admin Analytics] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Get summary statistics
 */
async function getSummaryStats(supabase: SupabaseClient) {
  const { count: totalSessions } = await supabase
    .from('sage_sessions')
    .select('*', { count: 'exact', head: true });

  const { count: totalQuestions } = await supabase
    .from('sage_messages')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'user');

  const { data: uniqueUsersData } = await supabase
    .from('sage_sessions')
    .select('user_id');

  const uniqueUsers = new Set(uniqueUsersData?.map((s: { user_id: string }) => s.user_id) || []).size;
  const avgQuestionsPerSession = totalSessions ? (totalQuestions || 0) / totalSessions : 0;

  const { data: messagesData } = await supabase
    .from('sage_messages')
    .select('metadata')
    .eq('role', 'assistant')
    .not('metadata', 'is', null);

  const subjectCounts: Record<string, number> = {};
  const levelCounts: Record<string, number> = {};
  messagesData?.forEach((msg: { metadata: unknown }) => {
    const meta = msg.metadata as { subject?: string; level?: string };
    if (meta?.subject) subjectCounts[meta.subject] = (subjectCounts[meta.subject] || 0) + 1;
    if (meta?.level) levelCounts[meta.level] = (levelCounts[meta.level] || 0) + 1;
  });

  const topSubjects = Object.entries(subjectCounts)
    .map(([subject, count]) => ({ subject, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topLevels = Object.entries(levelCounts)
    .map(([level, count]) => ({ level, count }))
    .sort((a, b) => b.count - a.count);

  // Safeguarding events count
  const { count: unreviewedSafetyEvents } = await supabase
    .from('sage_safeguarding_events')
    .select('*', { count: 'exact', head: true });

  const { count: proSubscriptions } = await supabase
    .from('sage_pro_subscriptions')
    .select('*', { count: 'exact', head: true })
    .in('status', ['active', 'trialing']);

  return NextResponse.json({
    totalSessions: totalSessions || 0,
    totalQuestions: totalQuestions || 0,
    uniqueUsers,
    avgQuestionsPerSession,
    freeUsers: uniqueUsers,
    proUsers: proSubscriptions || 0,
    topSubjects,
    topLevels,
    unreviewedSafetyEvents: unreviewedSafetyEvents || 0,
  });
}

/**
 * Get quota and cost statistics — provider-aware
 */
async function getQuotaStats(supabase: SupabaseClient) {
  const today = new Date().toISOString().split('T')[0];
  const { data: todayMessages } = await supabase
    .from('sage_messages')
    .select('user_id')
    .eq('role', 'user')
    .gte('timestamp', `${today}T00:00:00Z`)
    .lte('timestamp', `${today}T23:59:59Z`);

  const dailyUsage = todayMessages?.length || 0;

  const { data: uniqueUsersData } = await supabase
    .from('sage_sessions')
    .select('user_id');

  const totalUsers = new Set(uniqueUsersData?.map((s: { user_id: string }) => s.user_id) || []).size;

  const { count: totalQuestions } = await supabase
    .from('sage_messages')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'user');

  const avgQuestionsPerUser = totalUsers ? (totalQuestions || 0) / totalUsers : 0;

  // Real cost data from sage_usage_log
  const { data: usageLogs } = await supabase
    .from('sage_usage_log')
    .select('model_used, estimated_cost_usd, tokens_used, questions_count');

  const providerCosts: Record<string, { cost: number; questions: number; tokens: number }> = {};
  let totalCost = 0;
  let totalTokens = 0;

  (usageLogs || []).forEach((log: { model_used: string; estimated_cost_usd: number; tokens_used: number; questions_count: number }) => {
    const provider = log.model_used || 'unknown';
    if (!providerCosts[provider]) {
      providerCosts[provider] = { cost: 0, questions: 0, tokens: 0 };
    }
    providerCosts[provider].cost += log.estimated_cost_usd || 0;
    providerCosts[provider].questions += log.questions_count || 0;
    providerCosts[provider].tokens += log.tokens_used || 0;
    totalCost += log.estimated_cost_usd || 0;
    totalTokens += log.tokens_used || 0;
  });

  const providerBreakdown = Object.entries(providerCosts)
    .map(([provider, data]) => ({
      provider,
      cost: data.cost,
      questions: data.questions,
      tokens: data.tokens,
      percentage: totalCost > 0 ? Math.round((data.cost / totalCost) * 100) : 0,
    }))
    .sort((a, b) => b.cost - a.cost);

  // Fallback: if no usage logs, estimate from question count
  const effectiveTotalCost = totalCost > 0 ? totalCost : (totalQuestions || 0) * 0.0003;
  const costPerQuestion = (totalQuestions || 0) > 0 ? effectiveTotalCost / (totalQuestions || 1) : 0;

  // Pro tier stats
  const { data: proSubs } = await supabase
    .from('sage_pro_subscriptions')
    .select('questions_used_this_month, questions_quota')
    .in('status', ['active', 'trialing']);

  const proSubscriptions = proSubs || [];
  const proMonthlyUsage = proSubscriptions.reduce((sum: number, s: { questions_used_this_month: number }) => sum + (s.questions_used_this_month || 0), 0);
  const proAvgQuestions = proSubscriptions.length > 0
    ? proMonthlyUsage / proSubscriptions.length
    : 0;

  return NextResponse.json({
    freeTier: {
      totalUsers,
      dailyUsage,
      limitHits: 0,
      avgQuestionsPerUser,
    },
    proTier: {
      totalSubscriptions: proSubscriptions.length,
      monthlyUsage: proMonthlyUsage,
      avgQuestionsPerUser: proAvgQuestions,
      revenue: proSubscriptions.length * 999, // £9.99/month in pence
    },
    costAnalysis: {
      totalCost: effectiveTotalCost,
      costPerQuestion,
      totalTokens,
      marginFree: -effectiveTotalCost,
      marginPro: proSubscriptions.length * 9.99 - effectiveTotalCost,
      providerBreakdown,
    },
  });
}

/**
 * Get subject breakdown — expanded to all 10 SageSubject values
 */
async function getSubjectStats(supabase: SupabaseClient) {
  const ALL_SUBJECTS = [
    'maths', 'english', 'science', 'computing', 'humanities',
    'languages', 'social-sciences', 'business', 'arts', 'general',
  ];

  // Get subject counts from sessions (more reliable than messages metadata)
  const { data: sessionData } = await supabase
    .from('sage_sessions')
    .select('subject, level, message_count');

  const subjectCounts: Record<string, number> = {};
  const subjectByLevel: Record<string, Record<string, number>> = {};

  ALL_SUBJECTS.forEach(s => { subjectCounts[s] = 0; });

  (sessionData || []).forEach((s: { subject: string; level: string; message_count: number }) => {
    const subject = s.subject || 'general';
    subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;

    const level = s.level || 'Other';
    if (!subjectByLevel[subject]) subjectByLevel[subject] = {};
    subjectByLevel[subject][level] = (subjectByLevel[subject][level] || 0) + 1;
  });

  return NextResponse.json({
    subjects: subjectCounts,
    subjectByLevel,
  });
}

/**
 * Usage analytics — DAU/WAU/MAU, peak hours, provider breakdown, level breakdown
 */
async function getUsageStats(supabase: SupabaseClient) {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // DAU/WAU/MAU from sessions
  const [dailyRes, weeklyRes, monthlyRes] = await Promise.all([
    supabase.from('sage_sessions').select('user_id').gte('started_at', dayAgo),
    supabase.from('sage_sessions').select('user_id').gte('started_at', weekAgo),
    supabase.from('sage_sessions').select('user_id').gte('started_at', monthAgo),
  ]);

  const dau = new Set((dailyRes.data || []).map((s: { user_id: string }) => s.user_id)).size;
  const wau = new Set((weeklyRes.data || []).map((s: { user_id: string }) => s.user_id)).size;
  const mau = new Set((monthlyRes.data || []).map((s: { user_id: string }) => s.user_id)).size;

  // Sessions per day for last 30 days
  const { data: recentSessions } = await supabase
    .from('sage_sessions')
    .select('started_at, message_count, subject, level, provider')
    .gte('started_at', monthAgo)
    .order('started_at', { ascending: true });

  const sessions = recentSessions || [];

  // Daily session counts for trend chart
  const dailyCounts: Record<string, number> = {};
  const hourCounts: number[] = new Array(24).fill(0);
  const dayOfWeekCounts: number[] = new Array(7).fill(0);
  const providerCounts: Record<string, number> = {};
  const levelCounts: Record<string, number> = {};
  let totalMessages = 0;

  sessions.forEach((s: { started_at: string; message_count: number; subject: string; level: string; provider: string }) => {
    const date = new Date(s.started_at);
    const dayKey = date.toISOString().split('T')[0];
    dailyCounts[dayKey] = (dailyCounts[dayKey] || 0) + 1;

    hourCounts[date.getUTCHours()]++;
    dayOfWeekCounts[date.getUTCDay()]++;

    const provider = s.provider || 'unknown';
    providerCounts[provider] = (providerCounts[provider] || 0) + 1;

    const level = s.level || 'Other';
    levelCounts[level] = (levelCounts[level] || 0) + 1;

    totalMessages += s.message_count || 0;
  });

  const avgQuestionsPerSession = sessions.length > 0 ? totalMessages / sessions.length : 0;

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

  // Peak hours heatmap data (hour × day-of-week)
  const peakHours = hourCounts.map((count, hour) => ({ hour, count }));
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const peakDays = dayOfWeekCounts.map((count, day) => ({ day: dayNames[day], count }));

  // Provider breakdown
  const providerBreakdown = Object.entries(providerCounts)
    .map(([provider, count]) => ({
      label: provider,
      value: count,
    }))
    .sort((a, b) => b.value - a.value);

  // Level breakdown
  const levelBreakdown = Object.entries(levelCounts)
    .map(([level, count]) => ({
      label: level,
      value: count,
    }))
    .sort((a, b) => b.value - a.value);

  return NextResponse.json({
    activeUsers: { dau, wau, mau },
    avgQuestionsPerSession,
    totalSessionsLast30d: sessions.length,
    dailyTrend,
    peakHours,
    peakDays,
    providerBreakdown,
    levelBreakdown,
  });
}

/**
 * Curriculum coverage statistics
 */
async function getCoverageStats(supabase: SupabaseClient) {
  // Get all curriculum topics with their subject/level
  const { data: topics } = await supabase
    .from('sage_curriculum_topics')
    .select('id, subject, level, topic_name, topic_slug')
    .limit(1000);

  // Get all sessions with topics_covered
  const { data: sessions } = await supabase
    .from('sage_sessions')
    .select('topics_covered, subject, level');

  const allTopics = topics || [];
  const allSessions = sessions || [];

  // Build coverage matrix: level × subject → { total, used }
  const matrix: Record<string, Record<string, { total: number; used: Set<string> }>> = {};
  const topicSessionCounts: Record<string, number> = {};

  allTopics.forEach((t: { id: string; subject: string; level: string }) => {
    const level = t.level || 'other';
    const subject = t.subject || 'general';
    if (!matrix[level]) matrix[level] = {};
    if (!matrix[level][subject]) matrix[level][subject] = { total: 0, used: new Set() };
    matrix[level][subject].total++;
    topicSessionCounts[t.id] = 0;
  });

  // Count topic usage from sessions
  allSessions.forEach((s: { topics_covered: string[]; subject: string; level: string }) => {
    const covered = s.topics_covered || [];
    covered.forEach((topicSlug: string) => {
      // Find matching topic
      const topic = allTopics.find((t: { topic_slug: string }) => t.topic_slug === topicSlug);
      if (topic) {
        const level = (topic as { level: string }).level || 'other';
        const subject = (topic as { subject: string }).subject || 'general';
        if (matrix[level]?.[subject]) {
          matrix[level][subject].used.add((topic as { id: string }).id);
        }
        topicSessionCounts[(topic as { id: string }).id] = (topicSessionCounts[(topic as { id: string }).id] || 0) + 1;
      }
    });
  });

  // Serialize matrix (convert Sets to counts)
  const coverageMatrix: Record<string, Record<string, { total: number; used: number; percentage: number }>> = {};
  for (const [level, subjects] of Object.entries(matrix)) {
    coverageMatrix[level] = {};
    for (const [subject, data] of Object.entries(subjects)) {
      coverageMatrix[level][subject] = {
        total: data.total,
        used: data.used.size,
        percentage: data.total > 0 ? Math.round((data.used.size / data.total) * 100) : 0,
      };
    }
  }

  // Unused topics (zero sessions)
  const unusedTopics = allTopics
    .filter((t: { id: string }) => topicSessionCounts[t.id] === 0)
    .map((t: { topic_name: string; subject: string; level: string }) => ({
      name: t.topic_name,
      subject: t.subject,
      level: t.level,
    }));

  // Most popular topics
  const popularTopics = Object.entries(topicSessionCounts)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([id, count]) => {
      const topic = allTopics.find((t: { id: string }) => t.id === id);
      return {
        name: topic ? (topic as { topic_name: string }).topic_name : id,
        subject: topic ? (topic as { subject: string }).subject : '',
        level: topic ? (topic as { level: string }).level : '',
        sessions: count,
      };
    });

  // Exam board coverage
  const { data: boards } = await supabase
    .from('sage_curriculum_boards')
    .select('exam_board, topic_id')
    .limit(5000);

  const boardCounts: Record<string, number> = {};
  (boards || []).forEach((b: { exam_board: string }) => {
    boardCounts[b.exam_board] = (boardCounts[b.exam_board] || 0) + 1;
  });

  const examBoardCoverage = Object.entries(boardCounts)
    .map(([board, topicCount]) => ({ board, topicCount }))
    .sort((a, b) => b.topicCount - a.topicCount);

  return NextResponse.json({
    totalTopics: allTopics.length,
    usedTopics: allTopics.length - unusedTopics.length,
    coveragePercentage: allTopics.length > 0
      ? Math.round(((allTopics.length - unusedTopics.length) / allTopics.length) * 100)
      : 0,
    coverageMatrix,
    unusedTopics: unusedTopics.slice(0, 50),
    unusedCount: unusedTopics.length,
    popularTopics,
    examBoardCoverage,
  });
}

/**
 * Safety/safeguarding statistics
 */
async function getSafetyStats(supabase: SupabaseClient) {
  // Get all safeguarding events
  const { data: events, count: totalEvents } = await supabase
    .from('sage_safeguarding_events')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(100);

  const allEvents = events || [];

  // Breakdown by severity
  const severityCounts: Record<string, number> = { low: 0, medium: 0, high: 0 };
  const categoryCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};

  // Daily trend for last 30 days
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dailyCounts: Record<string, number> = {};

  allEvents.forEach((e: { severity: string; category: string; event_type: string; created_at: string }) => {
    severityCounts[e.severity] = (severityCounts[e.severity] || 0) + 1;
    categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
    typeCounts[e.event_type] = (typeCounts[e.event_type] || 0) + 1;

    const date = new Date(e.created_at);
    if (date >= monthAgo) {
      const dayKey = date.toISOString().split('T')[0];
      dailyCounts[dayKey] = (dailyCounts[dayKey] || 0) + 1;
    }
  });

  // Build daily trend
  const dailyTrend: { label: string; value: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split('T')[0];
    dailyTrend.push({
      label: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      value: dailyCounts[key] || 0,
    });
  }

  // Recent events (last 20)
  const recentEvents = allEvents.slice(0, 20).map((e: {
    id: string; event_type: string; severity: string; category: string;
    created_at: string; session_id: string; details: Record<string, unknown>;
  }) => ({
    id: e.id,
    eventType: e.event_type,
    severity: e.severity,
    category: e.category,
    createdAt: e.created_at,
    sessionId: e.session_id,
    details: e.details,
  }));

  return NextResponse.json({
    totalEvents: totalEvents || 0,
    severityCounts,
    categoryCounts,
    typeCounts,
    dailyTrend,
    recentEvents,
  });
}

/**
 * Student learning outcomes statistics
 */
async function getOutcomesStats(supabase: SupabaseClient) {
  const [profilesRes, assessmentsRes, xpRes, badgesRes, digestsRes] = await Promise.all([
    supabase.from('sage_student_profiles').select('mastery_map, misconceptions, total_study_minutes, current_streak_days'),
    supabase.from('sage_assessments').select('subject, score, max_score, assessment_type, status').eq('status', 'completed'),
    supabase.from('sage_student_xp').select('total_xp, level, xp_this_week'),
    supabase.from('sage_student_badges').select('badge_id'),
    supabase.from('sage_weekly_digests').select('sessions_count, total_minutes, misconceptions_resolved')
      .order('week_start', { ascending: false }).limit(100),
  ]);

  const profiles = profilesRes.data || [];
  const assessments = assessmentsRes.data || [];
  const xpData = xpRes.data || [];
  const earnedBadges = badgesRes.data || [];
  const digests = digestsRes.data || [];

  // Mastery stats
  let totalMastery = 0;
  let masteryCount = 0;
  const subjectMastery: Record<string, { total: number; count: number }> = {};

  profiles.forEach((p: { mastery_map: Record<string, { score: number; subject?: string }> }) => {
    const map = p.mastery_map || {};
    for (const [, entry] of Object.entries(map)) {
      totalMastery += entry.score || 0;
      masteryCount++;
      const subject = entry.subject || 'general';
      if (!subjectMastery[subject]) subjectMastery[subject] = { total: 0, count: 0 };
      subjectMastery[subject].total += entry.score || 0;
      subjectMastery[subject].count++;
    }
  });

  // Misconception frequency
  const misconceptionCounts: Record<string, number> = {};
  profiles.forEach((p: { misconceptions: Array<{ topic?: string; description?: string }> }) => {
    const misconceptions = p.misconceptions || [];
    misconceptions.forEach((m) => {
      const key = m.topic || m.description || 'unknown';
      misconceptionCounts[key] = (misconceptionCounts[key] || 0) + 1;
    });
  });

  const topMisconceptions = Object.entries(misconceptionCounts)
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // Assessment stats by subject
  const assessmentBySubject: Record<string, { total: number; avgScore: number; count: number }> = {};
  assessments.forEach((a: { subject: string; score: number; max_score: number }) => {
    if (!assessmentBySubject[a.subject]) {
      assessmentBySubject[a.subject] = { total: 0, avgScore: 0, count: 0 };
    }
    assessmentBySubject[a.subject].total += a.score;
    assessmentBySubject[a.subject].count++;
  });
  for (const subject of Object.keys(assessmentBySubject)) {
    const s = assessmentBySubject[subject];
    s.avgScore = s.count > 0 ? Math.round(s.total / s.count) : 0;
  }

  // XP & gamification
  const totalXP = xpData.reduce((sum: number, x: { total_xp: number }) => sum + (x.total_xp || 0), 0);
  const avgXP = xpData.length > 0 ? Math.round(totalXP / xpData.length) : 0;
  const weeklyXP = xpData.reduce((sum: number, x: { xp_this_week: number }) => sum + (x.xp_this_week || 0), 0);
  const totalBadgesEarned = earnedBadges.length;

  // Streak stats
  const totalStudyMinutes = profiles.reduce((sum: number, p: { total_study_minutes: number }) => sum + (p.total_study_minutes || 0), 0);
  const avgStreak = profiles.length > 0
    ? Math.round(profiles.reduce((sum: number, p: { current_streak_days: number }) => sum + (p.current_streak_days || 0), 0) / profiles.length)
    : 0;

  // Misconceptions resolved from digests
  const totalMisconceptionsResolved = digests.reduce(
    (sum: number, d: { misconceptions_resolved: number }) => sum + (d.misconceptions_resolved || 0), 0
  );

  return NextResponse.json({
    mastery: {
      averageMastery: masteryCount > 0 ? Math.round(totalMastery / masteryCount) : 0,
      totalStudents: profiles.length,
      subjectMastery: Object.entries(subjectMastery).map(([subject, data]) => ({
        subject,
        avgMastery: data.count > 0 ? Math.round(data.total / data.count) : 0,
        studentCount: data.count,
      })),
    },
    assessments: {
      totalCompleted: assessments.length,
      bySubject: assessmentBySubject,
    },
    misconceptions: {
      top: topMisconceptions,
      totalResolved: totalMisconceptionsResolved,
    },
    gamification: {
      totalXP,
      avgXP,
      weeklyXP,
      totalBadgesEarned,
      activeStudentsWithXP: xpData.length,
    },
    engagement: {
      totalStudyMinutes,
      avgStreak,
      avgStudyMinutes: profiles.length > 0 ? Math.round(totalStudyMinutes / profiles.length) : 0,
    },
  });
}

/**
 * SEN/SEND aggregate statistics (privacy-preserving — no individual data)
 */
async function getSENStats(supabase: SupabaseClient) {
  // SEN categories are stored in sage_student_profiles or passed in session metadata
  // Query sessions with SEN-related metadata
  const { data: sessions } = await supabase
    .from('sage_sessions')
    .select('metadata, user_id, message_count')
    .not('metadata', 'is', null);

  const senCategories: Record<string, number> = {};
  const senUsers = new Set<string>();
  let senSessions = 0;
  let senMessages = 0;

  (sessions || []).forEach((s: { metadata: Record<string, unknown>; user_id: string; message_count: number }) => {
    const meta = s.metadata || {};
    const categories = meta.senCategories as string[] | undefined;
    if (categories && categories.length > 0) {
      senSessions++;
      senMessages += s.message_count || 0;
      senUsers.add(s.user_id);
      categories.forEach((cat: string) => {
        senCategories[cat] = (senCategories[cat] || 0) + 1;
      });
    }
  });

  // Get total sessions for comparison
  const { count: totalSessions } = await supabase
    .from('sage_sessions')
    .select('*', { count: 'exact', head: true });

  const categoryBreakdown = Object.entries(senCategories)
    .map(([category, sessionCount]) => ({ category, sessionCount }))
    .sort((a, b) => b.sessionCount - a.sessionCount);

  return NextResponse.json({
    totalSENUsers: senUsers.size,
    totalSENSessions: senSessions,
    totalSENMessages: senMessages,
    percentageOfSessions: (totalSessions || 0) > 0
      ? Math.round((senSessions / (totalSessions || 1)) * 100)
      : 0,
    categoryBreakdown,
    avgMessagesPerSENSession: senSessions > 0 ? Math.round(senMessages / senSessions) : 0,
  });
}
