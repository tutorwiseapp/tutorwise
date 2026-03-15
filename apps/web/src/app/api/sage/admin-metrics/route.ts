/**
 * Sage Admin Metrics API
 *
 * GET /api/sage/admin-metrics - Platform-wide learning analytics
 *
 * Admin-only endpoint for aggregate student metrics:
 * total students, average mastery, subject breakdown, cost per student.
 *
 * @module api/sage/admin-metrics
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

    // Admin check
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Aggregate queries in parallel
    const [
      { count: totalStudents },
      { data: studentProfiles },
      { data: recentSessions },
      { data: assessments },
    ] = await Promise.all([
      supabase.from('sage_student_profiles').select('id', { count: 'exact', head: true }),
      supabase.from('sage_student_profiles').select('mastery_map, total_study_minutes, current_streak_days'),
      supabase.from('sage_sessions').select('subject, message_count, started_at')
        .gte('started_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('sage_assessments').select('subject, score, max_score, assessment_type')
        .eq('status', 'completed'),
    ]);

    // Calculate aggregate mastery
    const profiles = studentProfiles || [];
    let totalMastery = 0;
    let masteryCount = 0;
    const subjectMastery: Record<string, { total: number; count: number }> = {};

    for (const p of profiles) {
      const map = p.mastery_map as Record<string, { score: number }> || {};
      for (const [, entry] of Object.entries(map)) {
        totalMastery += entry.score;
        masteryCount++;
      }
    }

    // Subject breakdown from sessions
    const subjectSessions: Record<string, number> = {};
    for (const s of recentSessions || []) {
      if (s.subject) {
        subjectSessions[s.subject] = (subjectSessions[s.subject] || 0) + 1;
      }
    }

    const totalSessions = (recentSessions || []).length;

    // Assessment stats
    const assessmentList = assessments || [];
    const avgAssessmentScore = assessmentList.length > 0
      ? Math.round(
          assessmentList.reduce((sum, a) => sum + (a.score! / a.max_score!) * 100, 0) / assessmentList.length
        )
      : 0;

    const metrics = {
      total_students: totalStudents || 0,
      average_mastery: masteryCount > 0 ? Math.round(totalMastery / masteryCount) : 0,
      total_study_minutes: profiles.reduce((sum, p) => sum + (p.total_study_minutes || 0), 0),
      average_streak: profiles.length > 0
        ? Math.round(profiles.reduce((sum, p) => sum + (p.current_streak_days || 0), 0) / profiles.length)
        : 0,
      sessions_last_30d: totalSessions,
      subject_breakdown: Object.entries(subjectSessions)
        .map(([subject, count]) => ({
          subject,
          sessions: count,
          percentage: totalSessions > 0 ? Math.round((count / totalSessions) * 100) : 0,
        }))
        .sort((a, b) => b.sessions - a.sessions),
      assessments: {
        total_completed: assessmentList.length,
        average_score_percent: avgAssessmentScore,
      },
    };

    return NextResponse.json({ metrics });
  } catch (error) {
    console.error('[Sage Admin Metrics] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
