/**
 * Sage Progress API
 *
 * GET /api/sage/progress - Get learning progress data
 *
 * @module api/sage/progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

interface ProgressStats {
  totalSessions: number;
  totalMessages: number;
  topicsCovered: string[];
  subjectsStudied: string[];
  averageSessionLength: number;
  streakDays: number;
  lastActivityAt: string | null;
  weeklyActivity: {
    day: string;
    sessions: number;
    messages: number;
  }[];
  subjectBreakdown: {
    subject: string;
    sessions: number;
    percentage: number;
  }[];
}

/**
 * GET /api/sage/progress
 * Get learning progress statistics for the current user
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
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId') || user.id;
    const period = searchParams.get('period') || '30days';

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    switch (period) {
      case '7days':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(now.getDate() - 90);
        break;
      case 'all':
        startDate = new Date(0);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Get sessions for the period
    const { data: sessions, error: sessionsError } = await supabase
      .from('sage_sessions')
      .select('*')
      .eq('user_id', studentId)
      .gte('started_at', startDate.toISOString())
      .order('started_at', { ascending: false });

    if (sessionsError) {
      console.error('[Sage Progress] Sessions error:', sessionsError);
    }

    // Calculate statistics
    const sessionList = sessions || [];
    const totalSessions = sessionList.length;
    const totalMessages = sessionList.reduce((sum, s) => sum + (s.message_count || 0), 0);

    // Collect unique topics and subjects
    const topicsSet = new Set<string>();
    const subjectsCount: Record<string, number> = {};

    sessionList.forEach(session => {
      if (session.subject) {
        subjectsCount[session.subject] = (subjectsCount[session.subject] || 0) + 1;
      }
      if (session.topics_covered) {
        session.topics_covered.forEach((topic: string) => topicsSet.add(topic));
      }
    });

    const topicsCovered = Array.from(topicsSet);
    const subjectsStudied = Object.keys(subjectsCount);

    // Calculate average session length (in minutes, estimated by message count)
    const averageSessionLength = totalSessions > 0
      ? Math.round((totalMessages / totalSessions) * 2)
      : 0;

    // Calculate streak
    const streakDays = calculateStreak(sessionList);

    // Get last activity
    const lastActivityAt = sessionList.length > 0
      ? sessionList[0].last_activity_at
      : null;

    // Calculate weekly activity
    const weeklyActivity = calculateWeeklyActivity(sessionList);

    // Calculate subject breakdown
    const subjectBreakdown = Object.entries(subjectsCount).map(([subject, count]) => ({
      subject,
      sessions: count,
      percentage: totalSessions > 0 ? Math.round((count / totalSessions) * 100) : 0,
    })).sort((a, b) => b.sessions - a.sessions);

    const progress: ProgressStats = {
      totalSessions,
      totalMessages,
      topicsCovered,
      subjectsStudied,
      averageSessionLength,
      streakDays,
      lastActivityAt,
      weeklyActivity,
      subjectBreakdown,
    };

    return NextResponse.json({ progress });
  } catch (error) {
    console.error('[Sage Progress] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * Calculate learning streak in days
 */
function calculateStreak(sessions: Array<{ started_at: string }>): number {
  if (sessions.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get unique dates with sessions
  const sessionDates = new Set(
    sessions.map(s => {
      const date = new Date(s.started_at);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    })
  );

  let streak = 0;
  let currentDate = today.getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  // Check if user has a session today or yesterday (allow for timezone differences)
  if (!sessionDates.has(currentDate) && !sessionDates.has(currentDate - oneDay)) {
    return 0;
  }

  // Count consecutive days
  while (sessionDates.has(currentDate) || sessionDates.has(currentDate - oneDay)) {
    if (sessionDates.has(currentDate)) {
      streak++;
    }
    currentDate -= oneDay;
  }

  return streak;
}

/**
 * Calculate weekly activity breakdown
 */
function calculateWeeklyActivity(
  sessions: Array<{ started_at: string; message_count?: number }>
): { day: string; sessions: number; messages: number }[] {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const activity: Record<number, { sessions: number; messages: number }> = {};

  // Initialize all days
  for (let i = 0; i < 7; i++) {
    activity[i] = { sessions: 0, messages: 0 };
  }

  // Get sessions from last 7 days
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  sessions
    .filter(s => new Date(s.started_at) >= oneWeekAgo)
    .forEach(session => {
      const day = new Date(session.started_at).getDay();
      activity[day].sessions++;
      activity[day].messages += session.message_count || 0;
    });

  return days.map((day, index) => ({
    day,
    sessions: activity[index].sessions,
    messages: activity[index].messages,
  }));
}
