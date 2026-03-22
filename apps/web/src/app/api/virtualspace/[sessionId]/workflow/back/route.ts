/**
 * POST /api/virtualspace/[sessionId]/workflow/back
 *
 * Returns to the previous phase. If already on phase 0, returns 409.
 *
 * Response: { state: WorkflowState } | { atStart: true }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { VirtualSpaceWorkflowRuntime, WorkflowRuntimeError } from '@/lib/virtualspace/VirtualSpaceWorkflowRuntime';

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

  try {
    const runtime = await VirtualSpaceWorkflowRuntime.forSession(sessionId, user.id);
    const state = await runtime.back();
    if (state === null) {
      return NextResponse.json({ atStart: true });
    }
    return NextResponse.json({ state });
  } catch (err) {
    if (err instanceof WorkflowRuntimeError) {
      const status = err.code === 'NOT_FOUND' ? 404 : 400;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    console.error('[workflow/back]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
