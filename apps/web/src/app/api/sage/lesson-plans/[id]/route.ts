/**
 * PATCH /api/sage/lesson-plans/:id — update a lesson plan
 *
 * @module api/sage/lesson-plans/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    // Verify ownership
    const { data: plan } = await supabase
      .from('sage_lesson_plans')
      .select('created_by')
      .eq('id', id)
      .single();

    if (!plan || plan.created_by !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) updates.title = String(body.title);
    if (body.phases !== undefined) updates.phases = body.phases;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.status !== undefined) updates.status = body.status;
    if (body.isTemplate !== undefined) updates.is_template = Boolean(body.isTemplate);
    if (body.difficulty !== undefined) updates.difficulty = String(body.difficulty);
    if (body.targetDuration !== undefined) updates.target_duration = Number(body.targetDuration);

    const { error } = await supabase
      .from('sage_lesson_plans')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('[Sage Lesson Plans PATCH] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { data: plan } = await supabase
      .from('sage_lesson_plans')
      .select('created_by')
      .eq('id', id)
      .single();

    if (!plan || plan.created_by !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Soft-delete: set status to archived
    await supabase
      .from('sage_lesson_plans')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', id);

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('[Sage Lesson Plans DELETE] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
