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

    // If recurring, update the same row in-place (matches scheduler service behavior)
    if (item.recurrence) {
      const now = new Date();
      let nextDate: Date | null = null;

      if (item.recurrence === 'cron' && item.cron_expression) {
        // Parse cron expression to compute next fire time
        try {
          const cronParser = await import('cron-parser');
          const interval = cronParser.default.parseExpression(item.cron_expression, {
            currentDate: now,
            tz: 'UTC',
          });
          nextDate = interval.next().toDate();
        } catch {
          // Invalid cron — fall through to complete without recurrence
        }
      } else {
        nextDate = new Date(now);
        switch (item.recurrence) {
          case 'daily': nextDate.setDate(nextDate.getDate() + 1); break;
          case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
          case 'biweekly': nextDate.setDate(nextDate.getDate() + 14); break;
          case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
          default: nextDate = null;
        }
        // Preserve original time-of-day
        if (nextDate) {
          const orig = new Date(item.scheduled_at);
          nextDate.setUTCHours(orig.getUTCHours(), orig.getUTCMinutes(), orig.getUTCSeconds(), 0);
        }
      }

      const withinWindow = nextDate && (!item.recurrence_end || nextDate <= new Date(item.recurrence_end));

      if (withinWindow && nextDate) {
        // Reset for next cycle (same row — no duplicates)
        const { data, error } = await supabase
          .from('scheduled_items')
          .update({
            scheduled_at: nextDate.toISOString(),
            status: 'scheduled',
            attempt_count: 0,
            locked_by: null,
            locked_at: null,
            started_at: null,
            completed_at: new Date().toISOString(),
            last_error: null,
          })
          .eq('id', id)
          .select('*')
          .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, data, next_at: nextDate.toISOString() });
      }
    }

    // Non-recurring or past recurrence end — mark as completed
    const { data, error } = await supabase
      .from('scheduled_items')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
