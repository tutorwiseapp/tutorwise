// cas/agents/qa/src/qa-agent.ts

import logger from '../../../packages/core/src/utils/logger';

class QaAgent {
  private isRunning: boolean;

  constructor() {
    this.isRunning = false;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('[QaAgent] Agent is already running.');
      return;
    }

    logger.info('[QaAgent] Starting...');
    this.isRunning = true;
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('[QaAgent] Agent is not running.');
      return;
    }

    logger.info('[QaAgent] Stopping...');
    this.isRunning = false;
  }
}

export default new QaAgent();
