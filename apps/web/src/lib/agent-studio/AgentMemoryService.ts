/**
 * AgentMemoryService — Supabase-native episodic memory for specialist agents.
 *
 * Replaces the need for Neo4j / Graphiti by using pgvector similarity search on two tables:
 *   memory_episodes — one row per agent run; retrieved before each run for context injection
 *   memory_facts    — structured (subject, relation, object) learnings; active until invalidated
 *
 * Integration:
 *   1. Before run:  fetchMemoryBlock(agentSlug, task) → inject into system prompt
 *   2. After run:   recordEpisode(...) + extractAndStoreFacts(...) — both fail-silently
 *
 * Migration 386.
 */

import { createServiceRoleClient } from '@/utils/supabase/server';
import { generateEmbedding } from '@/lib/services/embeddings';
import { getAIService } from '@/lib/ai';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MemoryEpisodeRow {
  task_summary: string;
  outcome_summary: string;
  outcome_type: string;
  was_acted_on: boolean | null;
  created_at: string;
  similarity: number;
}

interface ExtractedFact {
  subject: string;
  relation: string;
  object: string;
  context: string;
  confidence: number;
}

// Platform-known entity terms used to populate the `entities` array cheaply (no AI call)
const KNOWN_ENTITIES = [
  // Infrastructure
  'pgBouncer', 'PostgresSaver', 'LangGraph', 'Supabase', 'Stripe', 'webhook', 'cron',
  // Severity keywords
  'P1', 'P2', 'P3', 'incident', 'alert', 'degraded',
  // Platform concepts
  'workflow_execution', 'shadow_divergence', 'conformance', 'booking', 'commission', 'payout',
  // Team agent slugs
  'director', 'planner', 'developer', 'tester', 'qa', 'engineer', 'security', 'marketer', 'analyst',
];

function extractEntities(text: string): string[] {
  const found = new Set<string>();
  for (const term of KNOWN_ENTITIES) {
    if (text.toLowerCase().includes(term.toLowerCase())) {
      found.add(term);
    }
  }
  return [...found].slice(0, 10);
}

function truncate(text: string, maxLen: number): string {
  return text.length <= maxLen ? text : text.slice(0, maxLen - 3) + '...';
}

function detectOutcomeType(outputText: string): string {
  const lower = outputText.toLowerCase();
  if (lower.includes('flag_for_review') || lower.includes('escalat') || lower.includes('severity')) return 'escalation';
  if (lower.includes('recommend') || lower.includes('suggest') || lower.includes('should')) return 'recommendation';
  if (lower.includes('p1') || lower.includes('p2') || lower.includes('alert') || lower.includes('urgent')) return 'alert';
  if (lower.includes('synthes') || lower.includes('executive summary') || lower.includes('key findings')) return 'synthesis';
  return 'analysis';
}

// ─── AgentMemoryService ───────────────────────────────────────────────────────

export class AgentMemoryService {
  /**
   * Retrieve semantically similar past episodes and active facts for a given agent + task.
   * Returns a formatted string ready for system prompt injection, or undefined if nothing relevant.
   * Fails silently — memory is non-critical augmentation.
   */
  async fetchMemoryBlock(agentSlug: string, task: string): Promise<string | undefined> {
    try {
      const supabase = await createServiceRoleClient();
      const embedding = await generateEmbedding(`${agentSlug}: ${task}`);
      const embeddingStr = JSON.stringify(embedding);

      const [episodesRes, factsRes] = await Promise.all([
        supabase.rpc('match_memory_episodes', {
          query_embedding: embeddingStr,
          p_agent_slug: agentSlug,
          match_threshold: 0.72,
          match_count: 3,
        }),
        supabase.rpc('match_memory_facts', {
          query_embedding: embeddingStr,
          p_agent_slug: agentSlug,
          match_count: 4,
        }),
      ]);

      const episodes = (episodesRes.data ?? []) as MemoryEpisodeRow[];
      const facts = (factsRes.data ?? []) as Array<{
        subject: string; relation: string; object: string; context: string | null;
      }>;

      if (!episodes.length && !facts.length) return undefined;

      const parts: string[] = [];

      if (episodes.length) {
        const formatted = episodes.map((ep, i) => {
          const date = new Date(ep.created_at).toISOString().split('T')[0];
          const acted = ep.was_acted_on === true ? ' ✓ acted on' : ep.was_acted_on === false ? ' ✗ not acted on' : '';
          return `${i + 1}. [${date}] ${ep.outcome_type}${acted}\n   Task: ${ep.task_summary}\n   Outcome: ${ep.outcome_summary}`;
        });
        parts.push(`Past similar runs:\n${formatted.join('\n')}`);
      }

      if (facts.length) {
        const formatted = facts.map((f) =>
          `  • ${f.subject} ${f.relation} ${f.object}${f.context ? ` — ${f.context}` : ''}`
        );
        parts.push(`Active learnings:\n${formatted.join('\n')}`);
      }

      return parts.join('\n\n');
    } catch {
      return undefined;
    }
  }

