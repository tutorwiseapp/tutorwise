/**
 * Workflow Agent Tool: get-divergences
 *
 * Returns shadow mode divergence reports — cases where shadow execution
 * produced different outcomes than the live system would have.
 * Used by admin AI agents for quality assurance before going live.
 */

import { createServiceRoleClient } from '@/utils/supabase/server';

export interface DivergenceReport {
  executionId: string;
  processId: string;
  processName: string | null;
  divergenceType: string;
  shadowDecision: unknown;
  liveDecision: unknown;
  confidence: number | null;
  detectedAt: string;
}

export async function getDivergences(limit = 20): Promise<DivergenceReport[]> {
  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from('workflow_executions')
    .select(`
      id,
      process_id,
      shadow_divergence,
      started_at,
      workflow_processes!inner(name)
    `)
    .eq('is_shadow', true)
    .not('shadow_divergence', 'is', null)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`get-divergences: ${error.message}`);

  return (data ?? []).map((row: Record<string, unknown>) => {
    const divergence = row.shadow_divergence as Record<string, unknown> | null;
    const process = row.workflow_processes as Record<string, unknown> | null;
    return {
      executionId: row.id as string,
      processId: row.process_id as string,
      processName: (process?.name as string) ?? null,
      divergenceType: (divergence?.type as string) ?? 'unknown',
      shadowDecision: divergence?.shadow_decision ?? null,
      liveDecision: divergence?.live_decision ?? null,
      confidence: (divergence?.confidence as number) ?? null,
      detectedAt: row.started_at as string,
    };
  });
}
