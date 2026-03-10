/*
 * Filename: src/app/api/admin/conductor/autonomy/[processId]/route.ts
 * Purpose: Approve/reject/manual tier change for process autonomy config
 * Phase: Conductor 4D
 * Created: 2026-03-10
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/conductor/autonomy/[processId]
 * Body: { action: 'approve' | 'reject' | 'set_tier', tier?: string }
 *
 * approve — applies the pending proposal (e.g. expand: supervised → semi-autonomous)
 * reject  — clears the pending proposal without changing tier
 * set_tier — manually set the tier directly
 */
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ processId: string }> }
) {
  try {
    const { processId } = await props.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { action, tier } = body;

    if (!['approve', 'reject', 'set_tier'].includes(action)) {
      return NextResponse.json({ error: 'action must be approve, reject, or set_tier' }, { status: 400 });
    }

    // Find config by process_id
    const { data: config, error: fetchError } = await supabase
      .from('process_autonomy_config')
      .select('id, current_tier, proposal')
      .eq('process_id', processId)
      .single();

    if (fetchError || !config) {
      return NextResponse.json({ error: 'Config not found' }, { status: 404 });
    }

    const TIER_ORDER = ['supervised', 'semi-autonomous', 'autonomous'];

    let updatePayload: Record<string, unknown> = {};

    if (action === 'approve') {
      if (!config.proposal) {
        return NextResponse.json({ error: 'No pending proposal to approve' }, { status: 400 });
      }
      const currentIdx = TIER_ORDER.indexOf(config.current_tier);
      const newTier = config.proposal === 'expand'
        ? TIER_ORDER[Math.min(currentIdx + 1, 2)]
        : TIER_ORDER[Math.max(currentIdx - 1, 0)];
      updatePayload = {
        current_tier: newTier,
        proposal: null,
        proposal_reason: null,
        proposed_at: null,
      };
    } else if (action === 'reject') {
      updatePayload = {
        proposal: null,
        proposal_reason: null,
        proposed_at: null,
      };
    } else if (action === 'set_tier') {
      if (!tier || !TIER_ORDER.includes(tier)) {
        return NextResponse.json(
          { error: 'tier must be supervised, semi-autonomous, or autonomous' },
          { status: 400 }
        );
      }
      updatePayload = { current_tier: tier };
    }

    const { data, error } = await supabase
      .from('process_autonomy_config')
      .update(updatePayload)
      .eq('id', config.id)
      .select('id, current_tier, proposal, updated_at')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
