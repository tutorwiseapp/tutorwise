/**
 * VirtualSpace Analytics API (v1.0)
 *
 * GET /api/virtualspace/analytics
 * Returns session metrics for the tutor dashboard.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(_request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Sessions owned by this tutor
  const { data: sessions } = await supabase
    .from('virtualspace_sessions')
    .select('id, title, status, session_type, created_at, ended_at, last_activity_at, session_report')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  // Homework set by this tutor (last 30 days)
  const { data: homework } = await supabase
    .from('virtualspace_homework')
    .select('id, completed_at, due_date, created_at')
    .eq('tutor_id', user.id)
    .gte('created_at', thirtyDaysAgo);

  const allSessions = sessions || [];
  const allHomework = homework || [];

  // Compute metrics
  const totalSessions = allSessions.length;
  const activeSessions = allSessions.filter((s) => s.status === 'active').length;
  const completedSessions = allSessions.filter((s) => s.status === 'completed').length;

  const sessionsThisMonth = allSessions.filter((s) => new Date(s.created_at) >= new Date(thirtyDaysAgo)).length;
  const sessionsThisWeek = allSessions.filter((s) => new Date(s.created_at) >= new Date(sevenDaysAgo)).length;

  // Average duration (completed sessions only)
  const durationsMs = allSessions
    .filter((s) => s.status === 'completed' && s.ended_at)
    .map((s) => new Date(s.ended_at!).getTime() - new Date(s.created_at).getTime())
    .filter((d) => d > 0 && d < 8 * 60 * 60 * 1000); // ignore > 8h (anomaly)

  const avgDurationMins = durationsMs.length
    ? Math.round(durationsMs.reduce((a, b) => a + b, 0) / durationsMs.length / 60000)
    : null;

  // Topics frequency (from session_report.topicsCovered)
  const topicFreq: Record<string, number> = {};
  allSessions
    .filter((s) => s.session_report?.topicsCovered)
    .forEach((s) => {
      (s.session_report.topicsCovered as string[]).forEach((t) => {
        topicFreq[t] = (topicFreq[t] || 0) + 1;
      });
    });
  const topTopics = Object.entries(topicFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([topic, count]) => ({ topic, count }));

  // Homework stats
  const totalHomework = allHomework.length;
  const completedHomework = allHomework.filter((h) => h.completed_at).length;
  const homeworkCompletionRate = totalHomework > 0
    ? Math.round((completedHomework / totalHomework) * 100)
    : null;

  // Sessions per week (last 8 weeks)
  const weeksData: { week: string; count: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const count = allSessions.filter(
      (s) => new Date(s.created_at) >= weekStart && new Date(s.created_at) < weekEnd
    ).length;
    weeksData.push({
      week: weekStart.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
      count,
    });
  }

  return NextResponse.json({
    summary: {
      totalSessions,
      activeSessions,
      completedSessions,
      sessionsThisMonth,
      sessionsThisWeek,
      avgDurationMins,
      totalHomework,
      completedHomework,
      homeworkCompletionRate,
    },
    topTopics,
    sessionsPerWeek: weeksData,
    recentSessions: allSessions.slice(0, 10).map((s) => ({
      id: s.id,
      title: s.title,
      status: s.status,
      type: s.session_type,
      createdAt: s.created_at,
      hasReport: !!s.session_report,
    })),
  });
}
