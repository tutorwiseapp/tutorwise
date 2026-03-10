/*
 * Filename: src/lib/platform/agent-handoff.ts
 * Purpose: Cross-agent sessionStorage handoff encoding/decoding
 * Phase: Conductor 4C
 * Created: 2026-03-10
 *
 * When a user is redirected from one agent to another (e.g. Lexi → Growth),
 * the handing-off agent encodes context to sessionStorage. The receiving agent
 * reads this on mount and pre-populates its system prompt / greeting.
 */

const HANDOFF_KEY = 'agent-handoff';

export type AgentId = 'lexi' | 'sage' | 'growth';

export interface AgentHandoff {
  from: AgentId;
  topic: string;              // e.g. 'listing optimisation'
  context_summary: string;    // 1-2 sentences for system prompt
  caas_score?: number;
  growth_score?: number | null;
  signals?: string[];         // e.g. ['listing not viewed 18d', 'caas below 70']
  initiated_at: string;       // ISO timestamp
}

/**
 * Write a handoff context to sessionStorage before navigating to another agent.
 * Call this client-side before redirecting.
 */
export function writeHandoff(handoff: Omit<AgentHandoff, 'initiated_at'>): void {
  if (typeof window === 'undefined') return;
  const full: AgentHandoff = { ...handoff, initiated_at: new Date().toISOString() };
  try {
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(full));
  } catch {
    // sessionStorage may be unavailable in some contexts
  }
}

/**
 * Read the incoming handoff context. Returns null if no handoff or it's stale (> 5 min).
 */
export function readHandoff(): AgentHandoff | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    const handoff = JSON.parse(raw) as AgentHandoff;
    // Discard stale handoffs (> 5 minutes old)
    const age = Date.now() - new Date(handoff.initiated_at).getTime();
    if (age > 5 * 60 * 1000) {
      clearHandoff();
      return null;
    }
    return handoff;
  } catch {
    return null;
  }
}

/**
 * Clear the handoff after the receiving agent has consumed it.
 */
export function clearHandoff(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(HANDOFF_KEY);
  } catch {
    // ignore
  }
}

/**
 * Format a handoff as a compact block for injection into an agent system prompt.
 */
export function formatHandoffForPrompt(handoff: AgentHandoff): string {
  const lines = [
    `HANDOFF FROM ${handoff.from.toUpperCase()}:`,
    `Topic: ${handoff.topic}`,
    `Context: ${handoff.context_summary}`,
  ];
  if (handoff.caas_score != null) lines.push(`CaaS Score: ${handoff.caas_score}`);
  if (handoff.growth_score != null) lines.push(`Growth Score: ${handoff.growth_score}`);
  if (handoff.signals?.length) lines.push(`Signals: ${handoff.signals.join(', ')}`);
  return lines.join('\n');
}