  /**
   * Record this run as a new memory episode (embeds task + outcome for future retrieval).
   * Call after each successful agent run. Fails silently.
   */
  async recordEpisode(opts: {
    agentSlug: string;
    runId: string;
    task: string;
    outputText: string;
    toolsCalled?: Array<{ slug: string }>;
  }): Promise<void> {
    try {
      const { agentSlug, runId, task, outputText, toolsCalled = [] } = opts;

      const taskSummary = truncate(task, 500);
      const outcomeSummary = truncate(outputText, 1000);
      const outcomeType = detectOutcomeType(outputText);

      // Entities from tools called + keyword extraction from output
      const toolEntities = toolsCalled.map((t) => t.slug);
      const textEntities = extractEntities(outputText);
      const entities = [...new Set([...toolEntities, ...textEntities])].slice(0, 10);

      const embedding = await generateEmbedding(`${taskSummary}\n${outcomeSummary}`);
      const supabase = await createServiceRoleClient();

      await supabase.from('memory_episodes').insert({
        agent_slug: agentSlug,
        run_id: runId,
        task_summary: taskSummary,
        outcome_summary: outcomeSummary,
        entities,
        outcome_type: outcomeType,
        embedding: JSON.stringify(embedding),
      });
    } catch {
      // Non-critical — never block agent execution
    }
  }

  /**
   * Use AI to extract 2–4 structured facts from the agent output and store them.
   * Only called for non-trivial outputs (>200 chars). Fails silently.
   */
  async extractAndStoreFacts(opts: {
    agentSlug: string;
    runId: string;
    outputText: string;
  }): Promise<void> {
    try {
      const { agentSlug, runId, outputText } = opts;

      if (outputText.length < 200) return; // too short to extract meaningful facts

      const ai = getAIService();
      const { data: facts } = await ai.generateJSON<ExtractedFact[]>({
        systemPrompt: `You are a knowledge extraction system. Extract 2-4 concise factual learnings from this agent analysis output.
Each fact should be a triple: subject → relation → object, plus a brief context sentence.
Focus on platform-specific findings (e.g. performance issues, security risks, metric anomalies, successful recommendations).
Only extract facts that would be useful to the same agent in a future run.
Return a JSON array ONLY — no markdown, no explanation.`,
        userPrompt: `Agent: ${agentSlug}\n\nOutput:\n${truncate(outputText, 2000)}\n\nReturn JSON array:\n[{"subject":"...","relation":"...","object":"...","context":"...","confidence":0.0-1.0}]`,
      });

      if (!Array.isArray(facts) || !facts.length) return;

      const supabase = await createServiceRoleClient();

      // Insert facts in parallel (max 4)
      await Promise.all(
        facts.slice(0, 4).map(async (fact) => {
          try {
            const factText = `${fact.subject} ${fact.relation} ${fact.object}: ${fact.context}`;
            const embedding = await generateEmbedding(factText);
            await supabase.from('memory_facts').insert({
              agent_slug: agentSlug,
              source_run_id: runId,
              subject: fact.subject,
              relation: fact.relation,
              object: fact.object,
              context: fact.context,
              confidence: Math.min(1, Math.max(0, fact.confidence ?? 0.8)),
              embedding: JSON.stringify(embedding),
            });
          } catch {
            // individual fact insert failing is acceptable
          }
        })
      );
    } catch {
      // Non-critical
    }
  }

  /**
   * Mark a fact as no longer valid (e.g. after a fix is confirmed).
   * Called when `was_acted_on = true` is set on an episode.
   */
  async invalidateFact(factId: string): Promise<void> {
    const supabase = await createServiceRoleClient();
    await supabase
      .from('memory_facts')
      .update({ valid_until: new Date().toISOString() })
      .eq('id', factId);
  }
}

export const agentMemoryService = new AgentMemoryService();
