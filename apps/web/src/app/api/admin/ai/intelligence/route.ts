/**
 * GET /api/admin/ai/intelligence
 * AI Product Adoption + AI Studio intelligence for Conductor Intelligence panel.
 * Phase 3 Use Cases 4 & 6.
 * Query params: ?view=adoption|studio (default: adoption)
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
    const { data: adminProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') ?? 'adoption';
    const days = Number(searchParams.get('days') ?? '30');

    const tool = view === 'studio' ? 'query_ai_studio_health' : 'query_ai_adoption_health';
    const data = await executeTool(tool, { days });
    return NextResponse.json({ success: true, data, view });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
