// cas/agents/tester/src/tester-agent.ts

import logger from '../../../packages/core/src/utils/logger';

class TesterAgent {
  private isRunning: boolean;

  constructor() {
    this.isRunning = false;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('[TesterAgent] Agent is already running.');
      return;
    }

    logger.info('[TesterAgent] Starting...');
    this.isRunning = true;
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('[TesterAgent] Agent is not running.');
      return;
    }

    logger.info('[TesterAgent] Stopping...');
    this.isRunning = false;
  }
}

export default new TesterAgent();
