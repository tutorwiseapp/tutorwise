// cas/agents/src/executor.js

const logger = require('../../packages/core/src/utils/logger');
const taskManager = require('./task-manager');
const { getService } = require('../../packages/core/src/service/service-registry');

class Executor {
  constructor() {
    this.isRunning = false;
  }

  start() {
    logger.info('[Executor] Starting...');
    this.isRunning = true;
    this.run();
  }

  stop() {
    logger.info('[Executor] Stopping...');
    this.isRunning = false;
  }

  async run() {
    // NOTE: The setTimeout was removed for testing purposes.
    // In the real application, this should be a long-running process.
    if (!this.isRunning) {
      return;
    }

    const task = taskManager.getNextTask();
    if (task) {
      logger.info(`[Executor] Executing task: ${task.id}`);
      await this.executeTask(task);
    }
  }

  async executeTask(task) {
    // This is a simplified workflow for now.
    // In the future, this will be much more sophisticated.

    // 1. Developer Agent implements the feature
    const developerAgent = getService('developer-agent');
    // In a real scenario, we'd pass the task to the agent and it would do the work.
    // For now, we'll just simulate it by calling the updater.
    await developerAgent.updateFromTodos(
      [
        { content: 'Implement feature', status: 'in_progress', activeForm: 'Implementing feature' },
      ],
      task.featureName
    );

    // 2. Tester Agent runs tests
    const testerAgent = getService('tester-agent');
    // Simulate running tests
    logger.info(`[Executor] [TesterAgent] Running tests for ${task.featureName}...`);

    // 3. QA Agent does a review
    const qaAgent = getService('qa-agent');
    // Simulate QA review
    logger.info(`[Executor] [QaAgent] Performing QA review for ${task.featureName}...`);

    // 4. Mark the task as complete
    await developerAgent.markFeatureComplete(task.featureName, new Date().toISOString());
    logger.info(`[Executor] Task ${task.id} completed.`);
  }
}

module.exports = new Executor();