/**
 * POST /api/admin/workflow/execute/start
 * Start a new workflow execution from a process record.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { workflowRuntime } from '@/lib/workflow/runtime/PlatformWorkflowRuntime';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { processId, context = {} } = body as {
      processId: string;
      context?: Record<string, unknown>;
    };

    if (!processId) {
      return NextResponse.json({ error: 'processId is required' }, { status: 400 });
    }

    const executionId = await workflowRuntime.start(processId, {
      ...context,
      _startedBy: user.id,
    });

    const { status, currentNodeId } = await workflowRuntime.getStatus(executionId);

    return NextResponse.json({ executionId, status, currentNodeId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[execute/start]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
