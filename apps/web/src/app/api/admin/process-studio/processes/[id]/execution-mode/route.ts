/**
 * PATCH /api/admin/process-studio/processes/[id]/execution-mode
 * Toggle execution mode for a process (design → shadow → live).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: processId } = await props.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { mode } = body as { mode: 'design' | 'shadow' | 'live' };

    if (!mode || !['design', 'shadow', 'live'].includes(mode)) {
      return NextResponse.json(
        { error: 'mode must be one of: design, shadow, live' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('workflow_processes')
      .update({ execution_mode: mode })
      .eq('id', processId)
      .select('id, name, execution_mode')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Process not found or update failed' }, { status: 404 });
    }

    return NextResponse.json({ updated: true, processId, mode: data.execution_mode });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[processes/execution-mode]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
