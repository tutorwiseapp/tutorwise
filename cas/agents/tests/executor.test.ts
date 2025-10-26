// cas/agents/tests/executor.test.ts

import executor from '../src/executor';
import taskManager from '../src/task-manager';
import { registerService, getService, unregisterService } from '../../packages/core/src/service/service-registry';
import InMemoryDeveloperAgent from './in-memory-developer-agent';

// Mock the logger to prevent logs from appearing during tests
jest.mock('../../packages/core/src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

describe('Executor', () => {
  let developerAgent: InMemoryDeveloperAgent;

  beforeEach(() => {
    developerAgent = new InMemoryDeveloperAgent();
    registerService('developer-agent', developerAgent);

    // Clear any tasks from previous tests
    while (taskManager.getNextTask()) {}
  });

  afterEach(() => {
    unregisterService('developer-agent');
  });

  it('should execute a task from the queue', async () => {
    const task = { id: 'TEST-1', featureName: 'Test Feature' };
    taskManager.addTask(task);

    await executor.processQueue(); // Manually trigger processing for test

    const agentFromRegistry = getService('developer-agent') as InMemoryDeveloperAgent;
    expect(agentFromRegistry.todos.length).toBe(1);
    expect(agentFromRegistry.completedFeatures.length).toBe(1);
    expect(agentFromRegistry.completedFeatures[0].featureName).toBe('Test Feature');
  });

  it('should not do anything if the queue is empty', async () => {
    await executor.processQueue(); // Manually trigger processing for test

    const agentFromRegistry = getService('developer-agent') as InMemoryDeveloperAgent;
    expect(agentFromRegistry.todos.length).toBe(0);
    expect(agentFromRegistry.completedFeatures.length).toBe(0);
  });
});