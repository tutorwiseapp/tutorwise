/**
 * Sage Weekly Digest Cron
 *
 * POST /api/cron/sage-weekly-digest - Generate weekly learning digests
 *
 * Runs Sundays 18:00 UTC via pg_cron. For each active student,
 * generates a digest from the past week's sessions and sends
 * via platform_notifications.
 *
 * @module api/cron/sage-weekly-digest
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Auth: cron secret
    const cronSecret = request.headers.get('x-cron-secret');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServiceRoleClient();

    // Date range: last 7 days
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setHours(0, 0, 0, 0);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 7);

    // Find active students (those with sessions in the last 7 days)
    const { data: recentSessions } = await supabase
      .from('sage_sessions')
      .select('user_id, subject, message_count, topics_covered, started_at')
      .gte('started_at', weekStart.toISOString())
      .lte('started_at', weekEnd.toISOString());

    if (!recentSessions || recentSessions.length === 0) {
      return NextResponse.json({ message: 'No active students this week', digests: 0 });
    }

    // Group by student
    const studentSessions = new Map<string, typeof recentSessions>();
    for (const s of recentSessions) {
      const existing = studentSessions.get(s.user_id) || [];
      existing.push(s);
      studentSessions.set(s.user_id, existing);
    }

    let digestCount = 0;

    for (const [studentId, sessions] of studentSessions) {
      // Fetch student profile for mastery data
      const { data: profile } = await supabase
        .from('sage_student_profiles')
        .select('mastery_map, current_streak_days, misconceptions')
        .eq('user_id', studentId)
        .single();

      const topics = new Set<string>();
      let totalMessages = 0;
      const subjects = new Set<string>();

      for (const s of sessions) {
        totalMessages += s.message_count || 0;
        if (s.subject) subjects.add(s.subject);
        if (s.topics_covered) {
          for (const t of s.topics_covered) topics.add(t);
        }
      }

      const estimatedMinutes = totalMessages * 2; // rough estimate

      // Count misconceptions resolved this week
      const misconceptions = (profile?.misconceptions || []) as Array<{ resolved: boolean; resolved_at?: string }>;
      const resolvedThisWeek = misconceptions.filter(
        m => m.resolved && m.resolved_at && new Date(m.resolved_at) >= weekStart
      ).length;

      // Build digest text
      const digestParts: string[] = [];
      digestParts.push(`This week you had ${sessions.length} study session${sessions.length > 1 ? 's' : ''}.`);
      if (topics.size > 0) {
        digestParts.push(`Topics covered: ${[...topics].join(', ')}.`);
      }
      if (profile && profile.current_streak_days > 1) {
        digestParts.push(`Study streak: ${profile!.current_streak_days} days — keep it up!`);
      }
      if (resolvedThisWeek > 0) {
        digestParts.push(`You cleared up ${resolvedThisWeek} misconception${resolvedThisWeek > 1 ? 's' : ''} this week.`);
      }

      const digestText = digestParts.join(' ');

      // Upsert digest
      await supabase.from('sage_weekly_digests').upsert({
        student_id: studentId,
        week_start: weekStart.toISOString().split('T')[0],
        week_end: weekEnd.toISOString().split('T')[0],
        sessions_count: sessions.length,
        total_minutes: estimatedMinutes,
        topics_practised: [...topics],
        mastery_changes: {},
        misconceptions_resolved: resolvedThisWeek,
        streak_days: profile?.current_streak_days || 0,
        digest_text: digestText,
        sent_at: now.toISOString(),
      }, { onConflict: 'student_id,week_start' });

      // Send notification
      await supabase.from('platform_notifications').insert({
        user_id: studentId,
        type: 'weekly_digest',
        title: 'Your Weekly Learning Digest',
        message: digestText,
        metadata: {
          week_start: weekStart.toISOString().split('T')[0],
          sessions_count: sessions.length,
          topics: [...topics],
        },
      });

      digestCount++;
    }

    return NextResponse.json({ message: 'Digests generated', digests: digestCount });
  } catch (error) {
    console.error('[Sage Weekly Digest] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
