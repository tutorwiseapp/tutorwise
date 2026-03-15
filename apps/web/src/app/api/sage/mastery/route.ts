/**
 * Sage Mastery Heatmap API
 *
 * GET /api/sage/mastery - Get mastery data for heatmap visualisation
 *
 * Returns topic mastery scores from sage_student_profiles mapped to
 * sage_curriculum_topics for visual grid rendering.
 *
 * @module api/sage/mastery
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { StudentModelService } from '@sage/services/student-model';

interface MasteryHeatmapItem {
  topic_slug: string;
  topic_name: string;
  subject: string;
  level: string;
  mastery_score: number;
  decayed_score: number;
  attempts: number;
  last_practised: string | null;
  status: 'mastered' | 'progressing' | 'struggling' | 'untouched';
  sort_order: number;
}

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
    const level = searchParams.get('level') || 'gcse_foundation';

    // If viewing another student, check consent
    if (studentId !== user.id) {
      const { data: studentProfile } = await supabase
        .from('sage_student_profiles')
        .select('allow_analytics_sharing')
        .eq('user_id', studentId)
        .single();

      if (!studentProfile?.allow_analytics_sharing) {
        return NextResponse.json({ error: 'Student has not enabled analytics sharing' }, { status: 403 });
      }
    }

    // Fetch curriculum topics
    let topicsQuery = supabase
      .from('sage_curriculum_topics')
      .select('topic_slug, topic_name, subject, level, sort_order')
      .eq('level', level)
      .order('sort_order');

    if (subject) {
      topicsQuery = topicsQuery.eq('subject', subject);
    }

    const [{ data: topics }, studentProfile] = await Promise.all([
      topicsQuery,
      new StudentModelService(supabase).getOrCreateProfile(studentId),
    ]);

    if (!topics) {
      return NextResponse.json({ heatmap: [] });
    }

    // Calculate decayed mastery
    const decayedTopics = new StudentModelService(supabase).getDecayedMastery(studentProfile);
    const decayMap = new Map(decayedTopics.map(t => [t.topic, t.decayed_mastery]));

    // Map curriculum topics to mastery data
    const heatmap: MasteryHeatmapItem[] = topics.map(topic => {
      const mastery = studentProfile.mastery_map[topic.topic_slug];
      const score = mastery?.score ?? 0;
      const decayed = decayMap.get(topic.topic_slug) ?? score;

      let status: MasteryHeatmapItem['status'] = 'untouched';
      if (mastery) {
        if (score >= 80) status = 'mastered';
        else if (score >= 50) status = 'progressing';
        else status = 'struggling';
      }

      return {
        topic_slug: topic.topic_slug,
        topic_name: topic.topic_name,
        subject: topic.subject,
        level: topic.level,
        mastery_score: score,
        decayed_score: decayed,
        attempts: mastery?.attempts ?? 0,
        last_practised: mastery?.last_practised ?? null,
        status,
        sort_order: topic.sort_order,
      };
    });

    // Summary stats
    const summary = {
      total_topics: heatmap.length,
      mastered: heatmap.filter(t => t.status === 'mastered').length,
      progressing: heatmap.filter(t => t.status === 'progressing').length,
      struggling: heatmap.filter(t => t.status === 'struggling').length,
      untouched: heatmap.filter(t => t.status === 'untouched').length,
      average_mastery: heatmap.length > 0
        ? Math.round(heatmap.reduce((sum, t) => sum + t.mastery_score, 0) / heatmap.length)
        : 0,
      streak_days: studentProfile.current_streak_days,
      total_study_minutes: studentProfile.total_study_minutes,
    };

    return NextResponse.json({ heatmap, summary });
  } catch (error) {
    console.error('[Sage Mastery] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
