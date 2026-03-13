/**
 * POST /api/admin/agents/[id]/run
 * Runs a specialist agent with the given prompt and returns the full output.
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@/utils/supabase/server';
import { specialistAgentRunner } from '@/lib/agent-studio/SpecialistAgentRunner';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Allow scheduler service via CRON_SECRET (same pattern as /api/cron/* routes)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isSchedulerAuth = cronSecret && authHeader
      ? authHeader.length === `Bearer ${cronSecret}`.length && timingSafeEqual(Buffer.from(authHeader), Buffer.from(`Bearer ${cronSecret}`))
      : false;

    if (!isSchedulerAuth) {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

      const { data: adminProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
      if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json() as { prompt: string; trigger_type?: string };

    if (!body.prompt) return NextResponse.json({ error: 'prompt is required' }, { status: 400 });

    const result = await specialistAgentRunner.run(id, body.prompt, body.trigger_type ?? 'manual');

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
