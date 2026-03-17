import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceRoleClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

// PATCH /api/admin/conductor/prompt-variants/[id]
// body: { action: 'approve' | 'reject' }
// On approve: writes proposed_instructions into agent config.instructions
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json() as { action: string };
  if (!['approve', 'reject'].includes(body.action)) {
    return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
  }

  const supa = await createServiceRoleClient();

  const { data: variant, error: fetchErr } = await supa
    .from('agent_prompt_variants')
    .select('id, agent_id, agent_slug, proposed_instructions, status')
    .eq('id', id)
    .single();

  if (fetchErr || !variant) return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
  if (variant.status !== 'pending') return NextResponse.json({ error: 'Variant already reviewed' }, { status: 409 });

  await supa
    .from('agent_prompt_variants')
    .update({ status: body.action === 'approve' ? 'approved' : 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', id);

  if (body.action === 'approve') {
    const { data: agent } = await supa.from('specialist_agents').select('config').eq('id', variant.agent_id).single();
    const currentConfig = (agent?.config ?? {}) as Record<string, unknown>;
    await supa.from('specialist_agents')
      .update({ config: { ...currentConfig, instructions: variant.proposed_instructions } })
      .eq('id', variant.agent_id);
  }

  return NextResponse.json({ success: true, action: body.action, agent_slug: variant.agent_slug });
}
