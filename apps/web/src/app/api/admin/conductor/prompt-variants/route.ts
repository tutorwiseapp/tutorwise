import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceRoleClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/admin/conductor/prompt-variants?status=pending
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? 'pending';

  const supa = await createServiceRoleClient();
  const query = supa
    .from('agent_prompt_variants')
    .select(`id, agent_slug, proposed_instructions, rationale, failure_pattern, quality_delta_pct, status, created_at, reviewed_at, specialist_agents!inner(name, role, department)`)
    .order('created_at', { ascending: false });

  if (status !== 'all') query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, data: data ?? [] });
}
