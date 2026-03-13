/**
 * PATCH  /api/admin/agents/[id] — seed actions (accept_seed, reset_seed)
 * PUT    /api/admin/agents/[id] — update agent
 * DELETE /api/admin/agents/[id] — deactivate agent
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
    const body = await request.json() as { action: string };

    if (!body.action || !['accept_seed', 'reset_seed'].includes(body.action)) {
      return NextResponse.json({ error: 'Invalid action. Must be accept_seed or reset_seed' }, { status: 400 });
    }

    const { data: agent } = await supabase
      .from('specialist_agents')
      .select('id, built_in, config, seed_config')
      .eq('id', id)
      .single();

    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    if (!agent.built_in) return NextResponse.json({ error: 'Seed actions only apply to built-in agents' }, { status: 400 });

    if (body.action === 'accept_seed') {
      // Promote current config as the new seed
      const { error } = await supabase
        .from('specialist_agents')
        .update({ seed_config: agent.config })
        .eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      // Reset config back to seed
      if (!agent.seed_config) return NextResponse.json({ error: 'No seed config available' }, { status: 400 });
      const { error } = await supabase
        .from('specialist_agents')
        .update({ config: agent.seed_config })
        .eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, action: body.action });
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

    // Check built_in guard
    const { data: existing } = await supabase
      .from('specialist_agents')
      .select('built_in, slug')
      .eq('id', id)
      .single();

    if (!existing) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

    if (existing.built_in && body.slug && body.slug !== existing.slug) {
      return NextResponse.json({ error: 'Cannot change slug of a built-in agent' }, { status: 403 });
    }

    // Validate tool slugs if config.tools is being updated
    const config = body.config as { tools?: string[] } | undefined;
    if (config?.tools && config.tools.length > 0) {
      const { data: validTools } = await supabase
        .from('analyst_tools')
        .select('slug')
        .in('slug', config.tools)
        .eq('status', 'active');
      const validSlugs = new Set((validTools ?? []).map((t: { slug: string }) => t.slug));
      const invalid = config.tools.filter((s: string) => !validSlugs.has(s));
      if (invalid.length > 0) {
        return NextResponse.json({ error: `Invalid tool slugs: ${invalid.join(', ')}` }, { status: 400 });
      }
    }

    const allowed: Record<string, unknown> = {};
    for (const key of ['name', 'role', 'department', 'description', 'config', 'status']) {
      if (key in body) allowed[key] = body[key];
    }
    if (!existing.built_in && 'slug' in body) allowed.slug = body.slug;

    const { data, error } = await supabase
      .from('specialist_agents')
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
      .from('specialist_agents')
      .select('built_in')
      .eq('id', id)
      .single();

    if (!existing) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    if (existing.built_in) return NextResponse.json({ error: 'Cannot delete a built-in agent' }, { status: 403 });

    const { error } = await supabase
      .from('specialist_agents')
      .update({ status: 'inactive' })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
