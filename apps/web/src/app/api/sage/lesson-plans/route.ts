/**
 * GET  /api/sage/lesson-plans  — list plans for current user
 * POST /api/sage/lesson-plans  — save a new plan
 *
 * @module api/sage/lesson-plans
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: plans, error } = await supabase
      .from('sage_lesson_plans')
      .select('id, title, subject, level, topic, exam_board, target_duration, difficulty, is_template, status, tags, created_at, updated_at, created_by, created_for')
      .or(`created_by.eq.${user.id},created_for.eq.${user.id}`)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ plans: plans ?? [] });

  } catch (error) {
    console.error('[Sage Lesson Plans GET] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { plan, createdFor } = body as {
      plan?: Record<string, unknown>;
      createdFor?: string;
    };

    if (!plan?.title || !Array.isArray(plan.phases)) {
      return NextResponse.json({ error: 'Missing plan data' }, { status: 400 });
    }

    const { data: saved, error } = await supabase
      .from('sage_lesson_plans')
      .insert({
        title:           String(plan.title),
        subject:         String(plan.subject ?? 'general'),
        level:           String(plan.level ?? 'GCSE'),
        topic:           String(plan.topic ?? ''),
        exam_board:      plan.examBoard ? String(plan.examBoard) : null,
        target_duration: Number(plan.targetDuration ?? 45),
        difficulty:      String(plan.difficulty ?? 'grade-5-6'),
        created_by:      user.id,
        created_for:     createdFor ?? null,
        phases:          plan.phases,
        tags:            Array.isArray(plan.tags) ? plan.tags : [],
        is_template:     Boolean(plan.isTemplate),
        status:          'active', // allowed by migration 421 CHECK update
      })
      .select('id')
      .single();

    if (error) throw error;

    return NextResponse.json({ id: saved.id }, { status: 201 });

  } catch (error) {
    console.error('[Sage Lesson Plans POST] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
