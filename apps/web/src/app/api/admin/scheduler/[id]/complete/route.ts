/**
 * POST /api/admin/scheduler/[id]/complete — mark item as completed
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: adminProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Get current item
    const { data: item, error: fetchError } = await supabase
      .from('scheduled_items')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Mark as completed
    const { data, error } = await supabase
      .from('scheduled_items')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // If recurring, create next occurrence
    if (item.recurrence) {
      const nextDate = new Date(item.scheduled_at);

      switch (item.recurrence) {
        case 'daily': nextDate.setDate(nextDate.getDate() + 1); break;
        case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
        case 'biweekly': nextDate.setDate(nextDate.getDate() + 14); break;
        case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
      }

      // Only create next if within recurrence window
      const withinWindow = !item.recurrence_end || nextDate <= new Date(item.recurrence_end);

      if (withinWindow) {
        await supabase.from('scheduled_items').insert({
          title: item.title,
          description: item.description,
          type: item.type,
          scheduled_at: nextDate.toISOString(),
          due_date: item.due_date,
          recurrence: item.recurrence,
          recurrence_end: item.recurrence_end,
          metadata: item.metadata,
          tags: item.tags,
          color: item.color,
          created_by: item.created_by,
        });
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
