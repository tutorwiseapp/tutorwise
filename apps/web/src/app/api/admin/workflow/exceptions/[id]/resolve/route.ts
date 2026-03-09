/**
 * POST /api/admin/workflow/exceptions/[id]/resolve
 * Marks an exception as resolved with optional resolution notes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({})) as { resolution?: string };

    const { error } = await supabase
      .from('workflow_exceptions')
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
        resolution: body.resolution ?? null,
      })
      .eq('id', id)
      .is('resolved_at', null);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
