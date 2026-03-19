/**
 * PATCH /api/sage/lesson-plans/:id/executions/:executionId
 *
 * Update execution state. Supports mid-drive editing — tutor can pause,
 * edit remaining phases, and resume. Sage can also call this autonomously
 * to adapt the plan based on student performance.
 *
 * @module api/sage/lesson-plans/[id]/executions/[executionId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; executionId: string }> }
) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { executionId } = await params;
    const body = await request.json().catch(() => ({}));

    const {
      current_phase_index,
      status,
      remaining_phases,
      mastery_delta,
      phases_completed,
      phases_struggled,
    } = body as {
      current_phase_index?: number;
      status?: string;
      remaining_phases?: unknown[];
      mastery_delta?: number;
      phases_completed?: number;
      phases_struggled?: number;
    };

    // Fetch execution to verify ownership
    const { data: execution } = await supabase
      .from('sage_lesson_plan_executions')
      .select('id, student_id, phases, current_phase_index')
      .eq('id', executionId)
      .single();

    if (!execution) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }

    // Ownership: student or tutor who loaded the plan
    const { data: plan } = await supabase
      .from('sage_lesson_plans')
      .select('created_by')
      .eq('id', (await params).id)
      .single();

    const canUpdate = execution.student_id === user.id || plan?.created_by === user.id;
    if (!canUpdate) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // updated_at is managed by the DB trigger (migration 421 — no manual set needed)
    const updates: Record<string, unknown> = {};

    if (current_phase_index !== undefined) {
      updates.current_phase_index = current_phase_index;
    }
    if (status !== undefined) {
      updates.status = status;
    }
    if (mastery_delta !== undefined) {
      updates.mastery_delta = mastery_delta;
    }
    if (phases_completed !== undefined) {
      updates.phases_completed = phases_completed;
    }
    if (phases_struggled !== undefined) {
      updates.phases_struggled = phases_struggled;
    }

    // Replace phases from current_phase_index onward if remaining_phases provided
    if (Array.isArray(remaining_phases) && current_phase_index !== undefined) {
      const existingPhases = (execution.phases as unknown[]) ?? [];
      const priorPhases = existingPhases.slice(0, current_phase_index);
      updates.phases = [...priorPhases, ...remaining_phases];
    }

    const { error } = await supabase
      .from('sage_lesson_plan_executions')
      .update(updates)
      .eq('id', executionId);

    if (error) throw error;

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('[Sage Lesson Plan Executions PATCH] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
