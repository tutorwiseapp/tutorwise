/**
 * GET /api/admin/referrals/analytics
 * Referral K-coefficient funnel + network graph stats for Conductor.
 * Query params: ?segment=platform (platform|role:tutor|role:agent|role:client|type:supply|type:demand)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { executeTool } from '@/lib/agent-studio/tools/executor';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const segment = searchParams.get('segment') ?? 'platform';

    const data = await executeTool('query_referral_funnel', { segment });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
