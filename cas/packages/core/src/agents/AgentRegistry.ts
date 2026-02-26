/**
 * Agent Registry
 *
 * Central registry for all CAS agents
 * Handles agent instantiation, lifecycle, and discovery
 */

import type { AgentExecutorInterface } from './AgentExecutorInterface';
import { MarketerAgent } from './MarketerAgent';
import { AnalystAgent } from './AnalystAgent';
import { PlannerAgent } from './PlannerAgent';
import { DeveloperAgent } from './DeveloperAgent';
import { TesterAgent } from './TesterAgent';
import { QAAgent } from './QAAgent';
import { EngineerAgent } from './EngineerAgent';
import { SecurityAgent } from './SecurityAgent';

export class AgentRegistry {
  private agents: Map<string, AgentExecutorInterface> = new Map();
  private initialized = false;

  constructor() {
    // Register all 8 agents
    this.registerAgent(new MarketerAgent());
    this.registerAgent(new AnalystAgent());
    this.registerAgent(new PlannerAgent());
    this.registerAgent(new DeveloperAgent());
    this.registerAgent(new TesterAgent());
    this.registerAgent(new QAAgent());
    this.registerAgent(new EngineerAgent());
    this.registerAgent(new SecurityAgent());
  }

  private registerAgent(agent: AgentExecutorInterface): void {
    this.agents.set(agent.agentId, agent);
    console.log(`[AgentRegistry] Registered agent: ${agent.agentId}`);
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[AgentRegistry] Already initialized');
      return;
    }

    console.log('[AgentRegistry] Initializing all agents...');

    const initPromises = Array.from(this.agents.values()).map(agent =>
      agent.initialize().catch(error => {
        console.error(`[AgentRegistry] Failed to initialize ${agent.agentId}:`, error);
        throw error;
      })
    );

    await Promise.all(initPromises);

    this.initialized = true;
    console.log(`[AgentRegistry] Initialized ${this.agents.size} agents successfully`);
  }

  getAgent(agentId: string): AgentExecutorInterface | undefined {
    return this.agents.get(agentId);
  }

  getAllAgents(): AgentExecutorInterface[] {
    return Array.from(this.agents.values());
  }

  getAgentIds(): string[] {
    return Array.from(this.agents.keys());
  }

  hasAgent(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  async getAgentHealth(agentId: string): Promise<{ healthy: boolean; message?: string } | null> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return null;
    }

    try {
      return await agent.getHealth();
    } catch (error: any) {
      return { healthy: false, message: error.message };
    }
  }

  async getAllAgentsHealth(): Promise<Record<string, { healthy: boolean; message?: string }>> {
    const health: Record<string, { healthy: boolean; message?: string }> = {};

    for (const [agentId, agent] of this.agents) {
      try {
        health[agentId] = await agent.getHealth();
      } catch (error: any) {
        health[agentId] = { healthy: false, message: error.message };
      }
    }

    return health;
  }

  async cleanup(): Promise<void> {
    console.log('[AgentRegistry] Cleaning up all agents...');

    const cleanupPromises = Array.from(this.agents.values()).map(agent =>
      agent.cleanup().catch(error => {
        console.error(`[AgentRegistry] Failed to cleanup ${agent.agentId}:`, error);
      })
    );

    await Promise.all(cleanupPromises);

    this.initialized = false;
    console.log('[AgentRegistry] Cleanup complete');
  }

  getAgentInfo(agentId: string) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return null;
    }

    return {
      agentId: agent.agentId,
      name: agent.name,
      description: agent.description,
      capabilities: agent.capabilities
    };
  }

  getAllAgentsInfo() {
    return this.getAgentIds().map(id => this.getAgentInfo(id));
  }
}
