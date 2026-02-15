// cas/index.ts
/**
 * CAS - Claude Agent System
 *
 * Entry point and module exports for the CAS multi-agent system.
 * Integrates with Lexi and Sage for feedback flow and optimization.
 *
 * @module cas
 */

import { startAllServices, stopAllServices } from './packages/core/src/service/service-manager.js';
import { registerAllAgents } from './agents/agent-registry.js';
import logger from './packages/core/src/utils/logger.js';
import taskManager from './agents/src/task-manager.js';

// --- Module Exports ---

// Message Bus
export * from './messages';

// Agent Registry & Manifests
export * from './agents';

// Tool Definitions & Executor
export * from './tools/actions';

// Dashboard & Metrics
export * from './dashboard';

// Integration Bridges (Lexi & Sage)
export * from './integration/lexi-bridge';
export * from './integration/sage-bridge';

// Retrospective Scheduler
export * from './scheduler/retrospective';

// Import singletons for initialization
import { lexiBridge } from './integration/lexi-bridge';
import { sageBridge } from './integration/sage-bridge';
import { retrospectiveScheduler } from './scheduler/retrospective';
import { metricsCollector } from './dashboard';

async function main() {
  logger.info('[CAS] Initializing...');

  // Register all services
  registerAllAgents();

  // Initialize integration bridges
  logger.info('[CAS] Lexi bridge status:', await lexiBridge.getStatus());
  logger.info('[CAS] Sage bridge status:', await sageBridge.getStatus());

  // Start all services
  await startAllServices();

  // Check if retrospective should run
  if (retrospectiveScheduler.shouldRunNow()) {
    logger.info('[CAS] Running scheduled retrospective...');
    const report = await retrospectiveScheduler.runRetrospective();
    logger.info('[CAS] Retrospective complete:', report.id);
  }

  // Log initial metrics
  const agentMetrics = await metricsCollector.getAgentMetrics();
  logger.info('[CAS] Active agents:', agentMetrics.length);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('[CAS] Shutting down...');
    await stopAllServices();
    process.exit(0);
  });

  logger.info('[CAS] System is running. Press Ctrl+C to exit.');
  logger.info('[CAS] Integration bridges active for Lexi and Sage feedback flow.');
}

main().catch(error => {
  logger.error('[CAS] A critical error occurred:', error);
  process.exit(1);
});
