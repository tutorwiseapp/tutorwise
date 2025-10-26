// cas/agents/tests/task-manager.test.ts

import taskManager from '../src/task-manager';

interface Task {
  id: string;
  description?: string;
}

describe('Task Manager', () => {
  beforeEach(() => {
    // Clear the queue before each test
    while (taskManager.getNextTask()) {}
  });

  it('should add a task to the queue', () => {
    const task: Task = { id: 'TEST-1', description: 'Test task' };
    taskManager.addTask(task);
    expect(taskManager.getQueueSize()).toBe(1);
  });

  it('should retrieve the next task from the queue', () => {
    const task1: Task = { id: 'TEST-1' };
    const task2: Task = { id: 'TEST-2' };
    taskManager.addTask(task1);
    taskManager.addTask(task2);

    const nextTask = taskManager.getNextTask();
    expect(nextTask).toBe(task1);
    expect(taskManager.getQueueSize()).toBe(1);
  });

  it('should return undefined when the queue is empty', () => {
    const nextTask = taskManager.getNextTask();
    expect(nextTask).toBeUndefined();
  });

  it('should maintain the order of tasks (FIFO)', () => {
    const tasks: Task[] = [{ id: '1' }, { id: '2' }, { id: '3' }];
    tasks.forEach(t => taskManager.addTask(t));

    expect(taskManager.getNextTask()).toBe(tasks[0]);
    expect(taskManager.getNextTask()).toBe(tasks[1]);
    expect(taskManager.getNextTask()).toBe(tasks[2]);
  });
});
