/**
 * GET    /api/admin/scheduler/[id] — get single item
 * PATCH  /api/admin/scheduler/[id] — update item
 * DELETE /api/admin/scheduler/[id] — cancel item (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: adminProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await supabase
      .from('scheduled_items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 404 });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: adminProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();

    // Only allow updating specific fields
    const allowed = ['title', 'description', 'type', 'status', 'scheduled_at', 'due_date', 'recurrence', 'recurrence_end', 'metadata', 'tags', 'color', 'cron_expression', 'endpoint', 'sql_function', 'http_method'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Validate status transitions — prevent bypassing the lock mechanism
    if ('status' in updates) {
      const validStatuses = ['scheduled', 'cancelled'];
      if (!validStatuses.includes(updates.status as string)) {
        return NextResponse.json(
          { error: `Status can only be set to: ${validStatuses.join(', ')}. Use /complete endpoint for completion.` },
          { status: 400 }
        );
      }
    }

    // Validate cron expression if provided
    if ('cron_expression' in updates && updates.cron_expression) {
      try {
        const cronParser = await import('cron-parser');
        cronParser.default.parseExpression(updates.cron_expression as string);
      } catch {
        return NextResponse.json({ error: 'Invalid cron expression' }, { status: 400 });
      }
    }

    const { data, error } = await supabase
      .from('scheduled_items')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: adminProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Soft delete: set status to cancelled
    const { data, error } = await supabase
      .from('scheduled_items')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select('id, status')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
