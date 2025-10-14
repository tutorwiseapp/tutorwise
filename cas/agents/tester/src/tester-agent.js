// cas/agents/tester/src/tester-agent.js

const logger = require('../../../packages/core/src/utils/logger');

class TesterAgent {
  constructor() {
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) {
      logger.warn('[TesterAgent] Agent is already running.');
      return;
    }

    logger.info('[TesterAgent] Starting...');
    this.isRunning = true;
  }

  async stop() {
    if (!this.isRunning) {
      logger.warn('[TesterAgent] Agent is not running.');
      return;
    }

    logger.info('[TesterAgent] Stopping...');
    this.isRunning = false;
  }
}

module.exports = new TesterAgent();
