/**
 * POST /api/virtualspace/[sessionId]/workflow/stop
 *
 * Stops the active workflow. Clears workflow_state, broadcasts workflow:stopped.
 * workflow_id is retained on the session for analytics.
 *
 * Response: { stopped: true }
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
    await runtime.stop();
    return NextResponse.json({ stopped: true });
  } catch (err) {
    if (err instanceof WorkflowRuntimeError) {
      const status = err.code === 'NOT_FOUND' ? 404 : 400;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    console.error('[workflow/stop]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
