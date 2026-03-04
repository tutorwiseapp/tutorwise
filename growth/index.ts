/**
 * Growth Agent — Top-Level Module
 *
 * Personalised AI business growth advisor for tutors, agents, clients, and organisations.
 * Top-level module alongside sage/ and lexi/.
 *
 * Usage (from apps/web):
 *   import { GrowthPlatformAgent, growthOrchestrator } from '@growth/agents';
 *   import type { GrowthUserMetrics } from '@growth/types';
 *
 * @module growth
 */

// Agents
export { GrowthPlatformAgent, createGrowthPlatformAgent, GrowthMarketplaceAgent } from './agents';

// Orchestrator
export { growthOrchestrator, GrowthOrchestrator } from './core/orchestrator';

// Types
export type { GrowthUserMetrics, GrowthUserRole } from './types';

// Tools
export { ALL_GROWTH_TOOLS, getToolsForRole } from './tools/definitions';
export { growthToolExecutor } from './tools/executor';
