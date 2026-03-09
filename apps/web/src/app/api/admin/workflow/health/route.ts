/**
 * GET /api/admin/workflow/health
 * Returns platform health counts: failed webhooks (DLQ) + shadow divergences.
 */

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createServiceRoleClient();

    const [webhooksResult, divergencesResult] = await Promise.all([
      supabase
        .from('failed_webhooks')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed'),
      supabase
        .from('workflow_executions')
        .select('id', { count: 'exact', head: true })
        .eq('is_shadow', true)
        .not('shadow_divergence', 'is', null),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        failedWebhooks: webhooksResult.count ?? 0,
        shadowDivergences: divergencesResult.count ?? 0,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
