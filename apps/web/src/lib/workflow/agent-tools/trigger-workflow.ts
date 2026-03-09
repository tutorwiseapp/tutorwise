/**
 * Workflow Agent Tool: trigger-workflow
 *
 * HITL action gateway. Starts a workflow execution for an entity,
 * checking entity cooldowns before proceeding.
 * Writes a cooldown record after every successful start.
 */

import { createServiceRoleClient } from '@/utils/supabase/server';
import { workflowRuntime } from '@/lib/workflow/runtime/PlatformWorkflowRuntime';

export interface TriggerWorkflowInput {
  processId: string;
  entityId: string;
  entityType: string;
  context: Record<string, unknown>;
}

export interface TriggerWorkflowResult {
  executionId: string | null;
  skipped: boolean;
  reason?: string;
}

const COOLDOWN_MINUTES = 60;

export async function triggerWorkflow(input: TriggerWorkflowInput): Promise<TriggerWorkflowResult> {
  const supabase = await createServiceRoleClient();

  // Check cooldown
  const { data: cooldown } = await supabase
    .from('workflow_entity_cooldowns')
    .select('cooldown_until')
    .eq('entity_id', input.entityId)
    .eq('entity_type', input.entityType)
    .single();

  if (cooldown?.cooldown_until && new Date(cooldown.cooldown_until) > new Date()) {
    return {
      executionId: null,
      skipped: true,
      reason: `Entity cooldown active until ${cooldown.cooldown_until}`,
    };
  }

  // Check for already-running execution for this process + entity
  const { data: existing } = await supabase
    .from('workflow_executions')
    .select('id')
    .eq('process_id', input.processId)
    .eq('target_entity_id', input.entityId)
    .in('status', ['running', 'paused'])
    .single();

  if (existing) {
    return {
      executionId: null,
      skipped: true,
      reason: `Execution already active: ${existing.id}`,
    };
  }

  const executionId = await workflowRuntime.start(input.processId, {
    ...input.context,
    target_entity_id: input.entityId,
  });

  // Write / update cooldown record
  const now = new Date();
  const cooldownUntil = new Date(now.getTime() + COOLDOWN_MINUTES * 60 * 1000);

  await supabase
    .from('workflow_entity_cooldowns')
    .upsert({
      entity_id: input.entityId,
      entity_type: input.entityType,
      last_workflow_at: now.toISOString(),
      last_workflow_type: input.processId,
      cooldown_until: cooldownUntil.toISOString(),
    });

  return { executionId, skipped: false };
}
