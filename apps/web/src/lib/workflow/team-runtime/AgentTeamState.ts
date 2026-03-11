/**
 * AgentTeamState — LangGraph Annotation.Root for multi-agent team execution.
 *
 * Phase 6A: Rewritten from a plain TypeScript interface to a proper LangGraph
 * Annotation.Root so TeamRuntime v2 can checkpoint state via PostgresSaver.
 *
 * Reducers:
 *   outputs         — merge (last writer wins per key)
 *   handoff_history — append
 *   visited_agents  — union set (no duplicates)
 *   all others      — last writer wins (default)
 */

import { Annotation } from '@langchain/langgraph';

export interface AgentTeamHandoff {
  from: string;
  to: string;
  reason: string;
  timestamp: string;
}

export const AgentTeamStateAnnotation = Annotation.Root({
  // The original task — set once, never updated by nodes
  task: Annotation<string>(),

  // Per-agent outputs keyed by agent slug — merged across nodes
  outputs: Annotation<Record<string, string>>({
    reducer: (existing, update) => ({ ...existing, ...update }),
    default: () => ({}),
  }),

  // Audit trail of agent handoffs — appended across nodes
  handoff_history: Annotation<AgentTeamHandoff[]>({
    reducer: (existing, update) => [...existing, ...update],
    default: () => [],
  }),

  // Active agent slug (Swarm pattern: tracks which agent is currently executing)
  current_agent: Annotation<string>({
    reducer: (_, b: string) => b,
    default: () => '',
  }),

  // Final synthesised result — set by coordinator/last agent
  team_result: Annotation<string | null>({
    reducer: (_, b: string | null) => b,
    default: () => null,
  }),

  // Swarm routing: next agent slug (null = done)
  next_agent: Annotation<string | null>({
    reducer: (_, b: string | null) => b,
    default: () => null,
  }),

  // Swarm routing: set of visited slugs — union across hops
  visited_agents: Annotation<string[]>({
    reducer: (existing, update) => [...new Set([...existing, ...update])],
    default: () => [],
  }),

  // Swarm routing: hop counter (last writer wins — node sets it)
  hop_count: Annotation<number>({
    reducer: (_, b: number) => b,
    default: () => 0,
  }),
});

export type AgentTeamState = typeof AgentTeamStateAnnotation.State;
