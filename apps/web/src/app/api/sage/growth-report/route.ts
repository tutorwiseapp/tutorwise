/**
 * Sage Growth Report API
 *
 * GET /api/sage/growth-report - Generate "Your Growth" report
 *
 * Compares pre vs post assessment scores, mastery changes over time,
 * study time trend. For student self-review and school report export.
 *
 * @module api/sage/growth-report
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { StudentModelService } from '@sage/services/student-model';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId') || user.id;
    const subject = searchParams.get('subject');

    // If viewing another student, check consent
    if (studentId !== user.id) {
      const { data: sp } = await supabase
        .from('sage_student_profiles')
        .select('allow_analytics_sharing')
        .eq('user_id', studentId)
        .single();

      if (!sp?.allow_analytics_sharing) {
        return NextResponse.json({ error: 'Student has not enabled analytics sharing' }, { status: 403 });
      }
    }

    // Fetch data in parallel
    const studentModelService = new StudentModelService(supabase);

    let assessmentsQuery = supabase
      .from('sage_assessments')
      .select('*')
      .eq('student_id', studentId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: true });

    if (subject) assessmentsQuery = assessmentsQuery.eq('subject', subject);

    let digestsQuery = supabase
      .from('sage_weekly_digests')
      .select('week_start, sessions_count, total_minutes, mastery_changes, streak_days')
      .eq('student_id', studentId)
      .order('week_start', { ascending: true })
      .limit(12);

    const [profile, { data: assessments }, { data: digests }] = await Promise.all([
      studentModelService.getOrCreateProfile(studentId),
      assessmentsQuery,
      digestsQuery,
    ]);

    // Pre vs Post comparison
    const preAssessments = (assessments || []).filter(a => a.assessment_type === 'pre');
    const postAssessments = (assessments || []).filter(a => a.assessment_type === 'post');

    const prePostComparison = preAssessments.map(pre => {
      const matchingPost = postAssessments.find(
        post => post.subject === pre.subject && new Date(post.completed_at!) > new Date(pre.completed_at!)
      );
      return {
        subject: pre.subject,
        pre_score: pre.score,
        pre_max: pre.max_score,
        pre_date: pre.completed_at,
        post_score: matchingPost?.score ?? null,
        post_max: matchingPost?.max_score ?? null,
        post_date: matchingPost?.completed_at ?? null,
        improvement: matchingPost
          ? Math.round(((matchingPost.score! / matchingPost.max_score!) - (pre.score! / pre.max_score!)) * 100)
          : null,
      };
    });

    // Mastery trend from weekly digests
    const masteryTrend = (digests || []).map(d => ({
      week: d.week_start,
      sessions: d.sessions_count,
      minutes: d.total_minutes,
      streak: d.streak_days,
      mastery_changes: d.mastery_changes,
    }));

    // Current mastery summary
    const masteryEntries = Object.entries(profile.mastery_map);
    const topicMastery = masteryEntries
      .map(([topic, entry]) => ({
        topic,
        score: entry.score,
        attempts: entry.attempts,
        last_practised: entry.last_practised,
      }))
      .sort((a, b) => b.score - a.score);

    // Active misconceptions
    const activeMisconceptions = profile.misconceptions
      .filter(m => !m.resolved)
      .map(m => ({ topic: m.topic, description: m.misconception }));

    // Topics due for review
    const reviewDue = studentModelService.getDecayedMastery(profile);

    const report = {
      student_id: studentId,
      generated_at: new Date().toISOString(),
      summary: {
        total_study_minutes: profile.total_study_minutes,
        current_streak: profile.current_streak_days,
        longest_streak: profile.longest_streak_days,
        topics_studied: masteryEntries.length,
        average_mastery: masteryEntries.length > 0
          ? Math.round(masteryEntries.reduce((sum, [, e]) => sum + e.score, 0) / masteryEntries.length)
          : 0,
        assessments_completed: (assessments || []).length,
      },
      pre_post_comparison: prePostComparison,
      mastery_trend: masteryTrend,
      current_mastery: topicMastery,
      misconceptions: activeMisconceptions,
      review_due: reviewDue.map(t => ({
        topic: t.topic,
        current_mastery: t.mastery,
        decayed_to: t.decayed_mastery,
        days_since_practice: t.days_since_practice,
      })),
    };

    return NextResponse.json({ report });
  } catch (error) {
    console.error('[Sage Growth Report] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
