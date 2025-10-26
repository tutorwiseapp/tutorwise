// cas/agents/src/task-manager.ts

import logger from '../../packages/core/src/utils/logger';
import { EventEmitter } from 'events';

interface Task {
  id: string;
  featureName: string;
  // Add other task properties here
}

class TaskManager extends EventEmitter {
  private taskQueue: Task[] = [];
  private isRunning = false;

  start() {
    logger.info('[TaskManager] Starting...');
    this.isRunning = true;
  }

  stop() {
    logger.info('[TaskManager] Stopping...');
    this.isRunning = false;
  }

  addTask(task: Task) {
    logger.info(`[TaskManager] Adding task: ${task.id}`);
    this.taskQueue.push(task);
    this.emit('newTask');
  }

  getNextTask(): Task | undefined {
    return this.taskQueue.shift();
  }

  getQueueSize(): number {
    return this.taskQueue.length;
  }
}

export default new TaskManager();
