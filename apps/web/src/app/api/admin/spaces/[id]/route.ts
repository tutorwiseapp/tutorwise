/**
 * PATCH  /api/admin/spaces/[id] — update a space
 * DELETE /api/admin/spaces/[id] — deactivate a space
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: adminProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await request.json() as {
      name?: string;
      description?: string;
      color?: string;
      status?: string;
    };

    const { data, error } = await supabase
      .from('agent_spaces')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, slug, name, color, status')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Space not found' }, { status: 404 });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: adminProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;

    // Prevent deleting built-in spaces
    const { data: space } = await supabase
      .from('agent_spaces')
      .select('built_in')
      .eq('id', id)
      .single();

    if (space?.built_in) {
      return NextResponse.json({ error: 'Cannot delete a built-in space' }, { status: 403 });
    }

    // Deactivate (soft delete) and unlink teams
    await supabase.from('agent_teams').update({ space_id: null }).eq('space_id', id);
    const { error } = await supabase
      .from('agent_spaces')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
