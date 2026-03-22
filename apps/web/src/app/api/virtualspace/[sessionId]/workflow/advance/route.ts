/**
 * POST /api/virtualspace/[sessionId]/workflow/advance
 *
 * Advances to the next phase. If already on the last phase, returns 409.
 *
 * Body: { exitTrigger?: 'auto' | 'tutor' | 'sage' | 'time' }
 * Response: { state: WorkflowState } | { done: true } (last phase)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { VirtualSpaceWorkflowRuntime, WorkflowRuntimeError } from '@/lib/virtualspace/VirtualSpaceWorkflowRuntime';
import type { PhaseExitTrigger } from '@/lib/virtualspace/VirtualSpaceWorkflowRuntime';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { exitTrigger = 'tutor' } = body as { exitTrigger?: PhaseExitTrigger };

  try {
    const runtime = await VirtualSpaceWorkflowRuntime.forSession(sessionId, user.id);
    const state = await runtime.advance(exitTrigger);
    if (state === null) {
      return NextResponse.json({ done: true }); // caller should stop the workflow
    }
    return NextResponse.json({ state });
  } catch (err) {
    if (err instanceof WorkflowRuntimeError) {
      const status = err.code === 'NOT_FOUND' ? 404 : 400;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    console.error('[workflow/advance]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
