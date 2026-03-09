/**
 * DELETE /api/admin/tools/[id] — deactivate a tool (block if built_in)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const { data: existing } = await supabase
      .from('analyst_tools')
      .select('built_in')
      .eq('id', id)
      .single();

    if (!existing) return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    if (existing.built_in) return NextResponse.json({ error: 'Cannot delete a built-in tool' }, { status: 403 });

    const { error } = await supabase
      .from('analyst_tools')
      .update({ status: 'inactive' })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
