// cas/agents/developer/src/developer-agent.js

const { FeaturePlanUpdater } = require('./FeaturePlanUpdater');
const logger = require('../../../packages/core/src/utils/logger');

class DeveloperAgent {
  constructor() {
    this.updater = new FeaturePlanUpdater(2); // Assuming week 2 for now
    this.isRunning = false;
  }

  /**
   * Starts the Developer Agent service.
   */
  async start() {
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
  async stop() {
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
  async updateFromTodos(...args) {
    return this.updater.updateFromTodos(...args);
  }

  async markFeatureComplete(...args) {
    return this.updater.markFeatureComplete(...args);
  }
}

module.exports = new DeveloperAgent();
