/**
 * subprocess.execute handler
 * Executes a referenced workflow process as a sub-execution inline.
 * Creates a child workflow_executions row; awaits its completion before returning.
 *
 * handlerConfig:
 *   template_id?   — UUID of a workflow_process (preferred)
 *   template_name? — Name of a workflow_process (fallback if id not set)
 */

import { createServiceRoleClient } from '@/utils/supabase/server';
import type { HandlerContext, HandlerOptions } from '../NodeHandlerRegistry';

export async function handleSubprocessExecute(
  context: HandlerContext,
  opts: HandlerOptions
): Promise<Record<string, unknown>> {
  const config = opts.handlerConfig ?? {};
  const templateId   = config.template_id   as string | undefined;
  const templateName = config.template_name as string | undefined;

  if (!templateId && !templateName) {
    throw new Error('subprocess: template_id or template_name is required in handlerConfig');
  }

  if (opts.executionMode === 'shadow') {
    return {
      shadowed: true,
      intended_handler: 'subprocess.execute',
      template_id:   templateId,
      template_name: templateName,
    };
  }

  const supabase = await createServiceRoleClient();

  // Resolve process id
  let processId: string;
  if (templateId) {
    processId = templateId;
  } else {
    const { data, error } = await supabase
      .from('workflow_processes')
      .select('id')
      .eq('name', templateName!)
      .single();

    if (error || !data) {
      throw new Error(`subprocess: process "${templateName}" not found`);
    }
    processId = data.id;
  }

  // Dynamic import to avoid circular build-time dependency
  const { workflowRuntime } = await import('@/lib/workflow/runtime/PlatformWorkflowRuntime');

  // Inherit the parent execution context and mark the source
  const subContext = {
    ...context,
    _parentExecutionId: opts.executionId,
    _subprocessNodeId: opts.nodeId,
  };

  const subExecutionId = await workflowRuntime.start(processId, subContext);

  return {
    subprocess_execution_id: subExecutionId,
    subprocess_process_id:   processId,
  };
}
