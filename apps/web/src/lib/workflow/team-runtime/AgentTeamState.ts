/**
 * AgentTeamState — shared state passed through a multi-agent team execution.
 * Used by TeamRuntime to wire LangGraph nodes.
 */

export interface AgentTeamMessage {
  role: string;
  content: string;
  agent_slug: string;
  timestamp: string;
}

export interface AgentTeamHandoff {
  from: string;
  to: string;
  reason: string;
  timestamp: string;
}

export interface AgentTeamState {
  task: string;
  messages: AgentTeamMessage[];
  context: Record<string, unknown>;   // agent_slug → output keyed by output_key
  outputs: Record<string, string>;
  current_agent: string;
  handoff_history: AgentTeamHandoff[];
  team_result: string | null;
}

export const INITIAL_AGENT_TEAM_STATE: Omit<AgentTeamState, 'task'> = {
  messages: [],
  context: {},
  outputs: {},
  current_agent: '',
  handoff_history: [],
  team_result: null,
};
