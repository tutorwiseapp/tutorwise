// cas/agents/developer/src/developer-agent.ts

import { FeaturePlanUpdater } from './FeaturePlanUpdater';
import logger from '../../../packages/core/src/utils/logger';

class DeveloperAgent {
  private updater: FeaturePlanUpdater;
  private isRunning: boolean;

  constructor() {
    this.updater = new FeaturePlanUpdater(2); // Assuming week 2 for now
    this.isRunning = false;
  }

  /**
   * Starts the Developer Agent service.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('[DeveloperAgent] Agent is already running.');
      return;
    }

    logger.info('[DeveloperAgent] Starting...');
    this.isRunning = true;
    // In the future, this could listen for events from a message bus
    // For now, it just starts and is ready to be called.
  }

  /**
   * Stops the Developer Agent service.
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('[DeveloperAgent] Agent is not running.');
      return;
    }

    logger.info('[DeveloperAgent] Stopping...');
    this.isRunning = false;
  }

  /**
   * Exposes the updater's methods to be called by the executor.
   */
  async updateFromTodos(todos: any[], featureName: string): Promise<any> {
    return this.updater.updateFromTodos(todos, featureName);
  }

  async markFeatureComplete(featureName: string, completedDate: string): Promise<any> {
    return this.updater.markFeatureComplete(featureName, completedDate);
  }
}

const developerAgentInstance = new DeveloperAgent();

export const developer = developerAgentInstance;
export default developerAgentInstance;
