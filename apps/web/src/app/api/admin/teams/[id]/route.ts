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

    const { data: adminProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
    if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await request.json() as { action?: string; space_id?: string | null; status?: string };

    // Seed actions
    if (body.action && ['accept_seed', 'reset_seed'].includes(body.action)) {
      const { data: team } = await supabase
        .from('agent_teams')
        .select('id, built_in, nodes, coordinator_slug, pattern, config, seed_config')
        .eq('id', id)
        .single();

      if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      if (!team.built_in) return NextResponse.json({ error: 'Seed actions only apply to built-in teams' }, { status: 400 });

      if (body.action === 'accept_seed') {
        const newSeed = { nodes: team.nodes, coordinator_slug: team.coordinator_slug, pattern: team.pattern };
        const { error } = await supabase.from('agent_teams').update({ seed_config: newSeed }).eq('id', id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      } else {
        if (!team.seed_config) return NextResponse.json({ error: 'No seed config available' }, { status: 400 });
        const seed = team.seed_config as Record<string, unknown>;
        const updates: Record<string, unknown> = {};
        if (seed.nodes) updates.nodes = seed.nodes;
        if (seed.coordinator_slug !== undefined) updates.coordinator_slug = seed.coordinator_slug;
        if (seed.pattern) updates.pattern = seed.pattern;
        const { error } = await supabase.from('agent_teams').update(updates).eq('id', id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, action: body.action });
    }

    // Regular partial update
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

    const { data: adminProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
    if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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

    const { data: adminProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
    if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;

    const { data: existing } = await supabase
      .from('agent_teams')
      .select('built_in')
      .eq('id', id)
      .single();

    if (!existing) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

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
