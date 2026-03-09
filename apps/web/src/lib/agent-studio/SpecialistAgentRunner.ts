/**
 * SpecialistAgentRunner
 * Loads a specialist agent from the DB, builds a system prompt, and runs ReAct-style
 * tool-calling loops via the shared AI service. Writes results to agent_run_outputs.
 */

import { createServiceRoleClient } from '@/utils/supabase/server';
import { getAIService } from '@/lib/ai';
import { executeTool } from './tools/executor';

export interface AgentRunResult {
  outputText: string;
  toolsCalled: Array<{ slug: string; input: unknown; output: unknown }>;
  durationMs: number;
  runId: string;
}

interface AgentConfig {
  skills?: string[];
  tools?: string[];
  instructions?: string;
}

interface SpecialistAgent {
  id: string;
  slug: string;
  name: string;
  role: string;
  department: string;
  description: string | null;
  config: AgentConfig;
}

const TOOL_CALL_PATTERN = /TOOL_CALL:\s*(\w+)\s+(\{[\s\S]*?\})/g;
const MAX_TOOL_ROUNDS = 5;

function buildSystemPrompt(agent: SpecialistAgent, toolDescriptions: string): string {
  const config = agent.config ?? {};
  const skills = (config.skills ?? []).join(', ') || 'general analysis';
  const instructions = config.instructions ? `\nAdditional instructions: ${config.instructions}` : '';

  return `You are ${agent.name}, a ${agent.role} specialist at Tutorwise (${agent.department}).
${agent.description ?? ''}

Skills: ${skills}${instructions}

Available tools:
${toolDescriptions}

When you need data, call a tool using this exact format on its own line:
TOOL_CALL: tool_slug {"param": "value"}

After receiving tool results, continue your analysis. When done, provide your final response.
Do not call tools unless you genuinely need data. Keep your response focused and actionable.`;
}

async function loadToolDescriptions(toolSlugs: string[]): Promise<string> {
  if (!toolSlugs.length) return '(no tools available)';

  const supabase = await createServiceRoleClient();
  const { data } = await supabase
    .from('analyst_tools')
    .select('slug, name, description, input_schema')
    .in('slug', toolSlugs)
    .eq('status', 'active');

  return (data ?? [])
    .map((t) => {
      const schema = t.input_schema as { properties?: Record<string, { type: string }> } | null;
      const params = schema?.properties ? Object.keys(schema.properties).join(', ') : '';
      return `  ${t.slug}: ${t.description}${params ? ` (params: ${params})` : ''}`;
    })
    .join('\n');
}

export class SpecialistAgentRunner {
  async run(agentId: string, prompt: string, triggerType: string = 'manual'): Promise<AgentRunResult> {
    const startTime = Date.now();
    const supabase = await createServiceRoleClient();

    // Load agent
    const { data: agent, error } = await supabase
      .from('specialist_agents')
      .select('id, slug, name, role, department, description, config')
      .eq('id', agentId)
      .single();

    if (error || !agent) throw new Error(`Agent not found: ${agentId}`);

    const toolSlugs: string[] = (agent.config as AgentConfig)?.tools ?? [];
    const toolDescriptions = await loadToolDescriptions(toolSlugs);
    const systemPrompt = buildSystemPrompt(agent as SpecialistAgent, toolDescriptions);

    const ai = getAIService();
    const toolsCalled: AgentRunResult['toolsCalled'] = [];
    let userPrompt = prompt;

    // Insert run record (running state)
    const { data: runRow } = await supabase
      .from('agent_run_outputs')
      .insert({ agent_id: agentId, trigger_type: triggerType, input_prompt: prompt, status: 'running' })
      .select('id')
      .single();

    const runId = runRow?.id ?? '';

    // ReAct loop — up to MAX_TOOL_ROUNDS
    let outputText = '';
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const result = await ai.generate({ systemPrompt, userPrompt });
      outputText = result.content;

      // Extract tool calls
      const matches = [...outputText.matchAll(TOOL_CALL_PATTERN)];
      if (!matches.length) break;

      const toolResults: string[] = [];
      for (const match of matches) {
        const [, slug, rawInput] = match;
        try {
          const input = JSON.parse(rawInput) as Record<string, unknown>;
          const output = await executeTool(slug, input);
          toolsCalled.push({ slug, input, output });
          toolResults.push(`TOOL_RESULT: ${slug}\n${JSON.stringify(output, null, 2)}`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          toolResults.push(`TOOL_ERROR: ${slug}\n${msg}`);
        }
      }

      // Append tool results to conversation
      userPrompt = `${outputText}\n\n${toolResults.join('\n\n')}\n\nPlease continue your analysis based on the tool results above.`;
    }

    const durationMs = Date.now() - startTime;

    // Update run record
    await supabase
      .from('agent_run_outputs')
      .update({
        output_text: outputText,
        tools_called: toolsCalled,
        status: 'completed',
        duration_ms: durationMs,
      })
      .eq('id', runId);

    return { outputText, toolsCalled, durationMs, runId };
  }

  async *stream(agentId: string, prompt: string): AsyncGenerator<string> {
    const supabase = await createServiceRoleClient();

    const { data: agent, error } = await supabase
      .from('specialist_agents')
      .select('id, slug, name, role, department, description, config')
      .eq('id', agentId)
      .single();

    if (error || !agent) {
      yield 'Agent not found.';
      return;
    }

    const toolSlugs: string[] = (agent.config as AgentConfig)?.tools ?? [];
    const toolDescriptions = await loadToolDescriptions(toolSlugs);
    const systemPrompt = buildSystemPrompt(agent as SpecialistAgent, toolDescriptions);

    const ai = getAIService();
    for await (const chunk of ai.stream({ systemPrompt, userPrompt: prompt })) {
      if (chunk.content) yield chunk.content;
    }
  }
}

export const specialistAgentRunner = new SpecialistAgentRunner();
