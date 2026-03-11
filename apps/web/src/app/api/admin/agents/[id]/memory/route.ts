/**
 * GET /api/admin/agents/[id]/memory
 * Returns memory_episodes and memory_facts for a given agent.
 * Episodes newest first; facts ordered by confidence desc (active only).
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: adminProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const { searchParams } = new URL(_req.url);
    const type = searchParams.get('type'); // 'episode' | 'fact'
    const recordId = searchParams.get('recordId');

    if (!recordId || !type) return NextResponse.json({ error: 'Missing type or recordId' }, { status: 400 });

    if (type === 'episode') {
      await supabase.from('memory_episodes').delete().eq('id', recordId);
    } else if (type === 'fact') {
      // Soft-delete by setting valid_until
      await supabase.from('memory_facts').update({ valid_until: new Date().toISOString() }).eq('id', recordId);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: adminProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;

    // Resolve agent slug from id
    const { data: agent, error: agentError } = await supabase
      .from('specialist_agents')
      .select('slug')
      .eq('id', id)
      .single();

    if (agentError || !agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

    const slug = agent.slug;

    const [episodesRes, factsRes] = await Promise.all([
      supabase
        .from('memory_episodes')
        .select('id, task_summary, outcome_summary, outcome_type, entities, was_acted_on, created_at')
        .eq('agent_slug', slug)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('memory_facts')
        .select('id, subject, relation, object, context, confidence, valid_until, created_at')
        .eq('agent_slug', slug)
        .is('valid_until', null)
        .order('confidence', { ascending: false })
        .limit(50),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        episodes: episodesRes.data ?? [],
        facts: factsRes.data ?? [],
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
