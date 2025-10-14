// cas/agents/tests/executor.test.js

const executor = require('../src/executor');
const taskManager = require('../src/task-manager');
const { registerService, getService, unregisterService } = require('../../packages/core/src/service/service-registry');
const InMemoryDeveloperAgent = require('./in-memory-developer-agent');

// Mock the logger to prevent logs from appearing during tests
jest.mock('../../packages/core/src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

describe('Executor', () => {
  let developerAgent;

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

    await executor.start();

    // Debugging: Let's inspect the agent from the registry
    const agentFromRegistry = getService('developer-agent');
    console.log('Agent from test:', developerAgent);
    console.log('Agent from registry:', agentFromRegistry);
    console.log('Are they the same instance?', developerAgent === agentFromRegistry);
    console.log('Registry agent todos:', agentFromRegistry.todos);


    expect(agentFromRegistry.todos.length).toBe(1);
    expect(agentFromRegistry.completedFeatures.length).toBe(1);
    expect(agentFromRegistry.completedFeatures[0].featureName).toBe('Test Feature');
  });

  it('should not do anything if the queue is empty', async () => {
    await executor.start();

    const agentFromRegistry = getService('developer-agent');
    expect(agentFromRegistry.todos.length).toBe(0);
    expect(agentFromRegistry.completedFeatures.length).toBe(0);
  });
});