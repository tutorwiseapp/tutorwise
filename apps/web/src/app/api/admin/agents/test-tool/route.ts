/**
 * POST /api/admin/agents/test-tool
 * Executes an analyst tool by slug for testing purposes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { executeTool } from '@/lib/agent-studio/tools/executor';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: adminProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
    if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json() as { slug: string; input?: Record<string, unknown> };
    if (!body.slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 });

    const result = await executeTool(body.slug, body.input ?? {});
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
