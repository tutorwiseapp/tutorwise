/**
 * GET|POST /api/cron/process-nudges
 * Called by pg_cron every 4 hours (job: 'proactive-nudges').
 * Runs proactive nudge checks for all active tutor profiles.
 *
 * Auth: Authorization: Bearer <CRON_SECRET> or x-cron-secret header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processNudges } from '@/lib/workflow/nudge-scheduler';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${cronSecret}`) return true;
  const xCronSecret = request.headers.get('x-cron-secret');
  if (xCronSecret === cronSecret) return true;
  return false;
}

async function handleNudges(request: NextRequest) {
  if (!isAuthorized(request)) {
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

export async function GET(request: NextRequest) {
  return handleNudges(request);
}

export async function POST(request: NextRequest) {
  return handleNudges(request);
}
