/**
 * GET /api/cron/process-nudges
 * Called by pg_cron every 4 hours (job: 'proactive-nudges').
 * Runs proactive nudge checks for all active tutor profiles.
 *
 * Auth: x-cron-secret header (matches CRON_SECRET env var).
 */

import { NextRequest, NextResponse } from 'next/server';
import { processNudges } from '@/lib/workflow/nudge-scheduler';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const report = await processNudges();
    return NextResponse.json({ success: true, data: report });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[process-nudges] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
