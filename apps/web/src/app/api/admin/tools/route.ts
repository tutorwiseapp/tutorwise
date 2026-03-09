/**
 * GET  /api/admin/tools — list analyst tools
 * POST /api/admin/tools — register a new tool
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('analyst_tools')
      .select('id, slug, name, description, category, input_schema, return_type, built_in, status, created_at')
      .order('built_in', { ascending: false })
      .order('name');

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
      description: string;
      category?: string;
      input_schema?: Record<string, unknown>;
      return_type?: string;
    };

    if (!body.slug || !body.name || !body.description) {
      return NextResponse.json({ error: 'slug, name, description are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('analyst_tools')
      .insert({
        slug: body.slug,
        name: body.name,
        description: body.description,
        category: body.category ?? 'analytics',
        input_schema: body.input_schema ?? {},
        return_type: body.return_type ?? 'json',
      })
      .select('id, slug, name')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: `Tool slug '${body.slug}' already exists` }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
