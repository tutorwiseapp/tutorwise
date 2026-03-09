/**
 * GET /api/admin/listings/intelligence
 * Listings health metrics + pricing intelligence for Conductor.
 * Query params: ?subject=maths&completeness_threshold=70
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
    const subject = searchParams.get('subject') ?? undefined;
    const threshold = parseInt(searchParams.get('completeness_threshold') ?? '70', 10);

    const [health, pricing] = await Promise.all([
      executeTool('query_listing_health', { completeness_threshold: threshold }),
      executeTool('query_pricing_intelligence', { subject }),
    ]);

    return NextResponse.json({ success: true, data: { health, pricing } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
