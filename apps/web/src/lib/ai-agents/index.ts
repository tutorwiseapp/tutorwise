/**
 * AI Agents Module
 *
 * Unified API for working with AI agents (platform and marketplace).
 * Provides backward compatibility with existing AI Tutor code.
 *
 * @module lib/ai-agents
 */

export * from './adapter';

// Re-export types from Sage for convenience
export type {
  AIAgent,
  AIAgentType,
  AIAgentContext,
  AIAgentStatus,
  AgentSession,
  AgentMessage,
  CreateAIAgentInput,
  UpdateAIAgentInput,
  AgentConfig,
} from '@sage/agents/base/types';
