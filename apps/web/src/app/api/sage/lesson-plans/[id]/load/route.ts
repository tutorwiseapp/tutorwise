/**
 * POST /api/sage/lesson-plans/:id/load
 *
 * Load a lesson plan into a VirtualSpace session.
 * Creates a sage_lesson_plan_executions record.
 * Returns the execution ID and full plan phases for the session drive loop.
 *
 * @module api/sage/lesson-plans/[id]/load
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(
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
    const { virtualspaceSessionId, sageSessionId, studentId } = body as {
      virtualspaceSessionId?: string;
      sageSessionId?: string;
      studentId?: string;
    };

    if (!virtualspaceSessionId || !sageSessionId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Fetch plan (must be accessible to this user)
    const { data: plan } = await supabase
      .from('sage_lesson_plans')
      .select('id, phases, created_by, created_for, status')
      .eq('id', id)
      .single();

    if (!plan || plan.status === 'archived') {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Access check: creator or student the plan was created for, or template
    const { data: planFull } = await supabase
      .from('sage_lesson_plans')
      .select('is_template')
      .eq('id', id)
      .single();

    const canAccess =
      plan.created_by === user.id ||
      plan.created_for === user.id ||
      planFull?.is_template;

    if (!canAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Create execution record
    const { data: execution, error: execError } = await supabase
      .from('sage_lesson_plan_executions')
      .insert({
        lesson_plan_id:           id,
        sage_session_id:          sageSessionId,
        virtualspace_session_id:  virtualspaceSessionId,
        student_id:               studentId ?? user.id,
        current_phase_index:      0,
        phases:                   plan.phases,
        status:                   'in_progress',
      })
      .select('id')
      .single();

    if (execError) throw execError;

    return NextResponse.json({
      executionId: execution.id,
      phases: plan.phases,
    });

  } catch (error) {
    console.error('[Sage Lesson Plans Load] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
