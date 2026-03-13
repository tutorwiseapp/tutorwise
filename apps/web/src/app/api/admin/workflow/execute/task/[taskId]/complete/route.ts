/**
 * POST /api/admin/workflow/execute/task/[taskId]/complete
 * Manually complete a HITL task (human-assigned approval/action).
 * Looks up the thread ID from the task and calls resume().
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { workflowRuntime } from '@/lib/workflow/runtime/PlatformWorkflowRuntime';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await props.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { decision = 'approve', result_data = {} } = body as {
      decision?: string;
      result_data?: Record<string, unknown>;
    };

    // Atomically claim the task — prevents double-completion race
    const { data: task } = await supabase
      .from('workflow_tasks')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', taskId)
      .eq('status', 'paused')
      .select('execution_id, status')
      .maybeSingle();

    if (!task) {
      // Could be not found OR already claimed by another request
      return NextResponse.json(
        { error: 'Task not found or no longer paused (may have been completed by another request)' },
        { status: 409 }
      );
    }

    const { data: execution } = await supabase
      .from('workflow_executions')
      .select('langgraph_thread_id')
      .eq('id', task.execution_id)
      .single();

    if (!execution?.langgraph_thread_id) {
      return NextResponse.json({ error: 'Execution thread not found' }, { status: 404 });
    }

    await workflowRuntime.resume(execution.langgraph_thread_id, decision, {
      ...result_data,
      completed_by: user.id,
      decision,
    });

    return NextResponse.json({ completed: true, taskId, decision });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[execute/task/complete]', message);

    // Write exception for task completion failure (fire-and-forget)
    const { taskId: tId } = await props.params;
    import('@/lib/workflow/exception-writer').then(async ({ writeException }) => {
      const { createServiceRoleClient: createSRC } = await import('@/utils/supabase/server');
      const supa = createSRC();
      writeException({
        supabase: supa,
        source: 'hitl_timeout',
        severity: 'high',
        title: `HITL task completion failed`,
        description: message,
        sourceEntityType: 'workflow_task',
        sourceEntityId: tId,
      });
    }).catch((err) => { console.error('[task-complete] Exception write failed:', err); });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
