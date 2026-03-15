/**
 * GET  /api/admin/scheduler — list scheduled items (filterable)
 * POST /api/admin/scheduler — create a new scheduled item
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
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const tag = searchParams.get('tag');

    let query = supabase
      .from('scheduled_items')
      .select('*')
      .order('scheduled_at', { ascending: true });

    if (type) query = query.eq('type', type);
    if (status) query = query.eq('status', status);
    if (from) query = query.gte('scheduled_at', from);
    if (to) query = query.lte('scheduled_at', to);
    if (tag) query = query.contains('tags', [tag]);

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
      title: string;
      description?: string;
      type: string;
      scheduled_at: string;
      due_date?: string;
      recurrence?: string;
      recurrence_end?: string;
      metadata?: Record<string, unknown>;
      tags?: string[];
      color?: string;
      cron_expression?: string;
      endpoint?: string;
      sql_function?: string;
      http_method?: string;
    };

    if (!body.title || !body.type || !body.scheduled_at) {
      return NextResponse.json({ error: 'title, type, and scheduled_at are required' }, { status: 400 });
    }

    // Validate cron expression if provided
    if (body.cron_expression) {
      try {
        const cronParser = await import('cron-parser');
        cronParser.default.parseExpression(body.cron_expression);
      } catch {
        return NextResponse.json({ error: 'Invalid cron expression' }, { status: 400 });
      }
    }

    const { data, error } = await supabase
      .from('scheduled_items')
      .insert({
        title: body.title,
        description: body.description ?? null,
        type: body.type,
        scheduled_at: body.scheduled_at,
        due_date: body.due_date ?? null,
        recurrence: body.recurrence ?? null,
        recurrence_end: body.recurrence_end ?? null,
        metadata: body.metadata ?? {},
        tags: body.tags ?? [],
        color: body.color ?? null,
        cron_expression: body.cron_expression ?? null,
        endpoint: body.endpoint ?? null,
        sql_function: body.sql_function ?? null,
        http_method: body.http_method ?? null,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
