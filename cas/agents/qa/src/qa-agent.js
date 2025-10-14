// cas/agents/qa/src/qa-agent.js

const logger = require('../../../packages/core/src/utils/logger');

class QaAgent {
  constructor() {
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) {
      logger.warn('[QaAgent] Agent is already running.');
      return;
    }

    logger.info('[QaAgent] Starting...');
    this.isRunning = true;
  }

  async stop() {
    if (!this.isRunning) {
      logger.warn('[QaAgent] Agent is not running.');
      return;
    }

    logger.info('[QaAgent] Stopping...');
    this.isRunning = false;
  }
}

module.exports = new QaAgent();
