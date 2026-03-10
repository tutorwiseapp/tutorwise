/*
 * Filename: src/app/api/admin/conductor/classify-intent/route.ts
 * Purpose: Semantic intent classification for the Conductor Command Center
 * Phase: Conductor 4B
 * Created: 2026-03-10
 *
 * POST /api/admin/conductor/classify-intent
 * Body: { input: string }
 * Returns: IntentResult with routing instructions for the Command Center
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { IntentDetector } from '@/lib/conductor/IntentDetector';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { input } = body;
    if (!input || typeof input !== 'string') {
      return NextResponse.json({ error: 'input is required' }, { status: 400 });
    }

    // Load available agents and processes as routing context
    const [agentsRes, processesRes] = await Promise.all([
      supabase
        .from('specialist_agents')
        .select('slug, name')
        .eq('status', 'active'),
      supabase
        .from('workflow_processes')
        .select('id, slug, name')
        .in('execution_mode', ['live', 'shadow']),
    ]);

    const agents = (agentsRes.data ?? []).map((a: any) => a.slug);
    const processes = (processesRes.data ?? []).map((p: any) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
    }));

    const result = await IntentDetector.classify(input, { agents, processes });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
