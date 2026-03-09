/**
 * cas_agent handler
 * Executes a specialist agent or agent team as a workflow node.
 * Registered in NodeHandlerRegistry as 'cas_agent'.
 *
 * handlerConfig:
 *   agent_slug?     — slug of a specialist_agent to run
 *   team_slug?      — slug of an agent_team to run (alternative to agent_slug)
 *   prompt_template — template with {{context.field}} placeholders
 *   output_field    — key to write result into execution_context
 */

import { createServiceRoleClient } from '@/utils/supabase/server';
import type { HandlerContext, HandlerOptions } from '../NodeHandlerRegistry';

function resolveTemplate(template: string, context: HandlerContext): string {
  return template.replace(/\{\{context\.(\w+)\}\}/g, (_, key) => {
    const val = context[key];
    return val !== undefined ? String(val) : `{{context.${key}}}`;
  });
}

export async function handleCasAgent(
  context: HandlerContext,
  opts: HandlerOptions
): Promise<Record<string, unknown>> {
  const config = opts.handlerConfig ?? {};
  const agentSlug = config.agent_slug as string | undefined;
  const teamSlug = config.team_slug as string | undefined;
  const promptTemplate = (config.prompt_template as string | undefined) ?? 'Analyse: {{context.task}}';
  const outputField = (config.output_field as string | undefined) ?? 'agent_output';

  if (!agentSlug && !teamSlug) {
    throw new Error('cas_agent: either agent_slug or team_slug is required in handlerConfig');
  }

  // Shadow mode: record intent without AI call
  if (opts.executionMode === 'shadow') {
    return {
      shadowed: true,
      intended_handler: 'cas_agent',
      agent_slug: agentSlug,
      team_slug: teamSlug,
    };
  }

  const resolvedPrompt = resolveTemplate(promptTemplate, context);
  const startTime = Date.now();

  if (agentSlug) {
    // Load agent id from slug
    const supabase = await createServiceRoleClient();
    const { data: agent, error } = await supabase
      .from('specialist_agents')
      .select('id')
      .eq('slug', agentSlug)
      .eq('status', 'active')
      .single();

    if (error || !agent) throw new Error(`cas_agent: agent '${agentSlug}' not found or inactive`);

    const { specialistAgentRunner } = await import('@/lib/agent-studio/SpecialistAgentRunner');
    const result = await specialistAgentRunner.run(agent.id, resolvedPrompt, 'workflow');

    return {
      [outputField]: result.outputText,
      agent_slug: agentSlug,
      run_id: result.runId,
      duration_ms: Date.now() - startTime,
    };
  }

  // Team run
  const { teamRuntime } = await import('@/lib/workflow/team-runtime/TeamRuntime');
  const result = await teamRuntime.run(teamSlug!, resolvedPrompt, 'workflow');

  return {
    [outputField]: result.team_result,
    team_slug: teamSlug,
    run_id: result.run_id,
    duration_ms: Date.now() - startTime,
  };
}
