/**
 * Unified AI Agents Module
 *
 * Provides base classes and types for all AI agents in TutorWise.
 * Supports both platform agents (Sage) and marketplace agents (AI Tutors).
 *
 * Architecture:
 * - BaseAgent: Abstract base class with common functionality
 * - PlatformAIAgent: Sage-based platform agents (free)
 * - MarketplaceAIAgent: User-created AI Tutors (paid)
 *
 * @module sage/agents
 */

// --- Base Types and Classes ---
export * from './base/types';
export { BaseAgent } from './base/BaseAgent';

// --- Platform Agent (Sage) ---
export { PlatformAIAgent, createPlatformAgent } from './PlatformAIAgent';

// --- Marketplace Agent (AI Tutors) ---
export { MarketplaceAIAgent } from './MarketplaceAIAgent';

// --- Agent Factory ---

import { PlatformAIAgent, createPlatformAgent } from './PlatformAIAgent';
import { MarketplaceAIAgent } from './MarketplaceAIAgent';
import type { BaseAIAgent, AIAgentType, AgentConfig } from './base/types';

/**
 * Create an AI agent based on context (platform or marketplace).
 */
export function createAgent(agent: BaseAIAgent, config: AgentConfig) {
  if (agent.agent_context === 'platform') {
    return new PlatformAIAgent(agent, config);
  } else {
    return new MarketplaceAIAgent(agent, config);
  }
}

/**
 * Create a default Sage agent (platform tutor).
 */
export function createSageAgent(
  subject: string = 'general',
  level?: string,
  agentType: AIAgentType = 'tutor'
) {
  return createPlatformAgent(agentType, subject, level);
}

// --- Exports ---

export default {
  createAgent,
  createSageAgent,
  createPlatformAgent,
  PlatformAIAgent,
  MarketplaceAIAgent,
};
