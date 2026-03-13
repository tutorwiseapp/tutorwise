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
    // Allow scheduler/cron via CRON_SECRET — accepts both:
    //   authorization: Bearer <secret>  (standard pattern)
    //   x-cron-secret: <secret>         (pg_cron net.http_post pattern)
    const authHeader = request.headers.get('authorization');
    const cronHeader = request.headers.get('x-cron-secret');
    const cronSecret = process.env.CRON_SECRET;

    let isSchedulerAuth = false;
    if (cronSecret) {
      const bearerToken = `Bearer ${cronSecret}`;
      if (authHeader && authHeader.length === bearerToken.length) {
        isSchedulerAuth = timingSafeEqual(Buffer.from(authHeader), Buffer.from(bearerToken));
      } else if (cronHeader && cronHeader.length === cronSecret.length) {
        isSchedulerAuth = timingSafeEqual(Buffer.from(cronHeader), Buffer.from(cronSecret));
      }
    }

    if (!isSchedulerAuth) {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

      const { data: adminProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
      if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json() as { prompt?: string; trigger?: string; trigger_type?: string };

    // Cron jobs send {"trigger":"schedule"} without a prompt — use a default
    const triggerType = body.trigger_type ?? body.trigger ?? 'manual';
    const prompt = body.prompt ?? `Run your scheduled analysis as ${id}. Use your tools to gather data and provide a comprehensive report.`;

    const result = await specialistAgentRunner.run(id, prompt, triggerType);

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
