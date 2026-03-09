/**
 * GET  /api/admin/teams — list agent teams
 * POST /api/admin/teams — create a new team
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('agent_teams')
      .select('id, slug, name, description, pattern, nodes, edges, coordinator_slug, config, status, built_in, created_at, updated_at')
      .order('built_in', { ascending: false })
      .order('name');

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as {
      slug: string;
      name: string;
      description?: string;
      pattern?: string;
      nodes?: unknown[];
      edges?: unknown[];
      coordinator_slug?: string;
      config?: Record<string, unknown>;
    };

    if (!body.slug || !body.name) {
      return NextResponse.json({ error: 'slug and name are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('agent_teams')
      .insert({
        slug: body.slug,
        name: body.name,
        description: body.description ?? null,
        pattern: body.pattern ?? 'supervisor',
        nodes: body.nodes ?? [],
        edges: body.edges ?? [],
        coordinator_slug: body.coordinator_slug ?? null,
        config: body.config ?? {},
        created_by: user.id,
      })
      .select('id, slug, name')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: `Team slug '${body.slug}' already exists` }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
