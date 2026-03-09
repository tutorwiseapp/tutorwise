/**
 * POST /api/admin/agents/[id]/run
 * Runs a specialist agent with the given prompt and returns the full output.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { specialistAgentRunner } from '@/lib/agent-studio/SpecialistAgentRunner';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json() as { prompt: string; trigger_type?: string };

    if (!body.prompt) return NextResponse.json({ error: 'prompt is required' }, { status: 400 });

    const result = await specialistAgentRunner.run(id, body.prompt, body.trigger_type ?? 'manual');

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
