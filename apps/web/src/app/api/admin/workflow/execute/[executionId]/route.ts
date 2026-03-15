/**
 * GET  /api/admin/workflow/execute/[executionId] — execution detail
 * DELETE /api/admin/workflow/execute/[executionId] — cancel execution
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { workflowRuntime } from '@/lib/workflow/runtime/PlatformWorkflowRuntime';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ executionId: string }> }
) {
  try {
    const { executionId } = await props.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: execution } = await supabase
      .from('workflow_executions')
      .select(`
        id, process_id, status, is_shadow, execution_context,
        started_at, completed_at,
        process:process_id ( name, category ),
        tasks:workflow_tasks ( id, node_id, name, type, handler, status, completion_mode, assigned_role, result_data, started_at, completed_at )
      `)
      .eq('id', executionId)
      .single();

    if (!execution) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }

    return NextResponse.json({ execution });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  props: { params: Promise<{ executionId: string }> }
) {
  try {
    const { executionId } = await props.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await workflowRuntime.cancel(executionId);

    return NextResponse.json({ cancelled: true, executionId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
