// cas/agents/src/executor.ts

import logger from '../../packages/core/src/utils/logger';
import taskManager from './task-manager';
import { getService } from '../../packages/core/src/service/service-registry';

interface Task {
  id: string;
  featureName: string;
  // Add other task properties here
}

class Executor {
  private isRunning = false;
  private isProcessing = false;

  start() {
    logger.info('[Executor] Starting...');
    this.isRunning = true;
    taskManager.on('newTask', () => this.processQueue());
  }

  stop() {
    logger.info('[Executor] Stopping...');
    this.isRunning = false;
  }

  async processQueue() {
    if (!this.isRunning || this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    while (taskManager.getQueueSize() > 0) {
      const task = taskManager.getNextTask();
      if (task) {
        logger.info(`[Executor] Executing task: ${task.id}`);
        await this.executeTask(task);
      }
    }

    this.isProcessing = false;
  }

  async executeTask(task: Task) {
    // This is a simplified workflow for now.
    // In the future, this will be much more sophisticated.

    // 1. Developer Agent implements the feature
    const developerAgent: any = getService('developer-agent');
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

export default new Executor();