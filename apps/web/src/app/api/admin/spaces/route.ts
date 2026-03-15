/**
 * GET  /api/admin/spaces — list agent spaces
 * POST /api/admin/spaces — create a new space
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
      .from('agent_spaces')
      .select('id, slug, name, description, color, status, built_in, created_at, updated_at')
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
      description?: string;
      color?: string;
    };

    if (!body.slug || !body.name) {
      return NextResponse.json({ error: 'slug and name are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('agent_spaces')
      .insert({
        slug: body.slug,
        name: body.name,
        description: body.description ?? null,
        color: body.color ?? '#6366f1',
        created_by: user.id,
      })
      .select('id, slug, name, color')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: `Space slug '${body.slug}' already exists` }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
