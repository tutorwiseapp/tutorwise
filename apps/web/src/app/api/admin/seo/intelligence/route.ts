/**
 * GET /api/admin/seo/intelligence
 * SEO platform health metrics + keyword opportunities for Conductor.
 * Query params: ?min_position=6&max_position=20
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
    const minPosition = parseInt(searchParams.get('min_position') ?? '6', 10);
    const maxPosition = parseInt(searchParams.get('max_position') ?? '20', 10);

    const [health, opportunities] = await Promise.all([
      executeTool('query_seo_health', {}),
      executeTool('query_keyword_opportunities', { min_position: minPosition, max_position: maxPosition }),
    ]);

    return NextResponse.json({ success: true, data: { health, opportunities } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
