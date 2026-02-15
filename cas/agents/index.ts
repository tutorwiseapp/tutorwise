/**
 * CAS Agents
 *
 * Registry and loader for all CAS agent capability manifests.
 * Provides discovery and routing for agent-to-agent communication.
 *
 * @module cas/agents
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// --- Types ---

export type CASAgentType =
  | 'planner'
  | 'analyst'
  | 'developer'
  | 'tester'
  | 'qa'
  | 'security'
  | 'engineer'
  | 'marketer';

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  operations: string[];
}

export interface AgentIntent {
  category: string;
  actions: string[];
  examples: string[];
}

export interface AgentTool {
  supported: boolean;
  format: string;
  functions: string[];
}

export interface AgentManifest {
  $schema?: string;
  name: string;
  version: string;
  agent: string;
  persona: string;
  description: string;
  capabilities: AgentCapability[];
  intents: AgentIntent[];
  tools: AgentTool;
  constraints: Record<string, unknown>;
  messageTypes: string[];
  integrations: string[];
}

// --- Agent Registry ---

const AGENT_TYPES: CASAgentType[] = [
  'planner',
  'analyst',
  'developer',
  'tester',
  'qa',
  'security',
  'engineer',
  'marketer',
];

const manifestCache = new Map<CASAgentType, AgentManifest>();

/**
 * Load agent manifest from JSON file
 */
export function loadAgentManifest(agentType: CASAgentType): AgentManifest | null {
  // Check cache first
  if (manifestCache.has(agentType)) {
    return manifestCache.get(agentType)!;
  }

  const manifestPath = join(__dirname, agentType, 'capabilities.json');

  if (!existsSync(manifestPath)) {
    console.warn(`[CAS Agents] Manifest not found for ${agentType}`);
    return null;
  }

  try {
    const content = readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(content) as AgentManifest;
    manifestCache.set(agentType, manifest);
    return manifest;
  } catch (error) {
    console.error(`[CAS Agents] Failed to load manifest for ${agentType}:`, error);
    return null;
  }
}

/**
 * Get all available agent types
 */
export function getAgentTypes(): CASAgentType[] {
  return [...AGENT_TYPES];
}

/**
 * Get all agent manifests
 */
export function getAllManifests(): Map<CASAgentType, AgentManifest> {
  const manifests = new Map<CASAgentType, AgentManifest>();

  for (const agentType of AGENT_TYPES) {
    const manifest = loadAgentManifest(agentType);
    if (manifest) {
      manifests.set(agentType, manifest);
    }
  }

  return manifests;
}

/**
 * Find agents that can handle a specific capability
 */
export function findAgentsByCapability(capabilityId: string): CASAgentType[] {
  const results: CASAgentType[] = [];

  for (const agentType of AGENT_TYPES) {
    const manifest = loadAgentManifest(agentType);
    if (manifest?.capabilities.some(c => c.id === capabilityId)) {
      results.push(agentType);
    }
  }

  return results;
}

/**
 * Find agents that can handle a specific intent category
 */
export function findAgentsByIntent(category: string): CASAgentType[] {
  const results: CASAgentType[] = [];

  for (const agentType of AGENT_TYPES) {
    const manifest = loadAgentManifest(agentType);
    if (manifest?.intents.some(i => i.category === category)) {
      results.push(agentType);
    }
  }

  return results;
}

/**
 * Get tool functions supported by an agent
 */
export function getAgentTools(agentType: CASAgentType): string[] {
  const manifest = loadAgentManifest(agentType);
  return manifest?.tools.functions || [];
}

/**
 * Check if an agent can receive a specific message type
 */
export function canReceiveMessageType(agentType: CASAgentType, messageType: string): boolean {
  const manifest = loadAgentManifest(agentType);
  return manifest?.messageTypes.includes(messageType) || false;
}

/**
 * Get agents that a planner can orchestrate
 */
export function getOrchestratableAgents(): CASAgentType[] {
  const plannerManifest = loadAgentManifest('planner');
  const canOrchestrate = plannerManifest?.constraints?.canOrchestrate as CASAgentType[] | undefined;
  return canOrchestrate || AGENT_TYPES.filter(t => t !== 'planner');
}

/**
 * Clear manifest cache (for testing)
 */
export function clearCache(): void {
  manifestCache.clear();
}

// --- Agent Descriptions (for quick reference) ---

export const AGENT_DESCRIPTIONS: Record<CASAgentType, string> = {
  planner: 'Strategic planning and task orchestration',
  analyst: 'Data analysis, metrics tracking, and insight generation',
  developer: 'Code generation, implementation, and development assistance',
  tester: 'Automated testing, test generation, and quality verification',
  qa: 'Quality assurance, acceptance testing, and release validation',
  security: 'Security scanning, vulnerability detection, and compliance',
  engineer: 'Infrastructure, DevOps, and platform engineering',
  marketer: 'Marketing analytics, user growth tracking, and engagement',
};

export default {
  loadAgentManifest,
  getAgentTypes,
  getAllManifests,
  findAgentsByCapability,
  findAgentsByIntent,
  getAgentTools,
  canReceiveMessageType,
  getOrchestratableAgents,
  clearCache,
  AGENT_DESCRIPTIONS,
};
