// cas/index.js

const { startAllServices, stopAllServices } = require('./packages/core/src/service/service-manager');
const { registerAllAgents } = require('./agents/agent-registry');
const logger = require('./packages/core/src/utils/logger');
const taskManager = require('./agents/src/task-manager');

async function main() {
  logger.info('[CAS] Initializing...');

  // Register all services
  registerAllAgents();
  // Register other services here in the future

  // Start all services
  await startAllServices();

  // Add a test task
  taskManager.addTask({
    id: 'TEST-1',
    featureName: 'Implement Test Feature',
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('[CAS] Shutting down...');
    await stopAllServices();
    process.exit(0);
  });

  logger.info('[CAS] System is running. Press Ctrl+C to exit.');
}

main().catch(error => {
  logger.error('[CAS] A critical error occurred:', error);
  process.exit(1);
});
