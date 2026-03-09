/**
 * CAS Integration Layer
 *
 * Bridges for connecting Lexi, Sage, and CAS agents
 * through the unified message bus.
 *
 * @module cas/integration
 */

// Lexi Bridge
export {
  LexiBridge,
  lexiBridge,
  type LexiFeedbackEvent,
  type LexiSessionEvent,
  type CASNotification,
} from './lexi-bridge';

// Sage Bridge
export {
  SageBridge,
  sageBridge,
  type SageFeedbackEvent,
  type SageSessionEvent,
  type SageProgressEvent,
} from './sage-bridge';

// Growth Bridge
export {
  GrowthBridge,
  growthBridge,
  type GrowthAuditEvent,
  type GrowthSessionEvent,
  type GrowthScoreEvent,
} from './growth-bridge';

// Workflow Bridge
export {
  WorkflowBridge,
  workflowBridge,
  type WorkflowLifecycleEvent,
  type WorkflowCompletedEvent,
  type WorkflowPausedEvent,
  type WorkflowFailedEvent,
  type ShadowDivergenceEvent,
  type WorkflowScanEvent,
} from './workflow-bridge';

// --- Unified Integration API ---

import { lexiBridge } from './lexi-bridge';
import { sageBridge } from './sage-bridge';
import { growthBridge } from './growth-bridge';
import { workflowBridge } from './workflow-bridge';

/**
 * Get status of all integrations
 */
export async function getIntegrationStatus() {
  const [lexiStatus, sageStatus, growthStatus, workflowStatus] = await Promise.all([
    lexiBridge.getStatus(),
    sageBridge.getStatus(),
    growthBridge.getStatus(),
    workflowBridge.getStatus(),
  ]);

  return {
    lexi: lexiStatus,
    sage: sageStatus,
    growth: growthStatus,
    workflow: workflowStatus,
    overall: {
      connected:
        lexiStatus.connected &&
        sageStatus.connected &&
        growthStatus.connected &&
        workflowStatus.connected,
      pendingFeedback:
        lexiStatus.pendingFeedback +
        sageStatus.pendingFeedback +
        growthStatus.pendingFeedback +
        workflowStatus.pendingFeedback,
    },
  };
}

/**
 * Initialize all integrations
 */
export function initializeIntegrations(): void {
  console.log('[CAS Integration] Initializing bridges...');

  // Bridges auto-initialize on import
  console.log('[CAS Integration] Lexi bridge ready');
  console.log('[CAS Integration] Sage bridge ready');
  console.log('[CAS Integration] Growth bridge ready');
  console.log('[CAS Integration] Workflow bridge ready');
}

export default {
  lexiBridge,
  sageBridge,
  growthBridge,
  workflowBridge,
  getIntegrationStatus,
  initializeIntegrations,
};
