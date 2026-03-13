/**
 * GET /api/cron/process-failed-webhooks
 * DLQ retry cron — re-fires failed webhook payloads with exponential backoff.
 * Designed to run every 15 minutes (scheduled in pg_cron via migration 346).
 *
 * Handles:
 *   - url = '/api/webhooks/workflow'  → re-POST to our own webhook endpoint
 *   - url = '/api/webhooks/stripe'    → strip event must be reprocessed via admin route
 *
 * Backoff: next retry allowed after 2^retry_count minutes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface FailedWebhook {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string> | null;
  payload: Record<string, unknown>;
  retry_count: number;
  max_retries: number;
  last_retry_at: string | null;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServiceRoleClient();
  const now = new Date();

  const { data: candidates, error } = await supabase
    .from('failed_webhooks')
    .select('id, url, method, headers, payload, retry_count, max_retries, last_retry_at')
    .in('status', ['failed', 'retrying'])
    .lt('retry_count', 5)
    .limit(50);

  if (error) {
    console.error('[DLQ Retry] Failed to fetch candidates:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ success: true, retried: 0 });
  }

  const results = { retried: 0, resolved: 0, dead: 0, skipped: 0 };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  for (const webhook of candidates as FailedWebhook[]) {
    // Exponential backoff: wait 2^retry_count minutes since last retry
    if (webhook.retry_count > 0 && webhook.last_retry_at) {
      const lastRetry = new Date(webhook.last_retry_at).getTime();
      const backoffMs = Math.pow(2, webhook.retry_count) * 60_000; // 2^n minutes
      if (now.getTime() - lastRetry < backoffMs) {
        results.skipped++;
        continue;
      }
    }

    const isWorkflowWebhook = webhook.url === '/api/webhooks/workflow';

    if (!isWorkflowWebhook) {
      results.skipped++;
      continue;
    }

    const webhookSecret = process.env.PROCESS_STUDIO_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[DLQ Retry] PROCESS_STUDIO_WEBHOOK_SECRET not set — cannot retry workflow webhooks');
      results.skipped++;
      continue;
    }

    // Atomic claim: set status to 'claiming' to prevent concurrent retries
    const { data: claimed } = await supabase
      .from('failed_webhooks')
      .update({ status: 'retrying', last_retry_at: now.toISOString() })
      .eq('id', webhook.id)
      .in('status', ['failed', 'retrying'])
      .select('id')
      .single();

    if (!claimed) {
      results.skipped++;
      continue;
    }

    try {
      results.retried++;
      const response = await fetch(`${appUrl}${webhook.url}`, {
        method: webhook.method ?? 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': webhookSecret,
          ...(webhook.headers ?? {}),
        },
        body: JSON.stringify(webhook.payload),
      });

      if (response.ok) {
        await supabase
          .from('failed_webhooks')
          .update({ status: 'resolved', resolved_at: now.toISOString() })
          .eq('id', webhook.id);
        results.resolved++;
      } else {
        const nextCount = webhook.retry_count + 1;
        const newStatus = nextCount >= webhook.max_retries ? 'dead' : 'failed';
        await supabase
          .from('failed_webhooks')
          .update({ retry_count: nextCount, status: newStatus })
          .eq('id', webhook.id);
        if (newStatus === 'dead') results.dead++;
      }
    } catch (err) {
      console.error(`[DLQ Retry] Failed to retry webhook ${webhook.id}:`, err);
      const nextCount = webhook.retry_count + 1;
      const newStatus = nextCount >= webhook.max_retries ? 'dead' : 'failed';
      await supabase
        .from('failed_webhooks')
        .update({ retry_count: nextCount, status: newStatus })
        .eq('id', webhook.id);
      if (newStatus === 'dead') results.dead++;
    }
  }

  console.log('[DLQ Retry] Complete:', results);
  return NextResponse.json({ success: true, ...results });
}
