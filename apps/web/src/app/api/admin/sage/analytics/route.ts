/**
 * Sage Admin Analytics API
 *
 * GET /api/admin/sage/analytics?type=summary|quota|subjects
 *
 * Provides analytics data for Sage AI Tutor admin dashboard:
 * - Summary: Overall usage stats
 * - Quota: Free/Pro tier usage and cost analysis
 * - Subjects: Subject breakdown
 *
 * @module api/admin/sage/analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/sage/analytics
 */
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
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, admin_role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.is_admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
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
      default:
        return NextResponse.json(
          { error: 'Invalid analytics type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Sage Admin Analytics] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get summary statistics
 */
async function getSummaryStats(supabase: ReturnType<typeof createServerClient>) {
  // Get total sessions
  const { count: totalSessions } = await supabase
    .from('sage_sessions')
    .select('*', { count: 'exact', head: true });

  // Get total questions (messages with role='user')
  const { count: totalQuestions } = await supabase
    .from('sage_messages')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'user');

  // Get unique users
  const { data: uniqueUsersData } = await supabase
    .from('sage_sessions')
    .select('user_id');

  const uniqueUsers = new Set(uniqueUsersData?.map((s: { user_id: string }) => s.user_id) || []).size;

  // Calculate avg questions per session
  const avgQuestionsPerSession = totalSessions ? (totalQuestions || 0) / totalSessions : 0;

  // Get subject breakdown
  const { data: messagesData } = await supabase
    .from('sage_messages')
    .select('metadata')
    .eq('role', 'assistant')
    .not('metadata', 'is', null);

  const subjectCounts: Record<string, number> = {};
  messagesData?.forEach((msg: { metadata: unknown }) => {
    const subject = (msg.metadata as { subject?: string })?.subject;
    if (subject) {
      subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
    }
  });

  const topSubjects = Object.entries(subjectCounts)
    .map(([subject, count]) => ({ subject, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Get level breakdown
  const levelCounts: Record<string, number> = {};
  messagesData?.forEach((msg: { metadata: unknown }) => {
    const level = (msg.metadata as { level?: string })?.level;
    if (level) {
      levelCounts[level] = (levelCounts[level] || 0) + 1;
    }
  });

  const topLevels = Object.entries(levelCounts)
    .map(([level, count]) => ({ level, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Count free vs pro users (for now, all are free until subscriptions are implemented)
  const freeUsers = uniqueUsers;
  const proUsers = 0;

  return NextResponse.json({
    totalSessions: totalSessions || 0,
    totalQuestions: totalQuestions || 0,
    uniqueUsers,
    avgQuestionsPerSession,
    freeUsers,
    proUsers,
    topSubjects,
    topLevels,
  });
}

/**
 * Get quota and cost statistics
 */
async function getQuotaStats(supabase: ReturnType<typeof createServerClient>) {
  // For now, mock data since subscriptions aren't implemented yet
  // In the future, this will query actual subscription and usage data

  // Get today's usage for free tier
  const today = new Date().toISOString().split('T')[0];
  const { data: todayMessages } = await supabase
    .from('sage_messages')
    .select('user_id')
    .eq('role', 'user')
    .gte('timestamp', `${today}T00:00:00Z`)
    .lte('timestamp', `${today}T23:59:59Z`);

  const dailyUsage = todayMessages?.length || 0;

  // Get unique users (all free tier for now)
  const { data: uniqueUsersData } = await supabase
    .from('sage_sessions')
    .select('user_id');

  const totalUsers = new Set(uniqueUsersData?.map((s: { user_id: string }) => s.user_id) || []).size;

  // Calculate avg questions per user (free tier)
  const { count: totalQuestions } = await supabase
    .from('sage_messages')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'user');

  const avgQuestionsPerUser = totalUsers ? (totalQuestions || 0) / totalUsers : 0;

  // Mock limit hits (users who hit the 10/day limit)
  const limitHits = 0; // Will be calculated from Redis rate limiter in production

  // Cost analysis (based on Gemini Flash 2.0 pricing)
  const costPerQuestion = 0.0003; // £0.0003 per question
  const totalCost = (totalQuestions || 0) * costPerQuestion;
  const marginFree = -totalCost; // Loss on free tier
  const marginPro = 0; // No pro users yet

  return NextResponse.json({
    freeTier: {
      totalUsers,
      dailyUsage,
      limitHits,
      avgQuestionsPerUser,
    },
    proTier: {
      totalSubscriptions: 0,
      monthlyUsage: 0,
      avgQuestionsPerUser: 0,
      revenue: 0, // In pence
    },
    costAnalysis: {
      totalCost,
      costPerQuestion,
      marginFree,
      marginPro,
    },
  });
}

/**
 * Get subject breakdown statistics
 */
async function getSubjectStats(supabase: ReturnType<typeof createServerClient>) {
  const { data: messagesData } = await supabase
    .from('sage_messages')
    .select('metadata')
    .eq('role', 'assistant')
    .not('metadata', 'is', null);

  const subjectCounts: Record<string, number> = {
    maths: 0,
    english: 0,
    science: 0,
    general: 0,
  };

  messagesData?.forEach((msg: { metadata: unknown }) => {
    const subject = (msg.metadata as { subject?: string })?.subject;
    if (subject && subject in subjectCounts) {
      subjectCounts[subject]++;
    }
  });

  return NextResponse.json(subjectCounts);
}
