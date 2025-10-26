// cas/agents/agent-registry.ts

import { registerService } from '../packages/core/src/service/service-registry';
import developerAgent from './developer/src/developer-agent';
import engineerAgent from './engineer/src/engineer-agent';
import testerAgent from './tester/src/tester-agent';
import qaAgent from './qa/src/qa-agent';
import taskManager from './src/task-manager';
import executor from './src/executor';
// Import other agents here as they are created

export function registerAllAgents() {
  registerService('task-manager', taskManager);
  registerService('executor', executor);
  registerService('developer-agent', developerAgent);
  registerService('engineer-agent', engineerAgent);
  registerService('tester-agent', testerAgent);
  registerService('qa-agent', qaAgent);
  // ... and so on for all other agents
}
