/**
 * PATCH  /api/admin/teams/[id] — partial update (e.g. space_id assignment)
 * PUT    /api/admin/teams/[id] — full update team
 * DELETE /api/admin/teams/[id] — deactivate team
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json() as { space_id?: string | null; status?: string };

    const allowed: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if ('space_id' in body) allowed.space_id = body.space_id ?? null;
    if ('status' in body) allowed.status = body.status;

    const { data, error } = await supabase
      .from('agent_teams')
      .update(allowed)
      .eq('id', id)
      .select('id, slug, name, space_id')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json() as Record<string, unknown>;

    const { data: existing } = await supabase
      .from('agent_teams')
      .select('built_in, slug')
      .eq('id', id)
      .single();

    if (!existing) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    if (existing.built_in && body.slug && body.slug !== existing.slug) {
      return NextResponse.json({ error: 'Cannot change slug of a built-in team' }, { status: 403 });
    }

    const allowed: Record<string, unknown> = {};
    for (const key of ['name', 'description', 'pattern', 'nodes', 'edges', 'coordinator_slug', 'config', 'status']) {
      if (key in body) allowed[key] = body[key];
    }
    if (!existing.built_in && 'slug' in body) allowed.slug = body.slug;

    const { data, error } = await supabase
      .from('agent_teams')
      .update(allowed)
      .eq('id', id)
      .select('id, slug, name')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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

    const { id } = await params;

    const { data: existing } = await supabase
      .from('agent_teams')
      .select('built_in')
      .eq('id', id)
      .single();

    if (!existing) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    if (existing.built_in) return NextResponse.json({ error: 'Cannot delete a built-in team' }, { status: 403 });

    const { error } = await supabase
      .from('agent_teams')
      .update({ status: 'inactive' })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
