/**
 * SpecialistAgentRunner
 * Loads a specialist agent from the DB, builds a system prompt, and runs ReAct-style
 * tool-calling loops via the shared AI service. Writes results to agent_run_outputs.
 *
 * Phase 4A: RAG augmentation — queries platform_knowledge_chunks before each run
 * to inject relevant knowledge into the system prompt.
 *
 * Phase 7 (migration 386): Episodic memory — injects relevant past runs + active facts
 * into the system prompt. Records a new episode + extracts facts after each run.
 */

import { createServiceRoleClient } from '@/utils/supabase/server';
import { getAIService } from '@/lib/ai';
import { generateEmbedding } from '@/lib/services/embeddings';
import { executeTool } from './tools/executor';
import { agentMemoryService } from './AgentMemoryService';

// ── Agent → knowledge category mapping (Phase 4A) ────────────────────────────
// Maps agent slugs to the most relevant platform_knowledge_chunks category.
// null = all categories (analyst, general-purpose agents)
const AGENT_KNOWLEDGE_CATEGORY: Record<string, string | null> = {
  'market-intelligence':   'intel_marketplace',
  'retention-monitor':     'intel_retention',
  'operations-monitor':    'intel_bookings',
  'autonomy-calibrator':   'workflow_process',
  'analyst':               null,
  'marketer':              'intel_caas',
  'planner':               'workflow_process',
  'developer':             'handler_doc',
  'engineer':              'handler_doc',
  'director':              null,
};

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

const TOOL_CALL_PATTERN = /TOOL_CALL:\s*([\w:]+)\s+(\{[\s\S]*?\})/g;
const MAX_TOOL_ROUNDS = 5;

function buildSystemPrompt(
  agent: SpecialistAgent,
  toolDescriptions: string,
  knowledgeBlock?: string,
  memoryBlock?: string
): string {
  const config = agent.config ?? {};
  const skills = (config.skills ?? []).join(', ') || 'general analysis';
  const instructions = config.instructions ? `\nAdditional instructions: ${config.instructions}` : '';
  const knowledgeSection = knowledgeBlock
    ? `\nPLATFORM KNOWLEDGE (relevant context for this task):\n${knowledgeBlock}\n`
    : '';
  const memorySection = memoryBlock
    ? `\nPAST EXPERIENCE (your own memory from similar previous runs):\n${memoryBlock}\n`
    : '';

  return `You are ${agent.name}, a ${agent.role} specialist at Tutorwise (${agent.department}).
${agent.description ?? ''}

Skills: ${skills}${instructions}${knowledgeSection}${memorySection}
Available tools:
${toolDescriptions}

When you need data, call a tool using this exact format on its own line:
TOOL_CALL: tool_slug {"param": "value"}

After receiving tool results, continue your analysis. When done, provide your final response.
Do not call tools unless you genuinely need data. Keep your response focused and actionable.`;
}

/**
 * Query platform_knowledge_chunks for relevant knowledge to augment the system prompt.
 * Falls back silently if the table doesn't exist or query fails.
 */
async function fetchKnowledgeBlock(agentSlug: string, prompt: string): Promise<string | undefined> {
  try {
    const category = AGENT_KNOWLEDGE_CATEGORY[agentSlug] ?? null;
    const embedding = await generateEmbedding(`${agentSlug}: ${prompt}`);
    const supabase = await createServiceRoleClient();
    const { data } = await supabase.rpc('match_platform_knowledge_chunks', {
      query_embedding: JSON.stringify(embedding),
      match_category: category,
      match_count: 3,
      match_threshold: 0.5,
    });
    if (!data || data.length === 0) return undefined;
    return (data as any[]).map((c: any) => `[${c.category}] ${c.title}:\n${c.content}`).join('\n---\n');
  } catch {
    // Knowledge base may not be seeded yet — fail silently
    return undefined;
  }
}

async function loadToolDescriptions(toolSlugs: string[]): Promise<string> {
  const supabase = await createServiceRoleClient();
  const lines: string[] = [];

  // Built-in tools
  if (toolSlugs.length > 0) {
    const { data } = await supabase
      .from('analyst_tools')
      .select('slug, name, description, input_schema')
      .in('slug', toolSlugs)
      .eq('status', 'active');

    for (const t of data ?? []) {
      const schema = t.input_schema as { properties?: Record<string, { type: string }> } | null;
      const params = schema?.properties ? Object.keys(schema.properties).join(', ') : '';
      lines.push(`  ${t.slug}: ${t.description}${params ? ` (params: ${params})` : ''}`);
    }
  }

  // MCP tools — load enabled tools from all active connections
  const { data: mcpTools } = await supabase
    .from('mcp_tool_catalog')
    .select('qualified_slug, description, input_schema, connection_id')
    .eq('enabled', true);

  if (mcpTools && mcpTools.length > 0) {
    // Fetch connection names for labelling
    const connIds = [...new Set(mcpTools.map((t) => t.connection_id))];
    const { data: conns } = await supabase
      .from('mcp_connections')
      .select('id, name')
      .in('id', connIds)
      .eq('status', 'active');
    const connNameMap = new Map((conns ?? []).map((c) => [c.id, c.name]));

    for (const t of mcpTools) {
      const connName = connNameMap.get(t.connection_id);
      if (!connName) continue; // skip tools from inactive connections
      const schema = t.input_schema as { properties?: Record<string, { type: string }> } | null;
      const params = schema?.properties ? Object.keys(schema.properties).join(', ') : '';
      lines.push(`  ${t.qualified_slug}: [${connName}] ${t.description}${params ? ` (params: ${params})` : ''}`);
    }
  }

  return lines.length > 0 ? lines.join('\n') : '(no tools available)';
}

export class SpecialistAgentRunner {
  async run(agentId: string, prompt: string, triggerType: string = 'manual', options?: { contextProfileId?: string }): Promise<AgentRunResult> {
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
    const [toolDescriptions, knowledgeBlock, memoryBlock] = await Promise.all([
      loadToolDescriptions(toolSlugs),
      fetchKnowledgeBlock(agent.slug, prompt),
      agentMemoryService.fetchMemoryBlock(agent.slug, prompt),
    ]);
    const systemPrompt = buildSystemPrompt(agent as SpecialistAgent, toolDescriptions, knowledgeBlock, memoryBlock);

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
    try {
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
            const output = await executeTool(slug, input, {
              profileId: options?.contextProfileId,
              agentSlug: agent.slug,
              runId,
            });
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
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const durationMs = Date.now() - startTime;

      // Mark run as failed
      await supabase
        .from('agent_run_outputs')
        .update({ output_text: `Error: ${errorMsg}`, status: 'failed', duration_ms: durationMs })
        .eq('id', runId);

      // Write exception (fire-and-forget)
      import('@/lib/workflow/exception-writer').then(({ writeException }) =>
        writeException({
          supabase,
          source: 'agent_error',
          severity: 'high',
          title: `Agent "${agent.name}" failed during execution`,
          description: errorMsg,
          sourceEntityType: 'specialist_agent',
          sourceEntityId: agent.id,
          context: { agentSlug: agent.slug, runId, triggerType, prompt: prompt.slice(0, 500) },
        })
      ).catch(() => {});

      throw err;
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

    // Phase 7: Record episode + extract facts (non-blocking, fail-silently)
    agentMemoryService.recordEpisode({
      agentSlug: agent.slug,
      runId,
      task: prompt,
      outputText,
      toolsCalled,
    }).catch(() => {});
    agentMemoryService.extractAndStoreFacts({
      agentSlug: agent.slug,
      runId,
      outputText,
    }).catch(() => {});

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
