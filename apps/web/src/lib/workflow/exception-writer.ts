/**
 * Filename: src/lib/workflow/exception-writer.ts
 * Purpose: Shared utility to write to workflow_exceptions table (fire-and-forget, fail-silent)
 * Used by: TeamRuntime, PlatformWorkflowRuntime, WorkflowCompiler, shadow-reconcile cron, webhook handler
 */

import { SupabaseClient } from '@supabase/supabase-js';

export type ExceptionSource =
  | 'workflow_failure'
  | 'agent_error'
  | 'conformance_deviation'
  | 'webhook_failure'
  | 'shadow_divergence'
  | 'hitl_timeout'
  | 'team_error';

export type ExceptionSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface WriteExceptionParams {
  supabase: SupabaseClient;
  source: ExceptionSource;
  severity: ExceptionSeverity;
  title: string;
  description?: string;
  sourceEntityType?: string;
  sourceEntityId?: string;
  context?: Record<string, unknown>;
}

/**
 * Write an exception to the unified workflow_exceptions queue.
 * Fire-and-forget — never throws, logs errors to console.
 */
export async function writeException(params: WriteExceptionParams): Promise<void> {
  try {
    const { supabase, source, severity, title, description, sourceEntityType, sourceEntityId, context } = params;
    await supabase.from('workflow_exceptions').insert({
      source,
      severity,
      title,
      description: description ?? null,
      source_entity_type: sourceEntityType ?? null,
      source_entity_id: sourceEntityId ?? null,
      context: context ?? {},
    });
  } catch (err) {
    console.error('[writeException] Failed to write exception:', err);
  }
}
