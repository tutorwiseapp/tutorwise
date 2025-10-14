// cas/agents/src/task-manager.js

const logger = require('../../packages/core/src/utils/logger');

class TaskManager {
  constructor() {
    this.taskQueue = [];
    this.isRunning = false;
  }

  start() {
    logger.info('[TaskManager] Starting...');
    this.isRunning = true;
    // In a real implementation, this would poll Jira/GitHub for new tasks.
    // For now, we'll just process tasks that are added manually.
  }

  stop() {
    logger.info('[TaskManager] Stopping...');
    this.isRunning = false;
  }

  addTask(task) {
    logger.info(`[TaskManager] Adding task: ${task.id}`);
    this.taskQueue.push(task);
  }

  getNextTask() {
    return this.taskQueue.shift();
  }

  getQueueSize() {
    return this.taskQueue.length;
  }
}

module.exports = new TaskManager();
