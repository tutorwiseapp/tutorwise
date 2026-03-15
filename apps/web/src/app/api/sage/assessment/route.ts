/**
 * Sage Assessment API
 *
 * POST /api/sage/assessment - Start a new diagnostic assessment
 * GET  /api/sage/assessment - Get assessments for the current user
 *
 * @module api/sage/assessment
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface StartAssessmentBody {
  subject: string;
  assessment_type: 'pre' | 'post' | 'formative' | 'diagnostic';
  topic_slugs?: string[];
  time_limit_minutes?: number;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    let query = supabase
      .from('sage_assessments')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (subject) query = query.eq('subject', subject);
    if (type) query = query.eq('assessment_type', type);

    const { data: assessments, error } = await query;

    if (error) {
      console.error('[Sage Assessment] Fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch assessments' }, { status: 500 });
    }

    return NextResponse.json({ assessments: assessments || [] });
  } catch (error) {
    console.error('[Sage Assessment] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: StartAssessmentBody = await request.json();

    if (!body.subject || !body.assessment_type) {
      return NextResponse.json({ error: 'subject and assessment_type required' }, { status: 400 });
    }

    // Fetch topic questions from problem bank
    let questionsQuery = supabase
      .from('sage_problem_bank')
      .select('id, subject, topic, difficulty, question_text, correct_answer, mark_scheme, options')
      .eq('subject', body.subject);

    if (body.topic_slugs?.length) {
      questionsQuery = questionsQuery.in('topic', body.topic_slugs);
    }

    const { data: allQuestions } = await questionsQuery;

    if (!allQuestions || allQuestions.length === 0) {
      return NextResponse.json({ error: 'No questions available for this subject' }, { status: 404 });
    }

    // Select questions: mix of difficulties, max 10
    const shuffled = allQuestions.sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffled.slice(0, Math.min(10, shuffled.length));

    // Create assessment
    const { data: assessment, error: insertError } = await supabase
      .from('sage_assessments')
      .insert({
        student_id: user.id,
        subject: body.subject,
        assessment_type: body.assessment_type,
        questions: selectedQuestions.map(q => ({
          id: q.id,
          topic: q.topic,
          difficulty: q.difficulty,
          question_text: q.question_text,
          options: q.options,
        })),
        max_score: selectedQuestions.length,
        time_limit_minutes: body.time_limit_minutes || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Sage Assessment] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create assessment' }, { status: 500 });
    }

    return NextResponse.json({ assessment }, { status: 201 });
  } catch (error) {
    console.error('[Sage Assessment] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
