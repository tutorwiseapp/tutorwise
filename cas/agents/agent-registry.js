// cas/agents/agent-registry.js

const { registerService } = require('../packages/core/src/service/service-registry');
const developerAgent = require('./developer/src/developer-agent');
const engineerAgent = require('./engineer/src/engineer-agent');
const testerAgent = require('./tester/src/tester-agent');
const qaAgent = require('./qa/src/qa-agent');
const taskManager = require('./src/task-manager');
const executor = require('./src/executor');
// Import other agents here as they are created

function registerAllAgents() {
  registerService('task-manager', taskManager);
  registerService('executor', executor);
  registerService('developer-agent', developerAgent);
  registerService('engineer-agent', engineerAgent);
  registerService('tester-agent', testerAgent);
  registerService('qa-agent', qaAgent);
  // ... and so on for all other agents
}

module.exports = {
  registerAllAgents,
};
