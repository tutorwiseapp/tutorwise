/**
 * GET /api/admin/financials/intelligence
 * Financial health metrics — clearing, payouts, revenue, anomalies for Conductor.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { executeTool } from '@/lib/agent-studio/tools/executor';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await executeTool('query_financial_health', {});
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
