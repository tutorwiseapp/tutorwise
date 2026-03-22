/**
 * POST /api/virtualspace/[sessionId]/workflow/start
 *
 * Starts a Learn Your Way workflow on a session.
 * Sets workflow_id + workflow_state, broadcasts workflow:started on Ably.
 *
 * Body: { workflowId: string }
 * Response: { state: WorkflowState }
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

  const body = await request.json().catch(() => ({}));
  const { workflowId } = body as { workflowId?: string };

  if (!workflowId) {
    return NextResponse.json({ error: 'workflowId is required' }, { status: 400 });
  }

  try {
    const runtime = await VirtualSpaceWorkflowRuntime.forSession(sessionId, user.id);
    const state = await runtime.start(workflowId);
    return NextResponse.json({ state });
  } catch (err) {
    if (err instanceof WorkflowRuntimeError) {
      const status = err.code === 'NOT_FOUND' ? 404 : 400;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    console.error('[workflow/start]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
