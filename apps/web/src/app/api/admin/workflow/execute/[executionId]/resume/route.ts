/**
 * POST /api/admin/workflow/execute/[executionId]/resume
 * Resume a paused checkpoint (HITL approval, webhook callback, AI session end).
 * Looks up the langgraph_thread_id from the executionId and calls resume().
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { workflowRuntime } from '@/lib/workflow/runtime/PlatformWorkflowRuntime';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ executionId: string }> }
) {
  try {
    const { executionId } = await props.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { decision = 'complete', result_data = {} } = body as {
      decision?: string;
      result_data?: Record<string, unknown>;
    };

    // Resolve langgraph_thread_id from executionId
    const { data: execution } = await supabase
      .from('workflow_executions')
      .select('id, status, langgraph_thread_id')
      .eq('id', executionId)
      .single();

    if (!execution?.langgraph_thread_id) {
      return NextResponse.json({ error: 'Execution not found or has no thread' }, { status: 404 });
    }

    await workflowRuntime.resume(execution.langgraph_thread_id, decision, result_data);

    return NextResponse.json({
      resumed: true,
      executionId,
      threadId: execution.langgraph_thread_id,
      status: execution.status,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[execute/resume]', message);

    // Write exception for resume failure (fire-and-forget)
    const { executionId: execId } = await props.params;
    import('@/lib/workflow/exception-writer').then(async ({ writeException }) => {
      const { createServiceRoleClient: createSRC } = await import('@/utils/supabase/server');
      const supa = createSRC();
      writeException({
        supabase: supa,
        source: 'workflow_failure',
        severity: 'high',
        title: `Workflow execution resume failed`,
        description: message,
        sourceEntityType: 'workflow_execution',
        sourceEntityId: execId,
      });
    }).catch(() => {});

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
