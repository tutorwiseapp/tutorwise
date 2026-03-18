/**
 * GET  /api/admin/agents — list specialist agents
 * POST /api/admin/agents — create a new agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: adminProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
    if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('specialist_agents')
      .select('id, slug, name, role, category, sub_category, description, config, seed_config, status, built_in, created_at, updated_at')
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

    const { data: adminProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
    if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json() as {
      slug: string;
      name: string;
      role: string;
      category?: string;
      sub_category?: string;
      description?: string;
      config?: Record<string, unknown>;
    };

    if (!body.slug || !body.name || !body.role) {
      return NextResponse.json({ error: 'slug, name, role are required' }, { status: 400 });
    }

    if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(body.slug)) {
      return NextResponse.json({ error: 'slug must be 3-64 lowercase alphanumeric chars or hyphens, no leading/trailing hyphens' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('specialist_agents')
      .insert({
        slug: body.slug,
        name: body.name,
        role: body.role,
        category: body.category ?? 'engineering',
        sub_category: body.sub_category ?? null,
        description: body.description ?? null,
        config: body.config ?? {},
        created_by: user.id,
      })
      .select('id, slug, name')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: `Agent slug '${body.slug}' already exists` }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
