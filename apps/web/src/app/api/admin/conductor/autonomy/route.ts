/*
 * Filename: src/app/api/admin/conductor/autonomy/route.ts
 * Purpose: List all process_autonomy_config entries with accuracy trends
 * Phase: Conductor 4D
 * Created: 2026-03-10
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/conductor/autonomy
 * Returns all process_autonomy_config rows with the associated process name
 * and recent accuracy trend from decision_outcomes.
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Load all autonomy configs with process names
    const { data: configs, error } = await supabase
      .from('process_autonomy_config')
      .select(`
        id, current_tier, accuracy_30d, accuracy_threshold,
        proposal, proposal_reason, proposed_at, updated_at,
        workflow_processes (id, name, slug, execution_mode)
      `)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    // For each config, attach recent decision_outcomes accuracy
    const enriched = await Promise.all(
      (configs ?? []).map(async (config: any) => {
        const { data: outcomes } = await supabase
          .from('decision_outcomes')
          .select('outcome_value, lag_days, measured_at')
          .in(
            'execution_id',
            (await supabase
              .from('workflow_executions')
              .select('id')
              .eq('process_id', config.workflow_processes?.id ?? '')
              .limit(100)
              .then((r) => (r.data ?? []).map((e: any) => e.id)))
          )
          .not('outcome_value', 'is', null)
          .order('measured_at', { ascending: false })
          .limit(30);

        const measured = outcomes ?? [];
        const correct = measured.filter((o: any) => o.outcome_value > 0.5).length;
        const computedAccuracy30d = measured.length > 0
          ? Math.round((correct / measured.length) * 100)
          : null;

        return {
          ...config,
          outcome_count: measured.length,
          computed_accuracy_30d: computedAccuracy30d,
        };
      })
    );

    return NextResponse.json({ success: true, data: enriched });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
