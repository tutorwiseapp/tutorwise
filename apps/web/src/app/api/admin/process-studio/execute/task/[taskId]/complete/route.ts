/**
 * POST /api/admin/process-studio/execute/task/[taskId]/complete
 * Manually complete a HITL task (human-assigned approval/action).
 * Looks up the thread ID from the task and calls resume().
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { workflowRuntime } from '@/lib/process-studio/runtime/PlatformWorkflowRuntime';

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

    const body = await request.json();
    const { decision = 'approve', result_data = {} } = body as {
      decision?: string;
      result_data?: Record<string, unknown>;
    };

    // Look up the execution thread ID via the task
    const { data: task } = await supabase
      .from('workflow_tasks')
      .select('execution_id, status')
      .eq('id', taskId)
      .single();

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (task.status !== 'paused') {
      return NextResponse.json(
        { error: `Task is not paused — current status: ${task.status}` },
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
